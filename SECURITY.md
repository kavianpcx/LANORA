# Security policy

LANORA is a development project. The API has baseline input validation, hashed bearer tokens, PBKDF2 password hashes, request size limits and process-local rate limiting. It has not undergone an independent security review.

## Report a vulnerability

Do not open a public issue for an exploitable vulnerability. Use GitHub **Security → Advisories → Report a vulnerability** for a private report: https://github.com/kavianpcx/lanora/security/advisories/new . Include affected commit/version, impact, and a minimal reproduction. Do not attach real account tokens, invite passwords, or network secrets.

## Current limitations

Account tokens expire after 30 days and lack refresh rotation/email verification. The web app holds bearer credentials in sessionStorage. Room membership is linked to an account, while room-scoped tokens remain distinct from account sessions. Rate limits and WebSocket events are process-local. The native tunnel is not integrated and has no reviewed key lifecycle. There is no signed desktop release or penetration test. See [detailed security notes](docs/SECURITY.md).

For deployment, use HTTPS, unique secrets, restrictive CORS, least privilege and firewall allowlists. Never disable Windows Firewall as a troubleshooting shortcut.
