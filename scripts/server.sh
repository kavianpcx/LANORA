#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command_name="${1:-status}"
if [[ $# -gt 0 ]]; then shift; fi

if [[ "$command_name" == code ]]; then
  echo 'Player passwords cannot be recovered or displayed. Use: bash scripts/server.sh player-auth change' >&2
  exit 2
fi

command -v docker >/dev/null || { echo 'Docker is missing. Install Docker Engine: https://docs.docker.com/engine/install/'; exit 1; }
docker compose version >/dev/null 2>&1 || { echo 'Install the Docker Compose plugin.'; exit 1; }
[[ -f .env ]] || { echo 'Run: bash scripts/setup-server.sh'; exit 1; }
docker info >/dev/null 2>&1 || { echo 'Cannot reach Docker. Start the Docker service and check your Docker permissions.'; exit 1; }

if grep -Eq '^(LANORA_ADMIN_TOKEN|LANORA_RELAY_SECRET)=replace-' .env; then
  echo 'Replace the example secrets in .env, or run setup-server.sh in a fresh checkout.'
  exit 1
fi

validate_compose() {
  docker compose config --quiet >/dev/null 2>&1 || {
    echo 'Invalid configuration. Check .env.'
    return 1
  }
}

player_auth_cli() {
  docker compose exec -T api /lanora-api player-auth "$@"
}

wait_for_player_auth_cli() {
  local attempt
  for attempt in {1..20}; do
    if player_auth_cli status >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  echo 'The LANORA API is not ready. Check services with: bash scripts/server.sh status' >&2
  return 1
}

migrate_legacy_player_code() {
  local legacy_code policy_output temp_env message
  legacy_code="$(sed -n 's/^LANORA_SHARED_NETWORK_CODE=//p' .env | head -n 1)"
  [[ -n "$legacy_code" ]] || return 0
  if ! policy_output="$(player_auth_cli status 2>/dev/null)"; then return 0; fi
  if grep -Fxq 'Player password: required' <<<"$policy_output"; then
    message='Migrated the existing player code to the SQLite password hash; other .env settings were preserved.'
  elif grep -Fxq 'Player password: disabled' <<<"$policy_output"; then
    message='Removed the unused legacy player code after confirming the passwordless policy; other .env settings were preserved.'
  else
    return 0
  fi

  temp_env="$(mktemp .env.XXXXXX)"
  awk '!/^LANORA_SHARED_NETWORK_CODE=/' .env > "$temp_env"
  printf '\n# Legacy player access code migrated into the SQLite password hash.\n' >> "$temp_env"
  chmod 600 "$temp_env"
  mv "$temp_env" .env
  docker compose up -d api
  echo "$message"
}

set_player_password() {
  local first confirm result
  while true; do
    IFS= read -r -s -p 'Enter player password: ' first
    printf '\n'
    IFS= read -r -s -p 'Confirm player password: ' confirm
    printf '\n'
    if [[ "$first" != "$confirm" ]]; then
      unset first confirm
      echo 'The passwords do not match. Try again.' >&2
      continue
    fi
    if [[ -z "$first" ]]; then
      unset first confirm
      echo 'The password cannot be empty.' >&2
      continue
    fi
    if result="$(printf '%s' "$first" | player_auth_cli set 2>&1)"; then
      unset first confirm
      printf '%s\n' "$result"
      return 0
    fi
    unset first confirm
    if [[ "$result" == *'use at least 12 characters'* ]]; then
      printf '%s\n' "$result" >&2
      continue
    fi
    printf '%s\n' "$result" >&2
    return 1
  done
}

case "$command_name" in
  doctor)
    validate_compose
    failed=0
    echo 'LANORA — server health report'
    api_id="$(docker compose ps -a -q api)"
    if [[ -n "$api_id" ]] && docker compose exec -T api /lanora-api healthcheck >/dev/null 2>&1; then
      echo 'API: PASS (health endpoint responds)'
    else
      echo 'API: FAIL (start or inspect the API service; try: bash scripts/server.sh logs)'
      failed=1
    fi

    relay_id="$(docker compose ps -a -q easytier)"
    if [[ -z "$relay_id" ]]; then
      echo 'Relay: FAIL (container not created)'
      failed=1
    else
      relay_state="$(docker inspect --format '{{.State.Status}}' "$relay_id")"
      if [[ "$relay_state" == running ]]; then
        echo 'Relay: PASS (container is running; external reachability is not verified)'
      else
        printf 'Relay: FAIL (container state: %s)\n' "$relay_state"
        failed=1
      fi
    fi

    if policy_output="$(player_auth_cli status 2>/dev/null)"; then
      printf '%s\n' "$policy_output"
      if grep -Fxq 'Player password: disabled' <<<"$policy_output"; then
        echo 'WARNING: anyone who can reach this server may join its shared gaming network.'
      fi
    else
      echo 'Player password policy: UNKNOWN (API/admin check failed)'
      failed=1
    fi

    public_host="$(sed -n 's/^LANORA_PUBLIC_HOST=//p' .env | head -n 1)"
    if [[ "$public_host" =~ ^[A-Za-z0-9.-]+$ ]]; then
      printf 'Public player URL: https://%s\n' "$public_host"
    else
      echo 'Public player URL: FAIL (LANORA_PUBLIC_HOST is invalid)'
      failed=1
    fi
    echo 'Configured host port mappings:'
    printf '  HTTP:     %s\n' "$(docker compose port caddy 80 2>/dev/null || echo 'unavailable')"
    printf '  HTTPS:    %s\n' "$(docker compose port caddy 443 2>/dev/null || echo 'unavailable')"
    printf '  Relay:    %s (TCP/UDP)\n' "$(docker compose port easytier 11010 2>/dev/null || echo 'unavailable')"

    if [[ -n "$api_id" ]] && summary_output="$(docker compose exec -T api /lanora-api admin-summary 2>/dev/null)"; then
      printf '%s\n' "$summary_output"
    else
      echo 'Database and active-player counts: FAIL (authenticated API summary unavailable)'
      failed=1
    fi

    recent_errors="$(docker compose logs --tail=100 api 2>&1 | sed -n 's/.*"error_type":"\([^"]*\)".*/\1/p' | tail -n 5)"
    echo 'Recent sanitized API failure types:'
    if [[ -n "$recent_errors" ]]; then
      while IFS= read -r error_type; do printf '  %s\n' "$error_type"; done <<<"$recent_errors"
    else
      echo '  None found in the latest 100 API log lines.'
    fi
    echo 'Public HTTPS and relay reachability: NOT CHECKED from another network.'
    echo 'For a public server, verify HTTPS /api/v1/health and UDP/TCP relay access from another connection.'
    exit "$failed"
    ;;
  start)
    validate_compose
    docker compose up -d --build
    wait_for_player_auth_cli
    migrate_legacy_player_code
    ;;
  restart)
    validate_compose
    docker compose up -d --build
    docker compose restart
    wait_for_player_auth_cli
    migrate_legacy_player_code
    ;;
  stop)
    docker compose stop
    echo 'Stopped. Database and certificates are preserved.'
    ;;
  logs)
    echo 'API operational logs only; raw relay logs may contain network credentials.'
    docker compose logs --tail=100 api
    ;;
  update)
    command -v git >/dev/null || { echo 'Install git first.'; exit 1; }
    git pull --ff-only
    validate_compose
    docker compose up -d --build
    wait_for_player_auth_cli
    migrate_legacy_player_code
    echo 'Updated; persistent volumes preserved.'
    ;;
  status)
    validate_compose || exit 1
    failed=0
    echo 'LANORA — local server checks'
    for service in api caddy easytier; do
      id="$(docker compose ps -a -q "$service")"
      if [[ -z "$id" ]]; then printf '%-10s not created (run server.sh start)\n' "$service"; failed=1; continue; fi
      printf '%-10s ' "$service"
      state="$(docker inspect --format '{{.State.Status}}' "$id")"
      [[ "$state" == running ]] || failed=1
      health_state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$id")"
      [[ "$health_state" != unhealthy ]] || failed=1
      docker inspect --format '{{.State.Status}}; health={{if .State.Health}}{{.State.Health.Status}}{{else}}not configured{{end}}' "$id"
    done
    if docker compose exec -T caddy wget -q -T 5 -O /dev/null http://api:8080/api/v1/health; then echo 'Local API: responds successfully'; else echo 'Local API: FAILED. Run server.sh logs and check api container.'; failed=1; fi
    if policy_output="$(player_auth_cli status 2>/dev/null)"; then
      printf '%s\n' "$policy_output"
    else
      echo 'Player password policy: unavailable'
      failed=1
    fi
    public_host="$(sed -n 's/^LANORA_PUBLIC_HOST=//p' .env | head -n 1)"
    if [[ "$public_host" =~ ^[A-Za-z0-9.-]+$ ]]; then
      printf 'Configured player address: https://%s\n' "$public_host"
    else
      echo 'Configured player address: invalid LANORA_PUBLIC_HOST; edit .env'
      failed=1
    fi
    echo 'Configured port mappings:'
    docker compose port caddy 443 || true
    docker compose port easytier 11010 || true
    if command -v ss >/dev/null; then
      echo 'Local listening sockets (Docker NAT mappings may not appear here):'
      ss -H -lntu | awk '$5 ~ /:(80|443|11010)$/ { print $1, $5 }'
    else
      echo 'Socket inspection unavailable; install iproute2.'
    fi
    echo 'These are local checks. From another network, verify HTTPS /api/v1/health and relay connectivity.'
    exit "$failed"
    ;;
  player-auth)
    subcommand="${1:-status}"
    case "$subcommand" in
      status)
        wait_for_player_auth_cli
        player_auth_cli status
        ;;
      enable|change)
        wait_for_player_auth_cli
        set_player_password
        ;;
      disable)
        wait_for_player_auth_cli
        player_auth_cli disable
        echo 'WARNING: anyone who can reach this server may join its shared gaming network.'
        ;;
      *)
        echo 'Usage: bash scripts/server.sh player-auth {status|enable|disable|change}' >&2
        exit 2
        ;;
    esac
    ;;
  migrate-legacy-player-code)
    wait_for_player_auth_cli
    migrate_legacy_player_code
    ;;
  *)
    echo 'Usage: bash scripts/server.sh {status|start|restart|stop|logs|update|doctor|player-auth}'
    exit 2
    ;;
esac
