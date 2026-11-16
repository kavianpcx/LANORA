<p align="center"><img src="assets/lanora-wordmark.svg" alt="LANORA" width="230"></p>
<p align="center"><a href="README.md">English</a> · <a href="README.fa.md">فارسی</a></p>

# LANORA

**Connect to a private game network, copy the host’s virtual IP, and play.**

LANORA is an open-source virtual LAN app for friends who want to play LAN-supported games over the internet. One person runs the server on a Linux VPS. Players install LANORA, enter the server address and its private access code, then connect. No account or website is needed.

[![CI](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml/badge.svg?branch=release/0.2.x)](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml) [![Desktop builds](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml/badge.svg?branch=release/0.2.x)](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-4355DB)](LICENSE) [![Pre-release](https://img.shields.io/github/v/release/kavianpcx/LANORA?include_prereleases&label=alpha)](https://github.com/kavianpcx/LANORA/releases)

## Set up the server

You need a Linux VPS with a domain pointed at it, Docker Engine with the Compose plugin, Git, and OpenSSL. Allow inbound TCP ports 80 and 443, plus TCP and UDP port 11010, in both the VPS firewall and the provider firewall.

Copy these commands into the VPS terminal:

~~~sh
git clone --branch release/0.2.x https://github.com/kavianpcx/LANORA.git
cd LANORA
bash scripts/setup-server.sh
~~~

Enter your domain when asked. The script creates private secrets, starts the services, and prints a **network access code**. Share the server address and this code privately with players. Check the local service status with:

~~~sh
bash scripts/server.sh status
~~~

The status output hides secrets. To reveal the shared access code later, use 'bash scripts/server.sh code'. From a different internet connection, verify the public API with 'curl -f https://YOUR_DOMAIN/api/v1/health'. Do not use '-k' to bypass a certificate error.

## Connect as a player

1. Install the Windows or Linux package from [GitHub Releases](https://github.com/kavianpcx/LANORA/releases/tag/v0.2.0-alpha.3).
2. Open LANORA, choose a display name, and enter the server address and access code from the server owner.
3. Press **Connect**. LANORA checks the server, authorizes the code, starts EasyTier, and waits for its virtual IP.
4. Once the virtual IP appears, share that IP with the player hosting the game. Other players enter the host’s virtual IP in the game’s **Direct IP** option.

Players on the same server automatically join one shared network. The separate room tools remain under the advanced section for older room-based setups.

## What this alpha verifies

- The API checks the shared access code before granting a per-device network token.
- Authorized clients receive the same server-specific EasyTier network configuration.
- Player presence expires if the app stops sending heartbeats. A member listed as app-online is not necessarily reachable inside the tunnel.
- The desktop reads its virtual IP from EasyTier and reads peer routes and latency from EasyTier when available. Unknown data stays marked unknown.
- EasyTier runs without an exit node. LANORA does not change the system’s default internet route or proxy.
- GitHub Actions builds and launches the Windows installer. Its Linux network test connects two isolated clients through a real EasyTier relay and checks assigned IPs plus TCP and UDP traffic.

## Limits

LANORA is an experimental alpha. The automated Linux network test uses two isolated network namespaces and forces relay transport. Two separate computers on public internet connections, Windows game traffic, direct P2P traversal, relay behavior across real VPS providers, and game-specific LAN discovery have not been verified. Some games require **Direct IP**; broadcast or multicast discovery is not guaranteed.

A working HTTPS API only proves that the control server responds. An EasyTier-assigned IP does not by itself prove that another player can reach it. Check the route status beside each player, then test in the game. Report failures with the details in [Troubleshooting](docs/TROUBLESHOOTING.md).

## Build from source

For desktop build requirements and commands, see [Building](docs/BUILDING.md). For API and self-hosting details, start with [Getting started](docs/GETTING_STARTED.md) and [Self-hosting](docs/SELF_HOSTING.md).

~~~sh
cd apps/desktop
npm ci
npm test
npm run build
~~~

The Windows NSIS installer and Linux Debian package are built by GitHub Actions. Releases include SHA-256 files for downloaded packages. Do not install a package whose checksum does not match.

## Project

- [Network architecture](docs/NETWORKING.md)
- [API reference](docs/API.md)
- [Configuration](docs/CONFIGURATION.md)
- [Security](docs/SECURITY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
- [Third-party licenses](THIRD_PARTY_LICENSES.md)

LANORA is distributed under the [MIT License](LICENSE). EasyTier is a separately distributed LGPL-3.0 component; see [third-party notices](THIRD_PARTY_LICENSES.md).
