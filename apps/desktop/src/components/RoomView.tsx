import { Activity, Copy, Wifi, Users } from "lucide-react";
import { labels } from "../labels";
import type { Lang, ActiveRoom, EngineStatus, PeerStatus } from "../types";
import { Avatar, type AvatarKind } from "./Avatar";
import { avatars } from "./avatarData";

export function RoomView({
  room,
  serverAddress,
  serverLatencyMs,
  serverReachable,
  presenceFresh,
  reconnecting,
  reconnectAttempt,
  tunnel,
  peerStatuses,
  lang,
  avatar,
  playerName,
  busy,
  onCopy,
  onCopyDiagnostics,
  onRetry,
  onLeave,
  onApprove,
}: {
  room: ActiveRoom;
  serverAddress: string;
  serverLatencyMs: number | null;
  serverReachable: boolean;
  presenceFresh: boolean;
  reconnecting: boolean;
  reconnectAttempt: number;
  tunnel: EngineStatus;
  peerStatuses: PeerStatus[];
  lang: Lang;
  avatar: AvatarKind;
  playerName: string;
  busy: boolean;
  onCopy: (value: string) => void;
  onCopyDiagnostics: (value: string) => void;
  onRetry: () => void;
  onLeave: () => void;
  onApprove: (id: string, approve: boolean) => void;
}) {
  const t = labels[lang];
  const members = room.members ?? [];
  const otherPlayers = members.filter((member) => member.userId !== room.selfUserId);
  const freshPeers = peerStatuses.filter(
    (peer) => peer.observedAt != null && Date.now() - peer.observedAt < 15000,
  );
  const peerByIP = new Map(freshPeers.map((peer) => [peer.virtualIp, peer]));
  const verifiedOtherRoutes = otherPlayers.filter((member) => member.virtualIp && peerByIP.has(member.virtualIp)).length;
  const diagnosticStatus = (ok: boolean | null) => ok === true ? "PASS" : ok === false ? "FAIL" : "UNKNOWN";
  const diagnostics = {
    checkedAt: new Date().toISOString(),
    backend: diagnosticStatus(serverReachable),
    playerAuthorization: room.status === "approved" ? "PASS" : "FAIL",
    easyTierProcess: tunnel.running ? "PASS" : tunnel.state === "failed" ? "FAIL" : "UNKNOWN",
    virtualIpAssigned: tunnel.virtualIp ? "PASS" : tunnel.state === "failed" ? "FAIL" : "UNKNOWN",
    playerPresence: presenceFresh ? "PASS" : "FAIL",
    peerRoute: otherPlayers.length === 0 ? "NOT CHECKED" : verifiedOtherRoutes > 0 ? "PASS" : "UNKNOWN",
    relay: "NOT CHECKED",
  };

  let statusText = t.starting;
  let statusTone = "pending";
  if (room.status === "pending") {
    statusText = t.pending;
  } else if (reconnecting) {
    statusText = lang === "fa"
      ? `تلاش مجدد · مرحلهٔ ${Math.min(reconnectAttempt, 3)} از ۳`
      : `Reconnecting · attempt ${Math.min(reconnectAttempt, 3)} of 3`;
    statusTone = "warning";
  } else if (!serverReachable || !presenceFresh) {
    statusText = t.serverInterrupted;
    statusTone = "warning";
  } else if (tunnel.state === "failed") {
    statusText = t.networkFailed;
    statusTone = "failed";
  } else if (tunnel.virtualIp) {
    if (otherPlayers.length === 0) {
      statusText = t.waitingForPeers;
      statusTone = "ready";
    } else if (otherPlayers.some((member) => member.virtualIp && peerByIP.has(member.virtualIp))) {
      statusText = t.peerReachable;
      statusTone = "ready";
    } else {
      statusText = t.ipAssigned;
      statusTone = "pending";
    }
  }

  return (
    <section className="app-room" aria-label={room.name}>
      <header className="app-room-heading">
        <div className="app-room-title">
          <span className="app-eyebrow">{lang === "fa" ? "شبکهٔ شما" : "YOUR NETWORK"}</span>
          <h1 dir="auto">{room.roomId === "shared" ? t.sharedNetwork : room.name}</h1>
          <p className="app-room-server" dir="ltr" title={serverAddress}>
            <span>{t.server}: </span>
            <bdi>{serverAddress}</bdi>
          </p>
        </div>
        <div className="app-room-header-meta">
          <span className={`app-room-state ${statusTone}`} role="status">
            <Activity size={15} className={tunnel.state === "connecting" ? "spin" : undefined} />
            <span dir={lang === "fa" ? "rtl" : "ltr"}>{statusText}</span>
          </span>
          <span className="app-server-latency" dir={lang === "fa" ? "rtl" : "ltr"}>
            {lang === "fa" ? "تأخیر سرور" : "Server latency"}
            <bdi>{serverReachable && serverLatencyMs != null ? ` · ${serverLatencyMs} ms` : " · —"}</bdi>
          </span>
        </div>
      </header>

      <div className="app-network-summary">
        <div className="app-my-ip">
          <span className="app-card-icon"><Wifi size={18} /></span>
          <div className="app-my-ip-copy">
            <small dir={lang === "fa" ? "rtl" : "ltr"}>{t.localIp}</small>
            <strong dir="ltr">{tunnel.virtualIp || "—"}</strong>
          </div>
          {tunnel.virtualIp && (
            <button className="app-icon" title={t.copy} aria-label={`${t.copy} ${tunnel.virtualIp}`} onClick={() => onCopy(tunnel.virtualIp!)}>
              <Copy size={15} />
            </button>
          )}
        </div>
        <div className="app-summary-actions">
          {tunnel.state === "failed" && <button className="app-button subtle" onClick={onRetry}>{t.retry}</button>}
          <button className="app-button danger" disabled={busy} onClick={onLeave}>
            {room.roomId === "shared" ? t.disconnect : room.role === "host" ? t.close : t.leave}
          </button>
        </div>
      </div>

      {room.inviteCode && (
        <div className="app-invite compact">
          <span dir={lang === "fa" ? "rtl" : "ltr"}>{room.roomId === "shared" ? t.sharedCode : t.invite}</span>
          <code dir="ltr">{room.inviteCode}</code>
          <button className="app-icon" onClick={() => onCopy(room.inviteCode!)} aria-label={t.copy}><Copy size={15} /></button>
        </div>
      )}

      <section className="app-player-section" aria-labelledby="app-player-heading">
        <div className="app-members-head">
          <h2 id="app-player-heading"><Users size={17} /><span dir={lang === "fa" ? "rtl" : "ltr"}>{t.members}</span></h2>
          <span className="app-player-count" dir="ltr">{members.length}</span>
        </div>
        {room.status === "pending" ? (
          <p className="app-no-players" dir={lang === "fa" ? "rtl" : "ltr"}>{t.pending}</p>
        ) : !room.members ? (
          <div className="skeleton" role="status">{lang === "fa" ? "دریافت بازیکن‌ها…" : "Loading players…"}</div>
        ) : members.length === 0 ? (
          <p className="app-no-players" dir={lang === "fa" ? "rtl" : "ltr"}>{t.noPlayers}</p>
        ) : (
          <div className="app-members">
            {members.map((member) => {
              const isSelf = member.userId === room.selfUserId;
              const avatarKind = isSelf ? avatar : avatars.includes(member.avatar as AvatarKind) ? member.avatar as AvatarKind : "fox";
              const displayName = isSelf ? playerName : member.username;
              const peer = !isSelf && member.virtualIp ? peerByIP.get(member.virtualIp) : undefined;
              const appStatus = !presenceFresh ? t.connectionUnknown : member.online === true ? t.onlineNow : member.online === false ? t.offline : t.connectionUnknown;
              const peerStatus = isSelf
                ? (lang === "fa" ? "شما" : "You")
                : peer
                  ? `${peer.routeType === "direct" ? t.directRoute : peer.routeType === "relay" ? t.relayRoute : t.peerRoute}${peer.latencyMs != null ? ` · ${Math.round(peer.latencyMs)} ms` : ""}`
                  : member.online === false && presenceFresh ? t.peerUnreachable : t.peerUnknown;
              return (
                <article className={`app-member ${isSelf ? "self" : ""}`} key={member.userId}>
                  <Avatar kind={avatarKind} size={38} decorative />
                  <div className="app-member-copy">
                    <b dir="auto" title={displayName}>{displayName}{isSelf && <span className="app-you-label"> · {lang === "fa" ? "شما" : "You"}</span>}</b>
                    <small dir={lang === "fa" ? "rtl" : "ltr"}>
                      {member.status === "pending" ? t.pending : appStatus}
                      {!isSelf && <span className="app-peer-quality"> · {peerStatus}</span>}
                    </small>
                  </div>
                  {member.virtualIp && (
                    <>
                      <code dir="ltr" title={member.virtualIp}>{member.virtualIp}</code>
                      <button className="app-icon app-member-copy-ip" title={t.copy} aria-label={`${t.copy} ${member.username} ${member.virtualIp}`} onClick={() => onCopy(member.virtualIp!)}>
                        <Copy size={14} />
                      </button>
                    </>
                  )}
                  {room.role === "host" && member.status === "pending" && (
                    <div className="app-member-approval">
                      <button onClick={() => void onApprove(member.userId, true)}>{t.approve}</button>
                      <button onClick={() => void onApprove(member.userId, false)}>{t.reject}</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <details className="app-network-help">
        <summary>{lang === "fa" ? "راهنمای اتصال بازی" : "How to connect in your game"}</summary>
        <p dir={lang === "fa" ? "rtl" : "ltr"}>{t.directIp}</p>
        <p dir={lang === "fa" ? "rtl" : "ltr"}>{t.peerCaution}</p>
        {!presenceFresh && <p dir={lang === "fa" ? "rtl" : "ltr"}>{t.tunnelKeepsRunning}</p>}
      </details>

      <details className="app-network-help app-diagnostics">
        <summary>{t.diagnostics}</summary>
        <p dir={lang === "fa" ? "rtl" : "ltr"}>{t.diagnosticNote}</p>
        <dl>
          {Object.entries(diagnostics).filter(([key]) => key !== "checkedAt").map(([key, value]) => (
            <div key={key}><dt>{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        <button className="app-button subtle" type="button" onClick={() => onCopyDiagnostics(JSON.stringify(diagnostics, null, 2))}>{t.copyDiagnostics}</button>
      </details>
    </section>
  );
}
