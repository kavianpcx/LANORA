# Security and privacy

LANORA is under active development and has not received an independent security audit. The controls below describe the current implementation, not a production certification.

## Implemented baseline

- HTTPS termination via Caddy in the supplied deployment.
- Cryptographically random bearer tokens and invite codes; the API stores token and invite hashes.
- PBKDF2-SHA256 password hashes with random salts for account and optional room passwords.
- Request body size limits and strict JSON decoding that rejects unknown fields.
- Process-local rate limits for registration, login and room join.
- Room-scoped tokens and host checks on room management endpoints.
- Native process launch uses a fixed executable path and argument structure; no backend-supplied arbitrary command is executed.

## Known risks and gaps

- Account tokens last 30 days; refresh rotation, email verification, account recovery and session management UI are absent.
- Web bearer tokens are held in `sessionStorage`; review XSS defenses, Content Security Policy and browser storage before production deployment.
- Account identity is stored on room membership, but there is no account-to-room history or session management UI; room operations use distinct room-scoped tokens.
- Rate limits are in-memory and key off observed remote address; distributed deployments need a shared limiter and trusted proxy handling.
- WebSocket event subscriptions are process-local and not authenticated through a browser-friendly secure session mechanism.
- A room network secret is stored in SQLite and is not yet consumed by the native engine; secret distribution/rotation/least-privilege need further review.
- Windows service privileges, adapter route ownership, firewall rule lifecycle, signing and teardown are not implemented/verified.
- Full transitive SBOM/license audit, fuzzing, penetration testing and production backup/restore exercise are outstanding.

## Deployment rules

Use HTTPS, unique high-entropy admin/relay secrets, strict CORS, least-privilege execution, protected backups, and firewall allowlists. Do not expose SQLite, Docker socket, API port directly, or administrator tokens. Do not automatically disable Windows Firewall. Do not place account tokens, room passwords, network secrets, or personal data in logs or bug reports.

## Vulnerability reporting

Do not open a public issue for an exploitable vulnerability. Use GitHub **Security → Advisories → Report a vulnerability** to send a private report. Include affected commit/version, impact and a minimal reproduction, and omit live credentials. The repository root [SECURITY.md](../SECURITY.md) links to the private advisory flow.
