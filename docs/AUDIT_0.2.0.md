# LANORA 0.2.0-alpha.2 audit

Baseline: `d0c7a2d5fbc57e502ba0ebafa63ddfd64780ef91` (`main`). The review work is on PR #13, based on `audit/0.2.0-alpha.1`; the package version is `0.2.0-alpha.2`.

## What the application actually does

The Go API stores rooms and memberships in SQLite. A random invitation allows a player to request entry; a per-member token authorizes that member's control-plane requests. Approval is required before a member can download tunnel configuration. The webview does not create a tunnel. Rust launches the pinned EasyTier v2.6.4 sidecar and reads its local status; EasyTier creates the virtual adapter and carries encrypted game traffic. The API does not relay game packets. A separately configured EasyTier shared node on the VPS provides a relay path.

The client does not configure an exit node or replace the system default route. Server reachability, room membership, sidecar process state, reported overlay IP and peer reachability are separate states. LANORA does not claim that a room record or an IP proves that another player is reachable. Peer-to-member mapping is not implemented, so peer reachability remains unknown.

## Confirmed defects fixed on this review branch

| Defect | Correction |
|---|---|
| EasyTier binary lookup and CLI options/IP field did not match the packaged v2.6.4 layout | Resolve the preserved resource path, pass global JSON flags in the expected order, and read only `ipv4_addr`. |
| A timed-out status query could leave a child process; close could leave the native event loop alive | Bounded, kill-on-drop CLI calls and orderly stop-before-exit handling. |
| A failed stop could be shown as a successful leave | Keep the room/tunnel state until local stop succeeds. |
| Default EasyTier RPC port could conflict with another installation | Choose an available loopback port and use it for queries. A brief bind-to-launch race remains. |
| Secret config could be briefly created with permissive Unix permissions | Create exclusively with mode `0600` before writing. Normal stop removes it; forced termination can still leave it behind. |
| Server status could stay green after an outage; any HTTP 200 could count as health | Verify the LANORA health schema and use bounded, serial health polling. |
| Membership polling unnecessarily returned the room network secret | Return only membership status and user ID; approved members retrieve network settings from the separate `/network` endpoint. |
| Room insertion could leave partial records; trailing JSON was accepted | Create room and host in one transaction; reject extra JSON values. |
| Pending users could not cancel and capacity reads ignored database errors | Allow own pending membership cancellation and return a server error if capacity cannot be read. |
| WebSocket subscriptions could linger after close/revocation | Bound ping/read lifetimes, reauthorize, and remove subscriptions. |
| Fresh API image had missing module checksums and unclear volume ownership | Resolve module sums, create the data directory for the non-root API user, add health checks, and test persistence. |
| VPS setup and status were too opaque | Add simple setup and `server.sh` status/log/restart/stop/update commands without deleting persistent volumes or printing secrets. |

The EasyTier CLI/configuration was checked against the pinned [v2.6.4 source](https://github.com/EasyTier/EasyTier/tree/v2.6.4). The installer uses Tauri 2's documented NSIS configuration and bundled license-file path.

## Desktop and installer changes

- Keep LANORA's blue/lime identity and connection-guide layout, add an original peer-node mark, and use a dark theme on first launch while retaining the saved light theme option. No signup or account system is introduced.
- Add a native integrated title bar with minimize, maximize/restore, close, drag and double-click behavior; the window remains resizable.
- Add profile/language/theme and server setup onboarding, actual request progress, loading skeletons, retry/error explanations, a bounded no-IP timeout and reduced-motion behavior. No artificial success or delay is added.
- Improve the server health badge, room/member loading and tunnel state copy. A peer still shows unknown unless verified.
- Keep the connected title-bar state tied to the periodic health check; a running process without an assigned virtual IP fails with a retryable message after 60 seconds.
- Refactor API calls, translations, profile fields, avatar selection, room view, dialogs and the server health hook into smaller modules.
- Remove unused Zustand and Rust `thiserror` dependencies. Keep fonts, license notices, database migrations and deployment/test files.
- Add transparent LANORA PNG/SVG/ICO and Tauri icon sizes, branded NSIS header/sidebar art, Farsi and English installer language selection, current-user install mode and the MIT license file. The workflow also emits SHA-256 sidecars. Windows Build CI must confirm the installer compiles and installs with these settings.
- Record layout, typography, color, feedback and accessibility choices in `docs/DESIGN_SYSTEM.md`.

## Alpha 2 validation

The tested source is commit `a30df623c1fb4042285f24bf3168c7c6258a709d` on the review branch. Both required workflows passed on that same source commit: [CI run 43959957097](https://github.com/kavianpcx/LANORA/actions/runs/43959957097) and [Desktop validation run 43959957135](https://github.com/kavianpcx/LANORA/actions/runs/43959957135).

An earlier candidate run failed the repository check after the installer sidebar bitmap was truncated during upload; the next commit restored and verified the complete bitmap. A separate early cleanup failure was fixed by supplying harmless Compose variables to the always-run cleanup step. Neither failure is from the tested `a30df623` source.

- Go API tests, including race detection and authorization regressions, passed. Repository checks, server command tests, fresh Docker deployment, restart and SQLite persistence passed in CI.
- Frontend regression tests and Rust native tests passed on Windows and Ubuntu runners.
- Windows Server 2025 CI built the branded NSIS installer, installed it silently, checked that the bundled EasyTier binary exists and reports its version, launched LANORA, and closed the app normally. This is an installer smoke test, not a clean Windows 10/11 hardware or virtual-adapter test.
- Ubuntu 24.04 CI built and installed the `.deb`, checked its EasyTier network capability, launched the installed application, exercised fullscreen restore and close, and captured the screenshot used in the README.
- The Linux namespace test used the real pinned EasyTier v2.6.4 binary and real TCP/UDP sockets between different virtual-adapter IPs through the self-hosted relay. It also exercised traffic while the API was stopped and after a local underlay link was taken down and restored.

This is useful local integration evidence, not proof of two-computer internet gaming. The CI source is the tested alpha candidate; any later source commit requires a new matching build before its binaries can be released.

## Not verified and remaining risks

- Two PCs on independent internet providers, real Windows adapter/driver and firewall behavior, Windows elevation, NAT/P2P, relay fallback on restrictive NAT, and actual game Direct IP/broadcast/multicast compatibility.
- Peer identity mapping, latency/loss measurement, Windows reconnect after WAN loss, Linux desktops other than Ubuntu 24.04 CI, and fullscreen/RTL interactions on physical systems.
- A kicked former member may retain already-disclosed EasyTier credentials. The relay allowlist is not database-backed admission control; the protocol does not revoke that member's room secret.
- Room tokens are held in process memory and memberships do not expire automatically. An abrupt client exit may leave a stale membership. A forced process kill may leave plaintext local config.
- Linux `cap_net_admin`/`cap_net_raw` grants broad network authority to the bundled sidecar on a multi-user device.

These are alpha limitations. Do not describe the product as stable or universally compatible until real multi-machine tests have been completed and recorded.

## Release state

Version: `0.2.0-alpha.2` is synchronized across npm, Cargo and Tauri. Windows and Linux packages may be published only from the matching successful desktop workflow run. Keep the GitHub release marked prerelease. Stable release remains blocked on the real Windows adapter/firewall and independent-network/game tests above.
