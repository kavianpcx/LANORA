# Roadmap

Status reflects this source snapshot.

## Implemented in the MVP

- [x] Go API/SQLite room and membership operations.
- [x] Account register/login/profile/logout.
- [x] Host approval, invite rotation, close, kick and accepting-members APIs.
- [x] React web account and room flows using the configured API.
- [x] Compose API/Caddy/EasyTier infrastructure scaffold.
- [x] Pages build/deploy workflow source.

## Remaining

- [ ] Run Go tests on a supported Go 1.27 environment.
- [ ] Add complete English localization and locale switching to the Persian-first web interface.
- [ ] Complete authorization/session management and distributed rate limiting.
- [ ] Package pinned EasyTier with required LGPL notices.
- [ ] Implement least-privilege Windows adapter/service lifecycle and structured config.
- [ ] Provision isolated room networks; verify secret delivery/rotation.
- [ ] Report real peer state, virtual IP, latency and direct/relay telemetry.
- [ ] Test two Windows PCs across different NATs, TCP/UDP, reconnect and relay fallback.
- [ ] Test game discovery and document per-game Direct IP/broadcast constraints.
- [ ] Produce signed Windows installer and full SBOM/license inventory.
- [ ] Build authenticated admin web UI and operational metrics.

Use `0.x` prereleases while contracts and packaging are unstable. Do not target stable 1.0 before tunnel/interoperability tests.
