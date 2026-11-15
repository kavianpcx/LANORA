# Troubleshooting

## Web app cannot reach the API

1. Open Settings and enter the API origin, e.g. `https://lan.example.org`, without `/api/v1`.
2. Check `GET https://YOUR_HOST/api/v1/health` from a terminal.
3. For local development, start the API from `services/api` and use `http://localhost:8080`.

## Browser CORS error

Set `LANORA_ALLOWED_ORIGINS` to the exact origin shown by the browser, including scheme and port, then restart the API. GitHub Pages project URL paths are not part of the origin: for `https://kavianpcx.github.io/lanora/`, allow `https://kavianpcx.github.io`.

## VPS health check fails

```sh
docker compose ps
docker compose logs --tail=100 api caddy
```

Confirm DNS A/AAAA records, inbound TCP 80/443, `LANORA_PUBLIC_HOST`, and that secrets in `.env` are set. Caddy cannot issue TLS if public DNS/firewall does not reach it.

## Invite code or password rejected

Invite codes are case-normalized, but copied whitespace may cause mistakes. Invite rotation invalidates the old code. Check the room password and capacity. A closed room or disabled new memberships cannot accept joins.

## Join remains pending

The host must approve the member if the room requires approval. The web client polls the API for status. If rejected or the room was closed, rejoin with a current invite code.

## Room endpoint returns unauthorized

Room endpoints use the distinct room-scoped token returned during room creation/join, not the account login token. In the current web client, room membership is stored for the browser session; closing that session may require joining again.

## No IP, ping, P2P, or relay state

Expected: EasyTier is not integrated into a working Windows tunnel. No virtual IP, peer ping, packet loss, or direct/relay status is available. Do not disable Windows Firewall or apply broad route changes. See [Networking](NETWORKING.md).

## Compose validation or Go tests fail locally

Install Docker Engine with the Compose plugin and Go 1.27+. Run `docker compose config` and `cd services/api && go test ./...`. The development container used for this repository work lacked a usable Go toolchain and Docker; those checks remain unverified here.
