package api

import (
	"database/sql"
	"errors"
	"net/http"
	"net/mail"
	"strings"
	"time"
)

type account struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	CreatedAt   string `json:"createdAt"`
}

type credentials struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
}

func (a *API) register(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if !decode(w, r, &in) { return }
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	in.DisplayName = strings.TrimSpace(in.DisplayName)
	parsed, err := mail.ParseAddress(in.Email)
	if err != nil || parsed.Address != in.Email || len(in.Email) > 254 || runeLen(in.DisplayName) < 2 || runeLen(in.DisplayName) > 32 || len(in.Password) < 10 || len(in.Password) > 128 {
		writeErr(w, 400, "invalid_registration", "ایمیل، نام نمایشی یا رمز عبور معتبر نیست؛ رمز باید حداقل ۱۰ نویسه باشد")
		return
	}
	id, err := randomHex(16)
	if err != nil { serverError(w, err); return }
	token, err := randomHex(32)
	if err != nil { serverError(w, err); return }
	passwordHash, err := makePasswordHash(in.Password)
	if err != nil { serverError(w, err); return }
	now := time.Now().UTC()
	created := now.Format(time.RFC3339Nano)
	expires := now.Add(30 * 24 * time.Hour).Format(time.RFC3339Nano)
	tx, err := a.db.Begin()
	if err != nil { serverError(w, err); return }
	defer tx.Rollback()
	_, err = tx.Exec(`INSERT INTO users(id,email,display_name,password_hash,created_at) VALUES(?,?,?,?,?)`, id, in.Email, in.DisplayName, passwordHash, created)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") { writeErr(w, 409, "email_exists", "این ایمیل قبلاً ثبت شده است"); return }
		serverError(w, err); return
	}
	_, err = tx.Exec(`INSERT INTO auth_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)`, hash(token), id, expires, created)
	if err != nil { serverError(w, err); return }
	if err = tx.Commit(); err != nil { serverError(w, err); return }
	writeJSON(w, 201, map[string]any{"accessToken": token, "user": account{ID:id, Email:in.Email, DisplayName:in.DisplayName, CreatedAt:created}})
}

func (a *API) login(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if !decode(w, r, &in) { return }
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	var user account
	var passwordHash string
	err := a.db.QueryRow(`SELECT id,email,display_name,created_at,password_hash FROM users WHERE email=?`, in.Email).Scan(&user.ID, &user.Email, &user.DisplayName, &user.CreatedAt, &passwordHash)
	if errors.Is(err, sql.ErrNoRows) || (err == nil && !checkPasswordHash(passwordHash, in.Password)) { writeErr(w, 401, "invalid_credentials", "ایمیل یا رمز عبور درست نیست"); return }
	if err != nil { serverError(w, err); return }
	token, err := randomHex(32)
	if err != nil { serverError(w, err); return }
	now := time.Now().UTC()
	created := now.Format(time.RFC3339Nano)
	expires := now.Add(30 * 24 * time.Hour).Format(time.RFC3339Nano)
	if _, err = a.db.Exec(`INSERT INTO auth_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)`, hash(token), user.ID, expires, created); err != nil { serverError(w, err); return }
	writeJSON(w, 200, map[string]any{"accessToken": token, "user": user})
}

func (a *API) getMe(w http.ResponseWriter, r *http.Request) {
	user, ok := a.authenticatedAccount(w, r)
	if ok { writeJSON(w, 200, map[string]any{"user": user}) }
}

func (a *API) updateMe(w http.ResponseWriter, r *http.Request) {
	user, ok := a.authenticatedAccount(w, r)
	if !ok { return }
	var in struct { DisplayName string `json:"displayName"` }
	if !decode(w, r, &in) { return }
	in.DisplayName = strings.TrimSpace(in.DisplayName)
	if runeLen(in.DisplayName) < 2 || runeLen(in.DisplayName) > 32 { writeErr(w, 400, "invalid_display_name", "نام نمایشی باید ۲ تا ۳۲ نویسه باشد"); return }
	if _, err := a.db.Exec(`UPDATE users SET display_name=? WHERE id=?`, in.DisplayName, user.ID); err != nil { serverError(w, err); return }
	user.DisplayName = in.DisplayName
	writeJSON(w, 200, map[string]any{"user": user})
}

func (a *API) logout(w http.ResponseWriter, r *http.Request) {
	raw := bearerToken(r)
	if raw == "" { writeErr(w, 401, "unauthorized", "توکن دسترسی لازم است"); return }
	if _, err := a.db.Exec(`DELETE FROM auth_sessions WHERE token_hash=?`, hash(raw)); err != nil { serverError(w, err); return }
	writeJSON(w, 200, map[string]string{"status":"signed_out"})
}

func (a *API) authenticatedAccount(w http.ResponseWriter, r *http.Request) (account, bool) {
	raw := bearerToken(r)
	if raw == "" { writeErr(w, 401, "unauthorized", "ابتدا وارد حساب شو"); return account{}, false }
	var user account
	err := a.db.QueryRow(`SELECT u.id,u.email,u.display_name,u.created_at FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`, hash(raw), time.Now().UTC().Format(time.RFC3339Nano)).Scan(&user.ID,&user.Email,&user.DisplayName,&user.CreatedAt)
	if err != nil { writeErr(w, 401, "unauthorized", "نشست معتبر نیست؛ دوباره وارد شو"); return account{}, false }
	return user, true
}

func bearerToken(r *http.Request) string {
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	if len(header) < 8 || !strings.EqualFold(header[:7], "Bearer ") { return "" }
	return strings.TrimSpace(header[7:])
}
