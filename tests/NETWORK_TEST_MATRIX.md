# Network verification matrix

No cross-machine network tests have been run in this development container. None of the following are passed.

| Scenario | Status | Needed evidence |
|---|---|---|
| Create room and second client join | API test authored; execution blocked (Go toolchain unavailable) | Run `cd services/api && go test ./...` |
| Unique virtual IPs | Not verified | Two packaged Windows clients and EasyTier adapter inspection |
| TCP and UDP between virtual IPs | Not verified | Bidirectional socket tests across different internet connections |
| Different NATs / P2P path | Not verified | Capture peer state on both Windows clients |
| Relay fallback | Not verified | Force direct path failure and confirm relay peer state/traffic |
| Reconnect after internet loss | Not verified | Disconnect/reconnect WAN while observing engine state |
| Password, invite, capacity and approval | API tests authored; execution blocked | Run test suite against SQLite driver |
| Windows firewall/adapter cleanup | Not verified | Install/uninstall on clean Windows 10/11 x64 VMs |
| LAN broadcast/multicast discovery | Not verified | Per-game integration tests; use Direct IP where discovery is unsupported |
| API offline while data plane active | Not verified | Disconnect control plane after tunnel setup and test game traffic |
