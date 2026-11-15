ALTER TABLE members ADD COLUMN account_id TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS members_account_room_idx ON members(room_id,account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS members_account_idx ON members(account_id);
