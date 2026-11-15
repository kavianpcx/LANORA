# Architecture

`apps/desktop` is a Tauri 2 Windows app with React UI and Rust native process control. `services/api` is Go REST/WebSocket with SQLite. `docker-compose.yml` runs the API, TLS proxy Caddy, and an EasyTier v2.6.4 shared node. Caddy serves only API responses; there is no website. SQLite persists in `lanora_data`.

The control path is client → HTTPS Caddy → API → SQLite. The game data path is Windows EasyTier peers via their virtual addresses, with the configured shared node available as relay. The backend does not proxy every game packet. Room membership is token-scoped, with no account login. A fresh display name belongs to the current room token, not a verified identity. Pending members cannot access network configuration. The frontend cannot launch arbitrary server commands.

The desktop currently reads a virtual IP from EasyTier CLI but does not identify or measure peer paths. WebSocket room events are in-memory and membership count does not prove online presence. See [Networking](NETWORKING.md) and [Security](SECURITY.md).
