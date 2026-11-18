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

The workflow adds a `.sha256` sidecar beside each Windows installer and Linux package. Verify the package before installing it:

```sh
sha256sum --check ./<package-name>.sha256
```

On Windows PowerShell, compare the sidecar's hash with the installer:

```powershell
Get-FileHash .\<installer-name>.exe -Algorithm SHA256
```

A source checkout alone does not contain the EasyTier binaries; follow the workflow's prepare step before building locally. `npm run build` checks TypeScript/Vite, but does not build the native executable. A successful installer build does not validate real two-client gaming. Do not distribute an untested binary as a stable release.

## Linux x64 desktop

The same desktop source supports a Debian/Ubuntu `.deb`. GitHub Actions installs Tauri Linux prerequisites, downloads and verifies the EasyTier v2.6.4 Linux x64 ZIP, and runs `npm run tauri build -- --bundles deb`. The package declares `libcap2-bin` and its post-install hook grants `cap_net_admin,cap_net_raw` to the bundled EasyTier core, so the UI need not run as root. Package installation requires administrator permission. The package and privilege behavior still need runtime testing on a clean Linux desktop; other distributions are not covered.

## Candidate validation

For `0.3.0-alpha.1`, pull-request workflows also run `npm test` and `cargo test` before packaging. The Linux workflow runs a real namespace integration test against the built Go API and pinned EasyTier executables. Installation/startup checks are separate CI steps and must be inspected independently of packaging success. Debian package validation extracts its control directory and checks that the expected `postinst` file exists; `tests/deb_validation_test.sh` covers both valid and missing-script packages.

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

## Signed Windows updates

The release workflow signs the Windows NSIS installer through Tauri's updater plugin. It requires `TAURI_SIGNING_PRIVATE_KEY` (and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if configured) as GitHub Actions secrets, plus `TAURI_UPDATER_PUBLIC_KEY` as a repository variable. Generate the keypair with `npx tauri signer generate -- -w <private-key-path>` on a secure machine. Do not commit the private key or place it in `.env`.

Pull-request builds leave in-app update checks disabled. Release-branch builds embed the public key and stable prerelease manifest URL. The workflow creates the manifest from the actual `.exe.sig` produced by Tauri and publishes it as a release asset and at `updates/alpha/latest.json`. A manifest/unit test does not prove the updater's signature verification, install, or relaunch path; those require a real older Windows installation and a newer signed release.
