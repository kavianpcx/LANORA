PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS rooms (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, host_id TEXT NOT NULL, host_token_hash TEXT NOT NULL,
 invite_hash TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL DEFAULT '', network_secret TEXT NOT NULL,
 max_players INTEGER NOT NULL, visibility TEXT NOT NULL, game_name TEXT NOT NULL DEFAULT '',
 approval INTEGER NOT NULL DEFAULT 0, accepting INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS members (
 room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE, user_id TEXT NOT NULL,
 username TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, role TEXT NOT NULL,
 status TEXT NOT NULL, joined_at TEXT NOT NULL, PRIMARY KEY(room_id,user_id)
);
CREATE INDEX IF NOT EXISTS members_token_idx ON members(token_hash);
