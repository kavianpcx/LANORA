## What changed?

<!-- Describe the user-facing or technical change. -->

## Validation

- [ ] `cd apps/web && npm ci && npm run build`
- [ ] `cd services/api && go test ./...` (Go 1.27+)
- [ ] `docker compose config` (if deployment files changed)
- [ ] Network/hardware test details included where relevant

Commands actually run and results:

## Limitations and risk

<!-- State what is not verified, API/config migrations, and security/network impact. -->

## Checklist

- [ ] Docs and tests updated where needed.
- [ ] No secrets, `.env`, generated binaries, or unlicensed assets added.
- [ ] Tunnel/IP/ping claims reflect measured results only.
