import { useEffect, useState, useRef, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Activity,
  ArrowRight,
  Check,
  Copy,
  Gamepad2,
  Globe2,
  Link2,
  LockKeyhole,
  Moon,
  Plus,
  RefreshCw,
  Server,
  Settings2,
  ShieldCheck,
  Sun,
  Users,
  Wifi,
  X,
} from "lucide-react";
import brand from "./brand.svg";
import { labels } from "./labels";
import { api, friendlyError, RequestError } from "./api";
import { Avatar, avatars, type AvatarKind } from "./components/Avatar";
import { ProfileFields } from "./components/ProfileFields";
import { Modal } from "./components/Modal";
import { TitleBar } from "./components/TitleBar";
import { useServer } from "./hooks/useServer";
import "./style.css";

type Lang = "en" | "fa";
type EngineStatus = {
  running: boolean;
  virtualIp: string | null;
  state: string;
  error: string | null;
};
type Member = {
  userId: string;
  username: string;
  role: string;
  status: string;
};
type ListedRoom = {
  id: string;
  name: string;
  gameName: string;
  memberCount: number;
  maxPlayers: number;
  requireApproval: boolean;
  acceptingMembers: boolean;
};
type ActiveRoom = {
  roomId: string;
  name: string;
  accessToken: string;
  inviteCode?: string;
  role: "host" | "member";
  status: string;
  members?: Member[];
};
type Network = { networkName: string; networkSecret: string; peerUrl: string };
export default function App() {
  const [lang, setLang] = useState<Lang>(() =>
    localStorage.getItem("lanora.language") === "fa" ? "fa" : "en",
  );
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    localStorage.getItem("lanora.theme") === "dark" ? "dark" : "light",
  );
  const [name, setName] = useState(
    () => localStorage.getItem("lanora.playerName") || "Player",
  );
  const [avatar, setAvatar] = useState<AvatarKind>(() => {
    const saved = localStorage.getItem("lanora.avatar");
    return avatars.includes(saved as AvatarKind)
      ? (saved as AvatarKind)
      : "fox";
  });
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [serverInput, setServerInput] = useState(
    () => localStorage.getItem("lanora.desktopServer") || "",
  );
  const {
    server,
    reachable: serverReachable,
    checking,
    phase,
    connect: connectServer,
    clear: clearServer,
    failure,
  } = useServer();
  const tunnelBusy = useRef(false);
  const [publicRooms, setPublicRooms] = useState<ListedRoom[]>([]);
  const [room, setRoom] = useState<ActiveRoom | null>(null);
  const [tunnel, setTunnel] = useState<EngineStatus>({
    running: false,
    virtualIp: null,
    state: "stopped",
    error: null,
  });
  const [mode, setMode] = useState<"create" | "join" | "settings" | null>(() =>
    localStorage.getItem("lanora.playerName") ? null : "settings",
  );
  const [selectedRoom, setSelectedRoom] = useState<ListedRoom | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const t = labels[lang];
  const [onboarding, setOnboarding] = useState(
    () => !localStorage.getItem("lanora.playerName"),
  );
  function closeModal() {
    if (busy) return;
    if (onboarding) {
      localStorage.setItem("lanora.playerName", name);
      localStorage.setItem("lanora.avatar", avatar);
      setOnboarding(false);
    }
    setMode(null);
  }
  useEffect(() => {
    let active = true;
    // Defer to the microtask queue so StrictMode's discarded mount cannot start a request.
    void Promise.resolve().then(() => {
      if (active && serverInput && localStorage.getItem("lanora.playerName"))
        void connect();
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("lanora.language", lang);
    localStorage.setItem("lanora.theme", theme);
  }, [lang, theme]);
  useEffect(() => {
    if (failure) setError(friendlyError(failure, lang));
  }, [failure, lang]);
  async function loadRooms(url = server) {
    setRoomsLoading(true);
    try {
      const result = await api<{ rooms: ListedRoom[] }>(url, "/api/v1/rooms");
      setPublicRooms(result.rooms);
    } finally {
      setRoomsLoading(false);
    }
  }
  useEffect(() => {
    if (!server || room) return;
    const timer = window.setInterval(() => {
      void loadRooms().catch(() => {});
    }, 10000);
    return () => window.clearInterval(timer);
  }, [server, room]);
  useEffect(() => {
    if (!room || room.status !== "approved" || !server) return;
    let active = true;
    const refresh = async () => {
      try {
        const current = await api<{ members: Member[] }>(
          server,
          `/api/v1/rooms/${room.roomId}`,
          room.accessToken,
        );
        if (active)
          setRoom((old) => (old ? { ...old, members: current.members } : null));
      } catch (e) {
        if (active) {
          setError(friendlyError(e, lang));
          if (
            e instanceof RequestError &&
            [401, 403, 404].includes(e.status ?? 0)
          ) {
            try {
              await invoke("engine_stop");
              if (active) {
                setTunnel({
                  running: false,
                  virtualIp: null,
                  state: "stopped",
                  error: null,
                });
                setRoom(null);
              }
            } catch (stopError) {
              if (active) setError(friendlyError(stopError, lang));
            }
          }
        }
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [room?.roomId, room?.accessToken, room?.status, server]);
  useEffect(() => {
    if (!room || room.status !== "pending" || !server) return;
    let active = true;
    const poll = async () => {
      try {
        const status = await api<{ status: string }>(
          server,
          `/api/v1/rooms/${room.roomId}/membership`,
          room.accessToken,
        );
        if (!active) return;
        if (status.status === "approved") {
          setRoom((old) => (old ? { ...old, status: "approved" } : null));
          await startTunnel(room.roomId, room.accessToken);
        } else if (status.status === "rejected") {
          setRoom(null);
          setError(
            lang === "fa"
              ? "میزبان درخواست ورود را رد کرد."
              : "The host declined your request.",
          );
        }
      } catch (e) {
        if (active) setError(friendlyError(e, lang));
      }
    };
    const timer = window.setInterval(poll, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [room?.roomId, room?.status, server]);
  useEffect(() => {
    if (!room || !tunnel.running) return;
    let active = true;
    const refresh = async () => {
      try {
        const status = await invoke<EngineStatus>("engine_status");
        if (active) setTunnel(status);
      } catch (e) {
        if (active) setError(friendlyError(e, lang));
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [room?.roomId, tunnel.running]);
  async function connect() {
    if (checking || room) return;
    setError("");
    const url = await connectServer(serverInput);
    if (url) {
      localStorage.setItem("lanora.desktopServer", url);
      void loadRooms(url).catch((e) => setError(friendlyError(e, lang)));
    }
  }
  async function startTunnel(id: string, token: string) {
    if (tunnelBusy.current) return;
    tunnelBusy.current = true;
    setTunnel({
      running: false,
      virtualIp: null,
      state: "connecting",
      error: null,
    });
    try {
      const cfg = await api<Network>(
        server,
        `/api/v1/rooms/${id}/network`,
        token,
      );
      await invoke("engine_start", { cfg });
      setTunnel({
        running: true,
        virtualIp: null,
        state: "connecting",
        error: null,
      });
    } catch (e) {
      setTunnel({
        running: false,
        virtualIp: null,
        state: "failed",
        error: "Engine initialization failed",
      });
      setError(friendlyError(e, lang));
    } finally {
      tunnelBusy.current = false;
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      if (mode === "settings") {
        const next = String(data.get("name") || "").trim();
        if (next.length < 2 || next.length > 32)
          throw new RequestError("invalid_input");
        setName(next);
        localStorage.setItem("lanora.playerName", next);
        localStorage.setItem("lanora.avatar", avatar);
        setOnboarding(false);
        setMode(null);
        return;
      }
      if (!server) throw new Error("Connect to your server first.");
      if (!name || name.trim().length < 2) {
        setMode("settings");
        throw new Error("Set your display name first.");
      }
      if (mode === "create") {
        const created = await api<{
          roomId: string;
          accessToken: string;
          inviteCode: string;
          room: { name: string };
        }>(server, "/api/v1/rooms", undefined, {
          name: String(data.get("roomName")),
          gameName: String(data.get("game") || ""),
          maxPlayers: Number(data.get("players")),
          visibility: data.get("visible") ? "public" : "private",
          password: String(data.get("password") || ""),
          requireApproval: Boolean(data.get("approval")),
          username: name,
        });
        const active: ActiveRoom = {
          roomId: created.roomId,
          name: created.room.name,
          accessToken: created.accessToken,
          inviteCode: created.inviteCode,
          role: "host",
          status: "approved",
        };
        setRoom(active);
        await startTunnel(active.roomId, active.accessToken);
      } else if (mode === "join") {
        const joined = await api<{
          roomId: string;
          roomName: string;
          accessToken: string;
          status: string;
        }>(server, "/api/v1/rooms/join", undefined, {
          username: name,
          password: String(data.get("password") || ""),
          ...(selectedRoom
            ? { roomId: selectedRoom.id }
            : { inviteCode: String(data.get("code") || "") }),
        });
        setRoom({
          roomId: joined.roomId,
          name: joined.roomName,
          accessToken: joined.accessToken,
          role: "member",
          status: joined.status,
        });
        if (joined.status === "approved")
          await startTunnel(joined.roomId, joined.accessToken);
      }
      setMode(null);
      setSelectedRoom(null);
    } catch (e) {
      setError(friendlyError(e, lang));
    } finally {
      setBusy(false);
    }
  }
  async function leave() {
    if (!room || tunnelBusy.current) return;
    setBusy(true);
    setError("");
    try {
      // Stop locally first. Never report a stopped tunnel after a failed stop.
      await invoke("engine_stop");
      setTunnel({
        running: false,
        virtualIp: null,
        state: "stopped",
        error: null,
      });
      try {
        await api(
          server,
          `/api/v1/rooms/${room.roomId}${room.role === "host" ? "" : "/leave"}`,
          room.accessToken,
          undefined,
          room.role === "host" ? "DELETE" : "POST",
        );
      } catch (e) {
        setError(friendlyError(e, lang));
        return;
      }
      setRoom(null);
      void loadRooms().catch(() => {});
    } catch (e) {
      setError(friendlyError(e, lang));
    } finally {
      setBusy(false);
    }
  }
  async function approve(userId: string, decision: boolean) {
    if (!room) return;
    try {
      await api(
        server,
        `/api/v1/rooms/${room.roomId}/approve`,
        room.accessToken,
        { userId, approve: decision },
      );
      const current = await api<{ members: Member[] }>(
        server,
        `/api/v1/rooms/${room.roomId}`,
        room.accessToken,
      );
      setRoom({ ...room, members: current.members });
    } catch (e) {
      setError(friendlyError(e, lang));
    }
  }
  const openJoin = (r: ListedRoom | null) => {
    setSelectedRoom(r);
    setMode("join");
    setError("");
  };
  return (
    <>
      <TitleBar />
      <div className="lanora-app" dir={lang === "fa" ? "rtl" : "ltr"}>
        <aside className="app-sidebar">
          <div className="side-brand">
            <img src={brand} alt="" />
            <div>
              <b>LANORA</b>
              <small>PRIVATE GAME NETWORK</small>
            </div>
          </div>
          <div className="side-divider" />
          <p className="side-label">
            {lang === "fa" ? "مسیر اتصال" : "YOUR ROUTE"}
          </p>
          <div className="side-step complete">
            <span>01</span>
            <div>
              <b>{lang === "fa" ? "سرور" : "Server"}</b>
              <small>
                {serverReachable
                  ? server
                  : lang === "fa"
                    ? "نشانی سرور را وارد کنید"
                    : "Enter your server address"}
              </small>
            </div>
            {serverReachable && <Check size={15} />}
          </div>
          <div className={"side-step " + (room ? "complete" : "")}>
            <span>02</span>
            <div>
              <b>{lang === "fa" ? "روم" : "Room"}</b>
              <small>
                {room
                  ? room.name
                  : lang === "fa"
                    ? "بسازید یا وارد شوید"
                    : "Create or join"}
              </small>
            </div>
            {room && <Check size={15} />}
          </div>
          <div className={"side-step " + (tunnel.virtualIp ? "complete" : "")}>
            <span>03</span>
            <div>
              <b>{lang === "fa" ? "آی‌پی مجازی" : "Virtual IP"}</b>
              <small dir="ltr">
                {tunnel.virtualIp || "Waiting for EasyTier"}
              </small>
            </div>
            {tunnel.virtualIp && <Check size={15} />}
          </div>
          <div className="side-spacer" />
          <div className="side-tip">
            <Gamepad2 size={21} />
            <b>{lang === "fa" ? "برای بازی آماده شوید" : "Ready to play?"}</b>
            <p>
              {lang === "fa"
                ? "آی‌پی مجازی میزبان بازی را در گزینهٔ Direct IP وارد کنید."
                : "Use the game host’s virtual IP in the game’s Direct IP option."}
            </p>
          </div>
          <div className="side-footer">
            <span className={serverReachable ? "online" : ""} />
            {serverReachable ? t.connected : t.disconnected}
          </div>
        </aside>
        <div className="app-workspace">
          <header className="app-header">
            <div className="app-brand">
              <span className="app-breadcrumb">
                {lang === "fa" ? "فضای بازی / روم‌ها" : "WORKSPACE / ROOMS"}
              </span>
            </div>
            <div className="app-header-actions">
              <span className={"app-api " + (serverReachable ? "ready" : "")}>
                {serverReachable
                  ? t.connected
                  : server
                    ? t.disconnected
                    : t.disconnected}
              </span>
              <button
                className="app-profile"
                title={t.settings}
                onClick={() => setMode("settings")}
              >
                <Avatar kind={avatar} />
                {name || t.profile}
                <Settings2 size={17} />
              </button>
            </div>
          </header>
          <main className="app-main">
            <section className="app-hero">
              <div className="app-eyebrow">
                <span className="app-live-dot" /> SELF-HOSTED VIRTUAL LAN
              </div>
              <h1>{t.subtitle}</h1>
              <p>{t.intro}</p>
            </section>
            <section className="app-server-card">
              <div className="app-section-title">
                <span className="app-card-icon">
                  <Server size={20} />
                </span>
                <div>
                  <h2>{t.server}</h2>
                  <p>{t.serverHelp}</p>
                </div>
                {serverReachable && (
                  <span className="app-verified">
                    <Check size={14} />
                    {t.connected}
                  </span>
                )}
              </div>
              <div className="app-server-form">
                <input
                  dir="ltr"
                  aria-label="Server address"
                  placeholder="https://games.example.com:443"
                  value={serverInput}
                  disabled={Boolean(room) || checking}
                  onChange={(e) => {
                    setServerInput(e.target.value);
                    clearServer();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void connect();
                  }}
                />
                <button
                  className="app-button primary"
                  onClick={() => void connect()}
                  disabled={checking || Boolean(room)}
                >
                  {checking ? (
                    <RefreshCw size={17} className="spin" />
                  ) : (
                    <ArrowRight size={17} />
                  )}{" "}
                  {checking
                    ? phase === "connecting"
                      ? lang === "fa"
                        ? "اتصال به سرور…"
                        : "Connecting…"
                      : t.checking
                    : t.connect}
                </button>
              </div>
              <p className="app-hint">
                <ShieldCheck size={15} />
                {t.backendOnly}
              </p>
            </section>
            {!room && server && (
              <>
                <div className="app-toolbar">
                  <div>
                    <span className="app-eyebrow">ROOM BROWSER</span>
                    <h2>{t.rooms}</h2>
                  </div>
                  <div className="app-actions">
                    <button
                      className="app-button subtle"
                      onClick={() =>
                        void loadRooms().catch((e) =>
                          setError(friendlyError(e, lang)),
                        )
                      }
                    >
                      <RefreshCw size={16} />
                      {t.refresh}
                    </button>
                    <button
                      className="app-button secondary"
                      onClick={() => openJoin(null)}
                    >
                      <Link2 size={16} />
                      {t.joinCode}
                    </button>
                    <button
                      className="app-button primary"
                      onClick={() => setMode("create")}
                    >
                      <Plus size={17} />
                      {t.create}
                    </button>
                  </div>
                </div>
                <div className="app-room-list">
                  {roomsLoading ? (
                    <div className="skeleton" role="status">
                      {lang === "fa"
                        ? "در حال خواندن روم‌ها…"
                        : "Loading rooms…"}
                    </div>
                  ) : publicRooms.length ? (
                    publicRooms.map((r) => (
                      <article className="app-room-card" key={r.id}>
                        <span className="app-game-icon">
                          <Gamepad2 size={20} />
                        </span>
                        <div className="app-room-meta">
                          <h3>{r.name}</h3>
                          <p>
                            {r.gameName || "LAN game"} · {r.memberCount}/
                            {r.maxPlayers} {t.members}
                          </p>
                        </div>
                        <button
                          className="app-button secondary"
                          disabled={
                            !r.acceptingMembers || r.memberCount >= r.maxPlayers
                          }
                          onClick={() => openJoin(r)}
                        >
                          {t.join}
                          <ArrowRight size={16} />
                        </button>
                      </article>
                    ))
                  ) : (
                    <div className="app-empty">
                      <Gamepad2 size={26} />
                      <p>{t.noRooms}</p>
                    </div>
                  )}
                </div>
              </>
            )}
            {room && (
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
                        void navigator.clipboard.writeText(room.inviteCode!);
                        setNotice(t.copied);
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
                            void navigator.clipboard.writeText(
                              tunnel.virtualIp!,
                            );
                            setNotice(t.copied);
                          }}
                        >
                          <Copy size={15} />
                        </button>
                      )}
                    </div>
                    <p>{tunnel.virtualIp ? t.peerCaution : t.waitingIp}</p>
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
                    <button
                      className="app-button subtle"
                      onClick={() =>
                        void invoke("engine_stop")
                          .then(() =>
                            startTunnel(room.roomId, room.accessToken),
                          )
                          .catch((e) => setError(friendlyError(e, lang)))
                      }
                    >
                      {t.retry}
                    </button>
                  )}
                </div>
                <div className="app-members">
                  {!room.members ? (
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
                            <button
                              onClick={() => void approve(m.userId, true)}
                            >
                              {t.approve}
                            </button>
                            <button
                              onClick={() => void approve(m.userId, false)}
                            >
                              {t.reject}
                            </button>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <button
                  className="app-button danger"
                  disabled={busy || tunnelBusy.current}
                  onClick={() => void leave()}
                >
                  {room.role === "host" ? t.close : t.leave}
                </button>
              </section>
            )}
            {!server && (
              <div className="app-onboarding">
                <span>01</span>
                {t.serverPrompt}
                <span>02</span>
                {lang === "fa"
                  ? "نام نمایشی خود را در تنظیمات وارد کنید."
                  : "Set your display name in Settings."}
                <span>03</span>
                {lang === "fa"
                  ? "روم بسازید یا به روم دوستانتان وارد شوید."
                  : "Create a room or join your friends."}
              </div>
            )}
            {error && (
              <div className="app-error" role="alert">
                <Activity size={16} />
                {error}
              </div>
            )}
            {notice && <p className="app-notice">{notice}</p>}
            <footer className="app-footer">
              <LockKeyhole size={14} />
              {t.dev}
            </footer>
          </main>
          {mode && (
            <Modal
              label={
                mode === "settings"
                  ? t.settings
                  : mode === "create"
                    ? t.create
                    : t.join
              }
              onClose={closeModal}
            >
              <div className="app-dialog">
                <button
                  className="app-dialog-close"
                  onClick={closeModal}
                  aria-label={t.cancel}
                >
                  <X size={19} />
                </button>
                <span className="app-eyebrow">
                  {mode === "settings" ? "PREFERENCES" : "GAME ROOM"}
                </span>
                <h2>
                  {mode === "settings"
                    ? onboarding
                      ? lang === "fa"
                        ? "به LANORA خوش آمدید"
                        : "Welcome to LANORA"
                      : t.settings
                    : mode === "create"
                      ? t.create
                      : t.join}
                </h2>
                {onboarding && mode === "settings" && (
                  <p className="app-hint">
                    {lang === "fa"
                      ? "یک نام و تصویر انتخاب کنید. ثبت‌نام لازم نیست؛ بعداً می‌توانید تغییرشان دهید."
                      : "Pick a name and avatar. No signup required. You can change both later."}
                  </p>
                )}
                <form className="app-form" onSubmit={submit}>
                  {mode === "settings" && (
                    <ProfileFields
                      {...{
                        lang,
                        theme,
                        name,
                        avatar,
                        setLang,
                        setTheme,
                        setAvatar,
                      }}
                    />
                  )}
                  {mode === "create" && (
                    <>
                      <label>
                        {t.roomName}
                        <input
                          name="roomName"
                          minLength={2}
                          maxLength={64}
                          required
                          autoFocus
                        />
                      </label>
                      <div className="app-form-row">
                        <label>
                          {t.game}
                          <input name="game" maxLength={64} />
                        </label>
                        <label>
                          {t.players}
                          <select name="players" defaultValue="8">
                            <option>4</option>
                            <option>8</option>
                            <option>16</option>
                            <option>32</option>
                          </select>
                        </label>
                      </div>
                      <label>
                        {t.password}
                        <input
                          name="password"
                          type="password"
                          maxLength={128}
                        />
                      </label>
                      <label className="app-check">
                        <input name="visible" type="checkbox" defaultChecked />
                        {t.visibility}
                      </label>
                      <label className="app-check">
                        <input name="approval" type="checkbox" />
                        {t.approval}
                      </label>
                    </>
                  )}
                  {mode === "join" && (
                    <>
                      {selectedRoom ? (
                        <div className="app-selected-room">
                          <Gamepad2 size={21} />
                          <strong>{selectedRoom.name}</strong>
                          <span>
                            {selectedRoom.memberCount}/{selectedRoom.maxPlayers}
                          </span>
                        </div>
                      ) : (
                        <label>
                          {t.invite}
                          <input
                            name="code"
                            dir="ltr"
                            autoFocus
                            required
                            placeholder="XXXXX-XXXXX"
                          />
                        </label>
                      )}
                      <label>
                        {t.password}
                        <input name="password" type="password" />
                      </label>
                      <small>{t.noPassword}</small>
                    </>
                  )}
                  <button
                    className="app-button primary"
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? (
                      <RefreshCw className="spin" size={17} />
                    ) : (
                      <Check size={17} />
                    )}{" "}
                    {busy
                      ? "Working…"
                      : mode === "settings"
                        ? t.save
                        : mode === "create"
                          ? t.create
                          : t.join}
                  </button>
                </form>
                {error && (
                  <p className="app-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </Modal>
          )}
        </div>
      </div>
    </>
  );
}
