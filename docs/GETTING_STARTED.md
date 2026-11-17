# Getting started

LANORA has two kinds of users: the person who runs a server and the players who connect to it.

## Server owner

The current server source and installer are on the release/0.2.x branch. You need a Linux VPS, a domain pointed at it, Docker Engine with Compose, Git, and OpenSSL. Allow inbound TCP 80/443 and TCP/UDP 11010 in both firewalls.

Run on the VPS:

~~~sh
git clone --branch release/0.2.x https://github.com/kavianpcx/LANORA.git
cd LANORA
bash scripts/setup-server.sh
~~~

Enter the domain when asked. On a fresh server, choose whether players need a password. Yes is the default; the installer starts services and then asks for the password twice without showing it. No opens player joins to anyone who can reach the VPS. Read the [server walkthrough](SELF_HOSTING.md) for the exact prompts, final status output, and upgrade steps.

## Player

Download the current [Windows installer](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.8/LANORA_0.2.0-alpha.8_x64-setup.exe) or [Linux package](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.8/LANORA_0.2.0-alpha.8_amd64.deb) from [release 0.2.0-alpha.8](https://github.com/kavianpcx/LANORA/releases/tag/v0.2.0-alpha.8). Check the adjacent SHA-256 file before installing.

Open LANORA, choose a display name, enter the server's HTTPS address, and click Connect. The app asks for a password only if that server requires one. When your virtual IP appears, give it to the game host. Other players use the host's virtual IP in the game's Direct IP or Join by address option.

The app's server-online status means its API heartbeat is working. EasyTier peer status is reported separately. For local development with a backend on the same machine, use `http://localhost:8080` or `http://127.0.0.1:8080`; port 1420 is the UI dev server, not the API. Public hosts use HTTPS and do not fall back to HTTP.
