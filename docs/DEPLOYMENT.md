# Deployment

## GitHub Pages (frontend only)

The Pages workflow builds `apps/web` with `VITE_BASE_PATH=/lanora/` and deploys `dist/`. Enable **Settings → Pages → Build and deployment → GitHub Actions** if needed. Pages does not host Go, SQLite, WebSocket backend or EasyTier. Configure the self-hosted API URL and allow the Pages origin in API CORS.

## VPS

Use `docker-compose.yml`, `.env.example`, and [self-hosting](SELF_HOSTING.md). The Caddy container builds and serves the static web app, routes `/api/*` to the Go API, and terminates TLS:

```sh
cp .env.example .env
# Edit hostname and secrets
docker compose config
docker compose up -d --build
curl --fail https://YOUR_HOST/api/v1/health
```

Caddy terminates TLS and serves the website; SQLite persists in a named volume. The EasyTier container is groundwork only, not a functional room relay.

## Releases

Use SemVer. No binary release is valid until Windows build, notices/signing review and artifact testing succeed. This is pre-release development; there is no installer.
