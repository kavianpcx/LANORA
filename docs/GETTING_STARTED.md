# Getting started

## Server operator

Install Docker Engine with Compose, Git, and OpenSSL on a Linux VPS. Point a domain at the VPS and allow inbound TCP 80/443 and TCP/UDP 11010. Then run:

~~~sh
git clone --branch release/0.2.x https://github.com/kavianpcx/LANORA.git
cd LANORA
bash scripts/setup-server.sh
bash scripts/server.sh status
~~~

On a fresh installation, setup asks whether players must enter a password. **Yes** is selected by default and recommended for public servers; **No** permits anyone who can reach the server to join. Share the configured HTTPS address with players and share a password privately only when protection is enabled. Verify external reachability using curl from a different network. Full instructions are in [Self-hosting](SELF_HOSTING.md).

## Player

Install [LANORA 0.2.0-alpha.8](https://github.com/kavianpcx/LANORA/releases/tag/v0.2.0-alpha.8) and verify the installer checksum shown beside the download. Enter the server's HTTPS address and your display name. Connect; LANORA asks for a password only when the server requires it. Wait for the EasyTier virtual IP, then give the game host's IP to the other players. Use Direct IP if the game does not discover LAN games automatically.

In the upcoming `0.3.0-alpha.1` candidate, everyday Settings contains avatar, language, and appearance. Edit the display name from the titlebar profile menu. The version menu has **Check for Updates**. The first updater-enabled release requires a manual install over Alpha 8; automatic signed update behavior will be verified separately before users are directed to rely on it.

For local development, use `http://localhost:8080` or `http://127.0.0.1:8080` when the backend runs on the same computer. The Vite/Tauri UI port is 1420 and is not the API port. Do not use `localhost` to reach a backend on a remote VPS; use that server's HTTPS domain.

The app online label reflects API heartbeat; EasyTier peer status is shown separately.
