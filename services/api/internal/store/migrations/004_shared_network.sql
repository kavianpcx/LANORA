CREATE TABLE IF NOT EXISTS shared_network (
 id INTEGER PRIMARY KEY CHECK(id=1),
 network_name TEXT NOT NULL UNIQUE,
 network_secret TEXT NOT NULL,
 code_hash TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS shared_members (
 device_id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL UNIQUE,
 username TEXT NOT NULL,
 token_hash TEXT NOT NULL UNIQUE,
 virtual_ip TEXT NOT NULL DEFAULT '',
 last_seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS shared_members_seen_idx ON shared_members(last_seen);
