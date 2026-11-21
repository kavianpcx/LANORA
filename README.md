<p align="center"><img src="https://raw.githubusercontent.com/kavianpcx/LANORA/release/0.2.x/apps/desktop/src-tauri/icons/icon.png" alt="LANORA desktop app icon" width="128"></p>
<p align="center"><a href="README.md">English</a> · <a href="README.fa.md">فارسی</a></p>

# LANORA

**Connect to your private game network, copy the host’s virtual IP, and play.**

LANORA is an open-source, self-hosted virtual LAN app for friends playing LAN-supported games over the internet. One person runs the server on a Linux VPS. Players install the desktop app, enter the server address, and provide a password only when the server owner requires one. There is no account and no website.

> **Status: experimental alpha.** Next maintenance candidate: `v0.3.0-alpha.2` (pending review and signed CI). Downloads below remain on the published `v0.3.0-alpha.1` release until publication succeeds.  The latest published version is `v0.3.0-alpha.1`, with signed Windows and Debian packages and a Tauri updater manifest. CI passed frontend and native tests, isolated Linux networking tests, API/VPS command checks, Windows installer build/install/launch, Linux package build/install/launch, checksum checks, and updater signature verification. The `v0.2.0-alpha.8` app has no updater, so this first updater-enabled version must be installed manually. Installed-version update/restart behavior, Windows-to-Windows public-network play, Windows game traffic, direct P2P, and game-specific LAN discovery remain unverified.
>
> **Security limit:** Changing the player-password policy revokes API sessions and rotates the current network identity, but cannot force a modified client already connected to the old EasyTier overlay to disconnect. Ask all players to fully disconnect and rejoin after a policy change.

[![CI](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml/badge.svg?branch=release/0.2.x)](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml) [![Desktop builds](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml/badge.svg?branch=release/0.2.x)](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-4355DB)](LICENSE) [![Latest alpha](https://img.shields.io/github/v/release/kavianpcx/LANORA?include_prereleases&label=alpha)](https://github.com/kavianpcx/LANORA/releases)

## Desktop preview

![LANORA desktop first-launch screenshot on Linux](docs/screenshots/linux-first-launch.png)

*Real Linux screenshot captured in a desktop CI smoke test. The Windows interface and details in newer alpha builds may differ.*

## Quick setup for the server owner

You need a Linux VPS, a domain pointed at it, Docker Engine with the Compose plugin, Git, and OpenSSL. Allow inbound TCP ports **80** and **443**, and **11010 TCP/UDP**, in both the VPS and provider firewalls.

Copy these commands into the VPS terminal:

```sh
git clone --branch release/0.2.x https://github.com/kavianpcx/LANORA.git
cd LANORA
bash scripts/setup-server.sh
```

Enter your domain when asked. Fresh installations ask whether players need a password. The default is **Yes**; the password is entered twice without being shown. Password protection is recommended for public internet servers. Choosing **No** lets anyone who can reach the server join its gaming network.

Check the services and player policy later:

```sh
bash scripts/server.sh status
bash scripts/server.sh doctor
bash scripts/server.sh player-auth status
```

Manage player password protection without reinstalling:

```sh
bash scripts/server.sh player-auth enable
bash scripts/server.sh player-auth change
bash scripts/server.sh player-auth disable
```

Disabling protection opens player access to anyone who can reach the server. This does not disable administrator authentication or EasyTier relay credentials. Policy changes revoke current API sessions; `doctor` checks local services, policy, configured ports, and database availability. Its external HTTPS and relay results remain explicitly unverified. See the [full VPS guide](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/SELF_HOSTING.md) for the EasyTier session limitation. Public servers use HTTPS; plain HTTP is accepted only for loopback addresses.

## Download and connect as a player

These links point to the `v0.3.0-alpha.1` prerelease. Both installers are signed, and the release includes SHA-256 checksums and detached signatures. The app’s live updater manifest is published at the [updater manifest](https://raw.githubusercontent.com/kavianpcx/LANORA/release/0.2.x/updates/alpha/latest.json).

- **Windows 10/11 x64:** [Download the installer](https://github.com/kavianpcx/LANORA/releases/download/v0.3.0-alpha.1/LANORA_0.3.0-alpha.1_x64-setup.exe) · [SHA-256](https://github.com/kavianpcx/LANORA/releases/download/v0.3.0-alpha.1/LANORA_0.3.0-alpha.1_x64-setup.exe.sha256) · [Signature](https://github.com/kavianpcx/LANORA/releases/download/v0.3.0-alpha.1/LANORA_0.3.0-alpha.1_x64-setup.exe.sig)
- **Linux x64 (Debian/Ubuntu):** [Download the .deb package](https://github.com/kavianpcx/LANORA/releases/download/v0.3.0-alpha.1/LANORA_0.3.0-alpha.1_amd64.deb) · [SHA-256](https://github.com/kavianpcx/LANORA/releases/download/v0.3.0-alpha.1/LANORA_0.3.0-alpha.1_amd64.deb.sha256) · [Signature](https://github.com/kavianpcx/LANORA/releases/download/v0.3.0-alpha.1/LANORA_0.3.0-alpha.1_amd64.deb.sig)
- [View release notes and all assets](https://github.com/kavianpcx/LANORA/releases/tag/v0.3.0-alpha.1)

1. Install and open LANORA. Choose a display name; no signup is needed.
2. Enter the server address and press **Connect**. LANORA asks for a password only when that server requires one.
3. When LANORA reports your virtual IP, share it with the friend hosting the game.
4. Other players enter the host’s **virtual IP** in the game’s Direct IP / Join by address option. The VPS address is only for connecting LANORA.

LAN discovery is not guaranteed for every game. Games that rely on broadcast or multicast may require Direct IP.

The Settings panel keeps avatar, language, and appearance together. Edit your display name from the titlebar profile menu. The version menu shows the installed version and provides **Check for Updates**. The first updater-enabled build must be installed manually over `v0.2.0-alpha.8`. Release CI built the Windows and Debian packages, verified their checksums and Tauri updater signatures, and published the updater manifest. The complete installed-version update, restart, and invalid-signature rejection flows have not yet been tested on physical Windows or Linux installations. Installing an update asks before disconnecting an active LANORA network.

## What has been tested

The release workflow exercises API authorization and race tests, frontend and Rust tests, Docker deployment checks, Windows installer build/install/launch, and Linux package build/install/launch. In an isolated Linux test, two clients join the shared network, receive distinct EasyTier IPs, exchange real TCP and UDP traffic through the relay, and keep their default routes unchanged. Avatar-sync API tests cover two independently authorized memberships, updates, validation, and persistence after reconnect; they are not two separate desktop PCs.

This does **not** verify two separate internet connections, a Windows tunnel carrying game traffic, direct P2P/NAT traversal, an external VPS relay, or any specific game. See the [network test limits](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/ROADMAP.md).

## How LANORA works

The self-hosted Go API publishes whether player passwords are required, then authorizes each player and coordinates membership. Passwords are stored as PBKDF2-SHA256 hashes. A passwordless server still creates authenticated player sessions, but anyone who can reach it can request membership. Administrator authentication and internal EasyTier relay credentials remain separate and protected. Authenticated profile updates synchronize each player's selected avatar and display name to other members. Server latency measures an actual API request round-trip; peer latency and Direct/Relay labels come separately from EasyTier status. Server RTT is not game ping. EasyTier carries game traffic on a separate virtual network; LANORA does not change the system default gateway or global proxy. Peer reachability is shown only when the native engine provides fresh evidence.

## Project layout

| Path | Purpose |
|---|---|
| `apps/desktop` | Tauri 2, React, TypeScript, and Rust desktop client |
| `services/api` | Go API and SQLite storage |
| `docker-compose.yml`, `deploy/docker` | Self-hosted API, TLS proxy, and EasyTier relay |
| `docs` | [Getting started](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/GETTING_STARTED.md), [networking](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/NETWORKING.md), [security](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/SECURITY.md), and [troubleshooting](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/TROUBLESHOOTING.md) |

To build from source, see the [build guide](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/BUILDING.md). Contributions are welcome; start with [CONTRIBUTING.md](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/CONTRIBUTING.md). LANORA code is MIT-licensed. EasyTier is separately licensed; see [third-party notices](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/THIRD_PARTY_LICENSES.md).
