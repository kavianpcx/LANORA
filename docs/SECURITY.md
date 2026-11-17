# LANORA security notes

LANORA is experimental. Review these limitations before exposing a server to people you do not trust.

## Authentication and stored credentials

- Public server addresses use HTTPS with normal certificate verification. HTTP is permitted only for loopback development.
- Server owners choose whether a player password is required. Fresh installs default to protected; existing access-code servers remain protected during migration.
- Player passwords are stored in SQLite as PBKDF2-SHA256 hashes, never plaintext. The public connection-info endpoint exposes only the policy and API version. The join endpoint enforces that policy and creates a per-device bearer session.
- A passwordless server allows anyone who can reach the server to request player membership. It does not disable the administrator token, internal relay credentials, or protected administrator endpoints.
- The API bearer token is held by the desktop React process in memory and is not persisted in localStorage. The player password is used only in memory for the authorization request and is not saved in localStorage.
- Rust writes the EasyTier configuration, including its network secret, to an app-local TOML file because the sidecar reads that file. Unix creation uses mode 0600. Windows uses the app data directory's inherited ACL; this behavior has not been verified with a native Windows security test. A force-killed process can leave the file behind. Do not treat the local network secret as protected from malware or another process running as the same user.
- Standard server commands do not print passwords, hashes, the administrator token, relay credentials, or bearer tokens. Do not share raw diagnostics, `.env`, or EasyTier TOML files.

## Changing player access

Use `bash scripts/server.sh player-auth status|enable|change|disable`. Policy changes delete current API memberships and rotate the shared network identity. Standard clients stop after the next rejected heartbeat and must join again. This does not immediately revoke an EasyTier secret already delivered to a modified client that keeps its old process running. Ask every player to fully disconnect and rejoin; treat the old overlay as active until trusted players have migrated.

The current server relay uses a broad `lanora-*` relay allowlist, so the allowlist itself is not member authorization. Passwordless mode makes the player-join endpoint open to reachable clients; it does not expose the administrator API or relay-control credential.

Do not enable EasyTier Secure Mode on the pinned v2.6.4 TOML path without a tested compatibility upgrade. EasyTier issue [#2489](https://github.com/EasyTier/EasyTier/issues/2489) documents a v2.6.4 TOML credential identity parsing problem. LANORA has not validated a per-device credential migration against its bundled Windows/Linux clients and relay.

## Traffic and routing

EasyTier encrypts data-plane traffic. LANORA does not configure an exit node, global proxy, or default gateway. The API handles authorization and presence; it does not relay game packets. Real Windows route, DNS, proxy, NAT, firewall and two-PC behavior remain unverified.

## Reporting

Report exploitable issues privately through [GitHub Security Advisories](https://github.com/kavianpcx/LANORA/security/advisories/new). Do not include passwords, bearer tokens, network secrets, raw `.env` content or unredacted route output. Include the app and OS version, error text, and sanitized logs.
