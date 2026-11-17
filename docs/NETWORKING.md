# Networking model

LANORA uses a control plane and a separate game-traffic data plane.

## Default connection

1. The client requests the HTTPS health endpoint and public connection-info endpoint. Discovery reports whether this server requires a player password; it does not authorize access or return secrets.
2. For a protected server, the player enters a password in the client dialog. For a passwordless server, the client sends no player credential. The API enforces its configured policy, creates a per-device bearer token, and returns this server's current EasyTier network identity only after authorization.
3. The desktop starts the bundled EasyTier process with DHCP enabled, the server's relay address as a peer, encryption enabled, and exit nodes disabled.
4. The app reads the adapter's actual virtual IP from EasyTier. It sends that IP with a heartbeat every five seconds.
5. The server reports app presence while a heartbeat is fresh (30 seconds). The client separately asks EasyTier for its peer routes. A route and its latency are shown only when EasyTier provides them.

Every player authorized by one server joins the same network. A passwordless server authorizes any reachable player but still creates bearer sessions; the player password is not the EasyTier network secret. The server stores the network secret in SQLite and only returns it after a successful join. Each device token is stored hashed server-side. Changing the player policy or password rotates the data-plane network identity and revokes existing device tokens. Standard clients stop their EasyTier process when the next heartbeat is rejected; a modified client may keep using an already-delivered secret until it exits.

Legacy room endpoints remain available. The desktop exposes them as advanced tools; they are not required for the default connection.

## Traffic and routes

The API manages authorization and presence; it does not proxy game packets. EasyTier carries virtual-network traffic through direct connections when available and can use the configured self-hosted relay. LANORA disables EasyTier exit nodes and does not set the Windows/Linux default gateway or a global system proxy. Only routes installed for the virtual network are expected to use the tunnel.

The game host shares the virtual IP shown in LANORA. Other players use that address in the game's Direct IP feature. The server's HTTPS address and relay port are not game connection addresses.

"App online" means the desktop recently contacted the API. It does not prove peer reachability. Peer reachability is shown only when the local EasyTier CLI reports a route for that member's virtual IP. A missing route or latency value stays unknown; it is never replaced with a made-up ping.

## Compatibility and verification

LANORA uses EasyTier v2.6.4 and its bundled CLI/core. The automated Linux integration test connects two isolated clients through the self-hosted relay, checks distinct assigned virtual IPs, confirms heartbeat presence, checks that default routes remain unchanged, and exchanges TCP and UDP payloads. It disables P2P to exercise relay transport.

This test is not equivalent to two computers on separate public internet connections. Public-network NAT traversal, direct P2P, Windows tunnel traffic, game-specific Direct IP behavior, and UDP broadcast/multicast discovery have not been verified. Some games will not discover a host automatically and may require Direct IP. See [the test matrix](../tests/NETWORK_TEST_MATRIX.md).
