# Configuration

## API variables

| Variable | Default | Purpose |
|---|---|---|
| `LANORA_LISTEN_ADDR` | `:8080` | HTTP listen address |
| `LANORA_DB_PATH` | `data/lanora.db` | SQLite path |
| `LANORA_ADMIN_TOKEN` | empty | Separate bearer token for limited admin summary |
| `LANORA_ALLOWED_ORIGINS` | local/Tauri plus current Pages origin | Exact comma-separated CORS/WebSocket origins |

## Docker Compose

Copy `.env.example` to `.env`, then set `LANORA_PUBLIC_HOST`, `LANORA_ADMIN_TOKEN`, `LANORA_RELAY_SECRET`, and exact `LANORA_ALLOWED_ORIGINS` values. Generate secrets with `openssl rand -hex 32`. The relay secret currently configures an isolated EasyTier node; it does not create per-room client networks. Never commit `.env`.

## Web

Set API Base URL in Settings; it is stored in browser local storage. Use the HTTPS API origin without `/api/v1`, e.g. `https://lan.example.org`. `VITE_BASE_PATH` controls Vite's output path; Pages uses `/lanora/`.
