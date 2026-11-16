<p align="center"><img src="assets/lanora-wordmark.svg" alt="LANORA" width="230"></p>
<p align="center"><a href="README.md">English</a> · <a href="README.fa.md">فارسی</a></p>

# LANORA

Play a LAN game with friends who are somewhere else. One friend runs the server on a Linux VPS. Everyone installs the desktop app, enters that server's HTTPS address, picks a name, and creates or joins a room. **No account, login, website, or subscription.**

**Experimental alpha:** `0.2.0-alpha.1` is a review candidate, not a published release. API access, room membership, the EasyTier process, its reported virtual IP, and actual peer reachability are separate states. LANORA never treats a room member or an IP alone as proof of a working game connection. Two independent internet connections and Windows game traffic remain **not verified**. See the [audit and test results](docs/AUDIT_0.2.0.md).

[![CI](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml) [![Desktop builds](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml/badge.svg?branch=main)](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml) [![MIT](https://img.shields.io/badge/license-MIT-4355DB)](LICENSE)

## First launch

![LANORA first-run profile screen from the installed Linux package in CI. No server or room is connected.](docs/screenshots/linux-first-launch.png)


## 1. Server owner: run these commands on your VPS

First install [Docker Engine with Compose](https://docs.docker.com/engine/install/). You also need Git and OpenSSL. Point a domain's DNS record at the VPS. Allow inbound **TCP 80/443 and TCP/UDP 11010** in your VPS firewall.

```sh
git clone --branch audit/0.2.0-alpha.1 https://github.com/kavianpcx/LANORA.git
cd LANORA
bash scripts/setup-server.sh
```

Enter your domain when asked, for example `games.example.com`. The script creates private secrets and starts the containers. It does not overwrite an existing `.env`.

```sh
bash scripts/server.sh status
curl --fail https://games.example.com/api/v1/health
```

Replace `games.example.com` with **your** domain. Once the HTTPS check succeeds, share `https://games.example.com` with the players. A local healthy container does not prove that the VPS is reachable from the internet.

Everyday commands, from the `LANORA` folder:

```sh
bash scripts/server.sh logs       # recent API logs, without relay credentials
bash scripts/server.sh restart    # restart services
bash scripts/server.sh stop       # keep database and certificates
bash scripts/server.sh update     # fast-forward source and rebuild; keep volumes
```

The VPS manages rooms and relays traffic. App downloads come from GitHub, not your VPS. [Full server guide and backups](docs/SELF_HOSTING.md).

## 2. Players: install the desktop app

The `0.2.0-alpha.1` candidate is available as review artifacts in [this desktop build](https://github.com/kavianpcx/LANORA/actions/runs/43897576940), linked from [PR #13](https://github.com/kavianpcx/LANORA/pull/13). Open **Artifacts** (GitHub sign-in required), download the package for your system and extract the ZIP:

- **Windows x64:** `lanora-windows-x64-prerelease`. Run the extracted `.exe` installer.
- **Ubuntu 24.04 x64:** `lanora-linux-x64-prerelease`. In the folder containing the extracted package, run:

```sh
sudo apt install ./LANORA_0.2.0-alpha.1_amd64.deb
```

These are temporary CI artifacts, **not a published release**. Check the [audit](docs/AUDIT_0.2.0.md) for exactly what was tested. The [previous v0.1.0-alpha.5 release](https://github.com/kavianpcx/LANORA/releases/tag/v0.1.0-alpha.5) predates these fixes and is not the recommended candidate.

Linux package installation grants network capabilities to the bundled EasyTier executable. Read the [privilege limitations](docs/SECURITY.md). Windows adapter creation and elevation still need clean-machine validation; do not disable your firewall to work around an error.

## 3. Connect and play

1. Open LANORA. Pick a local nickname and an avatar. You can change the name, avatar, language and light/dark theme in **Settings**.
2. Enter the **same HTTPS address** provided by the VPS owner, optionally including its port. Click **Connect to server**. A bare domain is interpreted as HTTPS. A raw IP requires a trusted certificate valid for that IP.
3. Player **A** creates a room. **B** and **C** select that public room or use its invitation code. If approval is enabled, A approves them.
4. Wait for EasyTier to report a virtual IP. A hosts the game using its LAN option and shares **A's virtual IP**. B and C enter that address in the game's **Direct IP** option. **Do not enter the VPS IP in the game.**
5. Verify the game connection. Peer reachability is currently displayed as **unknown**. LAN discovery varies by game; games needing broadcast/multicast may require another compatibility approach.

The HTTPS API is the **control plane**: rooms, permissions and configuration. EasyTier v2.6.4 is the **data plane**: a separate encrypted virtual network per room, using direct peers where possible or the self-hosted relay. LANORA does not configure an internet exit node or replace the default route. Default public STUN discovery is disabled in the candidate client; restrictive NATs may depend on the VPS relay.

## Development and documentation

| Folder | Purpose |
|---|---|
| `apps/desktop` | Tauri/Rust engine lifecycle; React/TypeScript desktop UI and bundled fonts |
| `services/api` | Go/SQLite room API; no account system |
| `deploy/docker`, `docker-compose.yml` | API image, Caddy HTTPS and EasyTier relay |
| `scripts` | Guided VPS setup and day-to-day management |
| `tests` | Deployment, command-contract and real local network tests |

```sh
cd apps/desktop
npm ci
npm test
npm run build
cd ../../services/api
go test -race ./...
```

Native builds need additional tools and pinned EasyTier resources. See [Building](docs/BUILDING.md), [Architecture](docs/ARCHITECTURE.md), [Networking](docs/NETWORKING.md), [API](docs/API.md), [Configuration](docs/CONFIGURATION.md), [Troubleshooting](docs/TROUBLESHOOTING.md), [Roadmap](docs/ROADMAP.md), [FAQ](docs/FAQ.md), and [Contributing](CONTRIBUTING.md).

Known alpha gaps include Windows privilege handling, real internet P2P/game validation, live peer-to-member mapping, crash recovery and data-plane revocation of previously disclosed room secrets. Do not use this alpha as a security boundary against untrusted players. See [Security](docs/SECURITY.md).

LANORA's own code is [MIT licensed](LICENSE). EasyTier and other third-party code retain their own licenses. Read [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) before redistributing installers.
