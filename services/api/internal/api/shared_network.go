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
	"unicode"
	"unicode/utf8"

	"lanora/services/api/internal/store"
)

var sharedDeviceIDPattern = regexp.MustCompile("^[a-f0-9]{32}$")

type sharedJoinRequest struct {
	Code     string `json:"code"` // Kept for clients from the previous alpha releases.
	Password string `json:"password"`
	DeviceID string `json:"deviceId"`
	Username string `json:"username"`
	Avatar   string `json:"avatar"`
}

type sharedNetworkState struct {
	Name         string
	Secret       string
	PlayerAuth   string
	PasswordHash string
}

type sharedHeartbeatRequest struct {
	VirtualIP string `json:"virtualIp"`
}

type sharedNetworkMember struct {
	UserID     string `json:"userId"`
	Username   string `json:"username"`
	Avatar     string `json:"avatar"`
	Role       string `json:"role"`
	Status     string `json:"status"`
	VirtualIP  string `json:"virtualIp,omitempty"`
	Online     bool   `json:"online"`
	PeerStatus string `json:"peerStatus"`
}

var playerAvatars = map[string]bool{
	"fox": true, "cat": true, "bear": true, "dog": true, "owl": true, "panda": true,
	"rabbit": true, "frog": true, "tiger": true, "penguin": true, "koala": true,
	"duck": true, "axolotl": true, "raccoon": true, "dragon": true, "robot": true, "ghost": true,
}

func normalizeProfile(deviceID, avatar string) (string, string, error) {
	deviceID = strings.ToLower(strings.TrimSpace(deviceID))
	if deviceID == "" {
		var err error
		deviceID, err = randomHex(16)
		if err != nil {
			return "", "", err
		}
	}
	avatar = strings.TrimSpace(avatar)
	if !sharedDeviceIDPattern.MatchString(deviceID) || (avatar != "" && !playerAvatars[avatar]) {
		return "", "", errors.New("invalid profile")
	}
	return deviceID, avatar, nil
}

func existingAvatar(db *store.DB, deviceID, requested string) string {
	if playerAvatars[requested] {
		return requested
	}
	var saved string
	if err := db.QueryRow(`SELECT avatar FROM player_profiles WHERE device_id=?`, deviceID).Scan(&saved); err == nil && playerAvatars[saved] {
		return saved
	}
	return "fox"
}

func storePlayerProfile(tx *sql.Tx, deviceID, username, avatar string) error {
	_, err := tx.Exec(`INSERT INTO player_profiles(device_id,username,avatar,updated_at) VALUES(?,?,?,?)
		ON CONFLICT(device_id) DO UPDATE SET username=excluded.username, avatar=excluded.avatar, updated_at=excluded.updated_at`,
		deviceID, username, avatar, time.Now().Unix())
	return err
}

type playerProfileUpdate struct {
	Username string `json:"username"`
	Avatar   string `json:"avatar"`
}

func validateProfileUpdate(w http.ResponseWriter, in *playerProfileUpdate) bool {
	in.Username = strings.TrimSpace(in.Username)
	if runeLen(in.Username) < 2 || runeLen(in.Username) > 32 || !playerAvatars[in.Avatar] {
		writeErr(w, 400, "invalid_profile", "Player name or avatar is invalid")
		return false
	}
	return true
}

func (a *API) updateSharedProfile(w http.ResponseWriter, r *http.Request) {
	tokenHash, ok := a.authenticateShared(w, r)
	if !ok {
		return
	}
	var in playerProfileUpdate
	if !decode(w, r, &in) || !validateProfileUpdate(w, &in) {
		return
	}
	var deviceID string
	if err := a.db.QueryRow(`SELECT device_id FROM shared_members WHERE token_hash=?`, tokenHash).Scan(&deviceID); err != nil {
		writeErr(w, 401, "unauthorized", "Network token is invalid")
		return
	}
	tx, err := a.db.Begin()
	if err != nil {
		serverError(w, err)
		return
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`UPDATE shared_members SET username=? WHERE token_hash=?`, in.Username, tokenHash); err == nil {
		err = storePlayerProfile(tx, deviceID, in.Username, in.Avatar)
	}
	if err != nil {
		serverError(w, err)
		return
	}
	if err = tx.Commit(); err != nil {
		serverError(w, err)
		return
	}
	members, err := a.listSharedMembers()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"members": members})
}

func (a *API) updateRoomProfile(w http.ResponseWriter, r *http.Request) {
	p, ok := a.authenticate(w, r)
	if !ok {
		return
	}
	id := r.PathValue("id")
	if p.RoomID != id {
		writeErr(w, 403, "forbidden", "دسترسی مجاز نیست")
		return
	}
	var in playerProfileUpdate
	if !decode(w, r, &in) || !validateProfileUpdate(w, &in) {
		return
	}
	var deviceID string
	if err := a.db.QueryRow(`SELECT device_id FROM members WHERE room_id=? AND user_id=?`, id, p.UserID).Scan(&deviceID); err != nil {
		writeErr(w, 401, "unauthorized", "Membership is no longer valid")
		return
	}
	tx, err := a.db.Begin()
	if err != nil {
		serverError(w, err)
		return
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`UPDATE members SET username=?, last_seen=? WHERE room_id=? AND user_id=?`, in.Username, time.Now().Unix(), id, p.UserID); err == nil {
		err = storePlayerProfile(tx, deviceID, in.Username, in.Avatar)
	}
	if err != nil {
		serverError(w, err)
		return
	}
	if err = tx.Commit(); err != nil {
		serverError(w, err)
		return
	}
	a.publish(id, "member.profile_changed", map[string]string{"userId": p.UserID})
	writeJSON(w, 200, map[string]string{"status": "updated"})
}

func (a *API) configureSharedNetwork(legacyCode string) {
	legacyCode = strings.TrimSpace(legacyCode)
	var state sharedNetworkState
	var legacyHash string
	err := a.db.QueryRow(`SELECT network_name, network_secret, code_hash, player_auth, password_hash
		FROM shared_network WHERE id=1`).Scan(&state.Name, &state.Secret, &legacyHash, &state.PlayerAuth, &state.PasswordHash)
	if errors.Is(err, sql.ErrNoRows) {
		id, randomErr := randomHex(16)
		if randomErr != nil {
			a.log.Error("shared network initialization failed", "error_type", "random")
			return
		}
		state.Name = "lanora-" + id
		state.Secret, randomErr = randomHex(32)
		if randomErr != nil {
			a.log.Error("shared network initialization failed", "error_type", "random")
			return
		}
		state.PlayerAuth = "password_required"
		legacyHash := ""
		if validLegacyCode(legacyCode) {
			state.PasswordHash, randomErr = makePasswordHash(legacyCode)
			if randomErr != nil {
				a.log.Error("shared network initialization failed", "error_type", "password_hash")
				return
			}
		}
		_, err = a.db.Exec(`INSERT INTO shared_network(id, network_name, network_secret, code_hash, created_at, player_auth, password_hash)
			VALUES(1, ?, ?, ?, ?, ?, ?)`, state.Name, state.Secret, legacyHash, time.Now().Unix(), state.PlayerAuth, state.PasswordHash)
	} else if err == nil {
		if state.PlayerAuth == "" {
			state.PlayerAuth = "password_required"
		}
		// Existing alpha servers stored SHA-256(code) in code_hash and kept the
		// high-entropy code in .env. Upgrade it once to the password hash format
		// without changing the current network when the code still matches.
		legacyCodeChanged := false
		if validLegacyCode(legacyCode) {
			if legacyHash != "" {
				legacyCodeChanged = subtle.ConstantTimeCompare([]byte(legacyHash), []byte(hash(legacyCode))) != 1
			} else if state.PasswordHash != "" {
				legacyCodeChanged = !checkPasswordHash(state.PasswordHash, legacyCode)
			}
		}
		if state.PlayerAuth == "password_required" && validLegacyCode(legacyCode) &&
			(state.PasswordHash == "" || legacyCodeChanged) {
			passwordHash, hashErr := makePasswordHash(legacyCode)
			if hashErr != nil {
				a.log.Error("shared network migration failed", "error_type", "password_hash")
				return
			}
			if legacyCodeChanged {
				id, randomErr := randomHex(16)
				if randomErr != nil {
					a.log.Error("shared network rotation failed", "error_type", "random")
					return
				}
				state.Name = "lanora-" + id
				state.Secret, randomErr = randomHex(32)
				if randomErr != nil {
					a.log.Error("shared network rotation failed", "error_type", "random")
					return
				}
			}
			state.PasswordHash = passwordHash
			tx, txErr := a.db.Begin()
			if txErr == nil && legacyCodeChanged {
				_, txErr = tx.Exec("DELETE FROM shared_members")
			}
			if txErr == nil {
				_, txErr = tx.Exec(`UPDATE shared_network SET network_name=?, network_secret=?, code_hash='',
					player_auth='password_required', password_hash=? WHERE id=1`, state.Name, state.Secret, passwordHash)
			}
			if txErr != nil {
				if tx != nil {
					_ = tx.Rollback()
				}
				a.log.Error("shared network migration failed", "error_type", "database")
				return
			}
			err = tx.Commit()
		} else if state.PlayerAuth == "passwordless" && legacyHash != "" {
			_, err = a.db.Exec("UPDATE shared_network SET code_hash='' WHERE id=1")
		}
	}
	if err != nil {
		a.log.Error("shared network initialization failed", "error_type", "database")
	}
}

func validLegacyCode(code string) bool { return len(code) >= 16 && len(code) <= 128 }

func (a *API) loadSharedNetwork() (sharedNetworkState, error) {
	var state sharedNetworkState
	err := a.db.QueryRow(`SELECT network_name, network_secret, player_auth, password_hash
		FROM shared_network WHERE id=1`).Scan(&state.Name, &state.Secret, &state.PlayerAuth, &state.PasswordHash)
	if err != nil {
		return sharedNetworkState{}, err
	}
	if state.PlayerAuth != "password_required" && state.PlayerAuth != "passwordless" {
		return sharedNetworkState{}, errors.New("invalid player authentication policy")
	}
	return state, nil
}

func (a *API) connectionInfo(w http.ResponseWriter, r *http.Request) {
	state, err := a.loadSharedNetwork()
	if err != nil {
		writeErr(w, 503, "shared_network_unconfigured", "Server connection information is unavailable")
		return
	}
	writeJSON(w, 200, map[string]string{
		"serverName": "LANORA Server",
		"playerAuth": state.PlayerAuth,
		"apiVersion": "v1",
	})
}

type playerAuthUpdate struct {
	PlayerAuth string `json:"playerAuth"`
	Password   string `json:"password"`
}

func (a *API) adminPlayerAuth(w http.ResponseWriter, r *http.Request) {
	if !a.authorizeAdmin(w, r) {
		return
	}
	state, err := a.loadSharedNetwork()
	if err != nil {
		writeErr(w, 503, "shared_network_unconfigured", "Player authentication policy is unavailable")
		return
	}
	writeJSON(w, 200, map[string]any{
		"playerAuth": state.PlayerAuth,
		"configured": state.PlayerAuth == "passwordless" || state.PasswordHash != "",
	})
}

func (a *API) updateAdminPlayerAuth(w http.ResponseWriter, r *http.Request) {
	if !a.authorizeAdmin(w, r) {
		return
	}
	var in playerAuthUpdate
	if !decode(w, r, &in) {
		return
	}
	var passwordHash string
	switch in.PlayerAuth {
	case "password_required":
		if !validPlayerPassword(in.Password) {
			writeErr(w, 400, "weak_password", "Use at least 12 characters and either 16 characters or at least three character types")
			return
		}
		var err error
		passwordHash, err = makePasswordHash(in.Password)
		if err != nil {
			serverError(w, err)
			return
		}
	case "passwordless":
		if in.Password != "" {
			writeErr(w, 400, "invalid_input", "A password must not be included when disabling player password protection")
			return
		}
	default:
		writeErr(w, 400, "invalid_input", "Player authentication must be password_required or passwordless")
		return
	}

	a.joinMu.Lock()
	defer a.joinMu.Unlock()
	id, err := randomHex(16)
	if err != nil {
		serverError(w, err)
		return
	}
	secret, err := randomHex(32)
	if err != nil {
		serverError(w, err)
		return
	}
	tx, err := a.db.Begin()
	if err != nil {
		serverError(w, err)
		return
	}
	if _, err = tx.Exec("DELETE FROM shared_members"); err == nil {
		_, err = tx.Exec(`UPDATE shared_network SET network_name=?, network_secret=?, code_hash='',
			player_auth=?, password_hash=? WHERE id=1`, "lanora-"+id, secret, in.PlayerAuth, passwordHash)
	}
	if err != nil {
		_ = tx.Rollback()
		serverError(w, err)
		return
	}
	if err = tx.Commit(); err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{
		"playerAuth":      in.PlayerAuth,
		"configured":      true,
		"sessionsRevoked": true,
	})
}

func validPlayerPassword(password string) bool {
	if !utf8.ValidString(password) || len(password) > 128 || runeLen(password) < 12 {
		return false
	}
	var lower, upper, digit, other bool
	for _, char := range password {
		switch {
		case unicode.IsLower(char):
			lower = true
		case unicode.IsUpper(char):
			upper = true
		case unicode.IsDigit(char):
			digit = true
		default:
			other = true
		}
	}
	classes := 0
	for _, present := range []bool{lower, upper, digit, other} {
		if present {
			classes++
		}
	}
	return runeLen(password) >= 16 || classes >= 3
}

func (a *API) joinSharedNetwork(w http.ResponseWriter, r *http.Request) {
	a.joinMu.Lock()
	defer a.joinMu.Unlock()
	var in sharedJoinRequest
	if !decode(w, r, &in) {
		return
	}
	var err error
	in.Code = strings.TrimSpace(in.Code)
	if len(in.Password) > 128 || len(in.Code) > 128 || (in.Password != "" && in.Code != "") {
		writeErr(w, 400, "invalid_input", "Password, access code, or player name is invalid")
		return
	}
	in.DeviceID = strings.ToLower(strings.TrimSpace(in.DeviceID))
	in.Username = strings.TrimSpace(in.Username)
	in.DeviceID, in.Avatar, err = normalizeProfile(in.DeviceID, in.Avatar)
	if err != nil {
		writeErr(w, 400, "invalid_profile", "Device id or avatar is invalid")
		return
	}
	in.Avatar = existingAvatar(a.db, in.DeviceID, in.Avatar)
	if !sharedDeviceIDPattern.MatchString(in.DeviceID) ||
		runeLen(in.Username) < 2 || runeLen(in.Username) > 32 {
		writeErr(w, 400, "invalid_input", "Device id or player name is invalid")
		return
	}
	state, err := a.loadSharedNetwork()
	if err != nil {
		writeErr(w, 503, "shared_network_unconfigured", "Shared network access is not configured")
		return
	}
	if state.PlayerAuth == "password_required" {
		if state.PasswordHash == "" {
			writeErr(w, 503, "player_auth_unconfigured", "Player password protection has not been configured")
			return
		}
		credential := in.Password
		if credential == "" {
			credential = in.Code
		}
		if !checkPasswordHash(state.PasswordHash, credential) {
			writeErr(w, 401, "network_password_invalid", "The server password is incorrect")
			return
		}
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
	tx, err := a.db.Begin()
	if err != nil {
		serverError(w, err)
		return
	}
	defer tx.Rollback()
	_, err = tx.Exec(
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
	if err == nil {
		err = storePlayerProfile(tx, in.DeviceID, in.Username, in.Avatar)
	}
	if err != nil {
		serverError(w, err)
		return
	}
	if err = tx.Commit(); err != nil {
		serverError(w, err)
		return
	}
	members, err := a.listSharedMembers()
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{
		"userId":      userID,
		"accessToken": token,
		"status":      "approved",
		"network": map[string]string{
			"networkName":   state.Name,
			"networkSecret": state.Secret,
			"peerUrl":       peer,
		},
		"members": members,
	})
}

func (a *API) sharedNetworkConfig(w http.ResponseWriter, r *http.Request) {
	a.joinMu.Lock()
	defer a.joinMu.Unlock()
	if _, ok := a.authenticateShared(w, r); !ok {
		return
	}
	state, err := a.loadSharedNetwork()
	if err != nil {
		writeErr(w, 503, "shared_network_unconfigured", "Shared network access is not configured")
		return
	}
	peer, err := sharedRelayURL()
	if err != nil {
		writeErr(w, 503, "relay_unconfigured", "The server relay is not configured")
		return
	}
	writeJSON(w, 200, map[string]string{
		"networkName":   state.Name,
		"networkSecret": state.Secret,
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
		`SELECT m.user_id,m.username,COALESCE(p.avatar,'fox'),m.virtual_ip FROM shared_members m
		 LEFT JOIN player_profiles p ON p.device_id=m.device_id WHERE m.last_seen>=? ORDER BY m.username,m.user_id`,
		cutoff,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]sharedNetworkMember, 0)
	for rows.Next() {
		var member sharedNetworkMember
		if err := rows.Scan(&member.UserID, &member.Username, &member.Avatar, &member.VirtualIP); err != nil {
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
