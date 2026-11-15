# Troubleshooting

## API URL and CORS

Set the API origin in web Settings without `/api/v1`. Configure `LANORA_ALLOWED_ORIGINS` to the exact browser origin, including scheme/port, then restart the API. For GitHub Pages, the origin excludes the `/lanora/` path.

## API health

Start the API locally, or run `docker compose ps` and `docker compose logs --tail=100 api caddy`. Verify DNS and ports 80/443. Test `https://YOUR_HOST/api/v1/health`.

## Invite and approval

Check copied code, password, accepting-members setting and capacity. A pending join requires host approval. Rotating the invite invalidates the previous code.

## Missing room permission

Room endpoints require the room-scoped token returned by create/join; account access tokens are separate. Browser session data is temporary.

## No virtual IP, ping, or game discovery

Expected: the Windows tunnel integration is not complete. Do not disable a firewall or add broad routes. See [docs/NETWORKING.md](docs/NETWORKING.md).
