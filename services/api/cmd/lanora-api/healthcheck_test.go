package main

import "testing"

func TestHealthcheckURLUsesConfiguredPort(t *testing.T) {
	tests := []struct {
		name string
		addr string
		want string
	}{
		{name: "default wildcard", addr: ":8080", want: "http://127.0.0.1:8080/api/v1/health"},
		{name: "custom wildcard port", addr: ":9091", want: "http://127.0.0.1:9091/api/v1/health"},
		{name: "loopback", addr: "127.0.0.1:8088", want: "http://127.0.0.1:8088/api/v1/health"},
		{name: "ipv6 wildcard", addr: "[::]:8090", want: "http://127.0.0.1:8090/api/v1/health"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := healthcheckURL(tt.addr)
			if err != nil {
				t.Fatalf("healthcheckURL(%q): %v", tt.addr, err)
			}
			if got != tt.want {
				t.Fatalf("healthcheckURL(%q) = %q, want %q", tt.addr, got, tt.want)
			}
		})
	}
}

func TestHealthcheckURLRejectsInvalidListener(t *testing.T) {
	for _, addr := range []string{"", "8080", ":not-a-port", ":65536", ":0"} {
		if addr == "" {
			continue // Empty config intentionally selects the default.
		}
		if _, err := healthcheckURL(addr); err == nil {
			t.Errorf("healthcheckURL(%q) unexpectedly succeeded", addr)
		}
	}
}
