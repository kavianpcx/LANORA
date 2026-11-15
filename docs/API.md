# API reference

Base URL: `https://YOUR_DOMAIN/api/v1`. Errors are JSON: `{ "error": { "code": "...", "message": "..." } }`. API health and public room discovery need no token. Room tokens returned by create/join grant access only to that room and must not be logged or shared.

| Method | Path | Access | Body or result |
|---|---|---|---|
| GET | `/health` | Public | SQLite-backed status |
| GET | `/rooms` | Public | Public room metadata and member count; no secrets |
| POST | `/rooms` | Public, rate limited | `{name,username,maxPlayers?,visibility?,gameName?,password?,requireApproval?}`; room token and invite code |
| POST | `/rooms/join` | Public, rate limited | `{username,roomId?,inviteCode?,password?}`; public ID or invite code; room token |
| GET | `/rooms/{id}` | Approved room token | Members and room metadata |
| GET | `/rooms/{id}/membership` | Member token | Approval status |
| GET | `/rooms/{id}/network` | Approved room token | Room network identity/secret and configured relay peer URL |
| POST | `/rooms/{id}/leave` | Approved member token | Leave |
| POST | `/rooms/{id}/approve` | Host token | `{userId,approve}` |
| POST | `/rooms/{id}/invite/rotate` | Host token | Rotate invitation |
| PATCH | `/rooms/{id}/accepting` | Host token | `{accepting}` |
| DELETE | `/rooms/{id}` | Host token | Close |
| GET | `/events` | Approved room token | WebSocket room events; process-local |
| GET | `/admin/summary` | Separate admin token | Room/member counts, not live tunnel telemetry |

`GET /rooms` never lists private rooms. Joining private rooms by ID is rejected. Join/create are limited to 12 attempts per client IP per minute in this single API process. The API does not claim that membership equals live peer connectivity. Older account tables remain in SQLite migrations to preserve existing databases, but the account routes are disabled.
