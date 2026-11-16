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

## Previous verified candidate tests

Before the `0.2.0-alpha.2` security and installer changes, commit `c120b467af9ad36502ab667a8dbbcdd3684339fa` passed [desktop workflow 43946935337](https://github.com/kavianpcx/LANORA/actions/runs/43946935337) and [server/API CI 43946935255](https://github.com/kavianpcx/LANORA/actions/runs/43946935255). Windows built, silently installed, launched and normally closed the NSIS package. Ubuntu 24.04 built and installed the `.deb`, opened the installed native UI, tested fullscreen restore/close and captured the committed screenshot. The Linux namespace test sent real TCP and UDP payloads between different EasyTier adapter IPs through the self-hosted relay, including with the API stopped and after a local underlay link down/up. Docker checks passed with SQLite data surviving restart.

That is Linux namespace evidence, not a two-computer internet test. Alpha 2 needs its own successful Actions runs because it changes the membership response, NSIS assets and package metadata. The exact alpha 2 run links and results belong here once those runs finish.

## Not verified and remaining risks

- Two PCs on independent internet providers, real Windows adapter/driver and firewall behavior, Windows elevation, NAT/P2P, relay fallback on restrictive NAT, and actual game Direct IP/broadcast/multicast compatibility.
- Peer identity mapping, latency/loss measurement, Windows reconnect after WAN loss, Linux desktops other than Ubuntu 24.04 CI, and fullscreen/RTL interactions on physical systems.
- A kicked former member may retain already-disclosed EasyTier credentials. The relay allowlist is not database-backed admission control; the protocol does not revoke that member's room secret.
- Room tokens are held in process memory and memberships do not expire automatically. An abrupt client exit may leave a stale membership. A forced process kill may leave plaintext local config.
- Linux `cap_net_admin`/`cap_net_raw` grants broad network authority to the bundled sidecar on a multi-user device.

These are alpha limitations. Do not describe the product as stable or universally compatible until real multi-machine tests have been completed and recorded.

## Release state

Target version: `0.2.0-alpha.2` across npm, Cargo and Tauri. Publish only packages from a successful desktop workflow run for the same source commit. Keep the GitHub release marked prerelease; do not replace or move an existing tag. Stable release remains blocked on the real Windows and independent-network tests above.
