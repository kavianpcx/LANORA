package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

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

func testAPIWithDB(t *testing.T) (http.Handler, *store.DB) {
	t.Helper()
	db, err := store.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return New(db, slog.New(slog.NewTextHandler(io.Discard, nil)), "admin-test-token"), db
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

func TestSharedNetworkAuthorizationPresenceAndCleanup(t *testing.T) {
	t.Setenv("LANORA_SHARED_NETWORK_CODE", "c7a0c4d9b071ec35f8bc1d2a")
	t.Setenv("LANORA_RELAY_PEER_URL", "tcp://relay.example.org:11010")
	h := testAPI(t)

	invalidStatus, _ := call(t, h, "POST", "/api/v1/network/join", "", map[string]any{
		"code":     "000000000000000000000000",
		"deviceId": strings.Repeat("a", 32),
		"username": "Player A",
	})
	if invalidStatus != 401 {
		t.Fatalf("invalid shared code status=%d", invalidStatus)
	}

	status, first := call(t, h, "POST", "/api/v1/network/join", "", map[string]any{
		"code":     "c7a0c4d9b071ec35f8bc1d2a",
		"deviceId": strings.Repeat("a", 32),
		"username": "Player A",
	})
	if status != 200 {
		t.Fatalf("shared join status=%d body=%v", status, first)
	}
	firstToken := first["accessToken"].(string)
	firstNetwork := first["network"].(map[string]any)
	if !strings.HasPrefix(firstNetwork["networkName"].(string), "lanora-") {
		t.Fatalf("invalid shared network name: %v", firstNetwork)
	}
	if len(firstNetwork["networkSecret"].(string)) != 64 {
		t.Fatal("shared network secret was not created")
	}

	status, config := call(t, h, "GET", "/api/v1/network/config", firstToken, nil)
	if status != 200 || config["networkSecret"] != firstNetwork["networkSecret"] {
		t.Fatalf("authorized shared config status=%d body=%v", status, config)
	}
	status, _ = call(t, h, "GET", "/api/v1/network/config", "", nil)
	if status != 401 {
		t.Fatalf("unauthorized shared config status=%d", status)
	}

	status, second := call(t, h, "POST", "/api/v1/network/join", "", map[string]any{
		"code":     "c7a0c4d9b071ec35f8bc1d2a",
		"deviceId": strings.Repeat("b", 32),
		"username": "Player B",
	})
	if status != 200 {
		t.Fatalf("second shared join status=%d body=%v", status, second)
	}
	secondNetwork := second["network"].(map[string]any)
	if secondNetwork["networkName"] != firstNetwork["networkName"] ||
		secondNetwork["networkSecret"] != firstNetwork["networkSecret"] {
		t.Fatal("server clients did not receive the same shared network")
	}

	status, heartbeat := call(t, h, "POST", "/api/v1/network/heartbeat", firstToken, map[string]any{
		"virtualIp": "10.126.0.1",
	})
	if status != 200 {
		t.Fatalf("heartbeat status=%d body=%v", status, heartbeat)
	}
	members := heartbeat["members"].([]any)
	if len(members) != 2 {
		t.Fatalf("active shared members=%d", len(members))
	}
	foundIP := false
	for _, raw := range members {
		member := raw.(map[string]any)
		if member["userId"] == first["userId"] {
			foundIP = member["virtualIp"] == "10.126.0.1" &&
				member["online"] == true &&
				member["peerStatus"] == "unknown"
		}
	}
	if !foundIP {
		t.Fatalf("heartbeat IP or peer status was not represented accurately: %v", members)
	}

	status, _ = call(t, h, "POST", "/api/v1/network/heartbeat", firstToken, map[string]any{
		"virtualIp": "127.0.0.1",
	})
	if status != 400 {
		t.Fatalf("loopback virtual IP was accepted: %d", status)
	}
	status, _ = call(t, h, "POST", "/api/v1/network/leave", second["accessToken"].(string), nil)
	if status != 200 {
		t.Fatalf("shared leave status=%d", status)
	}
	status, _ = call(t, h, "POST", "/api/v1/network/heartbeat", second["accessToken"].(string), map[string]any{})
	if status != 401 {
		t.Fatalf("departed shared member remained authorized: %d", status)
	}
}

func TestSharedPlayerProfileSyncAndPersistence(t *testing.T) {
	t.Setenv("LANORA_RELAY_PEER_URL", "tcp://relay.example.org:11010")
	h, _ := testAPIWithDB(t)
	status, _ := call(t, h, "PATCH", "/api/v1/admin/player-auth", "admin-test-token", map[string]any{"playerAuth": "passwordless"})
	if status != 200 {
		t.Fatalf("enable passwordless access=%d", status)
	}
	join := func(device, username, avatar string) map[string]any {
		t.Helper()
		status, result := call(t, h, "POST", "/api/v1/network/join", "", map[string]any{
			"deviceId": device, "username": username, "avatar": avatar,
		})
		if status != 200 {
			t.Fatalf("join %s=%d body=%v", username, status, result)
		}
		return result
	}
	a := join(strings.Repeat("a", 32), "Player A", "cat")
	b := join(strings.Repeat("b", 32), "Player B", "fox")
	status, _ = call(t, h, "PATCH", "/api/v1/network/profile", a["accessToken"].(string), map[string]any{"username": "Player A", "avatar": "panda"})
	if status != 200 {
		t.Fatalf("authorized profile update=%d", status)
	}
	status, heartbeat := call(t, h, "POST", "/api/v1/network/heartbeat", b["accessToken"].(string), map[string]any{})
	if status != 200 {
		t.Fatalf("second player heartbeat=%d body=%v", status, heartbeat)
	}
	seenUpdatedProfile := false
	for _, raw := range heartbeat["members"].([]any) {
		member := raw.(map[string]any)
		if member["userId"] == a["userId"] {
			seenUpdatedProfile = member["username"] == "Player A" && member["avatar"] == "panda"
		}
	}
	if !seenUpdatedProfile {
		t.Fatalf("other player did not receive updated profile: %v", heartbeat["members"])
	}
	status, _ = call(t, h, "PATCH", "/api/v1/network/profile", "", map[string]any{"username": "Intruder", "avatar": "dragon"})
	if status != 401 {
		t.Fatalf("unauthorized profile update=%d", status)
	}
	status, _ = call(t, h, "POST", "/api/v1/network/leave", a["accessToken"].(string), nil)
	if status != 200 {
		t.Fatalf("leave before reconnect=%d", status)
	}
	status, rejoined := call(t, h, "POST", "/api/v1/network/join", "", map[string]any{
		"deviceId": strings.Repeat("a", 32), "username": "Player A",
	})
	if status != 200 {
		t.Fatalf("rejoin without avatar=%d body=%v", status, rejoined)
	}
	status, heartbeat = call(t, h, "POST", "/api/v1/network/heartbeat", b["accessToken"].(string), map[string]any{})
	if status != 200 {
		t.Fatalf("heartbeat after reconnect=%d", status)
	}
	for _, raw := range heartbeat["members"].([]any) {
		member := raw.(map[string]any)
		if member["userId"] == rejoined["userId"] && member["avatar"] != "panda" {
			t.Fatalf("avatar did not persist on reconnect: %v", member)
		}
	}
	status, invalid := call(t, h, "POST", "/api/v1/network/join", "", map[string]any{
		"deviceId": strings.Repeat("c", 32), "username": "Player C", "avatar": "unlisted-avatar",
	})
	if status != 400 || invalid["error"].(map[string]any)["code"] != "invalid_profile" {
		t.Fatalf("invalid avatar was accepted: %d %v", status, invalid)
	}
}

func TestRoomProfilesAreAuthorizedAndVisibleToOtherMembers(t *testing.T) {
	h := testAPI(t)
	status, host := call(t, h, "POST", "/api/v1/rooms", "", map[string]any{
		"name": "Profile Room", "username": "Host", "deviceId": strings.Repeat("d", 32), "avatar": "cat",
	})
	if status != 201 {
		t.Fatalf("create room=%d body=%v", status, host)
	}
	roomID := host["roomId"].(string)
	status, guest := call(t, h, "POST", "/api/v1/rooms/join", "", map[string]any{
		"inviteCode": host["inviteCode"], "username": "Guest", "deviceId": strings.Repeat("e", 32), "avatar": "fox",
	})
	if status != 200 {
		t.Fatalf("join room=%d body=%v", status, guest)
	}
	status, _ = call(t, h, "PATCH", "/api/v1/rooms/"+roomID+"/profile", guest["accessToken"].(string), map[string]any{"username": "Guest", "avatar": "panda"})
	if status != 200 {
		t.Fatalf("authorized room profile update=%d", status)
	}
	status, loaded := call(t, h, "GET", "/api/v1/rooms/"+roomID, host["accessToken"].(string), nil)
	if status != 200 {
		t.Fatalf("load room=%d body=%v", status, loaded)
	}
	found := false
	for _, raw := range loaded["members"].([]any) {
		member := raw.(map[string]any)
		if member["userId"] == guest["userId"] {
			found = member["username"] == "Guest" && member["avatar"] == "panda" && member["online"] == true
		}
	}
	if !found {
		t.Fatalf("updated room profile/presence not visible: %v", loaded["members"])
	}
	status, _ = call(t, h, "PATCH", "/api/v1/rooms/"+roomID+"/profile", "", map[string]any{"username": "Intruder", "avatar": "dragon"})
	if status != 401 {
		t.Fatalf("unauthorized room profile update=%d", status)
	}
}

func TestKickingRoomMemberRotatesNetworkGeneration(t *testing.T) {
	t.Setenv("LANORA_RELAY_PEER_URL", "tcp://relay.example.org:11010")
	h := testAPI(t)
	_, host := call(t, h, "POST", "/api/v1/rooms", "", map[string]any{"name": "Rotate Room", "username": "Host"})
	roomID := host["roomId"].(string)
	_, guest := call(t, h, "POST", "/api/v1/rooms/join", "", map[string]any{"inviteCode": host["inviteCode"], "username": "Guest"})
	status, before := call(t, h, "GET", "/api/v1/rooms/"+roomID+"/network", host["accessToken"].(string), nil)
	if status != 200 {
		t.Fatalf("get initial network config=%d body=%v", status, before)
	}
	status, removed := call(t, h, "POST", "/api/v1/rooms/"+roomID+"/members/"+guest["userId"].(string)+"/kick", host["accessToken"].(string), nil)
	if status != 200 || removed["networkGenerationRotated"] != true {
		t.Fatalf("kick status=%d body=%v", status, removed)
	}
	status, after := call(t, h, "GET", "/api/v1/rooms/"+roomID+"/network", host["accessToken"].(string), nil)
	if status != 200 || after["networkGeneration"] == before["networkGeneration"] || after["networkSecret"] == before["networkSecret"] {
		t.Fatalf("kick did not rotate network credentials: status=%d after=%v before=%v", status, after, before)
	}
	status, _ = call(t, h, "GET", "/api/v1/rooms/"+roomID, guest["accessToken"].(string), nil)
	if status != 401 {
		t.Fatalf("kicked player retained API membership=%d", status)
	}
}

func TestSharedCodeRotationRevokesExistingTokens(t *testing.T) {
	t.Setenv("LANORA_SHARED_NETWORK_CODE", "old-code-0123456789abcdef")
	t.Setenv("LANORA_RELAY_PEER_URL", "tcp://relay.example.org:11010")
	db, err := store.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	before := New(db, logger, "admin-test-token")
	status, joined := call(t, before, "POST", "/api/v1/network/join", "", map[string]any{
		"code":     "old-code-0123456789abcdef",
		"deviceId": strings.Repeat("c", 32),
		"username": "Player C",
	})
	if status != 200 {
		t.Fatalf("join before rotation=%d body=%v", status, joined)
	}

	t.Setenv("LANORA_SHARED_NETWORK_CODE", "new-code-fedcba9876543210")
	after := New(db, logger, "admin-test-token")
	status, _ = call(t, after, "GET", "/api/v1/network/config", joined["accessToken"].(string), nil)
	if status != 401 {
		t.Fatalf("old token remained authorized after code rotation: %d", status)
	}
	status, rejoined := call(t, after, "POST", "/api/v1/network/join", "", map[string]any{
		"code":     "new-code-fedcba9876543210",
		"deviceId": strings.Repeat("c", 32),
		"username": "Player C",
	})
	if status != 200 {
		t.Fatalf("join after code rotation=%d", status)
	}
	oldNetwork := joined["network"].(map[string]any)
	newNetwork := rejoined["network"].(map[string]any)
	if oldNetwork["networkName"] == newNetwork["networkName"] || oldNetwork["networkSecret"] == newNetwork["networkSecret"] {
		t.Fatal("code rotation did not rotate the data-plane identity")
	}
}

func TestConnectionInfoAndPasswordlessPlayerAuthorization(t *testing.T) {
	t.Setenv("LANORA_RELAY_PEER_URL", "tcp://relay.example.org:11010")
	h, _ := testAPIWithDB(t)

	status, info := call(t, h, "GET", "/api/v1/connection-info", "", nil)
	if status != 200 || info["playerAuth"] != "password_required" {
		t.Fatalf("initial discovery status=%d info=%v", status, info)
	}
	for _, secretField := range []string{"passwordHash", "networkSecret", "adminToken", "accessToken"} {
		if _, ok := info[secretField]; ok {
			t.Fatalf("connection discovery exposed %q", secretField)
		}
	}
	status, _ = call(t, h, "GET", "/api/v1/admin/player-auth", "", nil)
	if status != 401 {
		t.Fatalf("unauthenticated player policy read=%d", status)
	}
	status, state := call(t, h, "GET", "/api/v1/admin/player-auth", "admin-test-token", nil)
	if status != 200 || state["configured"] != false {
		t.Fatalf("initial admin player policy status=%d body=%v", status, state)
	}
	status, rejected := call(t, h, "POST", "/api/v1/network/join", "", map[string]any{
		"deviceId": strings.Repeat("a", 32), "username": "Passwordless Test",
	})
	if status != 503 || rejected["error"].(map[string]any)["code"] != "player_auth_unconfigured" {
		t.Fatalf("unconfigured protected server did not fail closed: %d %v", status, rejected)
	}
	status, updated := call(t, h, "PATCH", "/api/v1/admin/player-auth", "admin-test-token", map[string]any{
		"playerAuth": "passwordless",
	})
	if status != 200 || updated["sessionsRevoked"] != true {
		t.Fatalf("disable player password status=%d body=%v", status, updated)
	}
	status, info = call(t, h, "GET", "/api/v1/connection-info", "", nil)
	if status != 200 || info["playerAuth"] != "passwordless" {
		t.Fatalf("passwordless discovery status=%d body=%v", status, info)
	}
	status, joined := call(t, h, "POST", "/api/v1/network/join", "", map[string]any{
		"deviceId": strings.Repeat("a", 32), "username": "Passwordless Test",
	})
	if status != 200 || joined["status"] != "approved" || joined["network"] == nil {
		t.Fatalf("passwordless join status=%d body=%v", status, joined)
	}
	status, config := call(t, h, "GET", "/api/v1/network/config", joined["accessToken"].(string), nil)
	if status != 200 || config["networkSecret"] != joined["network"].(map[string]any)["networkSecret"] {
		t.Fatalf("authorized passwordless network config status=%d body=%v", status, config)
	}
	status, _ = call(t, h, "GET", "/api/v1/admin/summary", "", nil)
	if status != 401 {
		t.Fatalf("passwordless mode opened administrator access: %d", status)
	}
}

func TestPasswordPolicyChangesRevokeSessionsAndPersist(t *testing.T) {
	t.Setenv("LANORA_RELAY_PEER_URL", "tcp://relay.example.org:11010")
	h, db := testAPIWithDB(t)
	password := "CorrectHorse9!Lamp"
	status, _ := call(t, h, "PATCH", "/api/v1/admin/player-auth", "admin-test-token", map[string]any{
		"playerAuth": "password_required", "password": password,
	})
	if status != 200 {
		t.Fatalf("set player password=%d", status)
	}
	status, _ = call(t, h, "PATCH", "/api/v1/admin/player-auth", "", map[string]any{
		"playerAuth": "passwordless",
	})
	if status != 401 {
		t.Fatalf("unauthenticated policy update=%d", status)
	}
	status, wrong := call(t, h, "POST", "/api/v1/network/join", "", map[string]any{
		"password": "WrongPassword8!Bay", "deviceId": strings.Repeat("b", 32), "username": "Protected Player",
	})
	if status != 401 || wrong["error"].(map[string]any)["code"] != "network_password_invalid" {
		t.Fatalf("wrong player password status=%d body=%v", status, wrong)
	}
	status, oldJoin := call(t, h, "POST", "/api/v1/network/join", "", map[string]any{
		"password": password, "deviceId": strings.Repeat("b", 32), "username": "Protected Player",
	})
	if status != 200 {
		t.Fatalf("valid player password status=%d body=%v", status, oldJoin)
	}
	oldToken := oldJoin["accessToken"].(string)
	var oldName, oldSecret string
	if err := db.QueryRow("SELECT network_name, network_secret FROM shared_network WHERE id=1").Scan(&oldName, &oldSecret); err != nil {
		t.Fatal(err)
	}
	newPassword := "NewCorrectHorse7!Lake"
	status, change := call(t, h, "PATCH", "/api/v1/admin/player-auth", "admin-test-token", map[string]any{
		"playerAuth": "password_required", "password": newPassword,
	})
	if status != 200 || change["sessionsRevoked"] != true {
		t.Fatalf("change player password status=%d body=%v", status, change)
	}
	status, _ = call(t, h, "GET", "/api/v1/network/config", oldToken, nil)
	if status != 401 {
		t.Fatalf("old session survived password change: %d", status)
	}
	status, _ = call(t, h, "POST", "/api/v1/network/join", "", map[string]any{
		"password": password, "deviceId": strings.Repeat("c", 32), "username": "Old Password",
	})
	if status != 401 {
		t.Fatalf("old password remained valid after change: %d", status)
	}
	status, newJoin := call(t, h, "POST", "/api/v1/network/join", "", map[string]any{
		"password": newPassword, "deviceId": strings.Repeat("d", 32), "username": "New Password",
	})
	if status != 200 {
		t.Fatalf("new password failed after change: %d %v", status, newJoin)
	}
	var currentName, currentSecret, storedHash string
	var policy string
	if err := db.QueryRow("SELECT network_name, network_secret, player_auth, password_hash FROM shared_network WHERE id=1").Scan(&currentName, &currentSecret, &policy, &storedHash); err != nil {
		t.Fatal(err)
	}
	if currentName == oldName || currentSecret == oldSecret || policy != "password_required" ||
		!strings.HasPrefix(storedHash, "pbkdf2-sha256$") || strings.Contains(storedHash, newPassword) {
		t.Fatal("password change did not rotate network identity or securely hash the password")
	}
	// Recreating the handler on the same persistent database models an API restart.
	restarted := New(db, slog.New(slog.NewTextHandler(io.Discard, nil)), "admin-test-token")
	status, info := call(t, restarted, "GET", "/api/v1/connection-info", "", nil)
	if status != 200 || info["playerAuth"] != "password_required" {
		t.Fatalf("policy did not persist after API restart: %d %v", status, info)
	}
	status, _ = call(t, restarted, "GET", "/api/v1/network/config", newJoin["accessToken"].(string), nil)
	if status != 200 {
		t.Fatalf("valid session did not survive restart: %d", status)
	}
	status, disabled := call(t, restarted, "PATCH", "/api/v1/admin/player-auth", "admin-test-token", map[string]any{
		"playerAuth": "passwordless",
	})
	if status != 200 || disabled["sessionsRevoked"] != true {
		t.Fatalf("disable password status=%d body=%v", status, disabled)
	}
	status, _ = call(t, restarted, "GET", "/api/v1/network/config", newJoin["accessToken"].(string), nil)
	if status != 401 {
		t.Fatalf("old session survived disabling password: %d", status)
	}
	status, passwordlessJoin := call(t, restarted, "POST", "/api/v1/network/join", "", map[string]any{
		"deviceId": strings.Repeat("e", 32), "username": "Open Player",
	})
	if status != 200 {
		t.Fatalf("passwordless join after policy change status=%d", status)
	}
	openToken := passwordlessJoin["accessToken"].(string)
	finalPassword := "FinalStrong8!River"
	status, _ = call(t, restarted, "PATCH", "/api/v1/admin/player-auth", "admin-test-token", map[string]any{
		"playerAuth": "password_required", "password": finalPassword,
	})
	if status != 200 {
		t.Fatalf("re-enable player password status=%d", status)
	}
	status, _ = call(t, restarted, "GET", "/api/v1/network/config", openToken, nil)
	if status != 401 {
		t.Fatalf("a revoked passwordless session regained access after re-enabling protection: %d", status)
	}
	status, _ = call(t, restarted, "POST", "/api/v1/network/join", "", map[string]any{
		"deviceId": strings.Repeat("e", 32), "username": "Open Player",
	})
	if status != 401 {
		t.Fatalf("passwordless join remained available after re-enabling protection: %d", status)
	}
	status, _ = call(t, restarted, "POST", "/api/v1/network/join", "", map[string]any{
		"password": finalPassword, "deviceId": strings.Repeat("e", 32), "username": "Open Player",
	})
	if status != 200 {
		t.Fatalf("player could not rejoin with password after re-enabling protection: %d", status)
	}
}

func TestPasswordStrengthAndRateLimit(t *testing.T) {
	for _, password := range []string{"short", "onlylowercase12", "123456789012"} {
		if validPlayerPassword(password) {
			t.Fatalf("weak password accepted: %q", password)
		}
	}
	if !validPlayerPassword("CorrectHorse9!Lamp") || !validPlayerPassword("correct horse battery") {
		t.Fatal("strong password or long passphrase rejected")
	}
	t.Setenv("LANORA_RELAY_PEER_URL", "tcp://relay.example.org:11010")
	h := testAPI(t)
	call(t, h, "PATCH", "/api/v1/admin/player-auth", "admin-test-token", map[string]any{
		"playerAuth": "password_required", "password": "CorrectHorse9!Lamp",
	})
	for i := 0; i < 12; i++ {
		status, _ := call(t, h, "POST", "/api/v1/network/join", "", map[string]any{
			"password": "WrongPassword8!Bay", "deviceId": fmt.Sprintf("%032x", i+1), "username": "Rate Limit Test",
		})
		if status != 401 {
			t.Fatalf("failed attempt %d had status %d, expected 401", i+1, status)
		}
	}
	status, _ := call(t, h, "POST", "/api/v1/network/join", "", map[string]any{
		"password": "CorrectHorse9!Lamp", "deviceId": strings.Repeat("f", 32), "username": "Rate Limit Test",
	})
	if status != 429 {
		t.Fatalf("too many player attempts were not rate limited: %d", status)
	}
}

func TestLegacyPlayerCodeMigratesToPasswordHash(t *testing.T) {
	const legacyCode = "old-code-0123456789abcdef"
	t.Setenv("LANORA_SHARED_NETWORK_CODE", legacyCode)
	t.Setenv("LANORA_RELAY_PEER_URL", "tcp://relay.example.org:11010")
	db, err := store.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	const originalName = "lanora-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	const originalSecret = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
	_, err = db.Exec(`INSERT INTO shared_network(id, network_name, network_secret, code_hash, created_at)
		VALUES(1, ?, ?, ?, 1)`, originalName, originalSecret, hash(legacyCode))
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.Exec(`INSERT INTO shared_members(device_id, user_id, username, token_hash, virtual_ip, last_seen)
		VALUES(?, ?, ?, ?, '', ?)`, strings.Repeat("a", 32), "existing-user", "Existing", hash("existing-token"), time.Now().Unix())
	if err != nil {
		t.Fatal(err)
	}
	h := New(db, slog.New(slog.NewTextHandler(io.Discard, nil)), "admin-test-token")
	var name, secret, codeHash, passwordHash, policy string
	if err := db.QueryRow(`SELECT network_name, network_secret, code_hash, password_hash, player_auth
		FROM shared_network WHERE id=1`).Scan(&name, &secret, &codeHash, &passwordHash, &policy); err != nil {
		t.Fatal(err)
	}
	if name != originalName || secret != originalSecret || policy != "password_required" ||
		codeHash != "" || !checkPasswordHash(passwordHash, legacyCode) {
		t.Fatal("legacy protected configuration was not safely migrated")
	}
	var members int
	if err := db.QueryRow("SELECT COUNT(*) FROM shared_members").Scan(&members); err != nil || members != 1 {
		t.Fatal("legacy migration unexpectedly destroyed valid sessions")
	}
	status, joined := call(t, h, "POST", "/api/v1/network/join", "", map[string]any{
		"code": legacyCode, "deviceId": strings.Repeat("c", 32), "username": "Old Client",
	})
	if status != 200 || joined["status"] != "approved" {
		t.Fatalf("legacy access code was not accepted after migration: %d %v", status, joined)
	}
}
