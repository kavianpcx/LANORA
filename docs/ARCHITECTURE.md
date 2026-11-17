# Architecture

LANORA has two independent planes:

- Control plane: Go API, SQLite, Caddy TLS proxy. It publishes the player authentication policy, enforces it on join, issues device bearer tokens, and returns player presence.
- Data plane: the desktop's bundled EasyTier v2.6.4 process and the server's EasyTier relay. Game packets do not pass through the API.

The desktop uses React and TypeScript in a Tauri 2 window. Rust validates network configuration, supervises EasyTier, reads the actual adapter IP, and queries EasyTier's local CLI for peer routes. The client does not accept commands from the API; the API returns structured network settings.

A server has one shared EasyTier network by default. An optional player password is stored as a PBKDF2-SHA256 hash; passwordless mode intentionally permits reachable clients to join. The separate network secret is persisted in SQLite, and each device gets a random bearer token whose hash is stored with its presence record. Administrator authentication and relay credentials remain separate. Legacy room APIs remain available as an advanced path.

The shared network uses EasyTier DHCP. LANORA disables exit nodes. It does not install a system-wide proxy or direct the default internet route through the tunnel.
