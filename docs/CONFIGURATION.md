# Configuration

For the simplest installation, use `scripts/setup-server.sh`. It creates `.env`, protects it with mode 0600, generates the administrator and relay secrets, and asks whether player passwords are required on fresh installations. Do not commit `.env`.

## Server environment

| Variable | Purpose |
|---|---|
| `LANORA_PUBLIC_HOST` | Domain used by Caddy for HTTPS |
| `LANORA_LISTEN_ADDR` | API address inside Docker; normally `:8080` |
| `LANORA_DB_PATH` | SQLite file inside the persistent data volume |
| `LANORA_ADMIN_TOKEN` | Private bearer token protecting administrator endpoints |
| `LANORA_ALLOWED_ORIGINS` | Exact CORS origins; Tauri origins are the default |
| `LANORA_RELAY_SECRET` | Secret for the internal EasyTier relay-control network |
| `LANORA_RELAY_PEER_URL` | Public EasyTier relay address, normally `tcp://YOUR_DOMAIN:11010` |
| `LANORA_SHARED_NETWORK_CODE` | Legacy alpha credential, read only for one-time upgrade migration; leave blank on new installs |

Player policy and the player password hash live in SQLite. Use `bash scripts/server.sh player-auth status|enable|change|disable` to check or change them. Do not edit the legacy environment variable to manage current passwords. Enabling, changing, or disabling player password protection revokes existing API memberships and rotates the shared network identity. Already-running modified EasyTier clients may keep the old overlay until they exit; see [Security](SECURITY.md).

The API is exposed through Caddy on TCP 443. Port 8080 is private. The relay listens on TCP/UDP 11010. Docker volumes keep SQLite and TLS certificates across image updates. Passwordless player access does not disable the administrator token or the EasyTier relay secret.

## Desktop preferences

The app stores the chosen language, theme, nickname, avatar, server address, and device ID locally. It keeps a player password only in memory while using it to request authorization; it does not store the password in localStorage. The issued bearer token remains in React process memory and is not persisted in localStorage. No user account is created.

Public servers must use HTTPS. Plain HTTP is accepted only for localhost, `127.0.0.0/8`, and `::1` for local development. The app does not disable certificate validation.
