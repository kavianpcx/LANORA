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

Windows installer build is unvalidated. `Cargo.lock` and a redistributable EasyTier bundle are absent. Do not publish binaries until packaging, notices, and two-client tests pass.
