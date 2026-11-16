package main

import (
	"log/slog"
	"net/http"
	"os"
	"time"

	"lanora/services/api/internal/api"
	"lanora/services/api/internal/store"
)

func main() {
    if len(os.Args) == 2 && os.Args[1] == "healthcheck" {
        client := &http.Client{Timeout: 3*time.Second}
        response, err := client.Get("http://127.0.0.1:8080/api/v1/health")
        if err != nil { os.Exit(1) }
        response.Body.Close()
        if response.StatusCode != http.StatusOK { os.Exit(1) }
        return
    }
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)
	dbPath := env("LANORA_DB_PATH", "data/lanora.db")
	db, err := store.Open(dbPath)
	if err != nil { logger.Error("database open failed", "error", err); os.Exit(1) }
	defer db.Close()
	addr := env("LANORA_LISTEN_ADDR", ":8080")
	server := &http.Server{Addr: addr, Handler: api.New(db, logger, os.Getenv("LANORA_ADMIN_TOKEN")), ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 60 * time.Second}
	logger.Info("LANORA API starting", "addr", addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed { logger.Error("server stopped", "error", err); os.Exit(1) }
}

func env(k, fallback string) string { if v := os.Getenv(k); v != "" { return v }; return fallback }
