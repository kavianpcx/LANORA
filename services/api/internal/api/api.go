package api

import (
	"crypto/rand"
	"crypto/hmac"
	"crypto/subtle"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"strconv"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/gorilla/websocket"
	"lanora/services/api/internal/store"
)

type API struct { db *store.DB; log *slog.Logger; adminToken string; origins map[string]bool; mu sync.Mutex; joinMu sync.Mutex; attempts map[string][]time.Time; events map[string]map[chan []byte]bool }
type ctxKey string
type principal struct { UserID, Username, Role string; RoomID string }
type room struct { ID string `json:"id"`; Name string `json:"name"`; HostID string `json:"hostId"`; MaxPlayers int `json:"maxPlayers"`; Visibility string `json:"visibility"`; GameName string `json:"gameName,omitempty"`; Approval bool `json:"requireApproval"`; Accepting bool `json:"acceptingMembers"`; CreatedAt string `json:"createdAt"`; Members []member `json:"members"` }
type member struct { UserID string `json:"userId"`; Username string `json:"username"`; Role string `json:"role"`; Status string `json:"status"`; JoinedAt string `json:"joinedAt"` }
type errBody struct { Error errorInfo `json:"error"` }
type errorInfo struct { Code string `json:"code"`; Message string `json:"message"` }
var codeRE = regexp.MustCompile(`^[A-Z0-9-]{8,32}$`)

func New(db *store.DB, log *slog.Logger, admin string) http.Handler {
	originList:=strings.Split(env("LANORA_ALLOWED_ORIGINS","tauri://localhost,http://tauri.localhost,https://tauri.localhost,http://localhost:1420,http://localhost:1421,https://kavianpcx.github.io"),","); origins:=map[string]bool{}; for _,o:=range originList{if o=strings.TrimSpace(o);o!=""{origins[o]=true}}
	a := &API{db:db, log:log, adminToken:admin, origins:origins, attempts:map[string][]time.Time{}, events:map[string]map[chan []byte]bool{}}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health", a.health)
	mux.HandleFunc("POST /api/v1/auth/register", a.register)
	mux.HandleFunc("POST /api/v1/auth/login", a.login)
	mux.HandleFunc("GET /api/v1/auth/me", a.getMe)
	mux.HandleFunc("PATCH /api/v1/auth/me", a.updateMe)
	mux.HandleFunc("POST /api/v1/auth/logout", a.logout)
	mux.HandleFunc("POST /api/v1/rooms", a.createRoom)
	mux.HandleFunc("POST /api/v1/rooms/join", a.joinRoom)
	mux.HandleFunc("GET /api/v1/rooms/{id}", a.getRoom)
	mux.HandleFunc("GET /api/v1/rooms/{id}/membership", a.membership)
	mux.HandleFunc("GET /api/v1/rooms/{id}/network", a.networkConfig)
	mux.HandleFunc("POST /api/v1/rooms/{id}/leave", a.leaveRoom)
	mux.HandleFunc("POST /api/v1/rooms/{id}/approve", a.approve)
	mux.HandleFunc("POST /api/v1/rooms/{id}/invite/rotate", a.rotateInvite)
	mux.HandleFunc("DELETE /api/v1/rooms/{id}", a.deleteRoom)
	mux.HandleFunc("POST /api/v1/rooms/{id}/members/{userId}/kick", a.kick)
	mux.HandleFunc("PATCH /api/v1/rooms/{id}/accepting", a.setAccepting)
	mux.HandleFunc("GET /api/v1/events", a.eventsWS)
	mux.HandleFunc("GET /api/v1/admin/summary", a.adminSummary)
	mux.HandleFunc("GET /", func(w http.ResponseWriter,r *http.Request){ writeErr(w,404,"not_found","مسیر پیدا نشد") })
	return securityHeaders(a.cors(rateLimit(a, mux)))
}
func env(key,fallback string)string{if v:=strings.TrimSpace(getenv(key));v!=""{return v};return fallback}
var getenv = func(k string)string{return os.Getenv(k)}
func (a *API) originAllowed(origin string)bool{return origin==""||a.origins[origin]}
func (a *API) cors(next http.Handler)http.Handler{return http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){origin:=r.Header.Get("Origin");if origin!=""&&!a.originAllowed(origin){writeErr(w,403,"origin_denied","مبدأ درخواست مجاز نیست");return};if origin!=""{w.Header().Set("Access-Control-Allow-Origin",origin);w.Header().Add("Vary","Origin");w.Header().Set("Access-Control-Allow-Headers","Authorization, Content-Type");w.Header().Set("Access-Control-Allow-Methods","GET, POST, PATCH, DELETE, OPTIONS")};if r.Method==http.MethodOptions{w.WriteHeader(http.StatusNoContent);return};next.ServeHTTP(w,r)})}

func (a *API) health(w http.ResponseWriter,r *http.Request){ if err:=a.db.Ping(); err!=nil { writeErr(w,503,"database_unavailable","ذخیره‌ساز در دسترس نیست"); return }; writeJSON(w,200,map[string]any{"status":"ok","service":"lanora-api","time":time.Now().UTC()}) }

type createRequest struct { Name string `json:"name"`; Password string `json:"password"`; MaxPlayers int `json:"maxPlayers"`; Visibility string `json:"visibility"`; GameName string `json:"gameName"`; RequireApproval bool `json:"requireApproval"`; Username string `json:"username"` }
func (a *API) createRoom(w http.ResponseWriter,r *http.Request){ account,ok:=a.authenticatedAccount(w,r);if !ok{return}; var in createRequest; if !decode(w,r,&in){return}; in.Username=account.DisplayName; in.Name=strings.TrimSpace(in.Name); in.Username=strings.TrimSpace(in.Username); if runeLen(in.Name)<2||runeLen(in.Name)>64||runeLen(in.Username)<2||runeLen(in.Username)>32||runeLen(in.GameName)>64||len(in.Password)>128 { writeErr(w,400,"invalid_input","نام روم باید ۲ تا ۶۴، نام بازی تا ۶۴، نام کاربر ۲ تا ۳۲ و رمز حداکثر ۱۲۸ نویسه باشد"); return }; if in.MaxPlayers==0 {in.MaxPlayers=8}; if in.MaxPlayers<2||in.MaxPlayers>32 {writeErr(w,400,"invalid_capacity","ظرفیت باید بین ۲ تا ۳۲ باشد");return}; if in.Visibility=="" {in.Visibility="private"}; if in.Visibility!="private"&&in.Visibility!="public" {writeErr(w,400,"invalid_visibility","نمایش باید private یا public باشد");return}
	id,e:=randomHex(16); if e!=nil {serverError(w,e);return}; userID,e:=randomHex(16); if e!=nil {serverError(w,e);return}; invite,e:=inviteCode(); if e!=nil {serverError(w,e);return}; token,e:=randomHex(32); if e!=nil {serverError(w,e);return}; secret,e:=randomHex(32); if e!=nil {serverError(w,e);return}; ts:=time.Now().UTC().Format(time.RFC3339Nano)
	passwordHash,e:=makePasswordHash(in.Password);if e!=nil{serverError(w,e);return}; _,e=a.db.Exec(`INSERT INTO rooms(id,name,host_id,host_token_hash,invite_hash,password_hash,network_secret,max_players,visibility,game_name,approval,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,id,in.Name,userID,hash(token),hash(invite),passwordHash,secret,in.MaxPlayers,in.Visibility,in.GameName,in.RequireApproval,ts); if e!=nil {serverError(w,e);return}; status:="approved"; _,e=a.db.Exec(`INSERT INTO members(room_id,user_id,account_id,username,token_hash,role,status,joined_at) VALUES(?,?,?,?,?,?,?,?)`,id,userID,account.ID,in.Username,hash(token),"host",status,ts); if e!=nil {serverError(w,e);return}; a.publish(id,"room.created",map[string]any{"roomId":id}); writeJSON(w,201,map[string]any{"roomId":id,"inviteCode":invite,"accessToken":token,"userId":userID,"networkSecret":secret,"status":"created","room":a.loadRoom(id)}) }

type joinRequest struct { InviteCode string `json:"inviteCode"`; Password string `json:"password"`; Username string `json:"username"` }
func (a *API) joinRoom(w http.ResponseWriter,r *http.Request){ account,ok:=a.authenticatedAccount(w,r);if !ok{return}; var in joinRequest; if !decode(w,r,&in){return};a.joinMu.Lock();defer a.joinMu.Unlock(); in.Username=account.DisplayName; in.InviteCode=strings.ToUpper(strings.TrimSpace(in.InviteCode)); in.Username=strings.TrimSpace(in.Username); if !codeRE.MatchString(in.InviteCode)||runeLen(in.Username)<2||runeLen(in.Username)>32||len(in.Password)>128 {writeErr(w,400,"invalid_input","کد دعوت، نام کاربری یا رمز معتبر نیست");return}; var rm room; var ih,ph,secret string; var count int; var approval,accepting int; e:=a.db.QueryRow(`SELECT id,name,host_id,max_players,visibility,game_name,approval,accepting,created_at,invite_hash,password_hash,network_secret FROM rooms WHERE invite_hash=?`,hash(in.InviteCode)).Scan(&rm.ID,&rm.Name,&rm.HostID,&rm.MaxPlayers,&rm.Visibility,&rm.GameName,&approval,&accepting,&rm.CreatedAt,&ih,&ph,&secret); if errors.Is(e,sql.ErrNoRows){writeErr(w,404,"room_not_found","روم یا کد دعوت پیدا نشد");return}; if e!=nil {serverError(w,e);return}; if !checkPasswordHash(ph,in.Password){writeErr(w,401,"invalid_password","رمز عبور درست نیست");return}; if accepting==0 {writeErr(w,403,"room_closed","ورود عضو جدید غیرفعال است");return}; var alreadyMember int; _=a.db.QueryRow(`SELECT COUNT(*) FROM members WHERE room_id=? AND account_id=?`,rm.ID,account.ID).Scan(&alreadyMember); if alreadyMember>0 {writeErr(w,409,"already_member","این حساب از قبل عضو روم است");return}; _=a.db.QueryRow(`SELECT COUNT(*) FROM members WHERE room_id=? AND status IN ('approved','pending')`,rm.ID).Scan(&count); if count>=rm.MaxPlayers {writeErr(w,409,"room_full","ظرفیت روم تکمیل است");return}; uid,err:=randomHex(16);if err!=nil{serverError(w,err);return};token,err:=randomHex(32);if err!=nil{serverError(w,err);return}; ts:=time.Now().UTC().Format(time.RFC3339Nano); status:="approved"; if approval==1 {status="pending"}; _,e=a.db.Exec(`INSERT INTO members(room_id,user_id,account_id,username,token_hash,role,status,joined_at) VALUES(?,?,?,?,?,?,?,?)`,rm.ID,uid,account.ID,in.Username,hash(token),"member",status,ts); if e!=nil {serverError(w,e);return}; a.publish(rm.ID,"member.joined",map[string]any{"userId":uid,"status":status}); out:=map[string]any{"roomId":rm.ID,"roomName":rm.Name,"userId":uid,"accessToken":token,"status":status}; if status=="approved" {out["networkSecret"]=secret}; writeJSON(w,200,out) }

func (a *API) getRoom(w http.ResponseWriter,r *http.Request){ p,ok:=a.authenticate(w,r); if !ok{return}; id:=r.PathValue("id"); if p.RoomID!=id {writeErr(w,403,"forbidden","دسترسی به این روم مجاز نیست");return}; rm:=a.loadRoom(id); if rm.ID=="" {writeErr(w,404,"room_not_found","روم پیدا نشد");return}; writeJSON(w,200,rm) }

func (a *API) membership(w http.ResponseWriter,r *http.Request){ raw:=strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"),"Bearer ")); if raw=="" {writeErr(w,401,"unauthorized","توکن دسترسی لازم است");return}; var p principal; var status string; e:=a.db.QueryRow(`SELECT user_id,username,role,room_id,status FROM members WHERE token_hash=?`,hash(raw)).Scan(&p.UserID,&p.Username,&p.Role,&p.RoomID,&status); if e!=nil {writeErr(w,401,"unauthorized","توکن معتبر نیست");return}; if p.RoomID!=r.PathValue("id"){writeErr(w,403,"forbidden","دسترسی مجاز نیست");return}; out:=map[string]any{"status":status,"userId":p.UserID}; if status=="approved" { var secret string; if e=a.db.QueryRow(`SELECT network_secret FROM rooms WHERE id=?`,p.RoomID).Scan(&secret); e==nil {out["networkSecret"]=secret} }; writeJSON(w,200,out) }

// Only approved room members receive tunnel credentials. The relay is configured
// by the server operator, never accepted as an executable command from a client.
func (a *API) networkConfig(w http.ResponseWriter,r *http.Request){
	p,ok:=a.authenticate(w,r);if !ok{return}
	id:=r.PathValue("id");if p.RoomID!=id {writeErr(w,403,"forbidden","دسترسی مجاز نیست");return}
	peer:=strings.TrimSpace(os.Getenv("LANORA_RELAY_PEER_URL"))
	u,e:=url.Parse(peer);if e!=nil||u==nil||(u.Scheme!="tcp"&&u.Scheme!="udp")||u.Hostname()==""||u.Port()==""||u.User!=nil||u.Path!=""||u.RawQuery!=""||u.Fragment!="" {writeErr(w,503,"relay_unconfigured","آدرس Relay روی سرور تنظیم نشده است");return}
	var secret string;if e=a.db.QueryRow(`SELECT network_secret FROM rooms WHERE id=?`,id).Scan(&secret);e!=nil {writeErr(w,404,"room_not_found","روم پیدا نشد");return}
	writeJSON(w,200,map[string]string{"networkName":"lanora-"+id,"networkSecret":secret,"peerUrl":peer})
}

func (a *API) leaveRoom(w http.ResponseWriter,r *http.Request){ p,ok:=a.authenticate(w,r); if !ok{return}; id:=r.PathValue("id"); if p.RoomID!=id {writeErr(w,403,"forbidden","دسترسی مجاز نیست");return}; if p.Role=="host" {writeErr(w,409,"host_must_close","مدیر روم باید روم را ببندد");return}; _,e:=a.db.Exec(`DELETE FROM members WHERE room_id=? AND user_id=?`,id,p.UserID); if e!=nil {serverError(w,e);return}; a.publish(id,"member.left",map[string]any{"userId":p.UserID}); writeJSON(w,200,map[string]any{"status":"left"}) }

func (a *API) approve(w http.ResponseWriter,r *http.Request){ p,ok:=a.authenticate(w,r); if !ok{return}; id:=r.PathValue("id"); if p.RoomID!=id||p.Role!="host" {writeErr(w,403,"host_required","فقط میزبان می‌تواند درخواست را بررسی کند");return}; var in struct{ UserID string `json:"userId"`; Approve bool `json:"approve"` }; if !decode(w,r,&in){return}; status:="rejected"; if in.Approve {status="approved"}; res,e:=a.db.Exec(`UPDATE members SET status=? WHERE room_id=? AND user_id=? AND status='pending'`,status,id,in.UserID); if e!=nil {serverError(w,e);return}; n,_:=res.RowsAffected(); if n==0 {writeErr(w,404,"pending_member_not_found","درخواست معلق پیدا نشد");return}; a.publish(id,"member.reviewed",map[string]any{"userId":in.UserID,"status":status}); writeJSON(w,200,map[string]string{"status":status}) }

func (a *API) rotateInvite(w http.ResponseWriter,r *http.Request){ p,ok:=a.authenticate(w,r); if !ok{return}; id:=r.PathValue("id"); if p.RoomID!=id||p.Role!="host" {writeErr(w,403,"host_required","فقط میزبان می‌تواند کد را عوض کند");return}; code,e:=inviteCode(); if e!=nil {serverError(w,e);return}; _,e=a.db.Exec(`UPDATE rooms SET invite_hash=? WHERE id=?`,hash(code),id); if e!=nil {serverError(w,e);return}; a.publish(id,"invite.rotated",nil); writeJSON(w,200,map[string]string{"inviteCode":code}) }

func (a *API) deleteRoom(w http.ResponseWriter,r *http.Request){ p,ok:=a.authenticate(w,r); if !ok{return}; id:=r.PathValue("id"); if p.RoomID!=id||p.Role!="host" {writeErr(w,403,"host_required","فقط میزبان می‌تواند روم را ببندد");return}; _,e:=a.db.Exec(`DELETE FROM rooms WHERE id=?`,id); if e!=nil {serverError(w,e);return}; a.publish(id,"room.closed",nil); writeJSON(w,200,map[string]string{"status":"closed"}) }

func (a *API) kick(w http.ResponseWriter,r *http.Request){ p,ok:=a.authenticate(w,r); if !ok{return}; id:=r.PathValue("id"); if p.RoomID!=id||p.Role!="host" {writeErr(w,403,"host_required","فقط میزبان می‌تواند عضو را خارج کند");return}; uid:=r.PathValue("userId"); res,e:=a.db.Exec(`DELETE FROM members WHERE room_id=? AND user_id=? AND role='member'`,id,uid); if e!=nil {serverError(w,e);return}; n,_:=res.RowsAffected(); if n==0 {writeErr(w,404,"member_not_found","عضو پیدا نشد");return}; a.publish(id,"member.kicked",map[string]string{"userId":uid}); writeJSON(w,200,map[string]string{"status":"removed"}) }

func (a *API) setAccepting(w http.ResponseWriter,r *http.Request){ p,ok:=a.authenticate(w,r); if !ok{return}; id:=r.PathValue("id"); if p.RoomID!=id||p.Role!="host" {writeErr(w,403,"host_required","فقط میزبان می‌تواند ورود را تغییر دهد");return}; var in struct{ Accepting bool `json:"accepting"` }; if !decode(w,r,&in){return}; _,e:=a.db.Exec(`UPDATE rooms SET accepting=? WHERE id=?`,in.Accepting,id); if e!=nil {serverError(w,e);return}; a.publish(id,"room.membership_policy",map[string]bool{"accepting":in.Accepting}); writeJSON(w,200,map[string]bool{"accepting":in.Accepting}) }

func (a *API) authenticate(w http.ResponseWriter,r *http.Request)(principal,bool){ raw:=strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"),"Bearer ")); if raw=="" {writeErr(w,401,"unauthorized","توکن دسترسی لازم است");return principal{},false}; var p principal; e:=a.db.QueryRow(`SELECT user_id,username,role,room_id FROM members WHERE token_hash=? AND status='approved'`,hash(raw)).Scan(&p.UserID,&p.Username,&p.Role,&p.RoomID); if e!=nil {writeErr(w,401,"unauthorized","توکن معتبر نیست یا عضویت تأیید نشده");return principal{},false}; return p,true }

func (a *API) loadRoom(id string) room { var x room; var approval,accept int; e:=a.db.QueryRow(`SELECT id,name,host_id,max_players,visibility,game_name,approval,accepting,created_at FROM rooms WHERE id=?`,id).Scan(&x.ID,&x.Name,&x.HostID,&x.MaxPlayers,&x.Visibility,&x.GameName,&approval,&accept,&x.CreatedAt); if e!=nil{return x}; x.Approval=approval==1;x.Accepting=accept==1; rows,e:=a.db.Query(`SELECT user_id,username,role,status,joined_at FROM members WHERE room_id=? ORDER BY joined_at`,id); if e==nil { defer rows.Close(); for rows.Next(){var m member; if rows.Scan(&m.UserID,&m.Username,&m.Role,&m.Status,&m.JoinedAt)==nil{x.Members=append(x.Members,m)} } }; return x }

func (a *API) eventsWS(w http.ResponseWriter,r *http.Request){ p,ok:=a.authenticate(w,r); if !ok{return}; upgrader:=websocket.Upgrader{CheckOrigin:func(r *http.Request)bool{return a.originAllowed(r.Header.Get("Origin"))}};c,e:=upgrader.Upgrade(w,r,nil); if e!=nil{return}; ch:=make(chan []byte,16); a.mu.Lock(); if a.events[p.RoomID]==nil{a.events[p.RoomID]=map[chan []byte]bool{}}; a.events[p.RoomID][ch]=true; a.mu.Unlock(); defer func(){a.mu.Lock();delete(a.events[p.RoomID],ch);a.mu.Unlock();c.Close()}(); for {select{case msg:=<-ch: c.SetWriteDeadline(time.Now().Add(5*time.Second));if c.WriteMessage(websocket.TextMessage,msg)!=nil{return};case <-r.Context().Done():return}} }
func (a *API) publish(id,kind string,data any){ b,_:=json.Marshal(map[string]any{"type":kind,"data":data,"at":time.Now().UTC()});a.mu.Lock();defer a.mu.Unlock();for ch:=range a.events[id]{select{case ch<-b:default:}} }
func (a *API) adminSummary(w http.ResponseWriter,r *http.Request){ if a.adminToken==""||r.Header.Get("Authorization")!="Bearer "+a.adminToken {writeErr(w,401,"unauthorized","دسترسی مدیر سرور لازم است");return}; var rooms,members int; _=a.db.QueryRow(`SELECT COUNT(*) FROM rooms`).Scan(&rooms);_=a.db.QueryRow(`SELECT COUNT(*) FROM members WHERE status='approved'`).Scan(&members);writeJSON(w,200,map[string]any{"activeRooms":rooms,"onlineMembers":members,"service":"lanora-api"}) }

func decode(w http.ResponseWriter,r *http.Request,v any)bool{r.Body=http.MaxBytesReader(w,r.Body,16<<10);d:=json.NewDecoder(r.Body);d.DisallowUnknownFields();if e:=d.Decode(v);e!=nil{writeErr(w,400,"invalid_json","بدنهٔ درخواست معتبر نیست");return false};return true}
func writeJSON(w http.ResponseWriter,status int,v any){w.Header().Set("Content-Type","application/json; charset=utf-8");w.WriteHeader(status);_=json.NewEncoder(w).Encode(v)}
func runeLen(s string)int{return utf8.RuneCountInString(s)}
func writeErr(w http.ResponseWriter,status int,code,msg string){writeJSON(w,status,errBody{Error:errorInfo{Code:code,Message:msg}})}
func serverError(w http.ResponseWriter,e error){slog.Error("request failed","error_type",fmt.Sprintf("%T",e));writeErr(w,500,"internal_error","خطای داخلی سرور")}
func hash(s string)string{b:=sha256.Sum256([]byte(s));return hex.EncodeToString(b[:])}
func makePasswordHash(password string)(string,error){if password==""{return "",nil};salt:=make([]byte,16);if _,e:=rand.Read(salt);e!=nil{return "",e};const rounds=120000;derived:=pbkdf2([]byte(password),salt,rounds,32);return fmt.Sprintf("pbkdf2-sha256$%d$%s$%s",rounds,hex.EncodeToString(salt),hex.EncodeToString(derived)),nil}
func checkPasswordHash(stored,password string)bool{if stored==""{return password==""};parts:=strings.Split(stored,"$");if len(parts)!=4||parts[0]!="pbkdf2-sha256"{return false};rounds,e:=strconv.Atoi(parts[1]);if e!=nil||rounds<100000||rounds>1000000{return false};salt,e:=hex.DecodeString(parts[2]);if e!=nil||len(salt)!=16{return false};expected,e:=hex.DecodeString(parts[3]);if e!=nil||len(expected)!=32{return false};actual:=pbkdf2([]byte(password),salt,rounds,len(expected));return subtle.ConstantTimeCompare(actual,expected)==1}
func pbkdf2(password,salt []byte,rounds,length int)[]byte{out:=make([]byte,0,length);for block:=uint32(1);len(out)<length;block++{mac:=hmac.New(sha256.New,password);mac.Write(salt);mac.Write([]byte{byte(block>>24),byte(block>>16),byte(block>>8),byte(block)});u:=mac.Sum(nil);t:=append([]byte(nil),u...);for i:=1;i<rounds;i++{mac=hmac.New(sha256.New,password);mac.Write(u);u=mac.Sum(nil);for j:=range t{t[j]^=u[j]}};out=append(out,t...)};return out[:length]}
func randomHex(n int)(string,error){b:=make([]byte,n);if _,e:=rand.Read(b);e!=nil{return "",e};return hex.EncodeToString(b),nil}
func inviteCode()(string,error){b:=make([]byte,10);if _,e:=rand.Read(b);e!=nil{return "",e};return strings.ToUpper(fmt.Sprintf("%X-%X",b[:5],b[5:])),nil}
func rateLimit(a *API,next http.Handler)http.Handler{return http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){p:=r.URL.Path;limited:=p=="/api/v1/rooms/join"||p=="/api/v1/auth/login"||p=="/api/v1/auth/register";if !limited{next.ServeHTTP(w,r);return};key:=clientIP(r);now:=time.Now();a.mu.Lock();list:=a.attempts[key][:0];for _,t:=range a.attempts[key]{if now.Sub(t)<time.Minute{list=append(list,t)}};if len(list)>=12{a.attempts[key]=list;a.mu.Unlock();writeErr(w,429,"rate_limited","تعداد تلاش‌ها زیاد است؛ کمی بعد دوباره امتحان کنید");return};a.attempts[key]=append(list,now);a.mu.Unlock();next.ServeHTTP(w,r)})}
func clientIP(r *http.Request)string{if ip:=net.ParseIP(strings.TrimSpace(r.Header.Get("X-Lanora-Client-IP")));ip!=nil{return ip.String()};host,_,err:=net.SplitHostPort(r.RemoteAddr);if err==nil&&net.ParseIP(host)!=nil{return net.ParseIP(host).String()};return r.RemoteAddr}
func securityHeaders(next http.Handler)http.Handler{return http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){w.Header().Set("X-Content-Type-Options","nosniff");w.Header().Set("Referrer-Policy","no-referrer");w.Header().Set("Cache-Control","no-store");next.ServeHTTP(w,r)})}
