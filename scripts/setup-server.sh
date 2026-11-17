#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f docker-compose.yml || ! -f .env.example ]]; then echo 'Run this from a LANORA checkout.' >&2; exit 1; fi
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then echo 'Install Docker Engine and the Docker Compose plugin first: https://docs.docker.com/engine/install/' >&2; exit 1; fi
if ! command -v openssl >/dev/null; then echo 'Install openssl first.' >&2; exit 1; fi
if [[ -e .env ]]; then
  chmod 600 .env
  echo 'Existing .env found. Keeping its settings and starting the current services.'
  docker compose config --quiet >/dev/null
  docker compose up -d --build
  bash scripts/server.sh migrate-legacy-player-code
  public_host="$(sed -n 's/^LANORA_PUBLIC_HOST=//p' .env | head -n 1)"
  printf '\nLANORA services started.\n'
  bash scripts/server.sh status || true
  if [[ "$public_host" =~ ^[A-Za-z0-9.-]+$ ]]; then
    printf 'Players connect to: https://%s\n' "$public_host"
  fi
  printf 'Check server status with: bash scripts/server.sh status\n'
  exit 0
fi
read -r -p 'Domain pointed at this VPS (example: games.example.com): ' host
if [[ ! "$host" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ || "$host" != *.* ]]; then echo 'Enter a valid domain name. TLS needs working DNS.' >&2; exit 1; fi
while true; do
  read -r -p 'Require a password for players? [Y/n]: ' password_choice
  case "${password_choice,,}" in
    ''|y|yes) require_player_password=1; break ;;
    n|no) require_player_password=0; break ;;
    *) echo 'Choose Yes or No.' ;;
  esac
done
if [[ "$require_player_password" == 0 ]]; then
  echo 'WARNING: anyone who can reach this server may join its shared gaming network.'
  echo 'Passwordless player access does not change administrator or EasyTier relay security.'
fi
admin_secret="$(openssl rand -hex 32)"
relay_secret="$(openssl rand -hex 32)"
umask 077
sed -e "s/^LANORA_PUBLIC_HOST=.*/LANORA_PUBLIC_HOST=$host/" \
    -e "s/^LANORA_ADMIN_TOKEN=.*/LANORA_ADMIN_TOKEN=$admin_secret/" \
    -e "s/^LANORA_RELAY_SECRET=.*/LANORA_RELAY_SECRET=$relay_secret/" \
    -e "s|^LANORA_RELAY_PEER_URL=.*|LANORA_RELAY_PEER_URL=tcp://$host:11010|" \
    .env.example > .env
unset admin_secret relay_secret
if ! docker compose config --quiet >/dev/null 2>&1; then echo 'Compose configuration failed. Check .env.' >&2; exit 1; fi
docker compose up -d --build
if [[ "$require_player_password" == 1 ]]; then
  bash scripts/server.sh player-auth enable
else
  bash scripts/server.sh player-auth disable
fi
printf '\nLANORA containers started. Current local service status:\n'
bash scripts/server.sh status || true
printf 'Player address (verify HTTPS from another network): https://%s\n' "$host"
if [[ "$require_player_password" == 0 ]]; then
  printf 'Player password protection is disabled. Anyone who can reach this server may join.\n'
else
  printf 'Player password protection is enabled. Share your chosen password privately.\n'
fi
printf 'Open inbound TCP 80/443 and TCP/UDP 11010. Check health with:\n  curl -f https://%s/api/v1/health\n' "$host"

printf "Inspect local status with: bash scripts/server.sh status\n"
