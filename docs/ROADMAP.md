# Roadmap and status

- [x] Self-hosted Go/SQLite API, public/private rooms, invite code, capacity, optional password/approval, host controls.
- [x] Tauri/React desktop flow without account login, language/theme settings, server health, public discovery, room management.
- [x] Native Rust process supervision and EasyTier v2.6.4 packaging workflow source.
- [ ] Verify installer execution, Windows adapter privileges, and Linux package capabilities on a real PC.
- [ ] Verify two PCs on separate networks, virtual IP assignment, TCP/UDP transfer, Direct IP gaming, reconnect, P2P and relay fallback.
- [ ] Measure peer reachability, associate EasyTier peer IPs to room members, and improve live presence.
- [ ] Broadcast/multicast compatibility tests for supported games.
- [ ] Security review, abuse control for anonymous room creation, release signing and source/notices audit.

See [network test matrix](../tests/NETWORK_TEST_MATRIX.md). An adapter IP or API membership is not proof of a working game connection.
