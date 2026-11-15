#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f docker-compose.yml || ! -f .env.example ]]; then echo 'Run this from a LANORA checkout.' >&2; exit 1; fi
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then echo 'Install Docker Engine and the Docker Compose plugin first: https://docs.docker.com/engine/install/' >&2; exit 1; fi
if ! command -v openssl >/dev/null; then echo 'Install openssl first.' >&2; exit 1; fi
if [[ -e .env ]]; then echo '.env already exists. Edit it and run: docker compose up -d --build' >&2; exit 1; fi
read -r -p 'Domain pointed at this VPS (example: games.example.com): ' host
if [[ ! "$host" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ || "$host" != *.* ]]; then echo 'Enter a valid domain name. TLS needs working DNS.' >&2; exit 1; fi
admin_secret="$(openssl rand -hex 32)"
relay_secret="$(openssl rand -hex 32)"
umask 077
sed -e "s/^LANORA_PUBLIC_HOST=.*/LANORA_PUBLIC_HOST=$host/" \
    -e "s/^LANORA_ADMIN_TOKEN=.*/LANORA_ADMIN_TOKEN=$admin_secret/" \
    -e "s/^LANORA_RELAY_SECRET=.*/LANORA_RELAY_SECRET=$relay_secret/" \
    -e "s|^LANORA_RELAY_PEER_URL=.*|LANORA_RELAY_PEER_URL=tcp://$host:11010|" \
    .env.example > .env
unset admin_secret relay_secret
if ! docker compose config --quiet; then echo 'Compose configuration failed. Check .env.' >&2; exit 1; fi
docker compose up -d --build
printf '\nLANORA started. Share this server address with players: https://%s\n' "$host"
printf 'Open inbound TCP 80/443 and TCP/UDP 11010. Check health with:\n  curl -f https://%s/api/v1/health\n' "$host"
