# Configuration

For the simplest installation, use scripts/setup-server.sh. It creates .env, protects it with mode 0600, and generates the private secrets. Do not commit .env.

## Server environment

| Variable | Purpose |
|---|---|
| LANORA_PUBLIC_HOST | Domain used by Caddy for HTTPS |
| LANORA_LISTEN_ADDR | API address inside Docker; normally :8080 |
| LANORA_DB_PATH | SQLite file inside the persistent data volume |
| LANORA_ADMIN_TOKEN | Optional private bearer token for admin summary |
| LANORA_ALLOWED_ORIGINS | Exact CORS origins; the Tauri origins are the default |
| LANORA_RELAY_SECRET | Secret for the relay control network |
| LANORA_RELAY_PEER_URL | Public EasyTier relay address, normally tcp://YOUR_DOMAIN:11010 |
| LANORA_SHARED_NETWORK_CODE | Private 16–128 character player authorization code |

The API is exposed through Caddy on TCP 443. Port 8080 is private. The relay listens on TCP/UDP 11010. Docker volumes keep SQLite and TLS certificates across image updates.

To rotate the shared access code, replace LANORA_SHARED_NETWORK_CODE in .env and run docker compose up -d --build. On API startup, the network identity rotates and existing device tokens are revoked. Give the new code to players. Do not paste any secret into issue reports.

## Desktop preferences

The app stores the chosen language, theme, nickname, avatar, server address, device ID, shared code, and current bearer token locally. The code and bearer token are local authorization secrets. Disconnect removes the shared code and revokes the current bearer token. No user account is created.

Public servers must use HTTPS. Plain HTTP is accepted only for localhost, 127.0.0.0/8, and ::1 for local development. The app does not disable certificate validation.
