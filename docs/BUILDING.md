# Building

The API requires Go 1.27+:

```sh
cd services/api
go test ./...
go build -trimpath -o ../../dist/lanora-api ./cmd/lanora-api
```

The Windows client requires Windows 10/11 x64, Node.js 22+, Rust stable, Tauri v2 prerequisites, and the pinned EasyTier v2.6.4 Windows binary and driver. The [desktop workflow](../.github/workflows/windows.yml) downloads its ZIP, checks SHA-256, stages resources and notices, then builds NSIS:

```powershell
cd apps/desktop
npm ci
npm run tauri build -- --bundles nsis
```

A source checkout alone does not contain the EasyTier binaries; follow the workflow's prepare step before building locally. `npm run build` checks TypeScript/Vite, but does not build the native executable. A successful installer build does not validate real two-client gaming. Do not distribute an untested binary as a stable release.

## Linux x64 desktop

The same desktop source supports a Debian/Ubuntu `.deb`. GitHub Actions installs Tauri Linux prerequisites, downloads and verifies the EasyTier v2.6.4 Linux x64 ZIP, and runs `npm run tauri build -- --bundles deb`. The package declares `libcap2-bin` and its post-install hook grants `cap_net_admin,cap_net_raw` to the bundled EasyTier core, so the UI need not run as root. Package installation requires administrator permission. The package and privilege behavior still need runtime testing on a clean Linux desktop; other distributions are not covered.

## Candidate validation

For `0.2.0-alpha.1`, PR builds also run `npm test` and `cargo test` before packaging. The Linux workflow runs a real namespace integration test against the built Go API and pinned EasyTier executables. Installation/startup checks are separate CI steps and must be inspected independently of packaging success.

```sh
cd apps/desktop
npm ci
npm test
npm run build
cd src-tauri
cargo test
```

On a disposable Linux development host with root access, Python 3 and iproute2, after preparing the EasyTier resources:

```sh
cd services/api
go build -o ../../lanora-api-test ./cmd/lanora-api
cd ../..
sudo python3 tests/network_smoke.py apps/desktop/src-tauri/resources/easytier/easytier-core apps/desktop/src-tauri/resources/easytier/easytier-cli ./lanora-api-test
```

The test creates temporary network namespaces and a bridge, starts a real API and relay, creates/joins a room, checks distinct OS adapter IPs, then sends actual TCP/UDP payloads. P2P is disabled to force the foreign-network relay path. It removes only its temporary processes/interfaces on exit. This is not a test across two ISPs and does not exercise Windows adapters or game discovery.
