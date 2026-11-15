# Self-hosting on Linux

LANORA needs Docker Engine and the Compose plugin, a VPS with public IPv4, and a domain pointing to it. Open inbound TCP 80/443 and TCP/UDP 11010. The desktop clients are downloaded from GitHub Releases; the VPS serves only API and EasyTier traffic.

For the guided setup use:

```sh
git clone https://github.com/kavianpcx/LANORA.git
cd LANORA
bash scripts/setup-server.sh
```

The script requires Docker/Compose and `openssl`, asks for the domain, writes a private `.env`, checks Compose, and starts services. It refuses to overwrite an existing `.env`. For manual setup instead:

```sh
cp .env.example .env
openssl rand -hex 32
openssl rand -hex 32
nano .env
```

Set `LANORA_PUBLIC_HOST` to the domain; set `LANORA_RELAY_PEER_URL=tcp://YOUR_DOMAIN:11010`; give `LANORA_ADMIN_TOKEN` and `LANORA_RELAY_SECRET` different random values from the two `openssl` commands. Keep `.env` private. Caddy obtains a TLS certificate when DNS and ports work.

```sh
docker compose config
docker compose up -d --build
docker compose ps
curl -f https://YOUR_DOMAIN/api/v1/health
```

Share `https://YOUR_DOMAIN` with players. It is the control server address. The game host's virtual IP is a different address, assigned by EasyTier in the desktop app. `lanora_data` stores SQLite. Back it up with a SQLite-consistent method accounting for WAL. `docker compose logs --tail=100 api caddy easytier` shows service errors. `docker compose down` stops services; do not use `-v` unless you intend to delete the database and TLS state. Peer connectivity has not been validated on two Windows PCs.
