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
| Alpha.2 Windows x64 EXE build and installer smoke test | Passed | [Desktop CI run 43959957135](https://github.com/kavianpcx/LANORA/actions/runs/43959957135): built NSIS, installed silently, checked bundled EasyTier version, launched and closed the installed app on Windows Server 2025 CI |
| Alpha.2 Ubuntu 24.04 x64 DEB build and install smoke test | Passed | [Desktop CI run 43959957135](https://github.com/kavianpcx/LANORA/actions/runs/43959957135): built and installed package, checked packaged EasyTier capability, launched app and exercised fullscreen restore/close in Xvfb |
| Windows firewall, adapter permissions and driver cleanup | Not verified | Requires clean Windows 10/11 PCs/VMs and real adapter tests |
| LAN game Direct IP, broadcast/multicast discovery | Not verified | Record each tested game/version and topology |
| Fullscreen, maximize/restore, dragging and RTL on physical desktops | Not verified | Custom controls implemented; needs interactive cross-platform validation |

See [audit](../docs/AUDIT_0.2.0.md) for the matching source commit, run links, and limits. No test claims universal game compatibility.
