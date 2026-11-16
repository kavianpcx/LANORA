# Changelog

## 0.2.0-alpha.1 — Unreleased candidate

- Correct bundled EasyTier executable lookup, global CLI JSON arguments and `ipv4_addr` parsing.
- Serialize native status/stop/start operations, terminate timed-out CLI processes, use a separate loopback RPC port, hide Windows subprocess consoles, and remove network config on normal stop/exit.
- Create Unix secret config with mode 0600 from the outset; disable default public STUN discovery in the client.
- Add bounded API requests, service-identity validation, periodic health checks and truthful failure/unknown peer states.
- Add local avatar selection, first-launch profile, custom window controls, real request skeletons and keyboard-contained dialogs. Retain English/Persian, light/dark and offline fonts.
- Extract API handling, connection hook, translations and reusable UI components; format React/CSS. Remove unused Zustand and Rust thiserror dependencies and obsolete social-preview artwork.
- Add VPS status/log/restart/stop/update commands; prepare the API data directory for its nonroot user and add a container health check. Run the relay without TUN/NET_ADMIN.
- Make room creation atomic, reject trailing JSON, and clean up/re-authorize WebSocket subscriptions.
- Add frontend, server-command, authorization, Docker persistence and real local namespace TCP/UDP tests.
- Build alpha artifacts on pull requests; do not automatically publish tags or releases. Two-machine internet gaming remains unverified.

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
