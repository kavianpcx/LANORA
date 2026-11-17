package main

import (
	"fmt"
	"net"
	"net/url"
	"strings"
)

// healthcheckURL probes the API listener from inside its container. Wildcard
// bind addresses are replaced with loopback because they are not dial targets.
func healthcheckURL(listenAddr string) (string, error) {
	if strings.TrimSpace(listenAddr) == "" {
		listenAddr = ":8080"
	}
	host, port, err := net.SplitHostPort(listenAddr)
	if err != nil {
		return "", fmt.Errorf("invalid LANORA_LISTEN_ADDR: %w", err)
	}
	if port == "" {
		return "", fmt.Errorf("invalid LANORA_LISTEN_ADDR: missing port")
	}
	if host == "" || host == "0.0.0.0" || host == "::" {
		host = "127.0.0.1"
	}
	u := url.URL{
		Scheme: "http",
		Host:   net.JoinHostPort(host, port),
		Path:   "/api/v1/health",
	}
	return u.String(), nil
}
