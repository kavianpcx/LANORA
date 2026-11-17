# FAQ

**Where do I download the app?** Use the current [LANORA 0.2.0-alpha.5 release](https://github.com/kavianpcx/LANORA/releases/tag/v0.2.0-alpha.5). It includes Windows x64 and Debian/Ubuntu Linux x64 packages with SHA-256 sidecars.

**Do players need an account?** No. Choose a display name in LANORA and enter the server address.

**Do all servers need a password?** No. Fresh server setup defaults to requiring a player password, but the owner can intentionally choose passwordless access. Existing servers keep their current policy until the owner changes it.

**What does a passwordless server mean?** Anyone who can reach the VPS can request player access. It does not turn off administrator authentication or internal EasyTier credentials.

**Can the server owner change the policy later?** Yes. Run one of these commands on the VPS; no reinstall is needed:

~~~sh
bash scripts/server.sh player-auth status
bash scripts/server.sh player-auth enable
bash scripts/server.sh player-auth change
bash scripts/server.sh player-auth disable
~~~

Policy changes revoke API sessions and rotate the current EasyTier network identity. Have players fully disconnect and rejoin.

**What does the VPS do?** It hosts the API, SQLite database, HTTPS endpoint, and EasyTier relay. The API authorizes players and coordinates membership; it does not carry all game packets.

**Which IP goes into the game?** The game host player's virtual IP shown by LANORA, not the public VPS address.

**Will every LAN game work?** No. Direct IP is more predictable. Broadcast/multicast discovery and specific games have not been verified.

**Is the Windows installer signed?** The release workflow does not code-sign installers. Windows may show a security warning.

**Is there a website?** No. Download the app from GitHub Releases and run your own server if you need one.
