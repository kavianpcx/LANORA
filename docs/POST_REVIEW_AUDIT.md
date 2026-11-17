# Post-review audit

Review reference: LANORA `0.2.0-alpha.3`, `release/0.2.x`, evaluated commit `1e14eabfd1b99739950661f73a332b9a64104390`.  
Repository state checked: `main` at `f0cab1bd7fceb982c2ccc8633fd8a47594c375a6`; latest release was `v0.2.0-alpha.3`.  
Current review changes are on PR #13, branch `audit/0.2.0-alpha.1`; use the PR for its live head SHA.

## Evidence reviewed

The complete combined evaluation text was pasted into the conversation and read. It includes both reports, their test claims and screenshot captions. The image pixels and PDF were not separately inspected; no visual-pixel claim is made.

The prior GitHub Actions results were checked against their referenced commit. CI and desktop validation succeeded on `1e14eab...`; that is historical evidence for alpha.3, not a test of the current review head. The report itself distinguishes the local relay socket check from the successful namespace TCP/UDP test and from the still-unverified two-PC gaming scenario.

## Findings and changes

| Category | Evidence and affected component | Severity / root cause | Change and regression coverage | Current result |
|---|---|---|---|---|
| Confirmed defect, fixed | `services/api/cmd/lanora-api/main.go` healthcheck targeted fixed port 8080 while the server listener is configurable. | P1. Custom `LANORA_LISTEN_ADDR` could disagree with healthcheck. | Added `healthcheckURL` deriving the listener target, mapping wildcard bind addresses to loopback and rejecting invalid ports. Unit cases cover default, custom port, IPv6 wildcard and invalid values. | Tests added; Go tests not run in this environment. |
| Confirmed deployment gap, fixed | `deploy/docker/Caddyfile` always proxied to `api:8080`. | P1. A custom API port could be healthy internally but unreachable through Caddy. | Added `LANORA_API_INTERNAL_PORT` to Compose and `.env.example`; Caddy routes to that port. Set it to the same numeric port as `LANORA_LISTEN_ADDR`. | Compose checks not run here. |
| Confirmed defect, fixed | `apps/desktop/src/App.tsx` used API reachability as the sidebar/footer “connected” state. Report caption 05 describes a mocked 401 while an ambiguous ready label remained. | P1. Control-plane reachability was conflated with authentication and data-plane state. | Added `src/connectionStatus.ts` to distinguish unreachable/reachable server, auth pending/failure, tunnel startup, assigned IP with unverified peer, and evidenced peer reachability. Sidebar uses this state. Added five tests. | **PASS**: 5 pure status-model tests run against the source with Node 24 type stripping. Full app build and native interaction not run. |
| Confirmed credential weakness, partly fixed | `apps/desktop/src/App.tsx` stored the shared access code in `localStorage` and restored it for auto-join. | P1. A shared browser profile could retain an avoidable server access code. | Code is now session-only; the old `lanora.sharedCode` value is deleted on startup. The access token remains in React process state, not localStorage. | Source change verified; full frontend test/build not run. |
| Residual secret-at-rest risk | `apps/desktop/src-tauri/src/main.rs` writes EasyTier TOML containing the network secret into app-local data for the sidecar. Unix creation uses mode 0600; the Windows ACL is inherited and was not tested here. A forced process termination can leave the config file. | P1. The sidecar needs the secret to join; plaintext can remain locally. | Not solved by the localStorage change. This threat and cleanup limitation remain explicit; no protected-storage claim is made. | NOT VERIFIED on Windows; residual risk remains. |
| Confirmed data-plane revocation limitation | `services/api/internal/api/shared_network.go` distributes one EasyTier network identity/secret to authorized users. API token removal blocks later control requests but cannot erase a secret already delivered to a running client. | P0. API revocation is not immediate overlay revocation. | No unsupported EasyTier feature was enabled. The current code rotates the network name/secret on access-code change at API startup and clears membership records, but clients still connected to the old overlay are not remotely stopped. Containment steps are documented in `docs/SECURITY.md`. | Limitation remains. Do not claim a Kick/Ban or immediate revoke capability. |
| EasyTier secure-mode compatibility | The client and VPS relay pin EasyTier v2.6.4 and use its TOML configuration path. EasyTier issue #2489 reports that v2.6.4 TOML secure-mode credential detection did not enter credential identity mode; the required parsing support arrived later. | Security design constraint. Blindly enabling credential mode on the pinned release risks handshake failure. | Kept the pinned version and documented why the v2.6.4 credential path was not switched on. No upgrade or release compatibility test was performed. | NOT VERIFIED as a LANORA implementation; no secure-mode migration claimed. |
| Independent relay timeout | Pasted report: local relay listened, a raw TCP socket was accepted, but a second core did not appear and timed out; environment also reported ICMP permission and DNS/STUN problems. | Inconclusive. An open socket does not prove an EasyTier handshake; exact client TOML/args from that experiment are not in the report. | Compared with `tests/network_smoke.py`: the prior CI test used real EasyTier v2.6.4 cores, matching API-issued network identity/secret and relay URL, disabled P2P, and passed TCP/UDP in isolated namespaces. This does not reproduce the independent 11019 setup. | Environment/configuration is plausible, but exact cause is undetermined; NOT REPRODUCED here. |
| Missing real-world validation | Report confirms no two Windows PCs on independent ISPs, external VPS relay, public NAT/P2P or actual game session. | P0 evidence gap, not proof of a product failure. | Preserved as a release limitation. No mock UI or namespace test is counted as two-PC proof. | NOT VERIFIED. |
| UX improvement | Caption 08 reports ~1332 px content at 760 px in Chromium without horizontal overflow. | P2 usability improvement; not a native Windows measurement. | No broad redesign or unvalidated spacing changes made. | Native/window-size checks NOT RUN. |
| Localization visual check | Source sets the application shell direction to LTR and localizes Persian text direction. Report’s captions are not pixels. | No source defect confirmed; visual coverage gap. | No structural mirroring introduced. | Full screen-by-screen Persian/English visual check NOT VERIFIED. |

## Test status

- **PASS:** Node 24 executed the five connection-status model tests against the current `connectionStatus.ts` source: server reachability alone, 401 auth failure, IP without peer proof, peer evidence, and tunnel startup.
- **NOT RUN:** Go tests for healthcheck defaults/custom ports; Go executable in this environment did not provide the standard Go tool interface.
- **NOT RUN:** Full `npm test`, TypeScript production build, Rust tests, Docker Compose validation, native Windows/Linux package installation.
- **PASS on prior alpha.3 commit only:** referenced GitHub Actions CI/desktop runs `43986156896` and `43986156937`, including Linux namespace relay TCP/UDP coverage.
- **NOT VERIFIED:** public VPS/external relay, two independent Windows clients, Windows firewall/adapter, real game discovery, P2P/NAT, IPv6/default-route/proxy/DNS behavior on Windows.

## Supported containment after suspected code disclosure

1. Change `LANORA_SHARED_NETWORK_CODE` in the VPS `.env` to a new high-entropy value.
2. From the LANORA checkout, recreate the API container so the new environment is loaded: `docker compose up -d --force-recreate api`.
3. The API rotates the network identity/secret and clears its membership records on startup.
4. Have every trusted player fully disconnect/exit the old client and rejoin with the new code, moving them onto the new network identity.

This isolates the new network once trusted clients migrate. It does **not** remotely terminate a hostile client that still holds the old secret, nor does it stop old overlay traffic between devices that have not migrated. Treat the old network as compromised until migration is complete; immediate revocation is unsupported.

## Release decision

The current head has no checks registered in GitHub for its SHA. No installer was built from it. Do not merge or release this candidate until applicable CI passes and the network-revocation limitation is accepted with the experimental warning retained. Two-PC testing remains an explicit NOT VERIFIED item.
