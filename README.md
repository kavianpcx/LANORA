<p align="center"><img src="https://raw.githubusercontent.com/kavianpcx/LANORA/release/0.2.x/apps/desktop/src-tauri/icons/icon.png" alt="LANORA desktop app icon" width="128"></p>
<p align="center"><a href="README.md">English</a> · <a href="README.fa.md">فارسی</a></p>

# LANORA

**Connect to your friends’ LAN game network, share the host’s virtual IP, and play.**

LANORA is an open-source, self-hosted virtual LAN app for games with LAN support. One person runs the server on a Linux VPS. Players install the desktop app and enter the server address. The app asks for a player password only when that server requires one. There is no account or hosted LANORA service.

> **Current release: 0.3.0-alpha.1 (experimental pre-release).** The release includes signed Windows and Debian packages, checksums, detached signatures, and a Tauri updater manifest. CI passed frontend/native and isolated Linux networking tests, API/VPS checks, Windows installer build/install/launch, Linux package build/install/launch, and updater signature verification. The v0.2.0-alpha.8 app has no updater, so the first updater-enabled version needs manual installation. Installed-version update/restart behavior, Windows-to-Windows public-network play, Windows game traffic, direct P2P/NAT traversal, and game-specific LAN discovery are not verified.
>
> **Access warning:** A passwordless server lets anyone who can reach it request player access. Changing the policy revokes API sessions and rotates the network identity, but cannot force a modified client already using the old EasyTier overlay to disconnect. Ask all players to fully disconnect and rejoin after a policy change.

[![CI](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml/badge.svg?branch=release/0.2.x)](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml) [![Desktop builds](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml/badge.svg?branch=release/0.2.x)](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-4355DB)](LICENSE) [![Latest alpha](https://img.shields.io/github/v/release/kavianpcx/LANORA?include_prereleases&label=alpha)](https://github.com/kavianpcx/LANORA/releases)

## Desktop preview

![LANORA Linux desktop first-launch screenshot](docs/screenshots/linux-first-launch.png)

*Actual desktop screenshot from a Linux CI smoke test of an earlier alpha. The current Windows UI may differ.*

## Download LANORA

- **Windows 10/11, x64:** [Download the installer](https://github.com/kavianpcx/LANORA/releases/download/v0.3.0-alpha.1/LANORA_0.3.0-alpha.1_x64-setup.exe) · [SHA-256](https://github.com/kavianpcx/LANORA/releases/download/v0.3.0-alpha.1/LANORA_0.3.0-alpha.1_x64-setup.exe.sha256) · [Signature](https://github.com/kavianpcx/LANORA/releases/download/v0.3.0-alpha.1/LANORA_0.3.0-alpha.1_x64-setup.exe.sig)
- **Linux x64, Debian/Ubuntu:** [Download the .deb package](https://github.com/kavianpcx/LANORA/releases/download/v0.3.0-alpha.1/LANORA_0.3.0-alpha.1_amd64.deb) · [SHA-256](https://github.com/kavianpcx/LANORA/releases/download/v0.3.0-alpha.1/LANORA_0.3.0-alpha.1_amd64.deb.sha256) · [Signature](https://github.com/kavianpcx/LANORA/releases/download/v0.3.0-alpha.1/LANORA_0.3.0-alpha.1_amd64.deb.sig)
- [Release notes and all release assets](https://github.com/kavianpcx/LANORA/releases/tag/v0.3.0-alpha.1) · [Live updater manifest](https://raw.githubusercontent.com/kavianpcx/LANORA/release/0.2.x/updates/alpha/latest.json)

Verify the downloaded file against its SHA-256 sidecar before installing it.

## Connect as a player

1. Install and open LANORA. Choose a display name; no signup is needed.
2. Ask the server owner for the HTTPS address and enter it in LANORA.
3. Press **Connect**. Enter a password only if LANORA asks for one.
4. Once LANORA shows your virtual IP, share it with the friend hosting the game.
5. The other players enter the game host’s virtual IP in the game’s Direct IP or Join by address screen. The VPS address is only for connecting LANORA.

For a backend running on the same computer, local development can use `http://localhost:8080` or `http://127.0.0.1:8080`; the Tauri/Vite UI port 1420 is not the API port. `localhost` cannot reach a VPS. Public servers stay on HTTPS.

Automatic LAN discovery varies by game. Some games require Direct IP and may not work through broadcast or multicast.

## Run your own server

The current server and desktop release use the source on the **release/0.2.x** branch. The installer builds the server API from that checkout; there is no separate hosted server account or image to download.

You need a Linux VPS, a domain pointed to its public IP, Docker Engine with the Compose plugin, Git, and OpenSSL. Allow inbound TCP ports **80** and **443**, plus **11010 TCP and UDP**, in both the VPS and provider firewalls. Keep API port 8080 private.

On the VPS, run:

~~~sh
git clone --branch release/0.2.x https://github.com/kavianpcx/LANORA.git
cd LANORA
bash scripts/setup-server.sh
~~~

Enter the domain when asked. A fresh installation then asks:

~~~text
Require a password for players? [Y/n]:
~~~

Press Enter or type **Yes** to keep the safe default. The installer starts the services and then asks for the password twice. Input is hidden:

~~~text
Enter player password:
Confirm player password:
~~~

Use at least 12 characters and either 16 characters or at least three character types, with a maximum of 128 bytes. The API stores a PBKDF2-SHA256 hash, not the plain password. Players cannot join until setup finishes and the policy is configured.

Type **No** to allow passwordless player access. The installer warns that anyone who can reach the server may join its shared gaming network. This affects player access only; administrator authentication and EasyTier relay credentials stay protected.

At the end, the installer prints the server address and chosen policy. For example:

~~~text
Player address (verify HTTPS from another network): https://games.example.com
Player password protection is enabled. Share your chosen password privately.
~~~

For a passwordless server, the final line instead warns that anyone who can reach the server may join. Share the HTTPS address with players, and share a password only when protection is enabled.

Check status or change the policy later, without reinstalling:

~~~sh
bash scripts/server.sh status
bash scripts/server.sh player-auth status
bash scripts/server.sh player-auth enable
bash scripts/server.sh player-auth change
bash scripts/server.sh player-auth disable
~~~

Existing installations keep their .env settings, database, and current protection; setup does not silently switch them to passwordless. See the [server walkthrough](docs/SELF_HOSTING.md) for upgrade steps, expected prompts, and policy-change behavior.

## How LANORA works

The self-hosted Go API reports whether player passwords are required and authorizes each join. It creates a per-device player session only after a successful join. Passwordless mode skips the player password but still creates a session; administrator endpoints and internal EasyTier relay credentials remain separately protected. EasyTier carries game traffic over its virtual network. LANORA does not change the system default gateway or global proxy, and it does not claim the API is the game-traffic path.

## What has been tested

The release workflow passed Go API and race tests, frontend and Rust tests, Docker deployment checks, Windows installer build/install/launch, and Linux package build/install/launch. An isolated Linux namespace test used two EasyTier clients to exchange TCP and UDP traffic through the relay.

This does **not** verify two PCs on separate internet connections, Windows game traffic, an external VPS relay, direct P2P, or a specific game. Read the [network test limits](docs/ROADMAP.md) before treating the alpha as ready for public gaming.

## Guides

- [First steps](docs/GETTING_STARTED.md)
- [Full VPS setup, prompts, and upgrades](docs/SELF_HOSTING.md)
- [Desktop installation](docs/INSTALLATION.md)
- [How networking works](docs/NETWORKING.md)
- [Security notes](docs/SECURITY.md)
- [Configuration](docs/CONFIGURATION.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Building from source](docs/BUILDING.md)

## Project layout

| Path | Purpose |
|---|---|
| apps/desktop | Tauri 2, React, TypeScript, and Rust desktop client |
| services/api | Go API and SQLite storage |
| docker-compose.yml and deploy/docker | Self-hosted API, HTTPS proxy, and EasyTier relay |
| docs | Setup, networking, security, and release guides |

LANORA is MIT-licensed. EasyTier has its own license; see [third-party notices](THIRD_PARTY_LICENSES.md).
