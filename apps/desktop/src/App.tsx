import { useEffect, useState, useRef, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Activity,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Gamepad2,
  Link2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  X,
} from "lucide-react";
import brand from "./brand.svg";
import { labels } from "./labels";
import { api, friendlyError, normalize, RequestError } from "./api";
import {
  discoverPlayerAuth,
  playerJoinCredentials,
  type PlayerAuthMode,
} from "./serverAuth";
import { deriveConnectionStatus, type ConnectionStage } from "./connectionStatus";
import { avatars, type AvatarKind } from "./components/Avatar";
import { ProfileFields } from "./components/ProfileFields";
import { Modal } from "./components/Modal";
import { TitleBar } from "./components/TitleBar";
import { useServer } from "./hooks/useServer";
import type {
  Lang,
  EngineStatus,
  Member,
  ListedRoom,
  ActiveRoom,
  Network,
  PeerStatus,
} from "./types";
import { RoomView } from "./components/RoomView";
import "./style.css";

function localDeviceId() {
  const key = "lanora.deviceId";
  const saved = localStorage.getItem(key);
  if (saved && /^[a-f0-9]{32}$/.test(saved)) return saved;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  localStorage.setItem(key, id);
  return id;
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() =>
    localStorage.getItem("lanora.language") === "fa" ? "fa" : "en",
  );
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    localStorage.getItem("lanora.theme") === "light" ? "light" : "dark",
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
  const [roomsFailed, setRoomsFailed] = useState(false);
  const [serverInput, setServerInput] = useState(
    () => localStorage.getItem("lanora.desktopServer") || "",
  );
  const [passwordPromptMode, setPasswordPromptMode] = useState<PlayerAuthMode | null>(null);
  const [playerPassword, setPlayerPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [connectionStage, setConnectionStage] = useState<ConnectionStage>("idle");
  const [peerStatuses, setPeerStatuses] = useState<PeerStatus[]>([]);
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
  const connectionBusy = useRef(false);
  const roomsBusy = useRef(false);
  const roomsVersion = useRef(0);
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
  const [onboardingStep, setOnboardingStep] = useState<"profile" | "server">(
    "profile",
  );
  const [serverHelp, setServerHelp] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ListedRoom | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const t = labels[lang];
  const connectionStatus = deriveConnectionStatus({
    serverReachable,
    stage: connectionStage,
    roomActive: Boolean(room),
    tunnelRunning: tunnel.running,
    virtualIp: tunnel.virtualIp,
    reachablePeerCount: peerStatuses.length,
  });
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
  function updateServerAddress(raw: string) {
    setServerInput(raw);
    let sameServer = false;
    try {
      sameServer = normalize(raw) === localStorage.getItem("lanora.desktopServer");
    } catch {
      sameServer = false;
    }
    if (!sameServer) {
      setPlayerPassword("");
      setPasswordPromptMode(null);
      setPasswordError("");
    }
  }
 
  useEffect(() => {
    // Remove access codes saved by older versions; new versions never restore them.
    localStorage.removeItem("lanora.sharedCode");
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = "ltr";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("lanora.language", lang);
    localStorage.setItem("lanora.theme", theme);
  }, [lang, theme]);
  useEffect(() => {
    if (failure) setError(friendlyError(failure, lang));
  }, [failure, lang]);
  async function loadRooms(url = server) {
    if (roomsBusy.current) return;
    roomsBusy.current = true;
    const generation = roomsVersion.current;
    setRoomsLoading(true);
    try {
      const result = await api<{ rooms: ListedRoom[] }>(url, "/api/v1/rooms");
      if (generation === roomsVersion.current) {
        setPublicRooms(result.rooms);
        setRoomsFailed(false);
      }
    } catch (error) {
      if (generation === roomsVersion.current) setRoomsFailed(true);
      throw error;
    } finally {
      roomsBusy.current = false;
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
    if (!room || room.roomId === "shared" || room.status !== "approved" || !server) return;
    let active = true;
    let inFlight = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const current = await api<{ members: Member[] }>(
          server,
          `/api/v1/rooms/${room.roomId}`,
          room.accessToken,
          undefined,
          undefined,
          { signal: controller.signal },
        );
        if (active)
          setRoom((old) => (old ? { ...old, members: current.members } : null));
      } catch (e) {
        if (active) {
          setError(friendlyError(e, lang));
          setRoom((old) =>
            old ? { ...old, members: old.members ?? [] } : null,
          );
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
      } finally {
        inFlight = false;
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [room?.roomId, room?.accessToken, room?.status, server]);
  useEffect(() => {
    if (!room || room.roomId === "shared" || room.status !== "pending" || !server) return;
    let active = true;
    let inFlight = false;
    const controller = new AbortController();
    const poll = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const status = await api<{ status: string }>(
          server,
          `/api/v1/rooms/${room.roomId}/membership`,
          room.accessToken,
          undefined,
          undefined,
          { signal: controller.signal },
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
      } finally {
        inFlight = false;
      }
    };
    const timer = window.setInterval(poll, 3000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [room?.roomId, room?.status, server]);
  useEffect(() => {
    if (!room || !tunnel.running || tunnel.state === "failed") return;
    let active = true;
    let inFlight = false;
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const status = await invoke<EngineStatus>("engine_status");
        if (active) setTunnel(status);
      } catch (e) {
        if (active) {
          setTunnel((old) => ({
            ...old,
            virtualIp: null,
            state: "status_unknown",
          }));
          setError(friendlyError(e, lang));
        }
      } finally {
        inFlight = false;
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [room?.roomId, tunnel.running, tunnel.state]);
  useEffect(() => {
    if (!room || room.roomId !== "shared" || !server) return;
    let active = true;
    let inFlight = false;
    const heartbeat = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const current = await api<{ members: Member[] }>(
          server,
          "/api/v1/network/heartbeat",
          room.accessToken,
          { virtualIp: tunnel.virtualIp || "" },
        );
        if (active)
          setRoom((old) => (old ? { ...old, members: current.members } : null));
      } catch (e) {
        if (
          active &&
          e instanceof RequestError &&
          [401, 403].includes(e.status ?? 0)
        ) {
          await invoke("engine_stop").catch(() => {});
          if (active) {
            setTunnel({
              running: false,
              virtualIp: null,
              state: "stopped",
              error: null,
            });
            setRoom(null);
            setError(friendlyError(e, lang));
          }
        }
      } finally {
        inFlight = false;
      }
    };
    void heartbeat();
    const timer = window.setInterval(heartbeat, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [room?.roomId, room?.accessToken, server, tunnel.virtualIp, lang]);
  useEffect(() => {
    if (!room || !tunnel.running || tunnel.state === "failed") {
      setPeerStatuses([]);
      return;
    }
    let active = true;
    let inFlight = false;
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const peers = await invoke<PeerStatus[]>("engine_peers");
        if (active) setPeerStatuses(peers);
      } catch {
        if (active) setPeerStatuses([]);
      } finally {
        inFlight = false;
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [room?.roomId, tunnel.running, tunnel.state]);
  useEffect(() => {
    if (!room || room.roomId !== "shared") return;
    if (tunnel.state === "tunnel_ready" && tunnel.virtualIp) {
      setConnectionStage("connected");
      setNotice(labels[lang].connected);
      const timer = window.setTimeout(() => {
        setNotice("");
        setConnectionStage("idle");
      }, 1600);
      return () => window.clearTimeout(timer);
    }
    if (tunnel.state === "failed") setConnectionStage("failed");
  }, [room?.roomId, tunnel.state, tunnel.virtualIp, lang]);
  useEffect(() => {
    if (
      !room ||
      room.status !== "approved" ||
      !tunnel.running ||
      tunnel.state !== "connecting"
    )
      return;
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const current = await invoke<EngineStatus>("engine_status").catch(
          () => null,
        );
        if (!active) return;
        if (current?.virtualIp || current?.state === "failed") {
          setTunnel(current);
          return;
        }
        await invoke("engine_stop");
        if (active) {
          setTunnel({
            running: false,
            virtualIp: null,
            state: "failed",
            error: "EasyTier did not report a virtual IP within 60 seconds",
          });
          setError(
            lang === "fa"
              ? "تا یک دقیقه آی‌پی مجازی دریافت نشد. وضعیت سرور و پورت‌های رله را بررسی کنید و دوباره تلاش کنید."
              : "No virtual IP arrived within a minute. Check the server and relay ports, then retry.",
          );
        }
      } catch (e) {
        if (active) {
          setTunnel((old) => ({
            ...old,
            state: "failed",
            error: "EasyTier did not report a virtual IP and could not be stopped",
          }));
          setError(friendlyError(e, lang));
        }
      }
    }, 60000);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [room?.roomId, room?.status, tunnel.running, tunnel.state, lang]);
  async function connect(rawAddress = serverInput) {
    if (connectionBusy.current || checking || room) return;
    connectionBusy.current = true;
    setBusy(true);
    setError("");
    setPasswordError("");
    setConnectionStage("server");
    try {
      const url = await connectServer(rawAddress);
      if (!url) {
        setConnectionStage("failed");
        return;
      }
      localStorage.setItem("lanora.desktopServer", url);
      const playerAuth = await discoverPlayerAuth(url, api);
      if (playerAuth === "passwordless") {
        await joinSharedNetwork(url, "", playerAuth);
        return;
      }
      setPlayerPassword("");
      setPasswordVisible(false);
      setPasswordPromptMode(playerAuth);
      setConnectionStage("idle");
    } catch (e) {
      setError(friendlyError(e, lang));
      setConnectionStage(e instanceof RequestError && e.status === 401 ? "auth-failed" : "failed");
    } finally {
      connectionBusy.current = false;
      setBusy(false);
    }
  }
  async function joinSharedNetwork(
    url: string,
    password: string,
    mode: PlayerAuthMode,
  ) {
    setConnectionStage("authenticating");
    const joined = await api<{
      userId: string;
      accessToken: string;
      status: string;
      network: Network;
      members: Member[];
    }>(url, "/api/v1/network/join", undefined, {
      ...playerJoinCredentials(mode, password),
      deviceId: localDeviceId(),
      username: name.trim(),
    });
    const active: ActiveRoom = {
      roomId: "shared",
      name: labels[lang].sharedNetwork,
      accessToken: joined.accessToken,
      role: "member",
      status: "approved",
      members: joined.members,
    };
    setRoom(active);
    setConnectionStage("tunnel");
    await startTunnel("shared", active.accessToken, url, joined.network);
  }
  async function submitServerPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!server || !passwordPromptMode || busy) return;
    setBusy(true);
    setPasswordError("");
    setConnectionStage("authenticating");
    try {
      await joinSharedNetwork(server, playerPassword, passwordPromptMode);
      setPasswordPromptMode(null);
      setPlayerPassword("");
      setPasswordVisible(false);
    } catch (e) {
      setPasswordError(friendlyError(e, lang));
      setConnectionStage(e instanceof RequestError && e.status === 401 ? "auth-failed" : "failed");
      if (e instanceof RequestError && e.status === 401) setPlayerPassword("");
    } finally {
      setBusy(false);
    }
  }
  function cancelPasswordPrompt() {
    if (busy) return;
    setPasswordPromptMode(null);
    setPlayerPassword("");
    setPasswordVisible(false);
    setPasswordError("");
    setConnectionStage("idle");
  }
  async function startTunnel(
    id: string,
    token: string,
    serverUrl = server,
    configuredNetwork?: Network,
  ) {
    if (tunnelBusy.current) return;
    tunnelBusy.current = true;
    setTunnel({
      running: false,
      virtualIp: null,
      state: "connecting",
      error: null,
    });
    try {
      const cfg =
        configuredNetwork ??
        (await api<Network>(
          serverUrl,
          id === "shared"
            ? "/api/v1/network/config"
            : `/api/v1/rooms/${id}/network`,
          token,
        ));
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
        const next = String(data.get("name") || name).trim();
        if (next.length < 2 || next.length > 32)
          throw new RequestError("invalid_input");
        setName(next);
        localStorage.setItem("lanora.playerName", next);
        localStorage.setItem("lanora.avatar", avatar);
        if (onboarding && onboardingStep === "profile") {
          setOnboardingStep("server");
          return;
        }
        if (onboarding && onboardingStep === "server") {
          const address = String(data.get("serverAddress") || "").trim();
          setServerInput(address);
          if (!address) {
            setOnboarding(false);
            setMode(null);
            return;
          }
          setOnboarding(false);
          setMode(null);
          await connect(address);
          return;
        }
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
      let revokeWarning = false;
      try {
        await api(
          server,
          room.roomId === "shared"
            ? "/api/v1/network/leave"
            : `/api/v1/rooms/${room.roomId}${room.role === "host" ? "" : "/leave"}`,
          room.accessToken,
          room.roomId === "shared" ? {} : undefined,
          room.roomId === "shared"
            ? "POST"
            : room.role === "host"
              ? "DELETE"
              : "POST",
        );
      } catch (e) {
        if (
          !(e instanceof RequestError && [401, 404].includes(e.status ?? 0))
        ) {
          revokeWarning = true;
        }
      }
      setRoom(null);
      setConnectionStage("idle");
      setPeerStatuses([]);
      if (revokeWarning) {
        setError(
          lang === "fa"
            ? "این دستگاه قطع شد، اما سرور خروج را تأیید نکرد. حضور شما پس از پایان مهلت Heartbeat منقضی می‌شود."
            : "This device disconnected, but the server could not confirm removal. Your online presence will expire after its heartbeat timeout.",
        );
      }
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
      <TitleBar
        lang={lang}
        status={
          checking || busy || tunnel.state === "connecting"
            ? "checking"
            : room && tunnel.running && tunnel.state === "tunnel_ready" && tunnel.virtualIp
              ? "connected"
              : tunnel.state === "failed" || phase === "failed" || (server && !serverReachable)
                ? "failed"
                : serverReachable
                  ? "server"
                  : "idle"
        }
        statusLabels={{
          idle: t.disconnected,
          checking: t.checking,
          server: t.serverReachable,
          connected: t.connected,
          failed: lang === "fa" ? "اتصال شبکه ناموفق بود" : "Network connection failed",
        }}
        name={name}
        avatar={avatar}
        settingsLabel={t.settings}
        onSettings={() => setMode("settings")}
      />
      <div className="lanora-app" dir="ltr" data-lang={lang}>
        <aside className="app-sidebar">
          <div className="side-brand">
            <img src={brand} alt="" />
            <div>
              <b>LANORA</b>
              <small>
                {lang === "fa" ? "شبکهٔ خصوصی بازی" : "PRIVATE GAME NETWORK"}
              </small>
            </div>
          </div>
          <div className="side-divider" />
          <p className="side-label">
            {lang === "fa" ? "مسیر اتصال" : "YOUR ROUTE"}
          </p>
          <div className={"side-step " + (serverReachable ? "complete" : "")}>
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
          <div
            className={
              "side-step " +
              (room?.status === "approved" ? "complete" : "") +
              (room?.status === "pending" ? " pending" : "")
            }
          >
            <span>02</span>
            <div>
              <b>{lang === "fa" ? "شبکه" : "Network"}</b>
              <small>
                {room
                  ? room.status === "pending"
                    ? `${room.name} · ${t.pending}`
                    : room.roomId === "shared"
                      ? t.sharedNetwork
                      : room.name
                  : lang === "fa"
                    ? t.connect
                    : "Connect to your server"}
              </small>
            </div>
            {room?.status === "approved" && <Check size={15} />}
          </div>
          <div className={"side-step " + (tunnel.virtualIp ? "complete" : "")}>
            <span>03</span>
            <div>
              <b>{lang === "fa" ? "آی‌پی مجازی" : "Virtual IP"}</b>
              <small dir="ltr">
                {tunnel.virtualIp ||
                  (lang === "fa"
                    ? "در انتظار EasyTier"
                    : "Waiting for EasyTier")}
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
            <span className={connectionStatus === "peer-connected" ? "online" : ""} />
            {connectionStatus === "server-unreachable"
              ? t.disconnected
              : connectionStatus === "server-reachable"
                ? t.serverReachable
                : connectionStatus === "authentication-pending"
                  ? t.authenticating
                  : connectionStatus === "authentication-failed"
                    ? t.authorizationFailed
                    : connectionStatus === "authorized"
                      ? lang === "fa" ? "دسترسی تأیید شد" : "Authorized"
                      : connectionStatus === "tunnel-starting"
                        ? lang === "fa" ? "در حال راه‌اندازی تونل" : "Starting tunnel"
                        : connectionStatus === "peer-connected"
                          ? lang === "fa" ? "همتا در دسترس است" : "Peer reachable"
                          : connectionStatus === "peer-unverified"
                            ? lang === "fa" ? "IP دریافت شد · ارتباط همتا تأیید نشده" : "Virtual IP assigned · Peer unverified"
                            : lang === "fa" ? "اتصال ناموفق" : "Connection failed"}
          </div>
        </aside>
        <div className="app-workspace">
          <main className="app-main">
            <section className="app-hero">
              <div className="app-eyebrow">
                <span className="app-brand-dot" />
                {lang === "fa" ? "شبکهٔ بازی شخصی" : "YOUR PRIVATE GAME NETWORK"}
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
                    <span dir={lang === "fa" ? "rtl" : "ltr"}>{t.serverReachable}</span>
                  </span>
                )}
              </div>
              <div className="app-server-form">
                <input
                  dir="ltr"
                  aria-label={t.server}
                  placeholder="https://games.example.com:443"
                  value={serverInput}
                  disabled={Boolean(room) || checking || busy}
                  onChange={(e) => {
                    updateServerAddress(e.target.value);
                    clearServer();
                    roomsVersion.current++;
                    setPublicRooms([]);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void connect();
                  }}
                />
                <button
                  className="app-button primary"
                  onClick={() => void connect()}
                  disabled={checking || busy || Boolean(room)}
                >
                  {checking || busy ? (
                    <RefreshCw size={17} className="spin" />
                  ) : (
                    <ArrowRight size={17} />
                  )}{" "}
                  {checking
                    ? phase === "connecting"
                      ? t.checking
                      : t.checking
                    : busy
                      ? connectionStage === "authenticating"
                        ? t.authenticating
                        : t.connectingNetwork
                      : t.connect}
                </button>
              </div>
              <p className="app-hint">
                <ShieldCheck size={15} />
                <span dir={lang === "fa" ? "rtl" : "ltr"}>{t.backendOnly}</span>
              </p>
              {connectionStage !== "idle" && connectionStage !== "failed" && !room && !passwordPromptMode && (
                <p className="app-connection-progress" role="status" aria-live="polite">
                  <RefreshCw size={15} className="spin" />
                  <span dir={lang === "fa" ? "rtl" : "ltr"}>
                    {connectionStage === "server"
                      ? t.checking
                      : connectionStage === "authenticating"
                        ? t.authenticating
                        : t.connectingNetwork}
                  </span>
                </p>
              )}
            </section>
            {!room && server && (
              <details
                className="app-advanced"
                onToggle={(event) => {
                  if (event.currentTarget.open)
                    void loadRooms().catch((e) => setError(friendlyError(e, lang)));
                }}
              >
                <summary>{t.advancedRooms}</summary>
                <div className="app-toolbar">
                  <div>
                    <span className="app-eyebrow">
                      {lang === "fa" ? "فهرست روم‌ها" : "ROOMS"}
                    </span>
                    <h2>{t.rooms}</h2>
                  </div>
                  <div className="app-actions">
                    <button
                      className="app-button subtle"
                      disabled={!serverReachable}
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
                      disabled={!serverReachable}
                      onClick={() => openJoin(null)}
                    >
                      <Link2 size={16} />
                      {t.joinCode}
                    </button>
                    <button
                      className="app-button primary"
                      disabled={!serverReachable}
                      onClick={() => setMode("create")}
                    >
                      <Plus size={17} />
                      {t.create}
                    </button>
                  </div>
                </div>
                <div className="app-room-list">
                  {roomsLoading && publicRooms.length === 0 ? (
                    <div className="skeleton" role="status">
                      {lang === "fa"
                        ? "در حال خواندن روم‌ها…"
                        : "Loading rooms…"}
                    </div>
                  ) : roomsFailed && publicRooms.length === 0 ? (
                    <div className="app-empty" role="alert">
                      {lang === "fa"
                        ? "خواندن روم‌ها ناموفق بود؛ تازه‌سازی را بزنید."
                        : "Could not load rooms. Choose Refresh to retry."}
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
                            {r.gameName ||
                              (lang === "fa" ? "بازی LAN" : "LAN game")} · {r.memberCount}/
                            {r.maxPlayers} {t.members}
                          </p>
                        </div>
                        <button
                          className="app-button secondary"
                          disabled={
                            !serverReachable ||
                            !r.acceptingMembers ||
                            r.memberCount >= r.maxPlayers
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
              </details>
            )}
            {room && (
              <RoomView
                room={room}
                tunnel={tunnel}
                peerStatuses={peerStatuses}
                lang={lang}
                busy={busy || tunnelBusy.current}
                onCopy={(value) =>
                  void navigator.clipboard
                    .writeText(value)
                    .then(() => setNotice(t.copied))
                    .catch(() =>
                      setError(
                        lang === "fa"
                          ? "کپی انجام نشد؛ آدرس را دستی انتخاب کنید."
                          : "Copy failed. Select the address manually.",
                      ),
                    )
                }
                onRetry={() =>
                  void invoke("engine_stop")
                    .then(() => startTunnel(room.roomId, room.accessToken))
                    .catch((e) => setError(friendlyError(e, lang)))
                }
                onLeave={() => void leave()}
                onApprove={(id, approved) => void approve(id, approved)}
              />
            )}
            {!server && (
              <div className="app-onboarding">
                <span>01</span>
                <div dir={lang === "fa" ? "rtl" : "ltr"}>{t.serverPrompt}</div>
                <span>02</span>
                <div dir={lang === "fa" ? "rtl" : "ltr"}>
                  {lang === "fa"
                    ? "نام نمایشی خود را در تنظیمات وارد کنید."
                    : "Set your display name in Settings."}
                </div>
                <span>03</span>
                <div dir={lang === "fa" ? "rtl" : "ltr"}>
                  {lang === "fa"
                    ? "سرور رمز بخواهد، پنجرهٔ ورود رمز را نشان می‌دهیم."
                    : "If the server requires a password, LANORA will ask for it."}
                </div>
              </div>
            )}
            {error && (
              <div className="app-error" role="alert">
                <Activity size={16} />
                <span dir={lang === "fa" ? "rtl" : "ltr"}>{error}</span>
              </div>
            )}
            {notice && <p className="app-notice" dir={lang === "fa" ? "rtl" : "ltr"}>{notice}</p>}
            <footer className="app-footer">
              <LockKeyhole size={14} />
              <span dir={lang === "fa" ? "rtl" : "ltr"}>{t.dev}</span>
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
                  {mode === "settings"
                    ? onboarding
                      ? lang === "fa"
                        ? onboardingStep === "profile"
                          ? "پروفایل شما"
                          : "سرور شما"
                        : onboardingStep === "profile"
                          ? "YOUR PROFILE"
                          : "YOUR SERVER"
                      : lang === "fa"
                        ? "تنظیمات برنامه"
                        : "APP SETTINGS"
                    : lang === "fa"
                      ? "فضای بازی"
                      : "GAME ROOM"}
                </span>
                <h2>
                  {mode === "settings"
                    ? onboarding
                      ? onboardingStep === "profile"
                        ? lang === "fa"
                          ? "به LANORA خوش آمدید"
                          : "Welcome to LANORA"
                        : lang === "fa"
                          ? "به سرور خودتان وصل شوید"
                          : "Connect to your server"
                      : t.settings
                    : mode === "create"
                      ? t.create
                      : t.join}
                </h2>
                {mode === "settings" && onboarding && (
                  <div
                    className="onboarding-progress"
                    aria-label={lang === "fa" ? "مرحله از دو" : "Onboarding step"}
                  >
                    <span
                      className={
                        onboardingStep === "profile" ? "active" : "done"
                      }
                    >
                      {lang === "fa" ? "۱" : "1"}
                    </span>
                    <i />
                    <span
                      className={onboardingStep === "server" ? "active" : ""}
                    >
                      {lang === "fa" ? "۲" : "2"}
                    </span>
                    <small>
                      {onboardingStep === "profile"
                        ? lang === "fa"
                          ? "پروفایل شما"
                          : "Your profile"
                        : lang === "fa"
                          ? "سرور شما"
                          : "Your server"}
                    </small>
                  </div>
                )}
                <form className="app-form" onSubmit={submit}>
                  {mode === "settings" &&
                    onboarding &&
                    onboardingStep === "profile" && (
                      <>
                        <p className="onboarding-copy">
                          {lang === "fa"
                            ? "برای شروع فقط یک نام نمایشی انتخاب کنید؛ حساب کاربری لازم نیست."
                            : "Choose a display name to get started. No account is needed."}
                        </p>
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
                      </>
                    )}
                  {mode === "settings" &&
                    onboarding &&
                    onboardingStep === "server" && (
                      <>
                        <p className="onboarding-copy">
                          {lang === "fa"
                            ? "نشانی سروری را وارد کنید که صاحبش برایتان فرستاده است."
                            : "Enter the server address shared by its owner."}
                        </p>
                        <label>
                          {lang === "fa" ? "نشانی سرور" : "Server address"}
                          <input
                            name="serverAddress"
                            dir="ltr"
                            inputMode="url"
                            autoComplete="url"
                            value={serverInput}
                            disabled={checking || busy}
                            onChange={(event) =>
                              updateServerAddress(event.target.value)
                            }
                            placeholder="https://games.example.com"
                            autoFocus
                          />
                        </label>
                        <button
                          className="app-help-toggle"
                          type="button"
                          aria-expanded={serverHelp}
                          onClick={() => setServerHelp((old) => !old)}
                        >
                          {serverHelp
                            ? lang === "fa"
                              ? "بستن راهنمای سرور"
                              : "Hide server setup help"
                            : lang === "fa"
                              ? "برای راه‌اندازی سرور کمک می‌خواهم"
                              : "I need help setting up a server"}
                        </button>
                        {serverHelp && (
                          <div className="app-help-panel">
                            <p>
                              {lang === "fa"
                                ? "صاحب سرور این دو دستور را روی VPS لینوکس اجرا می‌کند:"
                                : "The server owner runs these commands on a Linux VPS:"}
                            </p>
                            <code dir="ltr">
                              git clone --branch release/0.2.x
                              https://github.com/kavianpcx/LANORA.git
                              <br />
                              cd LANORA &amp;&amp; bash scripts/setup-server.sh
                            </code>
                          </div>
                        )}
                        <button
                          className="app-button subtle onboarding-back"
                          type="button"
                          disabled={checking}
                          onClick={() => setOnboardingStep("profile")}
                        >
                          {lang === "fa" ? "بازگشت به پروفایل" : "Back to profile"}
                        </button>
                      </>
                    )}
                  {mode === "settings" && !onboarding && (
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
                      ? lang === "fa"
                        ? "در حال انجام…"
                        : "Working…"
                      : mode === "settings" &&
                          onboarding &&
                          onboardingStep === "profile"
                        ? lang === "fa"
                          ? "ادامه"
                          : "Continue"
                        : mode === "settings" &&
                            onboarding &&
                            onboardingStep === "server"
                          ? lang === "fa"
                            ? checking
                              ? "در حال اتصال…"
                              : "اتصال به سرور"
                            : checking
                              ? "Connecting…"
                              : "Connect to server"
                          : mode === "settings"
                            ? t.save
                        : mode === "create"
                          ? t.create
                          : t.join}
                  </button>
                  {mode === "settings" &&
                    onboarding &&
                    onboardingStep === "server" && (
                      <button
                        className="app-button subtle"
                        type="button"
                        disabled={busy || checking}
                        onClick={() => {
                          localStorage.setItem("lanora.playerName", name);
                          localStorage.setItem("lanora.avatar", avatar);
                          setOnboarding(false);
                          setMode(null);
                        }}
                      >
                        {lang === "fa" ? "فعلاً بعداً وصل می‌شوم" : "I’ll connect later"}
                      </button>
                    )}
                </form>
                {error && (
                  <p className="app-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </Modal>
          )}
          {passwordPromptMode && (
            <Modal label={t.serverPassword} onClose={cancelPasswordPrompt}>
              <div className="app-dialog" dir="ltr">
                <span className="app-eyebrow">{t.server}</span>
                <h2 dir={lang === "fa" ? "rtl" : "ltr"}>{t.serverPassword}</h2>
                <p className="app-password-help" dir={lang === "fa" ? "rtl" : "ltr"}>
                  {passwordPromptMode === "legacy_password"
                    ? t.legacyPasswordHelp
                    : t.passwordRequiredHelp}
                </p>
                <form className="app-form" onSubmit={submitServerPassword}>
                  <div className="app-password-group">
                    <label htmlFor="player-server-password" dir={lang === "fa" ? "rtl" : "ltr"}>
                      {t.passwordInput}
                    </label>
                    <span className="app-password-field" dir="ltr">
                      <input
                        id="player-server-password"
                        autoFocus
                        required
                        type={passwordVisible ? "text" : "password"}
                        dir="ltr"
                        autoComplete="off"
                        value={playerPassword}
                        disabled={busy}
                        onChange={(event) => {
                          setPlayerPassword(event.target.value);
                          setPasswordError("");
                        }}
                        placeholder={t.passwordPlaceholder}
                      />
                      <button
                        className="app-password-toggle"
                        type="button"
                        aria-label={passwordVisible ? t.hidePassword : t.showPassword}
                        title={passwordVisible ? t.hidePassword : t.showPassword}
                        disabled={busy}
                        onClick={() => setPasswordVisible((visible) => !visible)}
                      >
                        {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </span>
                  </div>
                  {passwordError && (
                    <p className="app-error" role="alert" dir={lang === "fa" ? "rtl" : "ltr"}>
                      {passwordError}
                    </p>
                  )}
                  <div className="app-dialog-actions" dir="ltr">
                    <button className="app-button primary" type="submit" disabled={busy}>
                      {busy ? <RefreshCw className="spin" size={17} /> : <ArrowRight size={17} />}
                      {t.connect}
                    </button>
                    <button
                      className="app-button subtle"
                      type="button"
                      disabled={busy}
                      onClick={cancelPasswordPrompt}
                    >
                      {t.cancel}
                    </button>
                  </div>
                </form>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </>
  );
}
