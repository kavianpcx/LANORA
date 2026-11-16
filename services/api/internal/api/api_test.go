package api

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"lanora/services/api/internal/store"
)

func testAPI(t *testing.T) http.Handler {
	t.Helper()
	db, e := store.Open(":memory:")
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { db.Close() })
	return New(db, slog.New(slog.NewTextHandler(io.Discard, nil)), "admin-test-token")
}
func call(t *testing.T, h http.Handler, method, path, token string, body any) (int, map[string]any) {
	t.Helper()
	var raw []byte
	if body != nil {
		raw, _ = json.Marshal(body)
	}
	r := httptest.NewRequest(method, path, bytes.NewReader(raw))
	if token != "" {
		r.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func TestCreateAndJoinRoom(t *testing.T) {
	h := testAPI(t)
	hostAccount := ""
	guestAccount := ""
	status, created := call(t, h, "POST", "/api/v1/rooms", hostAccount, map[string]any{"name": "Friday LAN", "username": "Host", "maxPlayers": 4})
	if status != 201 {
		t.Fatalf("create status=%d body=%v", status, created)
	}
	invite := created["inviteCode"].(string)
	roomID := created["roomId"].(string)
	status, joined := call(t, h, "POST", "/api/v1/rooms/join", guestAccount, map[string]any{"inviteCode": invite, "username": "Guest"})
	if status != 200 || joined["status"] != "approved" {
		t.Fatalf("join status=%d body=%v", status, joined)
	}
	token := created["accessToken"].(string)
	status, loaded := call(t, h, "GET", "/api/v1/rooms/"+roomID, token, nil)
	if status != 200 {
		t.Fatalf("get room status=%d body=%v", status, loaded)
	}
	members := loaded["members"].([]any)
	if len(members) != 2 {
		t.Fatalf("members=%d", len(members))
	}
}

func TestRoomPassword(t *testing.T) {
	h := testAPI(t)
	hostAccount := ""
	guestAccount := ""
	_, created := call(t, h, "POST", "/api/v1/rooms", hostAccount, map[string]any{"name": "Password Room", "username": "Host", "password": "correct horse"})
	invite := created["inviteCode"].(string)
	status, _ := call(t, h, "POST", "/api/v1/rooms/join", guestAccount, map[string]any{"inviteCode": invite, "username": "Guest", "password": "wrong"})
	if status != 401 {
		t.Fatalf("wrong password status=%d", status)
	}
	status, joined := call(t, h, "POST", "/api/v1/rooms/join", guestAccount, map[string]any{"inviteCode": invite, "username": "Guest", "password": "correct horse"})
	if status != 200 || joined["status"] != "approved" {
		t.Fatalf("valid password status=%d body=%v", status, joined)
	}
}

func TestApprovalAndCapacity(t *testing.T) {
	h := testAPI(t)
	hostAccount := ""
	guestAccount := ""
	thirdAccount := ""
	_, created := call(t, h, "POST", "/api/v1/rooms", hostAccount, map[string]any{"name": "Closed Queue", "username": "Host", "maxPlayers": 2, "requireApproval": true})
	invite := created["inviteCode"].(string)
	host := created["accessToken"].(string)
	roomID := created["roomId"].(string)
	_, joined := call(t, h, "POST", "/api/v1/rooms/join", guestAccount, map[string]any{"inviteCode": invite, "username": "Guest"})
	if joined["status"] != "pending" {
		t.Fatalf("expected pending: %v", joined)
	}
	guestToken := joined["accessToken"].(string)
	uid := joined["userId"].(string)
	status, _ := call(t, h, "POST", "/api/v1/rooms/"+roomID+"/approve", host, map[string]any{"userId": uid, "approve": true})
	if status != 200 {
		t.Fatalf("approve status=%d", status)
	}
	status, membership := call(t, h, "GET", "/api/v1/rooms/"+roomID+"/membership", guestToken, nil)
	if status != 200 || membership["status"] != "approved" || membership["networkSecret"] != nil {
		t.Fatalf("membership status=%d body=%v", status, membership)
	}
	status, full := call(t, h, "POST", "/api/v1/rooms/join", thirdAccount, map[string]any{"inviteCode": invite, "username": "Third"})
	if status != 409 || full["error"].(map[string]any)["code"] != "room_full" {
		t.Fatalf("capacity status=%d body=%v", status, full)
	}
}

func TestInviteRotationAndAuthorization(t *testing.T) {
	h := testAPI(t)
	hostAccount := ""
	guestAccount := ""
	_, created := call(t, h, "POST", "/api/v1/rooms", hostAccount, map[string]any{"name": "Private", "username": "Host"})
	id := created["roomId"].(string)
	host := created["accessToken"].(string)
	old := created["inviteCode"].(string)
	denied, _ := call(t, h, "POST", "/api/v1/rooms", "", map[string]any{"name": "No Account", "username": "Host"})
	if denied != 201 {
		t.Fatalf("anonymous room create status=%d", denied)
	}
	status, rotated := call(t, h, "POST", "/api/v1/rooms/"+id+"/invite/rotate", host, nil)
	if status != 200 || rotated["inviteCode"] == old {
		t.Fatalf("rotation status=%d body=%v", status, rotated)
	}
	status, _ = call(t, h, "POST", "/api/v1/rooms/join", guestAccount, map[string]any{"inviteCode": old, "username": "Guest"})
	if status != 404 {
		t.Fatalf("old invite should fail, got %d", status)
	}
	status, _ = call(t, h, "DELETE", "/api/v1/rooms/"+id, "bad-token", nil)
	if status != 401 {
		t.Fatalf("unauthorized delete got %d", status)
	}
}

func TestPublicDiscovery(t *testing.T) {
	h := testAPI(t)
	_, created := call(t, h, "POST", "/api/v1/rooms", "", map[string]any{"name": "Public LAN", "username": "Host", "visibility": "public"})
	_, private := call(t, h, "POST", "/api/v1/rooms", "", map[string]any{"name": "Secret LAN", "username": "Host", "visibility": "private"})
	status, result := call(t, h, "GET", "/api/v1/rooms", "", nil)
	if status != 200 {
		t.Fatalf("list status=%d", status)
	}
	list := result["rooms"].([]any)
	if len(list) != 1 || list[0].(map[string]any)["id"] != created["roomId"] {
		t.Fatalf("discovery=%v", list)
	}
	if _, ok := list[0].(map[string]any)["networkSecret"]; ok {
		t.Fatal("secret leaked")
	}
	status, _ = call(t, h, "POST", "/api/v1/rooms/join", "", map[string]any{"roomId": private["roomId"], "username": "Guest"})
	if status != 404 {
		t.Fatalf("private join by ID=%d", status)
	}
	status, joined := call(t, h, "POST", "/api/v1/rooms/join", "", map[string]any{"roomId": created["roomId"], "username": "Guest"})
	if status != 200 || joined["status"] != "approved" {
		t.Fatalf("public join %d: %v", status, joined)
	}
}

func TestNetworkAuthorizationAndIsolation(t *testing.T) {
	t.Setenv("LANORA_RELAY_PEER_URL", "tcp://relay.example.org:11010")
	h := testAPI(t)
	_, a := call(t, h, "POST", "/api/v1/rooms", "", map[string]any{"name": "First", "username": "Host", "requireApproval": true})
	_, b := call(t, h, "POST", "/api/v1/rooms", "", map[string]any{"name": "Second", "username": "Host"})
	id := a["roomId"].(string)
	host := a["accessToken"].(string)
	_, guest := call(t, h, "POST", "/api/v1/rooms/join", "", map[string]any{"inviteCode": a["inviteCode"], "username": "Guest"})
	guestToken := guest["accessToken"].(string)
	status, _ := call(t, h, "GET", "/api/v1/rooms/"+id+"/network", guestToken, nil)
	if status != 401 {
		t.Fatalf("pending network access=%d", status)
	}
	_, pending := call(t, h, "GET", "/api/v1/rooms/"+id+"/membership", guestToken, nil)
	if pending["networkSecret"] != nil {
		t.Fatal("pending credentials leaked")
	}
	status, _ = call(t, h, "GET", "/api/v1/rooms/"+id+"/network", b["accessToken"].(string), nil)
	if status != 403 {
		t.Fatalf("cross-room access=%d", status)
	}
	call(t, h, "POST", "/api/v1/rooms/"+id+"/approve", host, map[string]any{"userId": guest["userId"], "approve": true})
	_, approvedMembership := call(t, h, "GET", "/api/v1/rooms/"+id+"/membership", guestToken, nil)
	if approvedMembership["status"] != "approved" || approvedMembership["networkSecret"] != nil {
		t.Fatal("membership status response contains tunnel credentials")
	}
	_, hostNet := call(t, h, "GET", "/api/v1/rooms/"+id+"/network", host, nil)
	status, guestNet := call(t, h, "GET", "/api/v1/rooms/"+id+"/network", guestToken, nil)
	if status != 200 || guestNet["networkSecret"] != hostNet["networkSecret"] {
		t.Fatal("approved peers need same network")
	}
	_, otherNet := call(t, h, "GET", "/api/v1/rooms/"+b["roomId"].(string)+"/network", b["accessToken"].(string), nil)
	if otherNet["networkSecret"] == hostNet["networkSecret"] {
		t.Fatal("rooms share credentials")
	}
	call(t, h, "POST", "/api/v1/rooms/"+id+"/leave", guestToken, nil)
	status, _ = call(t, h, "GET", "/api/v1/rooms/"+id+"/network", guestToken, nil)
	if status != 401 {
		t.Fatalf("departed member authorized=%d", status)
	}
	call(t, h, "DELETE", "/api/v1/rooms/"+id, host, nil)
	status, _ = call(t, h, "GET", "/api/v1/rooms/"+id+"/network", host, nil)
	if status != 401 {
		t.Fatalf("closed room authorized=%d", status)
	}
}

func TestRejectTrailingJSON(t *testing.T) {
	h := testAPI(t)
	r := httptest.NewRequest("POST", "/api/v1/rooms", bytes.NewBufferString(`{"name":"Room","username":"Host"} {}`))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 400 {
		t.Fatalf("trailing JSON accepted: %d", w.Code)
	}
}

func TestPendingMemberCanCancel(t *testing.T) {
	h := testAPI(t)
	_, host := call(t, h, "POST", "/api/v1/rooms", "", map[string]any{"name": "Approval", "username": "Host", "requireApproval": true, "maxPlayers": 2})
	_, guest := call(t, h, "POST", "/api/v1/rooms/join", "", map[string]any{"inviteCode": host["inviteCode"], "username": "Guest"})
	status, _ := call(t, h, "POST", "/api/v1/rooms/"+host["roomId"].(string)+"/leave", guest["accessToken"].(string), nil)
	if status != 200 {
		t.Fatalf("pending cancellation=%d", status)
	}
	status, _ = call(t, h, "POST", "/api/v1/rooms/join", "", map[string]any{"inviteCode": host["inviteCode"], "username": "Next"})
	if status != 200 {
		t.Fatalf("cancel did not free capacity: %d", status)
	}
}

func TestRejectedMembershipIsNotAnActivePlayer(t *testing.T) {
	h := testAPI(t)
	_, host := call(t, h, "POST", "/api/v1/rooms", "", map[string]any{"name": "Approval", "username": "Host", "requireApproval": true})
	_, guest := call(t, h, "POST", "/api/v1/rooms/join", "", map[string]any{"inviteCode": host["inviteCode"], "username": "Guest"})
	id := host["roomId"].(string)
	token := host["accessToken"].(string)
	status, _ := call(t, h, "POST", "/api/v1/rooms/"+id+"/approve", token, map[string]any{"userId": guest["userId"], "approve": false})
	if status != 200 {
		t.Fatalf("reject=%d", status)
	}
	_, membership := call(t, h, "GET", "/api/v1/rooms/"+id+"/membership", guest["accessToken"].(string), nil)
	if membership["status"] != "rejected" || membership["networkSecret"] != nil {
		t.Fatal("rejected member status/credentials incorrect")
	}
	_, loaded := call(t, h, "GET", "/api/v1/rooms/"+id, token, nil)
	if len(loaded["members"].([]any)) != 1 {
		t.Fatal("rejected request appears in player list")
	}
}
