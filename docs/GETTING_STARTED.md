# Getting started

This runs the control-plane MVP locally. It does not create a virtual network tunnel; Windows EasyTier integration is under development.

Requirements: Go 1.27+, Node.js 20+, npm and Git.

## Start the API

```sh
cd services/api
go run ./cmd/lanora-api
```

Default URL is `http://localhost:8080`; SQLite defaults to `services/api/data/lanora.db`.

## Start the web app

In another terminal:

```sh
cd apps/web
npm ci
npm run dev
```

Open the Vite URL. Register an account and set API Base URL to `http://localhost:8080` in Settings. `LANORA_ALLOWED_ORIGINS` must include the exact web origin.

## Try room management

1. Create a room with a name and optional password/approval.
2. Copy the invite code shown in the active room.
3. In a second browser profile, register another account and join using that code.
4. If approval is required, approve the request from the host session.

Room operations are real API/SQLite operations. The web app does not produce virtual IPs, pings, or tunnels.

See [Self-hosting](SELF_HOSTING.md), [Building](BUILDING.md), [Networking](NETWORKING.md), and [Troubleshooting](TROUBLESHOOTING.md).
