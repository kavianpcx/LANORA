package store

import (
	"database/sql"
	"embed"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"sort"
	"time"

	_ "modernc.org/sqlite"
)

type DB struct { *sql.DB }

//go:embed migrations/*.sql
var migrationFiles embed.FS

func Open(path string) (*DB, error) {
	if path != ":memory:" { if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil { return nil, err } }
	db, err := sql.Open("sqlite", path)
	if err != nil { return nil, err }
	db.SetMaxOpenConns(1)
	if _, err = db.Exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;`); err != nil { db.Close(); return nil, fmt.Errorf("configure sqlite: %w", err) }
	if err = migrate(db); err != nil { db.Close(); return nil, fmt.Errorf("migrate: %w", err) }
	return &DB{db}, nil
}

func migrate(db *sql.DB) error {
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`); err != nil { return err }
	entries, err := migrationFiles.ReadDir("migrations")
	if err != nil { return err }
	sort.Slice(entries, func(i, j int) bool { return entries[i].Name() < entries[j].Name() })
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".sql" { continue }
		var exists int
		err := db.QueryRow(`SELECT 1 FROM schema_migrations WHERE version=?`, entry.Name()).Scan(&exists)
		if err == nil { continue }
		if err != sql.ErrNoRows { return err }
		contents, err := migrationFiles.ReadFile(path.Join("migrations", entry.Name()))
		if err != nil { return err }
		tx, err := db.Begin()
		if err != nil { return err }
		if _, err = tx.Exec(string(contents)); err != nil { _ = tx.Rollback(); return fmt.Errorf("apply %s: %w", entry.Name(), err) }
		if _, err = tx.Exec(`INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)`, entry.Name(), time.Now().UTC().Format(time.RFC3339Nano)); err != nil { _ = tx.Rollback(); return err }
		if err = tx.Commit(); err != nil { return err }
	}
	return nil
}
