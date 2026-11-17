# API reference

The default base URL is https://YOUR_DOMAIN/api/v1. Errors use JSON shaped like { "error": { "code": "...", "message": "..." } }. Responses use no-store caching. Public HTTPS is required for non-loopback addresses.

## Shared network

| Method | Path | Access | Request / response |
|---|---|---|---|
| GET | /health | Public | SQLite-backed API health |
| GET | /connection-info | Public | Returns server name, API version, and `playerAuth` (`password_required` or `passwordless`); contains no credentials |
| POST | /network/join | Public, rate limited | `{ password?, deviceId, username }`; accepts legacy `{ code, ... }` during compatibility migration. Returns a per-device bearer token, shared network configuration, and current app-online members |
| GET | /network/config | Shared-member bearer token | The authorized network name, secret, and relay URL |
| POST | /network/heartbeat | Shared-member bearer token | { virtualIp }; records an adapter IP reported by the desktop and returns members with a heartbeat in the last 30 seconds |
| POST | /network/leave | Shared-member bearer token | Revokes this device token and its presence row |
| GET | /admin/player-auth | Administrator bearer token | Returns the player policy and whether a password is configured |
| PATCH | /admin/player-auth | Administrator bearer token | `{ "playerAuth": "password_required", "password": "..." }` sets protection; `{ "playerAuth": "passwordless" }` disables only the player password |

The connection-info endpoint is discovery only. It returns no password hash, administrator token, player token, or EasyTier credential; the join endpoint still enforces the policy. Passwords are PBKDF2-SHA256 hashes. Passwordless joins still create a per-device API session and must pass the normal authorization checks on later requests. Administrator endpoints always require the private administrator bearer token. EasyTier relay credentials are separate from player authentication.

Policy changes revoke current shared-member API sessions and rotate the network name and secret. A modified client can keep a secret already delivered to its running EasyTier process; the server cannot force that old overlay to stop. The server limits join attempts to 12 per client address per minute. Device IDs are random 16-byte values kept locally by the app. Names are 2–32 characters. Reported IPv4 addresses must be valid unicast addresses.

A heartbeat proves that the app can reach the API. It does not prove that the IP is currently reachable through EasyTier. The peerStatus field from the API is intentionally unknown; the desktop determines tunnel route status independently using the local EasyTier CLI.

## Optional room API

Legacy room endpoints are retained for advanced compatibility:

| Method | Path | Access |
|---|---|---|
| GET | /rooms | Public room metadata |
| POST | /rooms | Public, rate limited; creates a room |
| POST | /rooms/join | Public, rate limited; joins by invite or room ID |
| GET | /rooms/{id} | Approved room token |
| GET | /rooms/{id}/membership | Room member token |
| GET | /rooms/{id}/network | Approved room token; returns room-specific EasyTier identity |
| POST | /rooms/{id}/leave | Approved member token |
| POST | /rooms/{id}/approve | Host token |
| POST | /rooms/{id}/invite/rotate | Host token |
| PATCH | /rooms/{id}/accepting | Host token |
| DELETE | /rooms/{id} | Host token |
| GET | /events | WebSocket room events; process-local |
| GET | /admin/summary | Separate admin token |

Room membership and shared-network membership use distinct bearer tokens. Do not log player passwords, legacy access codes, tokens, or network secrets.
