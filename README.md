<p align="center"><img src="assets/lanora-wordmark.svg" alt="LANORA" width="230"></p>
<p align="center"><a href="README.md">English</a> · <a href="README.fa.md">فارسی</a></p>

# LANORA

LANORA is an experimental, self-hosted virtual LAN app for playing LAN games with friends over the internet. One friend runs the server on a Linux VPS; everyone installs the Windows app, enters that server's address, and creates or joins a room. There is no account or login.

**Status:** The API and room flow are implemented. The Windows client launches EasyTier and asks it for a virtual IP. A successful two-PC tunnel, peer communication, game traffic, firewall behavior, and relay fallback have **not been verified**. Do not present this alpha as a proven gaming VPN.

[![API tests](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml) [![Windows installer](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml/badge.svg?branch=main)](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml) [![MIT license](https://img.shields.io/badge/license-MIT-3557C7)](LICENSE)

## Server owner: install on a Linux VPS

You need a VPS with Docker and Docker Compose, a domain pointing to that VPS, and ports **80/tcp, 443/tcp, 11010/tcp and 11010/udp** open. Run these commands over SSH:

```sh
git clone https://github.com/kavianpcx/LANORA.git
cd LANORA
cp .env.example .env
openssl rand -hex 32
openssl rand -hex 32
nano .env
docker compose up -d --build
docker compose ps
curl -f https://YOUR_DOMAIN/api/v1/health
```

In `.env`, replace `LANORA_PUBLIC_HOST` with your domain, `LANORA_RELAY_PEER_URL` with `tcp://YOUR_DOMAIN:11010`, and paste the two **different** random values into `LANORA_ADMIN_TOKEN` and `LANORA_RELAY_SECRET`. Save the file, then run Compose. Share `https://YOUR_DOMAIN` with players. The server does **not** host a website or distribute Windows downloads. See [full VPS instructions](docs/SELF_HOSTING.md).

## Players: install on Windows

1. Download the **Windows installer** from [GitHub Releases](https://github.com/kavianpcx/LANORA/releases), if a successful prerelease build is available. Downloads come from GitHub, not your VPS.
2. Install and run LANORA. The virtual adapter may require administrator rights.
3. In **Settings**, choose your display name, language (English or Persian), and light/dark theme. No email or password is required.
4. Enter the **same server address** your friend shared, for example `https://games.example.com:443`, and select **Connect to server**.
5. Create a room and share its invite code, or select a public room and join. Private rooms require an invite code. A room may also require a password or host approval.
6. When EasyTier reports a virtual IP in the app, share it with friends. The game host starts a LAN game. Friends try **Direct IP / Join by address** in the game using the **host player's virtual IP**, not the VPS IP. An IP shown in the app does not by itself prove that peers are reachable.

The server manages rooms, membership, and relay discovery. EasyTier carries the game traffic on a separate virtual network. The VPS address is for connecting LANORA clients to their control server; it is **not** the game host address. LAN discovery may fail for games that need broadcast or multicast. Try Direct IP first.

## What's in this repository

| Path | Role |
|---|---|
| `apps/desktop` | Tauri 2, React, TypeScript Windows app and native EasyTier process control |
| `services/api` | Go and SQLite room API |
| `deploy/docker` | API and Caddy Docker images |
| `docker-compose.yml` | API, private SQLite storage, TLS proxy, EasyTier shared node |
| `docs` | [Setup](docs/GETTING_STARTED.md), [network](docs/NETWORKING.md), [API](docs/API.md), [build](docs/BUILDING.md), [security](docs/SECURITY.md) |

Run API tests with `cd services/api && go test ./...`; build the desktop frontend with `cd apps/desktop && npm ci && npm run build`. The Windows installer is built by [GitHub Actions](.github/workflows/windows.yml) only after CI succeeds. See [building](docs/BUILDING.md). Known limitations and next tests are in [ROADMAP](docs/ROADMAP.md). Contributions: [CONTRIBUTING.md](CONTRIBUTING.md).

LANORA's own code is [MIT licensed](LICENSE). Bundled EasyTier is separately LGPL-3.0; read [third-party licenses](THIRD_PARTY_LICENSES.md) before redistribution.
