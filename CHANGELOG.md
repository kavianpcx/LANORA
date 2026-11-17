# Changelog

## 0.2.0-alpha.8 — Connection UX and diagnostic accuracy — 2026-11-17

- Reject empty and malformed server addresses before connecting and show localized inline validation with focus returned to the address field.
- Infer HTTP for bare localhost/loopback development addresses, retain HTTPS for public hosts, and reject plaintext HTTP to non-loopback hosts.
- Improve timeout, network, invalid-response, unsupported-protocol, and exposed TLS-certificate error messages in English and Persian.
- Refine player rows with compact real peer RTT, separate measured server RTT, a red-accented Power Disconnect action, accessible copy controls, and transient copy feedback.
- Mark player presence and peer route data stale after their freshness windows without treating one missed API call as a reason to stop EasyTier.
- Report partial peer reachability as a count, separate observed relay routes from independent relay checks, and whitelist fields copied in diagnostics.
- Keep all 17 existing avatar IDs and WebP artworks. Remove an unused player-avatar fallback helper and unused avatar CSS; normalize the owl's visual scale for its larger transparent inset.
- Keep this experimental prerelease. Native Windows, real localhost backend, multi-PC internet, game TCP/UDP, P2P, and relay fallback remain unverified in this environment.

## 0.2.0-alpha.7 — Compact profile dialogs — 2026-11-17

- Constrain profile setup and Settings dialogs to the available window height, with a persistent header and action footer and one scrollable content area.
- Compact the avatar picker, remove its duplicate selected-avatar preview, and keep the existing avatar art and saved IDs.
- Clarify the Profile and Server onboarding steps, keep primary actions accessible, and keep onboarding open until EasyTier reports a real virtual IP or the user dismisses it.
- Style the in-dialog scrollbar for both themes, contain background scrolling, restore focus on close, and retain Escape support.
- Replace the connected-state server form with a compact summary, distinguish server API RTT from peer route RTT, expire stale route measurements, and show bounded recovery after an unexpected EasyTier process exit.
- Persist validated player names and avatar IDs against authenticated shared-network and room memberships; refresh other members through existing polling.
- Rotate room network credentials and increment the generation after a host removes a member; authorized room clients detect the rotation and rejoin.
- Add redacted connection diagnostics and `bash scripts/server.sh doctor` for local API, relay-container, password-policy, ports, database/player summary, and sanitized API error-type checks.
- Add backend coverage for profile synchronization, avatar persistence, membership authorization, and room credential rotation.
- Keep this release experimental; Windows scaling variants and independent public-network/game connectivity remain unverified.

## 0.2.0-alpha.6 — Desktop connection and avatar polish — 2026-11-17

- Replace the generic avatar glyphs with a cohesive set of 17 bundled character illustrations; preserve old avatar IDs and add selected preview plus keyboard navigation.
- Add a bounded startup skeleton backed by desktop version and native engine initialization checks, without requiring the server to be online.
- Show actual server, player-authorization, and virtual-network connection stages; animate the content transition without fake progress.
- Show the joined server address and use stable local avatar fallbacks for other players. Avatar choices are not synchronized by the current server API.
- Keep connection failures on the connection screen and show only local profile-save errors in Settings.
- Keep this release experimental; independent public-network peer connectivity and game-specific LAN discovery remain unverified.

## 0.2.0-alpha.5 — Optional player passwords — 2026-11-17

- Let server owners choose required or passwordless player access during fresh setup; protected access remains the default.
- Discover the player policy before join. The desktop asks for a password only when required and keeps it out of localStorage.
- Store player passwords with PBKDF2-SHA256, retain the existing access-code path for older servers, and fail closed when discovery is unavailable.
- Add administrator-authenticated `player-auth` management commands. Policy changes revoke API sessions and rotate the shared EasyTier network identity.
- Migrate existing server codes into the SQLite password hash without replacing `.env` settings or deleting the database.
- Document that passwordless access is open to reachable players and does not remove administrator or relay security; retain the existing EasyTier overlay revocation limitation.

## 0.2.0-alpha.4 — Status and deployment reliability — 2026-11-17

- Derive API healthcheck targets from `LANORA_LISTEN_ADDR`; align Caddy with `LANORA_API_INTERNAL_PORT` for custom internal ports.
- Keep shared access codes in process memory only and remove legacy localStorage values on startup.
- Separate API availability, authorization, tunnel startup, virtual-IP assignment and measured peer reachability in desktop status.
- Add regression coverage for custom healthcheck ports and connection-state transitions.
- Document network-secret rotation, client migration steps, and the fact that API token revocation cannot immediately evict an already-connected EasyTier peer.
- Keep this release experimental. Independent Windows PCs on public networks, external VPS relay, P2P/NAT and game-specific compatibility remain unverified.

## 0.2.0-alpha.3 — Shared-network preview — 2026-11-17

- Make the server-wide shared network the primary client flow: enter the server address and private access code, then LANORA joins the same EasyTier network automatically.
- Add server-managed shared-network authorization, per-device tokens, expiring app-presence heartbeats, reported virtual IPs, and explicit disconnect cleanup.
- Show app heartbeat presence separately from actual EasyTier peer routes. Display peer latency only when EasyTier reports a measurable value.
- Keep the application shell and sidebar LTR in Persian; apply RTL only to Persian text. Allow plain HTTP only for loopback development servers.
- Add original fox, cat, bear, dog, owl, panda, rabbit, frog, tiger, and penguin avatars. Include the Windows ICO in the installed app bundle.
- Generate a private shared access code during VPS setup; add an explicit code display command and keep secrets out of server status output.
- Extend the isolated EasyTier network smoke test to exercise the shared API path, real assigned virtual IPs, TCP/UDP relay traffic, and unchanged default routes.
- Move desktop, crate, and app versions together to 0.2.0-alpha.3. Add a guarded GitHub prerelease workflow that uploads only successfully built Windows and Linux packages with SHA-256 checksums.
- Keep the release experimental: independent public internet links, Windows tunnel traffic, direct P2P, and game compatibility remain unverified.

## 0.2.0-alpha.2 — Experimental prerelease

- Correct bundled EasyTier executable lookup, global CLI JSON arguments and `ipv4_addr` parsing.
- Serialize native status/stop/start operations, terminate timed-out CLI processes, use a separate loopback RPC port, hide Windows subprocess consoles, and remove network config on normal stop/exit.
- Create Unix secret config with mode 0600 from the outset; disable default public STUN discovery in the client.
- Add bounded API requests, service-identity validation, periodic health checks and truthful failure/unknown peer states.
- Add local avatar selection, first-launch profile, custom window controls, real request skeletons and keyboard-contained dialogs. Retain English/Persian, light/dark and offline fonts.
- Extract API handling, connection hook, translations and reusable UI components; format React/CSS. Remove unused Zustand and Rust thiserror dependencies and obsolete social-preview artwork.
- Add VPS status/log/restart/stop/update commands; prepare the API data directory for its nonroot user and add a container health check. Run the relay without TUN/NET_ADMIN.
- Make room creation atomic, reject trailing JSON, and clean up/re-authorize WebSocket subscriptions.
- Keep the room network secret out of frequent membership-status replies; deliver it only through the approved-member network endpoint.
- Add branded NSIS installer artwork, an English/Farsi installer language selector, current-user install mode, and packaged MIT license metadata.
- Rework first-launch onboarding into profile and server steps, default new installs to the dark theme, localize the room heading, and show checking/reachable/unreachable states in the integrated title bar.
- Stop a tunnel attempt that keeps running without reporting a virtual IP after 60 seconds; explain the timeout and offer a real retry path.
- Add a documented desktop design system, a version-consistency check for the title bar, validated icon sizes, and SHA-256 sidecars for CI installer artifacts.
- Store the Linux package checksum beside the downloaded filename and verify it before uploading the artifact.
- Add frontend, server-command, authorization, Docker persistence and real local namespace TCP/UDP tests. Two-machine internet gaming remains unverified.

## 0.1.0-alpha.5

- Published Windows x64 EXE and Linux x64 DEB build artifacts.
- Added guided server setup and Linux capability post-install hook.
- Package build success did not verify real game connectivity.

## 0.1.0-alpha.4

- Added installer notices and Compose configuration CI.

## 0.1.0-alpha.2

- Published the first successful Windows installer build.
- Replaced browser/account flow with desktop public room discovery and guest membership.

## 0.1.0-alpha.1

- Initial API, Windows client groundwork and self-hosted deployment source.
- Initial Windows build attempts failed; no verified LAN release.

