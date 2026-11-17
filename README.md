<p align="center"><img src="assets/lanora-wordmark.svg" alt="LANORA" width="230"></p>
<p align="center"><a href="README.md">English</a> · <a href="README.fa.md">فارسی</a></p>

# LANORA

**Connect to your private game network, copy the host’s virtual IP, and play.**

LANORA is an open-source, self-hosted virtual LAN app for friends playing LAN-supported games over the internet. One person runs the server on a Linux VPS. Players install the desktop app, enter the server address and private access code, and connect to the same shared network. There is no account and no website.

> **Status: experimental alpha.** LANORA 0.2.0-alpha.3 has passed automated API, deployment, desktop package, and isolated relay-network tests. Two computers on separate public networks, Windows game traffic, direct P2P, and game-specific LAN discovery have not been verified.

[![CI](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml/badge.svg?branch=release/0.2.x)](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml) [![Desktop builds](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml/badge.svg?branch=release/0.2.x)](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-4355DB)](LICENSE) [![Latest alpha](https://img.shields.io/github/v/release/kavianpcx/LANORA?include_prereleases&label=alpha)](https://github.com/kavianpcx/LANORA/releases)

## Quick setup for the server owner

You need a Linux VPS, a domain pointed at it, Docker Engine with the Compose plugin, Git, and OpenSSL. Allow inbound TCP ports **80** and **443**, and **11010 TCP/UDP**, in both the VPS and provider firewalls.

Copy these commands into the VPS terminal:

```sh
git clone --branch release/0.2.x https://github.com/kavianpcx/LANORA.git
cd LANORA
bash scripts/setup-server.sh
```

Enter your domain when asked. The script creates the private keys, starts LANORA, and prints the server address and network access code. Send both to your players privately.

Check the services or reveal the access code later:

```sh
bash scripts/server.sh status
bash scripts/server.sh code
```

The status output does not reveal secrets. Public servers use HTTPS; plain HTTP is accepted only for loopback addresses. Read the [full VPS guide](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/SELF_HOSTING.md) if you need help with DNS, firewall ports, or TLS.

## Download and connect as a player

- **Windows 10/11 x64:** [Download the installer](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.3/LANORA_0.2.0-alpha.3_x64-setup.exe)
- **Linux x64 (Debian/Ubuntu):** [Download the .deb package](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.3/LANORA_0.2.0-alpha.3_amd64.deb)
- [View release notes and SHA-256 checksums](https://github.com/kavianpcx/LANORA/releases/tag/v0.2.0-alpha.3)

1. Install and open LANORA. Choose a display name; no signup is needed.
2. Enter the server address and access code from the server owner, then press **Connect**.
3. When LANORA reports your virtual IP, share it with the friend hosting the game.
4. Other players enter the host’s **virtual IP** in the game’s Direct IP / Join by address option. The VPS address is only for connecting LANORA.

LAN discovery is not guaranteed for every game. Games that rely on broadcast or multicast may require Direct IP.

## What has been tested

The release workflow passed API authorization and race tests, frontend and Rust tests, Docker deployment checks, Windows installer build/install/launch, and Linux package build/install/launch. In an isolated Linux test, two clients joined the shared network, received distinct EasyTier IPs, exchanged real TCP and UDP traffic through the relay, and kept their default routes unchanged.

This does **not** verify two separate internet connections, a Windows tunnel carrying game traffic, direct P2P/NAT traversal, an external VPS relay, or any specific game. See the [network test limits](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/ROADMAP.md).

## How LANORA works

The self-hosted Go API authenticates the shared access code and coordinates membership. EasyTier carries game traffic on a separate virtual network; the API is not the game-data path. LANORA does not change the system default gateway or global proxy. Peer latency and reachability are shown only when the native engine provides evidence.

## Project layout

| Path | Purpose |
|---|---|
| `apps/desktop` | Tauri 2, React, TypeScript, and Rust desktop client |
| `services/api` | Go API and SQLite storage |
| `docker-compose.yml`, `deploy/docker` | Self-hosted API, TLS proxy, and EasyTier relay |
| `docs` | [Getting started](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/GETTING_STARTED.md), [networking](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/NETWORKING.md), [security](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/SECURITY.md), and [troubleshooting](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/TROUBLESHOOTING.md) |

To build from source, see the [build guide](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/BUILDING.md). Contributions are welcome; start with [CONTRIBUTING.md](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/CONTRIBUTING.md). LANORA code is MIT-licensed. EasyTier is separately licensed; see [third-party notices](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/THIRD_PARTY_LICENSES.md).
