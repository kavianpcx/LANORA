# Set up a LANORA server

This guide follows what the server owner does and sees. LANORA's API, database, HTTPS endpoint, and EasyTier relay run on the owner's Linux VPS. Players need the desktop app and the server address. The app asks for a player password only if the owner turns password protection on.

## 1. Prepare the VPS

You need a Linux VPS, a domain whose DNS A record points to it, Git, OpenSSL, Docker Engine, and the Docker Compose plugin. Install Docker using its official instructions: https://docs.docker.com/engine/install/

Open these inbound ports in both the VPS firewall and the VPS provider firewall:

- TCP 80 and TCP 443 for HTTPS setup and the API.
- TCP and UDP 11010 for the EasyTier relay.

Keep API port 8080 private. Do not expose it directly to the internet.

## 2. Download and start LANORA

Run these commands on the VPS:

~~~sh
git clone --branch release/0.2.x https://github.com/kavianpcx/LANORA.git
cd LANORA
bash scripts/setup-server.sh
~~~

The installer asks for the domain pointed at the VPS. Enter it without `https://`, for example `games.example.com`.

On a fresh installation, it then asks:

~~~text
Require a password for players? [Y/n]:
~~~

Press Enter or type `yes` to require a password. This is the default and is recommended for public servers. The installer starts the services, then asks for the password twice:

~~~text
Enter player password:
Confirm player password:
~~~

Input stays hidden while you type. Passwords need at least 12 characters and either 16 characters or three character types (lowercase, uppercase, digits, symbols), with a maximum of 128 bytes. LANORA stores a PBKDF2-SHA256 password hash; it does not print or save the plain password in `.env`.

Type `no` to allow passwordless player joins. The installer warns that anyone who can reach the server may join its shared gaming network. This choice affects player access only; administrator authentication and EasyTier relay credentials remain protected.

At the end, the installer shows the service status and a player address such as:

~~~text
Players connect to: https://games.example.com
Player password protection is enabled. Share your chosen password privately.
~~~

For passwordless setup, it instead says that anyone who can reach the server may join. Share the HTTPS address with players. Share the password privately only when protection is enabled.

## 3. Check the server from the VPS

Run:

~~~sh
bash scripts/server.sh status
bash scripts/server.sh doctor
bash scripts/server.sh player-auth status
~~~

The status output reports container health, local API health, the player password policy, address, and port mappings. It never prints passwords, hashes, administrator tokens, or relay credentials. These local checks do not prove public internet reachability.

`doctor` adds an authenticated database/player summary and recent API error types with only the sanitized error category shown. It reports the relay container state and actual Docker port mappings, and explicitly marks public HTTPS and relay reachability as not checked. Use a second internet connection to verify the public address and relay ports.

When Caddy has obtained its HTTPS certificate, test from a different network:

~~~sh
curl --fail https://games.example.com/api/v1/health
~~~

The response should include `"status":"ok"`. Do not bypass TLS verification with `-k`.

## 4. Change player access later

Run these commands from the LANORA checkout on the VPS:

~~~sh
bash scripts/server.sh player-auth status
bash scripts/server.sh player-auth enable
bash scripts/server.sh player-auth change
bash scripts/server.sh player-auth disable
~~~

`enable` turns protection on and asks for a new password twice. `change` replaces the current password. `disable` turns off the player password and prints the open-access warning. A password cannot be recovered or displayed; set a new one if it is lost. You do not need to reinstall LANORA.

Every policy change deletes current API memberships and rotates the shared EasyTier network identity. Standard LANORA clients stop after the next rejected heartbeat and must connect again. A modified client can keep using an EasyTier secret already delivered to its running process, so ask all players to fully disconnect and rejoin. Administrator authentication and relay credentials are unchanged.

## Updating an existing installation

If `.env` already exists, setup keeps its settings and does not ask the fresh-install questions. The database and Docker volumes are preserved. Existing alpha servers with `LANORA_SHARED_NETWORK_CODE` remain password-protected: the API migrates the code into the password hash and the setup/update command removes the old environment value after successful migration. Do not delete `.env` or the Docker volumes during an update.

To update from the current branch:

~~~sh
bash scripts/server.sh update
~~~

The command pulls changes and rebuilds the services without deleting persistent data. Keep a protected backup of `.env`; it contains the server's private configuration. Do not run `docker compose down --volumes` if you need to keep the database and certificates.

## Services and persistent data

- TCP 80: Caddy certificate setup and redirect.
- TCP 443: HTTPS API.
- TCP and UDP 11010: EasyTier relay.
- `lanora_data`: SQLite database and player policy.
- `caddy_data` and `caddy_config`: TLS certificates and Caddy settings.

LANORA does not provide a hosted service or public website. Each server owner operates their own instance.
