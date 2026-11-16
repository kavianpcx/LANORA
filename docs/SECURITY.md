# Security

Caddy terminates TLS for the API. Public IP-based HTTPS requires a trusted certificate; LANORA refuses insecure remote HTTP. The room invite code is separate from its random EasyTier secret. Invite codes are hashed in SQLite, room passwords use salted PBKDF2-SHA256, and room access tokens are stored as hashes. Approved members can obtain room network credentials; pending members cannot. The API rate limits anonymous create/join attempts per IP in-process.

The app does not require a login: display names are unverified and can be impersonated. Whoever possesses a room token can act as that member, and the host token grants host powers. Tokens are held in application memory for the session; closing/restarting the app may lose access to the room. Keep `.env` and SQLite backups private. No room or network secrets should appear in logs or support reports. The Windows EasyTier TOML with network secret is written to local app data and deleted on explicit leave, but a crash can leave it on disk; protected storage and cleanup need improvement before stable release.

Known gaps: anonymous abuse controls are process-local; live presence is not measured; Windows elevation, firewall lifecycle, peer identity, release signing and two-PC transport have not been validated. Do not disable Windows Firewall or change the default route as a repair step. See [network test matrix](../tests/NETWORK_TEST_MATRIX.md).

## Alpha audit: trust boundaries

The `0.2.0-alpha.1` candidate creates Unix configuration files with mode 0600 before writing the secret, uses a separate loopback RPC port, kills timed-out CLI subprocesses and stops EasyTier on a normal window close. Windows files inherit the local user's app-data permissions. This is not encrypted credential storage: a forced process kill or OS crash can leave a secret configuration file behind. Other processes running as the same OS user can access it and the local EasyTier RPC service.

**Removing a membership or closing a room is not cryptographic revocation.** Someone who retained its network name/secret may run a modified EasyTier client. The official client stops after a definite membership-authorization failure, but network credential rotation/device authentication is still required for hostile-member isolation. Invitation rotation only changes who can request admission; it does not rotate the network secret.

The Linux DEB grants `cap_net_admin,cap_net_raw` to its EasyTier binary. This avoids running the React UI as root but gives any local user able to execute that binary substantial network privileges. Use it only on trusted single-user test systems until a narrowly scoped privileged service replaces this mechanism. Windows adapter creation/elevation and firewall rule ownership remain release blockers; no blanket administrator manifest or firewall disabling has been added.

The self-hosted relay runs without a TUN device or NET_ADMIN. Its wildcard permits `lanora-*` networks, not only rooms currently in SQLite; it is not an API-enforced admission gateway. Restrict exposure to trusted players when testing. Client public STUN defaults are disabled; relay transport is the baseline under restrictive NATs. No default route or exit node is requested by LANORA.

Room tokens remain memory-only. Normal app exit stops the native process but does not guarantee an API leave/close request; abnormal exits or backend downtime can leave stale memberships and consume room capacity. Live presence, resumable membership credentials and TTL cleanup are still needed. Never call an approved database membership an online player.
