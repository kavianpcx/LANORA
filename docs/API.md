# API reference

Base path `/api/v1`. Errors: `{ "error": { "code": "...", "message": "..." } }`. Bearer credentials use `Authorization: Bearer <token>`.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | No | SQLite-backed health |
| POST | `/auth/register` | No | `{email,password,displayName}`; password >=10 chars |
| POST | `/auth/login` | No | Returns account token (30-day expiry) |
| GET/PATCH | `/auth/me` | Account | Read profile / `{displayName}` update |
| POST | `/auth/logout` | Account | Revoke account session |
| POST | `/rooms` | Account | `{name,password?,maxPlayers?,visibility?,gameName?,requireApproval?}`; returns invite code and room token |
| POST | `/rooms/join` | Account | `{inviteCode,password?}`; returns room token |
| GET | `/rooms/{id}` | Room token | Room and members |
| GET | `/rooms/{id}/membership` | Room token | Approval state; currently also returns room secret when approved |
| POST | `/rooms/{id}/leave` | Member token | Leave room |
| POST | `/rooms/{id}/approve` | Host token | `{userId,approve}` |
| POST | `/rooms/{id}/invite/rotate` | Host token | Rotate invite code |
| PATCH | `/rooms/{id}/accepting` | Host token | `{accepting}` |
| POST | `/rooms/{id}/members/{userId}/kick` | Host token | Remove member |
| DELETE | `/rooms/{id}` | Host token | Close room |
| GET (WebSocket) | `/events` | Room token | Room events; in-memory subscribers |
| GET | `/admin/summary` | Admin token | Minimal room/member counts |

Room creation/join require an account token; the server derives the member display name and records the account ID. Subsequent room operations use a separate room-scoped token. Account registration alone does not grant room access. Rate limits/validation exist, but distributed limiting and production threat review remain outstanding.
