# Network and installation verification matrix

Results are scoped to their environment. A namespace test uses real EasyTier, real adapters and real socket traffic on one Linux runner; it is not two PCs on independent ISPs.

| Scenario | Actual result | Evidence / boundary |
|---|---|---|
| Create/join, password, capacity, approval, public/private discovery | Passed | Go SQLite integration tests in GitHub Actions |
| Pending network access denied, cross-room denial, revoked token denial | Passed | Go authorization regressions |
| Pending membership cancellation frees capacity | Passed | Go regression in follow-up CI |
| Distinct real adapter IPv4 addresses | Passed locally in Linux namespaces | `tests/network_smoke.py` in desktop CI |
| TCP and UDP payload round trips through shared foreign-network relay | Passed locally in Linux namespaces | P2P deliberately disabled; separate relay network identity |
| Real internet NAT/P2P and relay fallback | Not verified | Needs two PCs on separate connections |
| Control API offline while tunnel active | Passed in Linux namespaces | Socket payloads after stopping the API process |
| Underlay disconnect/reconnect | Passed in Linux namespaces | Linux namespace link down/up; not WAN loss on Windows |
| Docker fresh installation, restart and SQLite persistence | Passed in CI | `tests/compose_smoke.sh`; local HTTPS proxy process, no public DNS/TLS verification |
| Native EXE and DEB builds; Rust regressions | Passed in CI | Candidate `0.2.0-alpha.1` build artifacts |
| Install/open/close actual desktop packages | See final audit results | Separate CI steps, never inferred from build success |
| Windows firewall, adapter permissions and driver cleanup | Not verified | Requires clean Windows 10/11 PCs/VMs and real adapter tests |
| LAN game Direct IP, broadcast/multicast discovery | Not verified | Record each tested game/version and topology |
| Fullscreen, maximize/restore, dragging and RTL on physical desktops | Not verified | Custom controls implemented; needs interactive cross-platform validation |

See [audit](../docs/AUDIT_0.2.0.md) for exact run links, earlier harness failures and final results. No test claims universal game compatibility.
