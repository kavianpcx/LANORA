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

## Intended self-hosted workflow

1. The server owner installs the LANORA API and the separately deployed networking infrastructure on a Linux VPS. SSH is only an administrator's setup tool; players do not SSH to the server.
2. Each player enters the server's HTTPS API address, including a non-default port when used, in the desktop client. The client checks `/api/v1/health`, then uses the API for account and room control.
3. The host creates a room and shares its invite code. Friends join through the same server and room membership is managed by the API.
4. A native networking engine must then establish the isolated virtual network. Game TCP/UDP packets should use that data plane, with direct peer paths when possible and a self-hosted relay fallback where required.

The control API being reachable only confirms the control plane. It does not mean that a player is online in the virtual LAN. In this repository snapshot, the EasyTier client integration, virtual adapter lifecycle, and measured peer status are still Development; the web and desktop UI must not report a LAN tunnel as connected until the native engine confirms it.

Players should use a domain with valid TLS in production. An IP address and custom port are accepted by the client when the server certificate is valid for that address. Do not expose the API over plain HTTP on a public network.

## Trust boundaries

Browser account tokens and room-scoped tokens are stored in `sessionStorage`; the API stores hashes for these tokens. Room secrets are stored in SQLite for future network provisioning. Admin summary uses a separate bearer token. Caddy terminates TLS.

Account identity is not currently bound to room membership. Room tokens authorize room actions independently of account login; unify this before multi-device account features.
