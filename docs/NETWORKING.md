# Networking

The API handles public room discovery, invitations, capacity and host approvals. Approved room members request a room-specific EasyTier network name and secret plus the server operator's pinned relay address. The desktop's Rust process starts the bundled EasyTier core, asks its CLI for the adapter IP, and stops the process on leave. The app does not set a default route or claim a peer connection merely because the API responds.

The VPS HTTPS address identifies the control server. The EasyTier peer endpoint uses TCP/UDP 11010. A LAN game's Direct IP target is the **game host player's virtual IP**, not either VPS address. Every player must join the same room. Private rooms have separate network names and secrets. No arbitrary command is accepted from the server.

EasyTier v2.6.4 supports Windows UDP broadcast relay upstream, but LANORA does not enable or test it. Direct IP is the first compatibility option; broadcast, multicast, Layer-2 discovery, P2P traversal, relay fallback, peer latency, and TCP/UDP across two PCs are unverified. Never use the displayed adapter IP as a claim of reachability. See [test matrix](../tests/NETWORK_TEST_MATRIX.md).
