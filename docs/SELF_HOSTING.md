# Self-hosting LANORA

This deployment builds and runs the static web app together with the Go control-plane API, SQLite storage, Caddy TLS proxy, and pinned EasyTier node. Caddy serves the web app and forwards `/api/*` to the API. Important limitation: the EasyTier node is not connected to per-room client provisioning. This Compose stack does **not** yet provide a verified virtual LAN or game-traffic relay.

## Requirements

- Linux VPS with Docker Engine and the Compose plugin
- Public DNS `A`/`AAAA` record pointed to the VPS
- TCP 80 and 443 inbound; UDP 443 is optional for HTTP/3
- TCP/UDP 11010 if you expose the configured EasyTier listeners
- A host firewall allowing only required inbound ports

## Configure

From the repository root:

```sh
cp .env.example .env
openssl rand -hex 32
```

Edit `.env`:

- `LANORA_PUBLIC_HOST`: your public DNS name.
- `LANORA_ADMIN_TOKEN`: a unique long random bearer secret.
- `LANORA_RELAY_SECRET`: a distinct long random secret for the isolated node.
- `LANORA_ALLOWED_ORIGINS`: exact comma-separated app origins, for example `https://kavianpcx.github.io,https://app.example.net,tauri://localhost`.
- Keep `LANORA_LISTEN_ADDR=:8080` and `LANORA_DB_PATH=/data/lanora.db` unless your deployment requires otherwise.

Never commit `.env` or expose its secrets in support logs.

## Start and verify

```sh
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 api caddy
curl --fail https://YOUR_HOST/api/v1/health
```

Caddy serves the frontend and obtains/renews certificates when DNS points to this VPS and HTTP/HTTPS are reachable. Open `https://YOUR_HOST`, then set API Base URL to `https://YOUR_HOST` in Settings. SQLite is stored in the named `lanora_data` volume. Back it up using a SQLite-consistent backup procedure; do not copy the active database file without accounting for WAL state.

## Admin endpoint

`GET https://YOUR_HOST/api/v1/admin/summary` accepts `Authorization: Bearer $LANORA_ADMIN_TOKEN` and returns room and approved-member counts. This endpoint is protected by a separate token. There is no admin web dashboard, resource/bandwidth telemetry, or relay-health interface in this snapshot.

## Firewall and ports

- `80/tcp`, `443/tcp`: Caddy web, API proxy and TLS.
- `443/udp`: optional HTTP/3.
- `11010/tcp` and `11010/udp`: EasyTier node listeners from Compose, only if you intend to expose this groundwork.
- The API port 8080 is exposed only to the Compose network; do not publish it directly.

The current listener is not sufficient to assert room traffic will traverse this node. Do not disable host firewall rules or forward a Windows client's default route through LANORA.

## Upgrade and backup

Pull reviewed source changes, inspect the changelog and Compose diff, validate with `docker compose config`, then rebuild. Preserve the `lanora_data` volume across upgrades. Back up `.env` securely outside the Git repository and protect it as a credential file.

See [Configuration](CONFIGURATION.md), [Deployment](DEPLOYMENT.md), and [Security](SECURITY.md).
