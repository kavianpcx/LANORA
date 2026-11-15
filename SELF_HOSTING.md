# Self-hosting LANORA

LANORA's API, SQLite store, and static web app can be self-hosted. Caddy builds/serves the web frontend, terminates TLS, and proxies `/api/*` to the Go API. The Compose file also includes an EasyTier node, but per-room client configuration, relay selection and end-to-end tunnel operation are not integrated or verified. Treat it as infrastructure groundwork, not a functioning LAN data plane.

## Requirements

- Linux VPS with Docker Engine and the Compose plugin
- A DNS hostname pointed at the VPS
- TCP 80/443 inbound; UDP 443 is optional for HTTP/3
- TCP and UDP 11010 if exposing the current EasyTier listener

## Configure and launch

```sh
cp .env.example .env
openssl rand -hex 32
```

Edit `.env`: set `LANORA_PUBLIC_HOST`, replace `LANORA_ADMIN_TOKEN` with a unique random value, replace `LANORA_RELAY_SECRET`, and set `LANORA_ALLOWED_ORIGINS` to exact web/Tauri origins. Do not commit `.env`.

```sh
docker compose config
docker compose up -d --build
docker compose ps
curl --fail https://YOUR_HOST/api/v1/health
```

Caddy serves the web app and provisions/renews TLS when DNS and inbound HTTP/HTTPS work. SQLite persists in `lanora_data`. Back up using a SQLite-consistent procedure; do not copy an active WAL database as an uncoordinated single file. Set the web app's API Base URL to `https://YOUR_HOST` after it loads.

## Admin summary

`GET /api/v1/admin/summary` uses `LANORA_ADMIN_TOKEN` and returns room/member counts only. A separate admin web dashboard, resource/bandwidth metrics, room moderation UI and relay health UI are not implemented.

## Operations

The API is control plane and does not proxy game traffic. Do not expose SQLite or Docker socket. Open only required firewall ports. See [configuration](docs/CONFIGURATION.md), [security](docs/SECURITY.md), and [deployment](docs/DEPLOYMENT.md).
