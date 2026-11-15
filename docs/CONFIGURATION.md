# Configuration

Copy `.env.example` to `.env` and edit it on the VPS. Never commit `.env`.

| Variable | Meaning |
|---|---|
| `LANORA_PUBLIC_HOST` | DNS host used by Caddy for HTTPS |
| `LANORA_LISTEN_ADDR` | API address inside Docker, default `:8080` |
| `LANORA_DB_PATH` | SQLite path in persistent volume |
| `LANORA_ADMIN_TOKEN` | Independent secret for minimal admin summary |
| `LANORA_RELAY_SECRET` | EasyTier shared node control-network secret, distinct from room secrets |
| `LANORA_RELAY_PEER_URL` | Public `tcp://HOST:11010` or `udp://HOST:11010` endpoint sent to approved members |
| `LANORA_ALLOWED_ORIGINS` | Exact allowed Tauri/development origins |

In the Windows app, enter the server's HTTPS address, including `:PORT` if nonstandard. The app remembers only the address, chosen display name, language, and theme. Public HTTP is refused; loopback HTTP is allowed for local development. Changes to `.env` require `docker compose up -d --build`.
