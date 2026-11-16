#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "${1:-status}" == code ]]; then
  [[ -f .env ]] || { echo 'Run: bash scripts/setup-server.sh'; exit 1; }
  access_code="$(sed -n 's/^LANORA_SHARED_NETWORK_CODE=//p' .env | head -n 1)"
  if [[ ${#access_code} -lt 16 || ${#access_code} -gt 128 ]]; then
    echo 'No shared-network code is configured. Run: bash scripts/server.sh start'
    exit 1
  fi
  printf 'Shared-network access code (share privately): %s\n' "$access_code"
  exit 0
fi

command -v docker >/dev/null || { echo 'Docker is missing. Install Docker Engine: https://docs.docker.com/engine/install/'; exit 1; }
docker compose version >/dev/null 2>&1 || { echo 'Install the Docker Compose plugin.'; exit 1; }
[[ -f .env ]] || { echo 'Run: bash scripts/setup-server.sh'; exit 1; }
docker info >/dev/null 2>&1 || { echo 'Cannot reach Docker. Start the Docker service and check your Docker permissions.'; exit 1; }

if grep -Eq '^(LANORA_ADMIN_TOKEN|LANORA_RELAY_SECRET)=replace-' .env; then
  echo 'Replace the example secrets in .env, or run setup-server.sh in a fresh checkout.'
  exit 1
fi

ensure_shared_network_code() {
  local current access_code temp_env
  current="$(sed -n 's/^LANORA_SHARED_NETWORK_CODE=//p' .env | head -n 1)"
  if [[ ${#current} -ge 16 && ${#current} -le 128 ]]; then
    return
  fi
  command -v openssl >/dev/null || { echo 'Install openssl to create a shared-network code.' >&2; exit 1; }
  access_code="$(openssl rand -hex 12)"
  temp_env="$(mktemp)"
  awk -v code="$access_code" '
    BEGIN { written=0 }
    /^LANORA_SHARED_NETWORK_CODE=/ {
      if (!written) print "LANORA_SHARED_NETWORK_CODE=" code
      written=1
      next
    }
    { print }
    END { if (!written) print "LANORA_SHARED_NETWORK_CODE=" code }
  ' .env > "$temp_env"
  chmod 600 "$temp_env"
  mv "$temp_env" .env
  printf 'Generated a shared-network access code. Save and share it privately: %s\n' "$access_code"
}

validate_compose() {
  docker compose config --quiet >/dev/null 2>&1 || {
    echo 'Invalid configuration. Check the required values in .env.'
    return 1
  }
}

case "${1:-status}" in
  start)
    ensure_shared_network_code
    validate_compose
    docker compose up -d --build
    ;;
  restart)
    ensure_shared_network_code
    validate_compose
    docker compose up -d --build
    docker compose restart
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
    ensure_shared_network_code
    validate_compose
    docker compose up -d --build
    echo 'Updated; persistent volumes preserved.'
    ;;
  status)
    validate_compose || exit 1
    failed=0
    echo 'LANORA — local server checks'
    shared_code="$(sed -n 's/^LANORA_SHARED_NETWORK_CODE=//p' .env | head -n 1)"
    if [[ ${#shared_code} -ge 16 && ${#shared_code} -le 128 ]]; then
      echo 'Shared-network access: configured (code hidden)'
    else
      echo 'Shared-network access: missing. Run bash scripts/server.sh start to create a code.'
      failed=1
    fi
    for service in api caddy easytier; do
      id=$(docker compose ps -a -q "$service")
      if [[ -z "$id" ]]; then printf '%-10s not created (run server.sh start)\n' "$service"; failed=1; continue; fi
      printf '%-10s ' "$service"
      state=$(docker inspect --format '{{.State.Status}}' "$id")
      [[ "$state" == running ]] || failed=1
      health_state=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$id")
      [[ "$health_state" != unhealthy ]] || failed=1
      docker inspect --format '{{.State.Status}}; health={{if .State.Health}}{{.State.Health.Status}}{{else}}not configured{{end}}' "$id"
    done
    if docker compose exec -T caddy wget -q -T 5 -O /dev/null http://api:8080/api/v1/health; then echo 'Local API: responds successfully'; else echo 'Local API: FAILED. Run server.sh logs and check api container.'; failed=1; fi
    public_host=$(sed -n 's/^LANORA_PUBLIC_HOST=//p' .env | head -n 1)
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
  *)
    echo 'Usage: bash scripts/server.sh {start|status|code|logs|restart|stop|update}'
    exit 2
    ;;
esac
