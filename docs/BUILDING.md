# Building

The API requires Go 1.27+:

```sh
cd services/api
go test ./...
go build -trimpath -o ../../dist/lanora-api ./cmd/lanora-api
```

The Windows client requires Windows 10/11 x64, Node.js 22+, Rust stable, Tauri v2 prerequisites, and the pinned EasyTier v2.6.4 Windows binary and driver. The [Windows workflow](../.github/workflows/windows.yml) downloads its ZIP, checks SHA-256, stages resources and notices, then builds NSIS:

```powershell
cd apps/desktop
npm ci
npm run tauri build -- --bundles nsis
```

A source checkout alone does not contain the EasyTier binaries; follow the workflow's prepare step before building locally. `npm run build` checks TypeScript/Vite, but does not build the native executable. A successful installer build does not validate real two-client gaming. Do not distribute an untested binary as a stable release.
