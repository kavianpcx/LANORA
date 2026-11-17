# Build and verify LANORA

The current pre-release is 0.2.0-alpha.5. To build the matching server and desktop source, check out release/0.2.x. The server API is built from the repository checkout by Docker Compose; it is not a separately hosted image.

Run each command block from the repository root unless the block changes directories itself.

## API

The API requires Go 1.27 or newer:

~~~sh
cd services/api
GOWORK=off go test -mod=readonly -race ./...
mkdir -p ../../dist
go build -trimpath -o ../../dist/lanora-api ./cmd/lanora-api
~~~

## Desktop prerequisites

The Windows x64 build needs Windows 10/11, Node.js 22, Rust stable, Tauri 2 prerequisites, and the pinned EasyTier 2.6.4 Windows resources. The Debian/Ubuntu x64 build needs Node.js 22, Rust stable, Tauri Linux dependencies, and the pinned EasyTier 2.6.4 Linux resources. The desktop workflow downloads these resources, verifies their SHA-256 values, stages license notices, and builds the packages.

Frontend tests and Rust tests:

~~~sh
cd apps/desktop
npm ci
npm test
npm run build
cd src-tauri
cargo test
~~~

Build a Windows installer on Windows:

~~~sh
cd apps/desktop
npm run tauri build -- --bundles nsis
~~~

Build a Debian package on Linux:

~~~sh
cd apps/desktop
npm run tauri build -- --bundles deb
~~~

A plain source checkout does not include the EasyTier binaries. Follow the prepare-resource steps in the [desktop workflow](../.github/workflows/windows.yml) before building locally.

## What release CI verifies

The Windows and Linux jobs run frontend and Rust tests, build their platform packages, and install and launch those packages. The Linux job also runs the isolated namespace relay test using two EasyTier clients, checks TCP/UDP traffic, and confirms that the test did not alter the system default route. The server-validation job runs Go race tests, setup-command tests, repository checks, and Docker Compose smoke tests. Successful CI does not verify two PCs on separate public networks or game-specific LAN discovery. See the [network test matrix](../tests/NETWORK_TEST_MATRIX.md).
