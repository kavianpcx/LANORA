# Set up a LANORA server

This walkthrough shows what a server owner needs, what the installer asks, and what appears when setup finishes. The current server source is on the release/0.2.x branch and matches LANORA 0.2.0-alpha.8.

## 1. Prepare your VPS

You need:

- A Linux VPS with a public IP.
- A domain whose DNS A record points to that IP.
- Docker Engine with the Docker Compose plugin, Git, and OpenSSL.

Open inbound **TCP 80 and 443**, and **TCP and UDP 11010**, in both the VPS firewall and your hosting provider's firewall. Keep API port 8080 private. Do not expose it directly to the internet.

## 2. Run the installer

Open a terminal on the VPS and run:

~~~sh
git clone --branch release/0.2.x https://github.com/kavianpcx/LANORA.git
cd LANORA
bash scripts/setup-server.sh
~~~

The first prompt asks for the domain:

~~~text
Domain pointed at this VPS (example: games.example.com):
~~~

Enter only the domain, without https://.

On a fresh installation, the next prompt is:

~~~text
Require a password for players? [Y/n]:
~~~

Press Enter or type Yes to keep the default password protection. This is recommended for public VPS servers.

The installer writes private administrator and relay secrets to .env, starts the containers, and then asks for the player password:

~~~text
Enter player password:
Confirm player password:
~~~

The input is hidden. Use at least 12 characters and either 16 characters or three character types, with a maximum of 128 bytes. If the password is too weak or the confirmation differs, the script asks again. Players cannot join until the protected policy has been configured.

If you type No at the policy prompt, the installer prints a warning before starting:

~~~text
WARNING: anyone who can reach this server may join its shared gaming network.
Passwordless player access does not change administrator or EasyTier relay security.
~~~

It then configures player access without a password. Administrator authentication and EasyTier relay credentials remain protected.

## 3. Read the result and check HTTPS

At the end, the installer prints service status, the player address, and the selected policy. The final lines look like:

~~~text
Player address (verify HTTPS from another network): https://games.example.com
Player password protection is enabled. Share your chosen password privately.
Open inbound TCP 80/443 and TCP/UDP 11010. Check health with:
  curl -f https://games.example.com/api/v1/health
~~~

For passwordless setup, the policy line instead says:

~~~text
Player password protection is disabled. Anyone who can reach the server may join.
~~~

Share the HTTPS address with players. Share a player password privately only when protection is enabled. Do not send .env or EasyTier credentials to players.

The local status check is:

~~~sh
bash scripts/server.sh status
bash scripts/server.sh player-auth status
~~~

It reports container health, local API health, player policy, address, and port mappings. It does not print passwords, hashes, admin tokens, or relay credentials. Local status does not prove internet reachability. After Caddy has obtained its certificate, test from another network:

~~~sh
curl --fail https://games.example.com/api/v1/health
~~~

The response should include "status":"ok". Do not bypass certificate validation with -k.

## 4. Change player access later

From the LANORA checkout on the VPS, run:

~~~sh
bash scripts/server.sh player-auth status
bash scripts/server.sh player-auth enable
bash scripts/server.sh player-auth change
bash scripts/server.sh player-auth disable
~~~

- status shows whether the player password is required; it never shows the password.
- enable asks for and confirms a new password.
- change replaces the current password.
- disable turns password protection off and prints the open-access warning.

You do not need to reinstall. Passwords cannot be recovered or displayed; set a new one if you lose it.

Every policy change deletes current API memberships and rotates the shared EasyTier network identity. Standard clients stop after their next rejected heartbeat and need to connect again. A modified client may retain an EasyTier secret already delivered to its running process, so have all players fully disconnect and rejoin. Administrator authentication and relay credentials are unchanged.

## 5. Update an existing server

If .env already exists, the installer keeps its settings and does not ask the fresh-install questions. Existing player protection is preserved; the installer never silently switches an existing server to passwordless. The database and Docker volumes remain in place.

Older alpha servers that used LANORA_SHARED_NETWORK_CODE are migrated to a password hash. The legacy value is removed from .env after the API confirms the migration. Back up .env securely, and do not delete Docker volumes during an update.

To update from the release branch:

~~~sh
bash scripts/server.sh update
~~~

This pulls the latest release/0.2.x source and rebuilds services without deleting persistent data. Do not run docker compose down --volumes if you need to keep the database and TLS certificates.

## Services and stored data

- TCP 80: Caddy certificate setup and redirect.
- TCP 443: HTTPS API.
- TCP and UDP 11010: EasyTier relay.
- lanora_data: SQLite database and player policy.
- caddy_data and caddy_config: TLS certificates and Caddy settings.

LANORA does not provide a hosted server or website. Each server owner runs and maintains their own VPS.
