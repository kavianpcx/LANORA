# Network test matrix

This matrix records executed automation only. A package build or UI screenshot is not proof of multiplayer connectivity.

| Scenario | Status | Evidence / limit |
|---|---|---|
| Shared access-code authorization and per-device tokens | Automated test | Go API test covers invalid code, same network configuration, bearer authorization, heartbeat, reported IP, and leave revocation |
| Two clients join the shared network API | Automated Linux integration test | Two independent device IDs join a real local API |
| Distinct EasyTier virtual IPv4 addresses | Automated Linux integration test | Two network namespaces and actual bundled EasyTier core |
| TCP and UDP game-like payloads via relay | Automated Linux integration test | Self-hosted EasyTier relay; P2P explicitly disabled |
| Default route unchanged | Automated Linux integration test | Captures each client's route before and after EasyTier |
| Client traffic after API stops | Automated Linux integration test | Already joined data plane continues passing TCP and UDP |
| Linux package installation and desktop launch | GitHub Actions | Debian package installed and app launched under Xvfb |
| Windows package install and app startup | GitHub Actions | NSIS package installed and native window closed normally |
| Windows EasyTier tunnel and game traffic | Not verified | No separate Windows test machines available |
| Two public internet links | Not verified | Local network namespaces are not separate ISPs |
| Direct P2P/NAT traversal | Not verified | Integration test forces relay transport |
| Relay through an external VPS and real firewall | Not verified | Local relay test only |
| Game-specific discovery, broadcast, or multicast | Not verified | Direct IP path is documented; no game matrix run |
| Public TLS reachability | Not verified here | Must be checked from a network outside the VPS |

