<p align="center"><img src="assets/lanora-wordmark.svg" alt="LANORA" width="240"></p>
<p align="center"><a href="README.md">English</a> · <a href="README.fa.md">فارسی</a></p>

# LANORA

LANORA is a self-hosted game room and virtual LAN project. One person runs the server on a Linux VPS. Each player installs the Windows app, enters that server's HTTPS address, signs in, and creates or joins a room with an invite code.

**Current status: experimental alpha.** Accounts and rooms work against the Go API. The Windows app now requests room network credentials and starts a bundled EasyTier process. Real peer connectivity, Windows adapter permissions, firewall behavior, TCP/UDP game traffic, and two-computer LAN play have **not been verified**. A reachable server API or an adapter IP does not prove that gaming peers can communicate. Do not recommend this as a working gaming VPN yet.

[![CI](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml) [![Windows build](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml/badge.svg?branch=main)](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-4355DB)](LICENSE) [GitHub Releases](https://github.com/kavianpcx/LANORA/releases)

## 1. Start the server

You need a Linux VPS, Docker Compose, a domain pointed at the VPS, and TCP ports 80/443 plus TCP/UDP 11010 open. SSH is only for the server owner.

```sh
git clone https://github.com/kavianpcx/LANORA.git
cd LANORA
cp .env.example .env
openssl rand -hex 32
nano .env
docker compose up -d --build
```

In `.env`, set `LANORA_PUBLIC_HOST` to your domain, `LANORA_RELAY_PEER_URL` to `tcp://YOUR_DOMAIN:11010`, and replace `LANORA_ADMIN_TOKEN` and `LANORA_RELAY_SECRET` with separate random values. The `openssl` command prints one value; run it twice. Caddy provisions HTTPS when DNS and ports are ready. Full steps: [Self-hosting](docs/SELF_HOSTING.md).

## 2. Get the Windows app

Check [GitHub Releases](https://github.com/kavianpcx/LANORA/releases). An installer is offered only after the Windows GitHub Actions build succeeds and is labeled as a prerelease. You may need administrator rights for the virtual adapter. The installer downloads from GitHub, so the VPS does not serve application downloads.

The [website](https://kavianpcx.github.io/LANORA/) is for reading about LANORA and managing accounts/rooms. A browser cannot create the Windows virtual adapter. A game needs the desktop app and a verified tunnel.

## 3. Play with friends (target workflow)

1. Everyone opens the Windows app and enters the **same** server address, such as `https://games.example.org:443`.
2. Each player signs up or signs in on that server.
3. The host creates a room and shares its invite code.
4. Friends join with the code. The host approves them if approval is enabled.
5. Confirm an actual virtual IP and peer reachability, then try the game's Direct IP option. LAN discovery depends on the game and has not been validated.

The API manages accounts and room membership. EasyTier handles the separate game data path, attempting peer connections through the self-hosted shared node. It must not change the system default route. LANORA currently reports an adapter IP from EasyTier, but peer status is not yet measured or validated end to end.

## Repository

| Directory | Purpose |
|---|---|
| `services/api` | Go API and SQLite room control |
| `apps/desktop` | Tauri Windows client and EasyTier process supervision |
| `apps/web` | React website and browser room management |
| `deploy/docker` | API and Caddy images |
| `docs` | Setup, network, security, and build notes |

The original LANORA code is [MIT licensed](LICENSE). EasyTier is separately licensed under LGPL-3.0; see [third-party notices](THIRD_PARTY_LICENSES.md). Build instructions: [Windows](docs/BUILDING.md), [API](docs/API.md), [architecture](docs/ARCHITECTURE.md), [troubleshooting](docs/TROUBLESHOOTING.md). Contributions are welcome through [CONTRIBUTING.md](CONTRIBUTING.md). Planned work and known gaps: [ROADMAP.md](docs/ROADMAP.md).
