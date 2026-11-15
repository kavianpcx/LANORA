# Deployment

See [Self-hosting](SELF_HOSTING.md). Docker Compose runs the API, SQLite volume, Caddy TLS proxy, and pinned EasyTier shared node. The VPS does not serve a website or Windows downloads. Installers, when built successfully, are served through [GitHub Releases](https://github.com/kavianpcx/LANORA/releases). No GitHub Pages workflow is used.

```sh
docker compose config
docker compose up -d --build
docker compose ps
curl -f https://YOUR_DOMAIN/api/v1/health
```

An actual two-PC end-to-end gaming test and secure release review are still required.
