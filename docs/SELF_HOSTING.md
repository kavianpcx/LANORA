# Run LANORA on your VPS

The server runs three Docker containers: Go API, Caddy HTTPS proxy, and EasyTier shared relay. SQLite and TLS certificates live in named volumes. No website or account service is required.

## First installation

You need a Linux VPS, Git, OpenSSL, Docker Engine with the Compose plugin, and permission to use Docker. Install Docker using [its distribution-specific instructions](https://docs.docker.com/engine/install/); the LANORA script does not run an opaque root installer for you.

Create a DNS A record such as `games.example.com` pointing at your VPS. If you publish an AAAA record, IPv6 must work too. Allow inbound TCP 80/443 and TCP/UDP 11010 in the VPS provider's firewall and operating-system firewall. Do not disable either firewall wholesale. The API's internal port 8080 must not be exposed publicly.

```sh
git clone --branch audit/0.2.0-alpha.1 https://github.com/kavianpcx/LANORA.git
cd LANORA
bash scripts/setup-server.sh
bash scripts/server.sh status
```

Enter your domain when asked. Setup writes `.env` with private permissions and two independently random secrets, validates Compose quietly and starts the containers. It refuses to replace an existing `.env`. For an existing installation use `server.sh start` instead. If Docker access is denied, fix the Docker installation/permissions; Docker group membership is effectively root access.

From another machine, replace the domain below with yours:

```sh
curl --fail https://games.example.com/api/v1/health
```

Expect JSON with `service: lanora-api` and `status: ok`. Do not add `-k`: a certificate failure must be fixed, not bypassed. Share `https://games.example.com` with players only after this succeeds. A raw VPS IP is not interchangeable with a domain certificate.

## Day-to-day commands

Run these from the checkout:

```sh
bash scripts/server.sh status
bash scripts/server.sh logs
bash scripts/server.sh restart
bash scripts/server.sh stop
bash scripts/server.sh start
bash scripts/server.sh update
```

`status` displays container state, API health, local port mappings/listening sockets and the public connection address. It returns nonzero for detected missing/stopped services or failed API checks. Local checks cannot prove internet reachability, a trusted certificate, or a working player-to-player relay path. Docker can publish ports through NAT without a corresponding `ss` listening socket.

`logs` shows the last 100 API lines. Raw EasyTier logs can include network information, so they are not printed automatically. Never post `.env`, membership tokens, network configuration files, `docker inspect` output or unredacted relay logs in an issue.

`update` uses `git pull --ff-only` and rebuilds containers on the current branch. It stops on a Git conflict and never resets local source changes. Stop game sessions and back up first. No command above deletes volumes, databases or certificates. Do not run `docker compose down -v` unless you explicitly intend to erase them.

## Backup

Stop the API before copying SQLite files so the database and its WAL remain consistent. Keep backups private because they contain room network secrets. Find the actual volume name with `docker volume ls` (Compose prefixes it with the project name). Back up the complete `lanora_data` volume using your Docker/host backup tooling while services are stopped, then run `server.sh start`. Keep the checkout's `.env` in a separate private backup. Test restoration on an isolated server.

## Common failures

- Missing Docker/Compose/OpenSSL: install the missing prerequisite, then rerun setup.
- Existing `.env`: preserve it; run `server.sh start`. Setup intentionally will not overwrite keys.
- API database permission denied: the image creates `/data` owned by UID 65532. Existing root-owned volumes may need an operator-managed ownership repair after a backup; no automatic recursive permission rewrite is performed.
- HTTPS fails: check DNS, public ports 80/443, provider firewall, and certificate issuance. Container health alone is insufficient.
- API succeeds but game fails: check TCP/UDP 11010, client adapter permissions and the game host's virtual IP. See [Troubleshooting](TROUBLESHOOTING.md).
