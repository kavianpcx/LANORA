ALTER TABLE shared_network ADD COLUMN player_auth TEXT NOT NULL DEFAULT 'password_required';
ALTER TABLE shared_network ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';
