# Architecture

LANORA separates the control plane from the planned peer data plane.

## Current components

- `apps/web`: React/TypeScript Vite client; account and room actions call the configured API. Hash routing supports project pages.
- `apps/desktop`: Tauri 2 + React shell. Rust process supervision is scaffolding and does not establish a tunnel.
- `services/api`: Go HTTP API and in-process WebSocket room events.
- SQLite: accounts, sessions, rooms, members, invite hashes, password hashes and room secrets.
- `deploy/docker`: API image and Caddy reverse proxy.
- `docker-compose.yml`: API, Caddy serving the built web frontend, persistent SQLite, and a pinned EasyTier node for infrastructure groundwork.

The API handles authentication and room control, not game packets. EasyTier peer connectivity and virtual interface support are not integrated. Tunnel UI fields remain Development/unknown.

## Trust boundaries

Browser account tokens and room-scoped tokens are stored in `sessionStorage`; the API stores hashes for these tokens. Room secrets are stored in SQLite for future network provisioning. Admin summary uses a separate bearer token. Caddy terminates TLS.

Account identity is not currently bound to room membership. Room tokens authorize room actions independently of account login; unify this before multi-device account features.
