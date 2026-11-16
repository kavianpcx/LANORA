# 0.2.0-alpha.1 implementation audit

Baseline: `d0c7a2d5fbc57e502ba0ebafa63ddfd64780ef91` on `main`.
Review branch: `audit/0.2.0-alpha.1`, [PR #13](https://github.com/kavianpcx/LANORA/pull/13).
Status: **Unreleased alpha candidate; review and test evidence below.**

## Architecture and evidence

The Go API stores rooms and membership in SQLite. A random invitation grants the ability to request admission; an opaque per-member token authorizes control operations. Only approved members can fetch the room's EasyTier network name, secret and self-hosted relay URL. Pending members cannot fetch tunnel credentials. Display names/avatars are local, unverified profile preferences, not accounts.

React calls the HTTPS API. Rust validates structured network config and launches the bundled EasyTier v2.6.4 process. EasyTier owns the virtual adapter and encrypted data plane; the API never forwards game packets. The VPS's separate shared node accepts foreign networks matching `lanora-*`. The client config does not request an exit node/default route. The application reports API reachability, room membership, process status and EasyTier-reported IPv4 separately. Per-member reachability remains unknown because a trustworthy peer-to-member mapping/probe has not been implemented.

## Confirmed defects and corrections

| Finding | Relevant implementation | Correction |
|---|---|---|
| Bundled binary lookup omitted the preserved `resources` path | `apps/desktop/src-tauri/src/main.rs` | Resolve `resources/easytier` inside the runtime resource directory |
| CLI output flag order and node-IP field did not match v2.6.4 | same | Global `-o json` before `node`; read only `ipv4_addr`, reject invalid/nonusable IPv4 |
| Timed-out CLI children could remain alive | same | `kill_on_drop` on bounded CLI execution |
| Stop failure could be presented as a disconnected tunnel | Rust engine stop and `src/App.tsx` | Retain process handle on stop failure; stop locally before confirming leave |
| Default RPC port could collide with other EasyTier instances | Rust engine | Select a loopback port and address the same port in CLI queries; tiny bind-to-spawn race remains |
| Unix secret file could be created with permissive initial mode | Rust engine | Exclusive file creation with 0600 before writing |
| Server badge stayed successful after outage | `src/hooks/useServer.ts` | Bounded serial health polling with cancellation and cleanup |
| Any successful HTTP reply could be mistaken for LANORA health | `src/api.ts` | Verify health schema/service identity |
| Requests had no deadline or understandable categorized failures | `src/api.ts` | Abort timeout, structured errors and EN/FA messages; browser certificate failures honestly grouped with network errors |
| Pending members incorrectly used an approved-only room route | `src/App.tsx` | Poll membership until approval; fetch members only once approved |
| Pending users could not cancel admission | `services/api/internal/api/api.go` | Permit their own token to leave without granting network access |
| Room and host insertion were not atomic | same | One transaction, roll back partial creation |
| WebSocket disconnects/revocation could leave subscriptions active | same | Read/disconnect loop, bounded pings, reauthorization and subscriber cleanup |
| Trailing JSON could be accepted | same | Reject a second JSON value/trailing content |
| Fresh Docker build failed due missing module checksum entries | `deploy/docker/api.Dockerfile`, dependency manifests | Resolve dependency checksums and validate an isolated Docker build |
| New SQLite volume was not explicitly prepared for nonroot | API Dockerfile | Create `/data` with UID/GID 65532 ownership; add native API health check |

The EasyTier integration was checked against the [pinned CLI](https://github.com/EasyTier/EasyTier/blob/v2.6.4/easytier/src/easytier-cli.rs), [configuration source](https://github.com/EasyTier/EasyTier/blob/v2.6.4/easytier/src/common/config.rs) and [core options](https://github.com/EasyTier/EasyTier/blob/v2.6.4/easytier/src/core.rs). Window controls follow [Tauri 2 window customization](https://v2.tauri.app/learn/window-customization/).

## Focused UX and maintenance changes

- First-launch nickname and original bundled SVG animal avatars; local preferences, editable later, no signup.
- Integrated resizable titlebar with native minimize/maximize/restore/close, built-in drag region and double-click behavior; window permissions explicitly scoped to the main window.
- Real request skeletons, server connection progress and retry; no artificial waiting period.
- Keyboard-contained dialogs, visible focus and reduced-motion support. Existing palette, fonts and language/theme options retained.
- Extracted API client, connection hook, translations, titlebar, avatars, modal and profile controls. Expanded compact CSS/React for maintenance.
- Removed unused `zustand` and `thiserror` dependencies; removed unused social-preview artwork. Database migrations and third-party notices retained for compatibility.
- Added `scripts/server.sh` with safe start/status/logs/restart/stop/update commands. No volume deletion. No raw relay logs or environment dumps.

## Executed validation

- Local `npm run build`: passed (TypeScript + Vite).
- Local `npm test`: 5 request/validation regression tests passed.
- Local `bash -n scripts/server.sh scripts/setup-server.sh tests/compose_smoke.sh`: passed.
- Local `TMPDIR="$PWD" python3 tests/server_commands_test.py`: passed; this uses a Docker stub, not real containers.
- [First candidate CI](https://github.com/kavianpcx/LANORA/actions/runs/43842805032): Go `go test -race ./...` passed; real Docker build failed on missing checksums, which triggered a follow-up fix.
- [First candidate desktop validation](https://github.com/kavianpcx/LANORA/actions/runs/43842805073): Rust tests passed on Windows and Linux. Real Linux namespace test passed: distinct OS adapter IPs and actual TCP/UDP round trips with P2P disabled, through the separate foreign-network relay.
- Follow-up build, Docker and installation results are recorded below after execution; do not infer success from a configured workflow.

## Still not verified / remaining risks

Two independent internet connections, real Windows LAN games, NAT hole punching, live peer identity mapping, automatic LAN discovery, Windows firewall/elevation, Linux desktop environments beyond CI, fullscreen/RTL window behavior on physical desktops, app crash recovery and trusted public VPS TLS remain unverified unless explicitly recorded in the final validation section.

Former members can retain disclosed network credentials. The relay whitelist is not database-backed admission control. The official app stops on confirmed control-plane revocation, but malicious clients need cryptographic revocation. Memory-only room tokens and absent membership TTL can leave stale room entries after exit. Forced process termination can leave plaintext local config. Linux file capabilities are broad for a multiuser machine. These are alpha release risks, not completed features. See [Security](SECURITY.md).

## Release position

Version `0.2.0-alpha.1` is consistent across npm, Rust and Tauri. The workflow generates review artifacts, not tags/releases. `main` and existing releases are not overwritten. This work does not authorize a stable release.
