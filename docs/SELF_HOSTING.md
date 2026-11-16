# Run LANORA on a Linux VPS

LANORA's control API, SQLite database, HTTPS proxy, and EasyTier relay run in Docker Compose. Players need only the desktop app, the server address, and the private shared-network code.

## Before you start

You need a Linux VPS, a domain whose DNS A record points to it, Git, OpenSSL, Docker Engine, and the Docker Compose plugin. Open inbound TCP 80 and 443 and TCP/UDP 11010 in both the VPS firewall and the VPS provider firewall. Leave API port 8080 private; do not expose it directly.

Install Docker using its official instructions: https://docs.docker.com/engine/install/

## Install

Copy these commands into the VPS terminal:

~~~sh
git clone --branch release/0.2.x https://github.com/kavianpcx/LANORA.git
cd LANORA
bash scripts/setup-server.sh
~~~

Enter the DNS name when asked, for example games.example.com. The setup script creates a restricted .env file with separate random administrator, relay, and shared-network secrets, then builds and starts the services. It prints the configured player address and shared-network access code. Send both privately to the players.

If HTTPS is not ready when the script finishes, check DNS and ports 80/443, then wait for Caddy to obtain its certificate. From a different network, verify the public API:

~~~sh
curl --fail https://games.example.com/api/v1/health
~~~

The response should include status "ok". Do not bypass TLS checks with -k.

## Check and manage

Run these commands from the LANORA checkout:

~~~sh
bash scripts/server.sh status
bash scripts/server.sh code
bash scripts/server.sh logs
bash scripts/server.sh restart
bash scripts/server.sh stop
bash scripts/server.sh start
bash scripts/server.sh update
~~~

The status command shows container state, local API health, configured address, and port mappings. These are checks from inside the VPS; they do not prove that the address is reachable from a player's network. Test public HTTPS with curl from another network. Status and logs do not print the access code, administrator token, or relay secret. The explicit code command reveals only the shared access code to the local operator.

Update pulls the current branch and rebuilds services without deleting Docker volumes. Do not run docker compose down --volumes if you want to keep the database and certificates.

## Change or recover the access code

The code is stored in .env with mode 0600. If you need to show the existing code, run:

~~~sh
bash scripts/server.sh code
~~~

To rotate it, edit LANORA_SHARED_NETWORK_CODE in .env to a new random value of 16–128 characters and restart:

~~~sh
docker compose up -d --build
~~~

The API rotates the EasyTier network name and secret and revokes existing shared-network tokens when it starts with the new code. Standard LANORA clients disconnect on their next rejected heartbeat and must reconnect. Keep the old code private; this does not forcibly stop a modified client that deliberately keeps an old EasyTier process running. Keep a backup of .env in a protected place; it contains the server's private configuration.

## Ports and data

- TCP 80: Caddy certificate challenge and redirect.
- TCP 443: HTTPS API.
- TCP and UDP 11010: EasyTier relay.
- SQLite: persistent lanora_data Docker volume.
- Caddy certificates: persistent caddy_data and caddy_config volumes.

LANORA does not provide a public website or hosted service. Each server owner operates their own instance.
