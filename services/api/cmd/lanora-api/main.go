package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"lanora/services/api/internal/api"
	"lanora/services/api/internal/store"
)

func main() {
	if len(os.Args) == 2 && os.Args[1] == "admin-summary" {
		if err := adminSummaryCommand(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}
	if len(os.Args) >= 2 && os.Args[1] == "player-auth" {
		if err := playerAuthCommand(os.Args[2:]); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}
	if len(os.Args) == 2 && os.Args[1] == "healthcheck" {
		client := &http.Client{Timeout: 3 * time.Second}
		healthURL, err := healthcheckURL(env("LANORA_LISTEN_ADDR", ":8080"))
		if err != nil {
			os.Exit(1)
		}
		response, err := client.Get(healthURL)
		if err != nil {
			os.Exit(1)
		}
		response.Body.Close()
		if response.StatusCode != http.StatusOK {
			os.Exit(1)
		}
		return
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)
	dbPath := env("LANORA_DB_PATH", "data/lanora.db")
	db, err := store.Open(dbPath)
	if err != nil {
		logger.Error("database open failed", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	addr := env("LANORA_LISTEN_ADDR", ":8080")
	server := &http.Server{Addr: addr, Handler: api.New(db, logger, os.Getenv("LANORA_ADMIN_TOKEN")), ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 60 * time.Second}
	logger.Info("LANORA API starting", "addr", addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func adminSummaryCommand() error {
	token := strings.TrimSpace(os.Getenv("LANORA_ADMIN_TOKEN"))
	if token == "" {
		return fmt.Errorf("LANORA_ADMIN_TOKEN is not configured")
	}
	endpoint, err := healthcheckURL(env("LANORA_LISTEN_ADDR", ":8080"))
	if err != nil {
		return err
	}
	u, err := url.Parse(endpoint)
	if err != nil {
		return fmt.Errorf("could not prepare the local API address")
	}
	u.Path = "/api/v1/admin/summary"
	request, err := http.NewRequest(http.MethodGet, u.String(), nil)
	if err != nil {
		return fmt.Errorf("could not prepare the server summary request")
	}
	request.Header.Set("Authorization", "Bearer "+token)
	client := &http.Client{Timeout: 5 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return fmt.Errorf("could not reach the LANORA API inside the server container")
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("server summary is unavailable (HTTP %d)", response.StatusCode)
	}
	var summary struct {
		ActiveRooms         int `json:"activeRooms"`
		ApprovedMemberships int `json:"approvedMemberships"`
		ActiveSharedPlayers int `json:"activeSharedPlayers"`
	}
	if err := json.NewDecoder(io.LimitReader(response.Body, 16<<10)).Decode(&summary); err != nil {
		return fmt.Errorf("the API returned an invalid server summary")
	}
	fmt.Printf("Database/API summary: PASS\nActive shared players: %d\nApproved room memberships: %d\nRooms: %d\n", summary.ActiveSharedPlayers, summary.ApprovedMemberships, summary.ActiveRooms)
	return nil
}

func playerAuthCommand(args []string) error {
	if len(args) != 1 {
		return fmt.Errorf("usage: lanora-api player-auth {status|set|disable}")
	}
	token := strings.TrimSpace(os.Getenv("LANORA_ADMIN_TOKEN"))
	if token == "" {
		return fmt.Errorf("LANORA_ADMIN_TOKEN is not configured")
	}
	endpoint, err := healthcheckURL(env("LANORA_LISTEN_ADDR", ":8080"))
	if err != nil {
		return err
	}
	u, err := url.Parse(endpoint)
	if err != nil {
		return err
	}
	u.Path = "/api/v1/admin/player-auth"

	method := http.MethodGet
	var body []byte
	switch args[0] {
	case "status":
	case "set":
		password, readErr := io.ReadAll(io.LimitReader(os.Stdin, 4097))
		if readErr != nil {
			return fmt.Errorf("could not read password from stdin")
		}
		if len(password) > 4096 {
			return fmt.Errorf("password input is too long")
		}
		method = http.MethodPatch
		body, err = json.Marshal(map[string]string{"playerAuth": "password_required", "password": string(password)})
		for i := range password {
			password[i] = 0
		}
		if err != nil {
			return fmt.Errorf("could not prepare password update")
		}
	case "disable":
		method = http.MethodPatch
		body = []byte(`{"playerAuth":"passwordless"}`)
	default:
		return fmt.Errorf("usage: lanora-api player-auth {status|set|disable}")
	}
	defer func() {
		for i := range body {
			body[i] = 0
		}
	}()
	request, err := http.NewRequest(method, u.String(), bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("could not prepare player policy request")
	}
	request.Header.Set("Authorization", "Bearer "+token)
	if method != http.MethodGet {
		request.Header.Set("Content-Type", "application/json")
	}
	client := &http.Client{Timeout: 10 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return fmt.Errorf("could not reach the LANORA API inside the server container")
	}
	defer response.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(response.Body, 16<<10))
	if err != nil {
		return fmt.Errorf("could not read the API response")
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		var result struct {
			Error struct {
				Code string `json:"code"`
			} `json:"error"`
		}
		_ = json.Unmarshal(responseBody, &result)
		switch result.Error.Code {
		case "weak_password":
			return fmt.Errorf("use at least 12 characters, and either 16 characters or at least three character types")
		case "unauthorized":
			return fmt.Errorf("administrator authentication failed; check LANORA_ADMIN_TOKEN")
		default:
			return fmt.Errorf("player policy request failed (HTTP %d)", response.StatusCode)
		}
	}
	var result struct {
		PlayerAuth string `json:"playerAuth"`
		Configured bool   `json:"configured"`
	}
	if err := json.Unmarshal(responseBody, &result); err != nil {
		return fmt.Errorf("the API returned an invalid player policy")
	}
	if args[0] == "status" {
		switch result.PlayerAuth {
		case "password_required":
			if result.Configured {
				fmt.Println("Player password: required")
			} else {
				fmt.Println("Player password: required (not configured)")
			}
		case "passwordless":
			fmt.Println("Player password: disabled")
		default:
			return fmt.Errorf("the API returned an unknown player policy")
		}
		return nil
	}
	if !result.Configured {
		return fmt.Errorf("the API did not confirm the player policy update")
	}
	fmt.Println("Player password policy updated. Existing player sessions were revoked.")
	return nil
}

func env(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}
