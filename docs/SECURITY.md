# LANORA security notes

LANORA is experimental. Review these limitations before exposing a server to people you do not trust.

## Authentication and stored credentials

- Public server addresses use HTTPS with normal certificate verification. HTTP is permitted only for loopback development.
- The shared access code authorizes the initial join; it is not the EasyTier network secret.
- The API stores a hash of the shared code, the generated shared-network secret in persistent SQLite, and hashes of per-device bearer tokens.
- The desktop now keeps the access code only in process memory and removes the legacy `lanora.sharedCode` localStorage entry on startup. Profile, theme, language and server URL preferences are not authentication credentials.
- The API bearer token is held by the desktop React process in memory and is not persisted in localStorage.
- Rust writes the EasyTier configuration, including its network secret, to an app-local TOML file because the sidecar reads that file. Unix creation uses mode 0600. Windows uses the app data directory's inherited ACL; this behavior has not been verified with a native Windows security test. A force-killed process can leave the file behind. Do not treat the local network secret as protected from malware or another process running as the same user.
- API responses and standard server commands should not print access codes, network secrets, admin tokens or bearer tokens. Do not share raw diagnostics, `.env`, or EasyTier TOML files.

## Removing access and rotating credentials

The current design uses one EasyTier network identity and secret for all admitted members. Removing a database membership or invalidating its API token blocks future control-plane requests, but **does not revoke a secret already delivered to a running client**. LANORA cannot remotely force that client to stop. Do not promise an immediate Kick/Ban action or data-plane revocation.

If the shared access code may have leaked, use this best-effort containment:

1. In the VPS checkout, replace `LANORA_SHARED_NETWORK_CODE` in `.env` with a new private high-entropy value (for example, generate one with `openssl rand -hex 32`).
2. Recreate the API container so it loads the changed environment: `docker compose up -d --force-recreate api`.
3. On API startup, LANORA rotates the EasyTier network name and secret and clears the stored member records.
4. Tell every trusted player to fully disconnect and exit LANORA, then rejoin with the new code. This moves trusted clients to the new network identity.
5. Treat the previous overlay as compromised until all trusted clients have migrated. A hostile client that retains the old secret may continue communicating with any device still on the old overlay.

This procedure limits future access to the new network after trusted clients migrate; it is not immediate revocation of old credentials. The current server relay uses a broad `lanora-*` relay allowlist, so the allowlist itself is not member authorization.

Do not enable EasyTier Secure Mode on the pinned v2.6.4 TOML path without a tested compatibility upgrade. EasyTier issue [#2489](https://github.com/EasyTier/EasyTier/issues/2489) documents a v2.6.4 TOML credential identity parsing problem. LANORA has not validated a per-device credential migration against its bundled Windows/Linux clients and relay.

## Traffic and routing

EasyTier encrypts data-plane traffic. LANORA does not configure an exit node, global proxy, or default gateway. The API handles authorization and presence; it does not relay game packets. Real Windows route, DNS, proxy, NAT, firewall and two-PC behavior remain unverified.

## Reporting

Report exploitable issues privately through [GitHub Security Advisories](https://github.com/kavianpcx/LANORA/security/advisories/new). Do not include access codes, bearer tokens, network secrets, raw `.env` content or unredacted route output. Include the app and OS version, error text, and sanitized logs.
