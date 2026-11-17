package api

import (
	"crypto/subtle"
	"database/sql"
	"errors"
	"net"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"
)

var sharedDeviceIDPattern = regexp.MustCompile("^[a-f0-9]{32}$")

type sharedJoinRequest struct {
	Code     string `json:"code"`
	DeviceID string `json:"deviceId"`
	Username string `json:"username"`
}

type sharedHeartbeatRequest struct {
	VirtualIP string `json:"virtualIp"`
}

type sharedNetworkMember struct {
	UserID     string `json:"userId"`
	Username   string `json:"username"`
	Role       string `json:"role"`
	Status     string `json:"status"`
	VirtualIP  string `json:"virtualIp,omitempty"`
	Online     bool   `json:"online"`
	PeerStatus string `json:"peerStatus"`
}

func (a *API) configureSharedNetwork(code string) {
	code = strings.TrimSpace(code)
	if len(code) < 16 || len(code) > 128 {
		if code != "" {
			a.log.Error("shared network disabled: access code must contain 16 to 128 bytes")
		}
		return
	}

	var name, secret, previousHash string
	err := a.db.QueryRow("SELECT network_name, network_secret, code_hash FROM shared_network WHERE id=1").Scan(&name, &secret, &previousHash)
	if errors.Is(err, sql.ErrNoRows) {
		id, randomErr := randomHex(16)
		if randomErr != nil {
			a.log.Error("shared network initialization failed", "error_type", "random")
			return
		}
		name = "lanora-" + id
		secret, randomErr = randomHex(32)
		if randomErr != nil {
			a.log.Error("shared network initialization failed", "error_type", "random")
			return
		}
		_, err = a.db.Exec(
			"INSERT INTO shared_network(id, network_name, network_secret, code_hash, created_at) VALUES(1, ?, ?, ?, ?)",
			name, secret, hash(code), time.Now().Unix(),
		)
	} else if err == nil {
		newHash := hash(code)
		if subtle.ConstantTimeCompare([]byte(previousHash), []byte(newHash)) != 1 {
			id, randomErr := randomHex(16)
			if randomErr != nil {
				a.log.Error("shared network rotation failed", "error_type", "random")
				return
			}
			rotatedName := "lanora-" + id
			rotatedSecret, randomErr := randomHex(32)
			if randomErr != nil {
				a.log.Error("shared network rotation failed", "error_type", "random")
				return
			}
			tx, txErr := a.db.Begin()
			if txErr != nil {
				a.log.Error("shared network rotation failed", "error_type", "database")
				return
			}
			if _, txErr = tx.Exec("DELETE FROM shared_members"); txErr == nil {
				_, txErr = tx.Exec(
					"UPDATE shared_network SET network_name=?, network_secret=?, code_hash=? WHERE id=1",
					rotatedName, rotatedSecret, newHash,
				)
			}
			if txErr != nil {
				_ = tx.Rollback()
				a.log.Error("shared network rotation failed", "error_type", "database")
				return
			}
			if txErr = tx.Commit(); txErr != nil {
				a.log.Error("shared network rotation failed", "error_type", "database")
				return
			}
			name, secret = rotatedName, rotatedSecret
		}
	}
	if err != nil {
		a.log.Error("shared network initialization failed", "error_type", "database")
		return
	}

	a.sharedNetworkCodeHash = hash(code)
	a.sharedNetworkName = name
	a.sharedNetworkSecret = secret
	a.sharedNetworkReady = true
}

func (a *API) joinSharedNetwork(w http.ResponseWriter, r *http.Request) {
	if !a.sharedNetworkReady {
		writeErr(w, 503, "shared_network_unconfigured", "Shared network access is not configured")
		return
	}
	var in sharedJoinRequest
	if !decode(w, r, &in) {
		return
	}
	in.Code = strings.TrimSpace(in.Code)
	in.DeviceID = strings.ToLower(strings.TrimSpace(in.DeviceID))
	in.Username = strings.TrimSpace(in.Username)
	if len(in.Code) < 16 || len(in.Code) > 128 ||
		!sharedDeviceIDPattern.MatchString(in.DeviceID) ||
		runeLen(in.Username) < 2 || runeLen(in.Username) > 32 {
		writeErr(w, 400, "invalid_input", "Access code, device id, or player name is invalid")
		return
	}
	if subtle.ConstantTimeCompare([]byte(hash(in.Code)), []byte(a.sharedNetworkCodeHash)) != 1 {
		writeErr(w, 401, "network_code_invalid", "The shared network access code is incorrect")
		return
	}
	peer, err := sharedRelayURL()
	if err != nil {
		writeErr(w, 503, "relay_unconfigured", "The server relay is not configured")
		return
	}
	token, err := randomHex(32)
	if err != nil {
		serverError(w, err)
		return
	}
	userID, err := randomHex(16)
	if err != nil {
		serverError(w, err)
		return
	}
	now := time.Now().Unix()
	_, err = a.db.Exec(
		`INSERT INTO shared_members(device_id, user_id, username, token_hash, virtual_ip, last_seen)
		 VALUES(?, ?, ?, ?, '', ?)
		 ON CONFLICT(device_id) DO UPDATE SET
		   user_id=excluded.user_id,
		   username=excluded.username,
		   token_hash=excluded.token_hash,
		   virtual_ip='',
		   last_seen=excluded.last_seen`,
		in.DeviceID, userID, in.Username, hash(token), now,
	)
	if err != nil {
		serverError(w, err)
		return
	}
	members, err := a.listSharedMembers()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{
		"userId":     userID,
		"accessToken": token,
		"status":     "approved",
		"network": map[string]string{
			"networkName":   a.sharedNetworkName,
			"networkSecret": a.sharedNetworkSecret,
			"peerUrl":       peer,
		},
		"members": members,
	})
}

func (a *API) sharedNetworkConfig(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.authenticateShared(w, r); !ok {
		return
	}
	if !a.sharedNetworkReady {
		writeErr(w, 503, "shared_network_unconfigured", "Shared network access is not configured")
		return
	}
	peer, err := sharedRelayURL()
	if err != nil {
		writeErr(w, 503, "relay_unconfigured", "The server relay is not configured")
		return
	}
	writeJSON(w, 200, map[string]string{
		"networkName":   a.sharedNetworkName,
		"networkSecret": a.sharedNetworkSecret,
		"peerUrl":       peer,
	})
}

func (a *API) sharedNetworkHeartbeat(w http.ResponseWriter, r *http.Request) {
	tokenHash, ok := a.authenticateShared(w, r)
	if !ok {
		return
	}
	var in sharedHeartbeatRequest
	if !decode(w, r, &in) {
		return
	}
	in.VirtualIP = strings.TrimSpace(in.VirtualIP)
	if in.VirtualIP != "" && !validSharedVirtualIP(in.VirtualIP) {
		writeErr(w, 400, "invalid_input", "Reported virtual IP is invalid")
		return
	}
	result, err := a.db.Exec(
		"UPDATE shared_members SET virtual_ip=?, last_seen=? WHERE token_hash=?",
		in.VirtualIP, time.Now().Unix(), tokenHash,
	)
	if err != nil {
		serverError(w, err)
		return
	}
	changed, _ := result.RowsAffected()
	if changed == 0 {
		writeErr(w, 401, "unauthorized", "Membership is no longer valid")
		return
	}
	members, err := a.listSharedMembers()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"members": members})
}

func (a *API) leaveSharedNetwork(w http.ResponseWriter, r *http.Request) {
	tokenHash, ok := a.authenticateShared(w, r)
	if !ok {
		return
	}
	if _, err := a.db.Exec("DELETE FROM shared_members WHERE token_hash=?", tokenHash); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 200, map[string]string{"status": "left"})
}

func (a *API) authenticateShared(w http.ResponseWriter, r *http.Request) (string, bool) {
	raw := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
	if raw == "" {
		writeErr(w, 401, "unauthorized", "Network token required")
		return "", false
	}
	var userID string
	err := a.db.QueryRow("SELECT user_id FROM shared_members WHERE token_hash=?", hash(raw)).Scan(&userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeErr(w, 401, "unauthorized", "Network token is invalid")
		} else {
			serverError(w, err)
		}
		return "", false
	}
	return hash(raw), true
}

func (a *API) listSharedMembers() ([]sharedNetworkMember, error) {
	cutoff := time.Now().Add(-30 * time.Second).Unix()
	rows, err := a.db.Query(
		"SELECT user_id, username, virtual_ip FROM shared_members WHERE last_seen>=? ORDER BY username, user_id",
		cutoff,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]sharedNetworkMember, 0)
	for rows.Next() {
		var member sharedNetworkMember
		if err := rows.Scan(&member.UserID, &member.Username, &member.VirtualIP); err != nil {
			return nil, err
		}
		member.Role = "member"
		member.Status = "approved"
		member.Online = true
		member.PeerStatus = "unknown"
		out = append(out, member)
	}
	return out, rows.Err()
}

func sharedRelayURL() (string, error) {
	peer := strings.TrimSpace(os.Getenv("LANORA_RELAY_PEER_URL"))
	u, err := url.Parse(peer)
	if err != nil || u == nil || (u.Scheme != "tcp" && u.Scheme != "udp") ||
		u.Hostname() == "" || u.Port() == "" || u.User != nil ||
		u.Path != "" || u.RawQuery != "" || u.Fragment != "" {
		return "", errors.New("invalid relay URL")
	}
	return peer, nil
}

func validSharedVirtualIP(raw string) bool {
	ip := net.ParseIP(raw)
	if ip == nil || ip.To4() == nil || ip.IsUnspecified() || ip.IsLoopback() || ip.IsMulticast() {
		return false
	}
	return raw != "255.255.255.255"
}
