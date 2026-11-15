# Networking

## Status

The actual LAN data plane is **not implemented or verified**. The Tauri app has a process-supervision starting point, but no completed Windows adapter setup, room-specific EasyTier client configuration, peer reachability checks, route lifecycle, or safe teardown. The Compose EasyTier node is not wired to room membership. No two-PC TCP/UDP, NAT traversal, P2P, or relay test has passed.

## Intended flow

1. Authenticate to the self-hosted HTTPS API.
2. Authorize room membership and deliver validated room-scoped configuration after approval.
3. A narrowly scoped Windows service starts a pinned EasyTier sidecar from structured configuration, never a backend-provided command string.
4. EasyTier negotiates direct peer connectivity and uses a self-hosted relay as needed.
5. The client reports measured interface/peer state; unknown values remain unknown.
6. Route only virtual-network destinations through the virtual interface. Do not replace the default route.

This is design intent, not current behavior.

## EasyTier and game compatibility

Compose pins EasyTier `v2.6.4`. Its upstream release notes describe an optional Windows UDP broadcast relay, disabled by default and requiring administrator privileges. LANORA does not enable, configure, or test this feature yet. Verify CLI/config compatibility against that exact release before integration. Upstream is LGPL-3.0; see [third-party notices](../THIRD_PARTY_LICENSES.md). The repository does not bundle its executable or the additional Windows runtime files.

The overlay is routed; the optional EasyTier UDP broadcast relay may help some Windows discovery flows, but it does not imply general Ethernet/Layer-2 or multicast support. LANORA has not established or verified these paths. Some games may fail even if unicast connectivity works. Prefer a game's Direct IP/Join by Address option and test each game. Never fabricate ping, loss, NAT, route, or direct/relay metrics; use Development/Unknown until measured.
