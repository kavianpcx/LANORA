import { Activity, Copy, Wifi, Link2, Users } from "lucide-react";
import { labels } from "../labels";
import type { Lang, ActiveRoom, EngineStatus, PeerStatus } from "../types";
import { Avatar, avatarForPlayer, type AvatarKind } from "./Avatar";
export function RoomView({
  room,
  serverAddress,
  tunnel,
  peerStatuses,
  lang,
  avatar,
  busy,
  onCopy,
  onRetry,
  onLeave,
  onApprove,
}: {
  room: ActiveRoom;
  serverAddress: string;
  tunnel: EngineStatus;
  peerStatuses: PeerStatus[];
  lang: Lang;
  avatar: AvatarKind;
  busy: boolean;
  onCopy: (value: string) => void;
  onRetry: () => void;
  onLeave: () => void;
  onApprove: (id: string, approve: boolean) => void;
}) {
  const t = labels[lang];
  return (
    <section className="app-room">
      <div className="app-room-top">
        <div>
          <span className="app-eyebrow">
            {room.roomId === "shared"
              ? lang === "fa" ? "شبکهٔ شما" : "YOUR NETWORK"
              : lang === "fa" ? "روم شما" : "YOUR ROOM"}
          </span>
          <h2>{room.roomId === "shared" ? t.sharedNetwork : room.name}</h2>
          <p className="app-room-server" dir="ltr">
            <span>{t.server}: </span>
            <code>{serverAddress}</code>
          </p>
          <p dir={lang === "fa" ? "rtl" : "ltr"}>
            {room.status === "pending"
              ? t.pending
              : room.roomId === "shared" && tunnel.state !== "tunnel_ready"
                ? tunnel.state === "failed"
                  ? t.networkFailed
                  : t.starting
                : t.joined}
          </p>
        </div>
        <span className="app-room-state">
          <Activity size={16} className={tunnel.state === "connecting" ? "spin" : undefined} />
          <span dir={lang === "fa" ? "rtl" : "ltr"}>
            {room.status === "pending"
              ? t.pending
              : tunnel.state === "tunnel_ready"
                ? t.ready
                : tunnel.state === "connecting"
                  ? t.starting
                  : tunnel.state === "failed"
                    ? lang === "fa"
                      ? "راه‌اندازی شبکه ناموفق بود"
                      : "Network initialization failed"
                    : tunnel.running
                      ? lang === "fa"
                        ? "وضعیت شبکه نامشخص"
                        : "Network status unknown"
                      : t.stopped}
          </span>
        </span>
      </div>
      {room.inviteCode && (
        <div className="app-invite">
          <span dir={lang === "fa" ? "rtl" : "ltr"}>
            {room.roomId === "shared" ? t.sharedCode : t.invite}
          </span>
          <code dir="ltr">{room.inviteCode}</code>
          <button
            className="app-icon"
            onClick={() => {
              onCopy(room.inviteCode!);
            }}
            aria-label={t.copy}
          >
            <Copy size={16} />
          </button>
        </div>
      )}
      <div className="app-ip-grid">
        <div>
          <span className="app-card-icon">
            <Wifi size={20} />
          </span>
          <small dir={lang === "fa" ? "rtl" : "ltr"}>{t.localIp}</small>
          <div className="app-ip-value">
            <strong dir="ltr">{tunnel.virtualIp || "—"}</strong>
            {tunnel.virtualIp && (
              <button
                className="app-icon"
                title={t.copy}
                onClick={() => {
                  onCopy(tunnel.virtualIp!);
                }}
              >
                <Copy size={15} />
              </button>
            )}
          </div>
          <p dir={lang === "fa" ? "rtl" : "ltr"}>
            {tunnel.virtualIp
              ? t.peerCaution
              : tunnel.state === "failed"
                ? lang === "fa"
                  ? "نصب EasyTier و مجوز آداپتور شبکه را بررسی کنید، سپس دوباره تلاش کنید."
                  : "Check the EasyTier installation and adapter permissions, then retry."
                : tunnel.running
                  ? t.waitingIp
                  : t.stopped}
          </p>
        </div>
        <div>
          <span className="app-card-icon">
            <Link2 size={20} />
          </span>
          <small dir="ltr">DIRECT IP</small>
          <p dir={lang === "fa" ? "rtl" : "ltr"}>{t.directIp}</p>
        </div>
      </div>
      <div className="app-members-head">
        <h3>
          <Users size={17} />
          <span dir={lang === "fa" ? "rtl" : "ltr"}>{t.members}</span>
          <span dir="ltr">{room.members?.length ?? "—"}</span>
        </h3>
        {tunnel.state === "failed" && (
          <button className="app-button subtle" onClick={onRetry}>
            {t.retry}
          </button>
        )}
      </div>
      <div className="app-members">
        {room.status === "pending" ? (
          <p dir={lang === "fa" ? "rtl" : "ltr"}>{t.pending}</p>
        ) : !room.members ? (
          <div className="skeleton" role="status">
            {lang === "fa" ? "دریافت اعضا…" : "Loading players…"}
          </div>
        ) : (
          room.members.length === 0 ? (
            <p className="app-no-players" dir={lang === "fa" ? "rtl" : "ltr"}>
              {t.noPlayers}
            </p>
          ) : room.members.map((m) => {
            const peer = m.virtualIp
              ? peerStatuses.find((item) => item.virtualIp === m.virtualIp)
              : undefined;
            const peerText = peer
              ? peer.latencyMs != null
                ? `${t.peerRoute} · ${Math.round(peer.latencyMs)} ms`
                : t.peerRoute
              : t.peerUnknown;
            return (
              <div className="app-member" key={m.userId}>
                <Avatar
                  kind={room.selfUserId === m.userId ? avatar : avatarForPlayer(m.userId)}
                  size={40}
                  decorative
                />
                <div className="app-member-copy">
                  <b dir="auto">{m.username}</b>
                  <small dir={lang === "fa" ? "rtl" : "ltr"}>
                    {m.status === "pending"
                      ? t.pending
                      : m.online === true
                        ? t.onlineNow
                        : m.online === false
                          ? t.offline
                          : t.connectionUnknown}
                    {" · "}{peerText}
                  </small>
                </div>
                {m.virtualIp && (
                  <>
                    <code dir="ltr">{m.virtualIp}</code>
                    <button
                      className="app-icon app-member-copy-ip"
                      title={t.copy}
                      aria-label={t.copy + " " + m.virtualIp}
                      onClick={() => onCopy(m.virtualIp!)}
                    >
                      <Copy size={14} />
                    </button>
                  </>
                )}
                {room.role === "host" && m.status === "pending" && (
                  <>
                    <button onClick={() => void onApprove(m.userId, true)}>
                      {t.approve}
                    </button>
                    <button onClick={() => void onApprove(m.userId, false)}>
                      {t.reject}
                    </button>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
      <button className="app-button danger" disabled={busy} onClick={onLeave}>
        {room.roomId === "shared"
          ? t.disconnect
          : room.role === "host" ? t.close : t.leave}
      </button>
    </section>
  );
}
