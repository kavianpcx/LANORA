#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f docker-compose.yml || ! -f .env.example ]]; then echo 'Run this from a LANORA checkout.' >&2; exit 1; fi
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then echo 'Install Docker Engine and the Docker Compose plugin first: https://docs.docker.com/engine/install/' >&2; exit 1; fi
if ! command -v openssl >/dev/null; then echo 'Install openssl first.' >&2; exit 1; fi
if [[ -e .env ]]; then
  chmod 600 .env
  echo 'Existing .env found. Keeping its settings and starting the current services.'
  access_code="$(sed -n 's/^LANORA_SHARED_NETWORK_CODE=//p' .env | head -n 1)"
  if [[ ${#access_code} -lt 16 || ${#access_code} -gt 128 ]]; then
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
    access_code_created=1
  else
    access_code_created=0
  fi
  docker compose config --quiet >/dev/null
  docker compose up -d --build
  public_host="$(sed -n 's/^LANORA_PUBLIC_HOST=//p' .env | head -n 1)"
  printf '\nLANORA services started.\n'
  bash scripts/server.sh status || true
  if [[ "$access_code_created" == 1 ]]; then
    printf 'Shared-network access code (share privately): %s\n' "$access_code"
  else
    printf 'Existing shared-network access code was kept and is not shown.\n'
  fi
  if [[ "$public_host" =~ ^[A-Za-z0-9.-]+$ ]]; then
    printf 'Players connect to: https://%s\n' "$public_host"
  fi
  printf 'Check server status with: bash scripts/server.sh status\n'
  exit 0
fi
read -r -p 'Domain pointed at this VPS (example: games.example.com): ' host
if [[ ! "$host" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ || "$host" != *.* ]]; then echo 'Enter a valid domain name. TLS needs working DNS.' >&2; exit 1; fi
admin_secret="$(openssl rand -hex 32)"
relay_secret="$(openssl rand -hex 32)"
shared_code="$(openssl rand -hex 12)"
umask 077
sed -e "s/^LANORA_PUBLIC_HOST=.*/LANORA_PUBLIC_HOST=$host/" \
    -e "s/^LANORA_ADMIN_TOKEN=.*/LANORA_ADMIN_TOKEN=$admin_secret/" \
    -e "s/^LANORA_RELAY_SECRET=.*/LANORA_RELAY_SECRET=$relay_secret/" \
    -e "s/^LANORA_SHARED_NETWORK_CODE=.*/LANORA_SHARED_NETWORK_CODE=$shared_code/" \
    -e "s|^LANORA_RELAY_PEER_URL=.*|LANORA_RELAY_PEER_URL=tcp://$host:11010|" \
    .env.example > .env
unset admin_secret relay_secret
if ! docker compose config --quiet >/dev/null 2>&1; then echo 'Compose configuration failed. Check .env.' >&2; exit 1; fi
docker compose up -d --build
printf '\nLANORA containers started. Current local service status:\n'
bash scripts/server.sh status || true
printf 'Player address (verify HTTPS from another network): https://%s\n' "$host"
printf 'Shared-network access code (share privately): %s\n' "$shared_code"
printf 'Open inbound TCP 80/443 and TCP/UDP 11010. Check health with:\n  curl -f https://%s/api/v1/health\n' "$host"

printf "Inspect local status with: bash scripts/server.sh status\n"
