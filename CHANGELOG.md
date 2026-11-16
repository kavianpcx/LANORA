# Changelog

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
