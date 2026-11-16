# Architecture

LANORA has two independent planes:

- Control plane: Go API, SQLite, Caddy TLS proxy. It authenticates the shared access code, issues device bearer tokens, and returns player presence.
- Data plane: the desktop's bundled EasyTier v2.6.4 process and the server's EasyTier relay. Game packets do not pass through the API.

The desktop uses React and TypeScript in a Tauri 2 window. Rust validates network configuration, supervises EasyTier, reads the actual adapter IP, and queries EasyTier's local CLI for peer routes. The client does not accept commands from the API; the API returns structured network settings.

A server has one persistent shared EasyTier network by default. The access code is stored as a hash; the separate network secret is persisted in SQLite. Each device gets a random bearer token whose hash is stored with the device's presence record. Legacy room APIs remain available as an advanced path.

The shared network uses EasyTier DHCP. LANORA disables exit nodes. It does not install a system-wide proxy or direct the default internet route through the tunnel.
