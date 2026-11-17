# Changelog

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
