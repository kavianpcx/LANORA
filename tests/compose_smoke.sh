#!/usr/bin/env bash
# Isolated CI checkout only. Leaves volumes intact for debugging.
set -euo pipefail
[[ ! -e .env ]] || { echo 'Refusing to overwrite .env'; exit 1; }
cp .env.example .env
sed -i "s/^LANORA_PUBLIC_HOST=.*/LANORA_PUBLIC_HOST=localhost/; s/^LANORA_ADMIN_TOKEN=.*/LANORA_ADMIN_TOKEN=$(openssl rand -hex 32)/; s/^LANORA_RELAY_SECRET=.*/LANORA_RELAY_SECRET=$(openssl rand -hex 32)/" .env
chmod 600 .env
docker compose config --quiet
docker compose up -d --build
for _ in $(seq 1 60); do
  if docker compose exec -T api /lanora-api healthcheck >/dev/null 2>&1; then break; fi
  sleep 2
done
wait_api() {
 for _ in $(seq 1 60); do
   if docker compose exec -T api /lanora-api healthcheck >/dev/null 2>&1; then return; fi
   sleep 1
 done
 echo 'API did not become healthy'; return 1
}
wait_api
bash scripts/server.sh status
created=$(docker compose exec -T caddy wget -qO- --header='Content-Type: application/json' --post-data='{"name":"Persistence test","username":"Host"}' http://api:8080/api/v1/rooms)
room_id=$(printf '%s' "$created" | python3 -c 'import sys,json;print(json.load(sys.stdin)["roomId"])')
bash scripts/server.sh restart
wait_api
docker compose exec -T caddy wget -qO- http://api:8080/api/v1/rooms | python3 -c 'import json,sys;assert any(r["id"]==sys.argv[1] for r in json.load(sys.stdin)["rooms"])' "$room_id"
bash scripts/server.sh logs >/dev/null
bash scripts/server.sh stop
docker compose up -d
wait_api
echo 'PASS: fresh containers, local API, status, restart/database persistence, logs, stop and start.'
echo 'External DNS, trusted TLS and internet relay traffic remain unverified.'
