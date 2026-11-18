import { Activity, Copy, Power, RefreshCw, Wifi, Users } from "lucide-react";
import { labels } from "../labels";
import type { Lang, ActiveRoom, EngineStatus, PeerStatus } from "../types";
import {
  buildConnectionDiagnostics,
  PEER_STATUS_MAX_AGE_MS,
  serializeSafeDiagnostics,
} from "../diagnostics";
import { Avatar, type AvatarKind } from "./Avatar";
import { avatars } from "./avatarData";
import { summarizePeerRoutes } from "../peerSummary";

export function RoomView({
  room,
  serverAddress,
  serverLatencyMs,
  serverReachable,
  presenceFresh,
  presenceUpdatedAt,
  reconnecting,
  reconnectAttempt,
  tunnel,
  peerStatuses,
  lang,
  avatar,
  playerName,
  busy,
  disconnecting,
  retrying,
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
  presenceUpdatedAt: number;
  reconnecting: boolean;
  reconnectAttempt: number;
  tunnel: EngineStatus;
  peerStatuses: PeerStatus[];
  lang: Lang;
  avatar: AvatarKind;
  playerName: string;
  busy: boolean;
  disconnecting: boolean;
  retrying: boolean;
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
    (peer) => peer.observedAt != null && Date.now() - peer.observedAt < PEER_STATUS_MAX_AGE_MS,
  );
  const peerByIP = new Map(freshPeers.map((peer) => [peer.virtualIp, peer]));
  const peerSummary = summarizePeerRoutes(otherPlayers, new Set(peerByIP.keys()), presenceFresh);
  const verifiedOtherRoutes = peerSummary.reachable;
  const observedRelayRoutes = otherPlayers.filter(
    (member) => member.online !== false || !presenceFresh,
  ).filter((member) => Boolean(member.virtualIp)).filter(
    (member) => peerByIP.get(member.virtualIp!)?.routeType === "relay",
  ).length;
  const diagnostics = buildConnectionDiagnostics({
    serverReachable,
    authorization: room.status === "approved" ? "approved" : room.status === "pending" ? "pending" : "rejected",
    tunnelRunning: tunnel.running,
    tunnelFailed: tunnel.state === "failed",
    virtualIpAssigned: Boolean(tunnel.virtualIp),
    presenceKnown: presenceUpdatedAt > 0,
    presenceFresh,
    expectedPeerCount: peerSummary.expectedPlayers,
    reachablePeerCount: verifiedOtherRoutes,
    observedRelayRouteCount: observedRelayRoutes,
    hasFreshPeerObservations: freshPeers.length > 0,
    totalOtherPlayerCount: peerSummary.totalOtherPlayers,
    awaitingVirtualIpCount: peerSummary.awaitingVirtualIp,
    playersWithVirtualIpCount: peerSummary.playersWithVirtualIp,
    unknownPeerCount: peerSummary.unknown,
  });
  const relativeUpdatedTime = () => {
    if (!presenceUpdatedAt) return lang === "fa" ? "هرگز" : "never";
    const seconds = Math.max(0, Math.floor((Date.now() - presenceUpdatedAt) / 1000));
    const [value, unit] = seconds < 60
      ? [seconds, "second"] as const
      : [Math.floor(seconds / 60), "minute"] as const;
    return new Intl.RelativeTimeFormat(lang === "fa" ? "fa-IR" : "en", { numeric: "auto" })
      .format(-value, unit);
  };
  const diagnosticState = (state: string) => ({
    pass: t.diagnosticPass,
    fail: t.diagnosticFail,
    unknown: t.diagnosticUnknown,
    pending: t.diagnosticPending,
    stale: t.diagnosticStale,
    partial: t.diagnosticPartial,
    not_checked: t.diagnosticNotChecked,
    observed: t.diagnosticObserved,
    none_observed: t.diagnosticNoneObserved,
  }[state] ?? t.diagnosticUnknown);
  const numberFormat = new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US");
  const peerRouteSummary = diagnostics.peerRoute.expected === 0
    ? diagnosticState(diagnostics.peerRoute.status)
    : t.peerRouteCount
      .replace("{reachable}", numberFormat.format(diagnostics.peerRoute.reachable))
      .replace("{expected}", numberFormat.format(diagnostics.peerRoute.expected));
  const peerAddressSummary = peerSummary.expectedPlayers === 0
    ? ""
    : t.peerPlayersReachable
      .replace("{reachable}", numberFormat.format(peerSummary.reachable))
      .replace("{expected}", numberFormat.format(peerSummary.expectedPlayers));
  const relaySummary = diagnostics.observedRelayRoutes.status === "observed"
    ? `${numberFormat.format(diagnostics.observedRelayRoutes.count)} · ${diagnosticState("observed")}`
    : diagnosticState(diagnostics.observedRelayRoutes.status);
  const diagnosticRows: [string, string][] = [
    [t.diagnosticBackend, diagnosticState(diagnostics.backend)],
    [t.diagnosticPlayerAuthorization, diagnosticState(diagnostics.playerAuthorization)],
    [t.diagnosticEasyTierProcess, diagnosticState(diagnostics.easyTierProcess)],
    [t.diagnosticVirtualIp, diagnosticState(diagnostics.virtualIpAssigned)],
    [t.diagnosticPlayerPresence, diagnosticState(diagnostics.playerPresence)],
    [t.diagnosticOtherPlayers, numberFormat.format(diagnostics.peerRoute.totalPlayers)],
    [t.diagnosticPeerRoute, peerRouteSummary],
    [t.diagnosticAwaitingIp, numberFormat.format(diagnostics.peerRoute.awaitingVirtualIp)],
    [t.diagnosticUnknownRoutes, numberFormat.format(diagnostics.peerRoute.unknown)],
    [t.diagnosticObservedRelayRoutes, relaySummary],
    [t.diagnosticRelayTest, diagnosticState(diagnostics.relayReachabilityTest)],
  ];

  let statusText = t.starting;
  let statusTone = "pending";
  if (room.status === "pending") {
    statusText = t.pending;
  } else if (reconnecting) {
    statusText = lang === "fa"
      ? `تلاش مجدد · مرحلهٔ ${Math.min(reconnectAttempt, 3)} از ۳`
      : `Reconnecting · attempt ${Math.min(reconnectAttempt, 3)} of 3`;
    statusTone = "warning";
  } else if (!serverReachable) {
    statusText = t.serverInterrupted;
    statusTone = "warning";
  } else if (!presenceFresh) {
    statusText = t.playerPresenceStale;
    statusTone = "warning";
  } else if (tunnel.state === "failed") {
    statusText = t.networkFailed;
    statusTone = "failed";
  } else if (tunnel.virtualIp) {
    if (otherPlayers.length === 0) {
      statusText = t.waitingForPeers;
      statusTone = "ready";
    } else if (peerSummary.status === "pass") {
      statusText = t.peerRoutesAllFound;
      statusTone = "ready";
    } else if (peerSummary.status === "partial") {
      statusText = t.peerRoutesPartial;
      statusTone = "ready";
    } else if (peerSummary.awaitingVirtualIp > 0) {
      statusText = t.waitingForPeerIp;
      statusTone = "pending";
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
          <span
            className="app-server-latency"
            title={t.serverRttTooltip}
            aria-label={`${t.serverRttTooltip}: ${serverReachable && serverLatencyMs != null ? `${serverLatencyMs} ms` : t.diagnosticUnknown}`}
            dir="ltr"
          >
            <Activity size={13} aria-hidden="true" />
            <span>{lang === "fa" ? "سرور" : "Server"}</span>
            <bdi>{serverReachable && serverLatencyMs != null ? `${serverLatencyMs} ms` : "—"}</bdi>
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
          {tunnel.state === "failed" && (
            <button className="app-button subtle" disabled={busy || retrying} onClick={onRetry}>
              {retrying ? <RefreshCw size={16} className="spin" aria-hidden="true" /> : <Activity size={16} aria-hidden="true" />}
              {retrying ? t.retrying : t.retry}
            </button>
          )}
          <button className="app-button danger" disabled={busy || disconnecting} onClick={onLeave}>
            {disconnecting ? <RefreshCw size={16} className="spin" aria-hidden="true" /> : <Power size={16} aria-hidden="true" />}
            {disconnecting ? t.disconnecting : room.roomId === "shared" ? t.disconnect : room.role === "host" ? t.close : t.leave}
          </button>
        </div>
      </div>

      {room.inviteCode && (
        <div className="app-invite compact">
          <span dir={lang === "fa" ? "rtl" : "ltr"}>{room.roomId === "shared" ? t.sharedCode : t.invite}</span>
          <code dir="ltr">{room.inviteCode}</code>
          <button className="app-icon" onClick={() => onCopy(room.inviteCode!)} aria-label={t.copy} title={t.copy}><Copy size={15} /></button>
        </div>
      )}

      <section className="app-player-section" aria-labelledby="app-player-heading">
        <div className="app-members-head">
          <h2 id="app-player-heading"><Users size={17} /><span dir={lang === "fa" ? "rtl" : "ltr"}>{t.members}</span></h2>
          <span className="app-player-count" dir="ltr">{members.length}</span>
        </div>
        {!presenceFresh && (
          <p className="app-presence-stale" role="status" dir={lang === "fa" ? "rtl" : "ltr"}>
            <Activity size={14} aria-hidden="true" />
            <span>{t.playerPresenceStale} · {t.playerPresenceUpdated.replace("{time}", relativeUpdatedTime())}</span>
          </p>
        )}
        {peerAddressSummary && (
          <div className="app-peer-overview" role="status" dir={lang === "fa" ? "rtl" : "ltr"}>
            <span>{peerAddressSummary}</span>
            {peerSummary.awaitingVirtualIp > 0 && (
              <span className="app-peer-awaiting">
                {t.peerAwaitingIp.replace("{count}", numberFormat.format(peerSummary.awaitingVirtualIp))}
              </span>
            )}
          </div>
        )}
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
              const routeLabel = peer?.routeType === "direct"
                ? t.directRoute
                : peer?.routeType === "relay"
                  ? t.relayRoute
                  : t.peerRoute;
              const peerRtt = peer?.latencyMs != null ? Math.round(peer.latencyMs) : null;
              const peerRttLabel = peerRtt == null
                ? ""
                : t.peerRttTooltip
                  .replace("{route}", routeLabel)
                  .replace("{value}", numberFormat.format(peerRtt));
              return (
                <article className={`app-member ${isSelf ? "self" : ""}`} key={member.userId}>
                  <Avatar kind={avatarKind} size={38} decorative />
                  <div className="app-member-copy">
                    <b dir="auto" title={displayName}>{displayName}{isSelf && <span className="app-you-label"> · {lang === "fa" ? "شما" : "You"}</span>}</b>
                    <small dir={lang === "fa" ? "rtl" : "ltr"}>
                      {member.status === "pending" ? t.pending : appStatus}
                      {!isSelf && (
                        <span className="app-peer-quality" title={peerRttLabel || routeLabel}>
                          <span>{peer ? routeLabel : t.peerUnknown}</span>
                          {peerRtt != null && (
                            <span className="app-peer-rtt" aria-label={peerRttLabel}>
                              <Activity size={12} aria-hidden="true" />
                              <bdi dir="ltr">{numberFormat.format(peerRtt)} ms</bdi>
                            </span>
                          )}
                        </span>
                      )}
                    </small>
                  </div>
                  {member.virtualIp && (
                    <>
                      <code dir="ltr" title={member.virtualIp}>{member.virtualIp}</code>
                      <button className="app-icon app-member-copy-ip" title={t.copyIp} aria-label={`${t.copyIp} ${member.username} ${member.virtualIp}`} onClick={() => onCopy(member.virtualIp!)}>
                        <Copy size={16} aria-hidden="true" />
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

      {(() => {
        const reachablePlayer = otherPlayers.find(
          (member) => member.virtualIp && peerByIP.has(member.virtualIp),
        );
        return reachablePlayer?.virtualIp ? (
          <div className="app-game-hint" dir={lang === "fa" ? "rtl" : "ltr"}>
            <div>
              <strong>{t.peerReachable}</strong>
              <p>{t.directIp}</p>
            </div>
            <button className="app-button subtle" type="button" onClick={() => onCopy(reachablePlayer.virtualIp!)}>
              <Copy size={15} aria-hidden="true" />{t.copyPlayerIp}
            </button>
          </div>
        ) : otherPlayers.length > 0 ? (
          <p className="app-game-wait" dir={lang === "fa" ? "rtl" : "ltr"}>{t.waitingForVerifiedPeer}</p>
        ) : null;
      })()}

      <details className="app-network-help">
        <summary>{lang === "fa" ? "راهنمای اتصال بازی" : "How to connect in your game"}</summary>
        {verifiedOtherRoutes > 0 ? (
          <>
            <p dir={lang === "fa" ? "rtl" : "ltr"}>{t.directIp}</p>
            <p dir={lang === "fa" ? "rtl" : "ltr"}>{t.peerCaution}</p>
          </>
        ) : (
          <p dir={lang === "fa" ? "rtl" : "ltr"}>{t.peerRouteNotVerifiedHelp}</p>
        )}
        {!presenceFresh && <p dir={lang === "fa" ? "rtl" : "ltr"}>{t.tunnelKeepsRunning}</p>}
      </details>

      <details className="app-network-help app-diagnostics">
        <summary>{t.diagnostics}</summary>
        <p dir={lang === "fa" ? "rtl" : "ltr"}>{t.diagnosticNote}</p>
        <dl>
          {diagnosticRows.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        <button className="app-button subtle" type="button" onClick={() => onCopyDiagnostics(serializeSafeDiagnostics(diagnostics))}>{t.copyDiagnostics}</button>
      </details>
    </section>
  );
}
