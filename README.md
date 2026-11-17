<p align="center"><img src="https://raw.githubusercontent.com/kavianpcx/LANORA/v0.2.0-alpha.6/apps/desktop/src-tauri/icons/icon.png" alt="LANORA desktop app icon" width="128"></p>
<p align="center"><a href="README.md">English</a> · <a href="README.fa.md">فارسی</a></p>

# LANORA

**Connect to your private game network, copy the host’s virtual IP, and play.**

LANORA is an open-source, self-hosted virtual LAN app for friends playing LAN-supported games over the internet. One person runs the server on a Linux VPS. Players install the desktop app, enter the server address, and provide a password only when the server owner requires one. There is no account and no website.

> **Status: experimental alpha.** LANORA 0.2.0-alpha.6 polishes the desktop avatars, startup loading, and connection feedback while keeping optional player-password protection. Independent Windows PCs on public networks, Windows game traffic, direct P2P, and game-specific LAN discovery have not been verified.
>
> **Security limit:** Changing the player-password policy revokes API sessions and rotates the current network identity, but cannot force a modified client already connected to the old EasyTier overlay to disconnect. Ask all players to fully disconnect and rejoin after a policy change.

[![CI](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml/badge.svg?branch=release/0.2.x)](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml) [![Desktop builds](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml/badge.svg?branch=release/0.2.x)](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-4355DB)](LICENSE) [![Latest alpha](https://img.shields.io/github/v/release/kavianpcx/LANORA?include_prereleases&label=alpha)](https://github.com/kavianpcx/LANORA/releases)

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
bash scripts/server.sh player-auth status
```

Manage player password protection without reinstalling:

```sh
bash scripts/server.sh player-auth enable
bash scripts/server.sh player-auth change
bash scripts/server.sh player-auth disable
```

Disabling protection opens player access to anyone who can reach the server. This does not disable administrator authentication or EasyTier relay credentials. Policy changes revoke current API sessions; see the [full VPS guide](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/SELF_HOSTING.md) for the EasyTier session limitation. Public servers use HTTPS; plain HTTP is accepted only for loopback addresses.

## Download and connect as a player

- **Windows 10/11 x64:** [Download the installer](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.6/LANORA_0.2.0-alpha.6_x64-setup.exe)
- **Linux x64 (Debian/Ubuntu):** [Download the .deb package](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.6/LANORA_0.2.0-alpha.6_amd64.deb)
- [View release notes and SHA-256 checksums](https://github.com/kavianpcx/LANORA/releases/tag/v0.2.0-alpha.6)

1. Install and open LANORA. Choose a display name; no signup is needed.
2. Enter the server address and press **Connect**. LANORA asks for a password only when that server requires one.
3. When LANORA reports your virtual IP, share it with the friend hosting the game.
4. Other players enter the host’s **virtual IP** in the game’s Direct IP / Join by address option. The VPS address is only for connecting LANORA.

LAN discovery is not guaranteed for every game. Games that rely on broadcast or multicast may require Direct IP.

## What has been tested

The release workflow passed API authorization and race tests, frontend and Rust tests, Docker deployment checks, Windows installer build/install/launch, and Linux package build/install/launch. In an isolated Linux test, two clients joined the shared network, received distinct EasyTier IPs, exchanged real TCP and UDP traffic through the relay, and kept their default routes unchanged.

This does **not** verify two separate internet connections, a Windows tunnel carrying game traffic, direct P2P/NAT traversal, an external VPS relay, or any specific game. See the [network test limits](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/ROADMAP.md).

## How LANORA works

The self-hosted Go API publishes whether player passwords are required, then authorizes each player and coordinates membership. Passwords are stored as PBKDF2-SHA256 hashes. A passwordless server still creates authenticated player sessions, but anyone who can reach it can request membership. Administrator authentication and internal EasyTier relay credentials remain separate and protected. EasyTier carries game traffic on a separate virtual network; LANORA does not change the system default gateway or global proxy. Peer reachability is shown only when the native engine provides evidence.

## Project layout

| Path | Purpose |
|---|---|
| `apps/desktop` | Tauri 2, React, TypeScript, and Rust desktop client |
| `services/api` | Go API and SQLite storage |
| `docker-compose.yml`, `deploy/docker` | Self-hosted API, TLS proxy, and EasyTier relay |
| `docs` | [Getting started](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/GETTING_STARTED.md), [networking](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/NETWORKING.md), [security](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/SECURITY.md), and [troubleshooting](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/TROUBLESHOOTING.md) |

To build from source, see the [build guide](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/BUILDING.md). Contributions are welcome; start with [CONTRIBUTING.md](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/CONTRIBUTING.md). LANORA code is MIT-licensed. EasyTier is separately licensed; see [third-party notices](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/THIRD_PARTY_LICENSES.md).
