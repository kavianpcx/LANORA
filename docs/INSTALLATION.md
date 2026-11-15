# Installation

## Web preview

```sh
cd apps/web
npm ci
npm run dev
```

The web deployment manages accounts and rooms through an HTTPS LANORA API. It cannot create a Windows virtual adapter or carry game packets.

## Windows desktop

There is no release installer yet. The repository has a Tauri 2 shell and a Rust process-supervision scaffold, but signed Windows packaging and the adapter/tunnel lifecycle are incomplete.

Development requires Windows 10/11 x64, Node.js 20+, Rust stable, and the [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/):

```powershell
cd apps/desktop
npm install
npm run tauri dev
```

This starts the current shell only; it does not indicate tunnel readiness. See [BUILDING.md](BUILDING.md).
