# Building

## Web

```sh
cd apps/web
npm ci
npm run build
npm run preview
```

For Pages: `VITE_BASE_PATH=/lanora/ npm run build`. Hash routing supports static hosting.

## API

Requires Go 1.27+:

```sh
cd services/api
go test ./...
go build -trimpath -o ../../dist/lanora-api ./cmd/lanora-api
```

## Desktop development

Windows 10/11 x64, Node.js 20+, Rust stable and [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/):

```powershell
cd apps/desktop
npm ci
npm run tauri dev
```

The Windows GitHub Actions workflow downloads EasyTier v2.6.4 from its upstream release, checks the pinned SHA-256, stages binaries and drivers as Tauri resources, and builds an NSIS installer. Only a successful Windows build can publish the clearly marked experimental prerelease. The installer is not proof of a working two-client LAN; peer traffic and adapter elevation still need hardware validation. There is no committed `Cargo.lock`, so review the resolved dependencies and reproducibility before a stable release.
