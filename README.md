<p align="center"><img src="assets/lanora-wordmark.svg" alt="LANORA" width="230"></p>
<p align="center"><a href="README.md">English</a> · <a href="README.fa.md">فارسی</a></p>

# LANORA

LANORA is an experimental, self-hosted virtual LAN app for playing LAN games with friends over the internet. One friend runs the server on a Linux VPS; everyone installs the Windows or supported Linux client, enters that server's address, and creates or joins a room. There is no account or login.

**Status:** The API and room flow are implemented. The desktop client launches EasyTier and asks it for a virtual IP. A successful two-PC tunnel, peer communication, game traffic, firewall behavior, and relay fallback have **not been verified**. Do not present this alpha as a proven gaming VPN.

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

## Players: download the desktop app

**Windows 10/11 x64:** [Download the experimental `.exe` installer](https://github.com/kavianpcx/LANORA/releases/download/v0.1.0-alpha.2/LANORA_0.1.0_x64-setup.exe) from GitHub. Install it, then open LANORA. A newer release may appear in [Releases](https://github.com/kavianpcx/LANORA/releases).

**Linux x64 (Debian/Ubuntu):** A `.deb` client build is being added. Do not use the Windows installer on Linux. The download command and direct link will appear here only after its GitHub Actions build succeeds. The Linux package must set limited network capabilities on its bundled EasyTier core during installation; this needs administrator permission.

**Connect and play:**

1. In **Settings**, set your display name, English/Persian language, and light/dark theme. There is no account or login.
2. Enter the **same HTTPS server address** the VPS owner shared, for example `https://games.example.com:443`. A raw IP works only when its HTTPS certificate is trusted for that IP.
3. Player A creates a room and shares the invite code. Players B and C choose the room in the public list or enter the code for a private room. If enabled, the host approves them.
4. When each app reports a virtual IP, A hosts the LAN game. B and C enter **A's virtual IP** in the game's Direct IP/Join by address screen. The VPS IP is for connecting LANORA, not for joining the game.
5. Test the connection. A visible adapter IP alone does not prove that peers can reach each other; LAN discovery and two-PC traffic are not yet verified.

The server manages rooms, membership, and relay discovery. EasyTier carries the game traffic on a separate virtual network. The VPS address is for connecting LANORA clients to their control server; it is **not** the game host address. LAN discovery may fail for games that need broadcast or multicast. Try Direct IP first.

## What's in this repository

| Path | Role |
|---|---|
| `apps/desktop` | Tauri 2, React, TypeScript Windows app and native EasyTier process control |
| `services/api` | Go and SQLite room API |
| `deploy/docker` | API and Caddy Docker images |
| `docker-compose.yml` | API, private SQLite storage, TLS proxy, EasyTier shared node |
| `docs` | [Setup](docs/GETTING_STARTED.md), [network](docs/NETWORKING.md), [API](docs/API.md), [build](docs/BUILDING.md), [security](docs/SECURITY.md) |

Run API tests with `cd services/api && go test ./...`; build the desktop frontend with `cd apps/desktop && npm ci && npm run build`. The desktop installers are built by [GitHub Actions](.github/workflows/windows.yml) only after the Windows build succeeds. See [building](docs/BUILDING.md). Verified: the [Windows build #3](https://github.com/kavianpcx/LANORA/actions/runs/43761263098) produced an EXE and [API CI #38](https://github.com/kavianpcx/LANORA/actions/runs/43761263111) passed. Neither test proves a working game tunnel. Known limitations and next tests are in [ROADMAP](docs/ROADMAP.md). Contributions: [CONTRIBUTING.md](CONTRIBUTING.md).

LANORA's own code is [MIT licensed](LICENSE). Bundled EasyTier is separately LGPL-3.0; read [third-party licenses](THIRD_PARTY_LICENSES.md) before redistribution.
