# Contributing to LANORA

Thanks for helping improve LANORA. The current project is a experimental desktop/server project; two-PC networking is not verified. Please keep issue descriptions, screenshots and release notes honest about what has actually been implemented and tested.

## Before opening a change

1. Search open issues and discussions for related work.
2. For larger changes, open an issue first to align on API/security/network implications.
3. Keep pull requests focused. Do not bundle unrelated formatting or generated files.
4. Never commit secrets, `.env`, access tokens, live user data, or unlicensed third-party assets.

## Local checks

```sh
cd apps/desktop
npm ci
npm run build
```

With Go 1.27+:

```sh
cd services/api
go test ./...
go vet ./...
```

For deployment changes, also validate `docker compose config`. Hardware/network tests must state the two-client, NAT, OS, engine version and protocol actually tested. Do not report an unrun check as passed.

## Design and security expectations

- Keep the desktop English and Persian experiences accessible and the Persian layout RTL and keyboard accessible.
- Do not fabricate tunnel, IP, ping, packet loss, peer or NAT values.
- Keep control-plane and data-plane responsibilities separate.
- Do not add backend-controlled command execution or broad firewall/route changes.
- Add/update tests and docs when changing API contracts or room membership.
- Preserve third-party licenses and update `THIRD_PARTY_LICENSES.md` when dependencies change.

## Pull requests

Use the PR template. Explain the change, validation run, limitations and any migration/configuration impact. A passing web build does not verify the Windows network engine.
