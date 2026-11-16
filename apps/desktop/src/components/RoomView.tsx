import { Activity, Copy, Wifi, Link2, Users } from "lucide-react";
import { labels } from "../labels";
import type { Lang, ActiveRoom, EngineStatus } from "../types";
export function RoomView({
  room,
  tunnel,
  lang,
  busy,
  onCopy,
  onRetry,
  onLeave,
  onApprove,
}: {
  room: ActiveRoom;
  tunnel: EngineStatus;
  lang: Lang;
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
          <span className="app-eyebrow">YOUR ROOM</span>
          <h2>{room.name}</h2>
          <p>{room.status === "pending" ? t.pending : t.joined}</p>
        </div>
        <span className="app-room-state">
          <Activity size={16} />
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
      </div>
      {room.inviteCode && (
        <div className="app-invite">
          <span>{t.invite}</span>
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
          <small>{t.localIp}</small>
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
          <p>
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
          <small>DIRECT IP</small>
          <p>{t.directIp}</p>
        </div>
      </div>
      <div className="app-members-head">
        <h3>
          <Users size={17} />
          {t.members} <span>{room.members?.length ?? "—"}</span>
        </h3>
        {tunnel.state === "failed" && (
          <button className="app-button subtle" onClick={onRetry}>
            {t.retry}
          </button>
        )}
      </div>
      <div className="app-members">
        {room.status === "pending" ? (
          <p>{t.pending}</p>
        ) : !room.members ? (
          <div className="skeleton" role="status">
            {lang === "fa" ? "دریافت اعضا…" : "Loading players…"}
          </div>
        ) : (
          room.members.map((m) => (
            <div className="app-member" key={m.userId}>
              <span className="app-avatar">
                {m.username.slice(0, 1).toUpperCase()}
              </span>
              <b>{m.username}</b>
              <small>
                {m.status === "pending"
                  ? t.pending
                  : (m.role === "host" ? "Host · " : "") +
                    (lang === "fa"
                      ? "ارتباط همتا نامشخص"
                      : "Peer connection unknown")}
              </small>
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
          ))
        )}
      </div>
      <button className="app-button danger" disabled={busy} onClick={onLeave}>
        {room.role === "host" ? t.close : t.leave}
      </button>
    </section>
  );
}
