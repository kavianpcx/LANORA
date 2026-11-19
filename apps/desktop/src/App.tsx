import { useEffect, useState, useRef, type FormEvent } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { check as tauriCheckForUpdate, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  Activity,
  ArrowRight,
  Check,
  Download,
  Eye,
  EyeOff,
  Gamepad2,
  Info,
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
import { PLAYER_PRESENCE_MAX_AGE_MS } from "./diagnostics";
import { reconcilePendingUpdate, downloadPercent, PENDING_UPDATE_VERSION_KEY, type PendingUpdateResult } from "./updateState";
import { avatars, type AvatarKind } from "./components/Avatar";
import { ProfileFields } from "./components/ProfileFields";
import { Modal } from "./components/Modal";
import { TitleBar } from "./components/TitleBar";
import { StartupSkeleton } from "./components/StartupSkeleton";
import { ConnectionJourney } from "./components/ConnectionJourney";
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

type UpdateState = "idle" | "checking" | "up_to_date" | "available" | "downloading" | "verifying" | "ready_to_install" | "installing" | "restarting" | "restart_required" | "installed" | "install_mismatch" | "failed" | "unavailable";
const UPDATER_ENABLED = import.meta.env.VITE_LANORA_UPDATES_ENABLED === "true";
const LANORA_E2E_ENABLED = import.meta.env.VITE_LANORA_E2E_ENABLED === "true";

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
  const [startupReady, setStartupReady] = useState(false);
  const [showStartupSkeleton, setShowStartupSkeleton] = useState(false);
  const [appVersion, setAppVersion] = useState("0.3.0-alpha.1");
  const [appVersionLoaded, setAppVersionLoaded] = useState(false);
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
  const [addressError, setAddressError] = useState("");
  const [passwordPromptMode, setPasswordPromptMode] = useState<PlayerAuthMode | null>(null);
  const [playerPassword, setPlayerPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [connectionStage, setConnectionStage] = useState<ConnectionStage>("idle");
  const [peerStatuses, setPeerStatuses] = useState<PeerStatus[]>([]);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);
  const {
    server,
    reachable: serverReachable,
    latencyMs: serverLatencyMs,
    checking,
    phase,
    connect: connectServer,
    setLatencyMonitoring,
    clear: clearServer,
    failure,
  } = useServer();
  const tunnelBusy = useRef(false);
  const connectionBusy = useRef(false);
  const leaveBusy = useRef(false);
  const retryBusy = useRef(false);
  const mainServerInputRef = useRef<HTMLInputElement>(null);
  const onboardingServerInputRef = useRef<HTMLInputElement>(null);
  const roomsBusy = useRef(false);
  const roomsVersion = useRef(0);
  const networkGenerationRef = useRef<{ roomId: string; generation: number | null }>({ roomId: "", generation: null });
  const [publicRooms, setPublicRooms] = useState<ListedRoom[]>([]);
  const [room, setRoom] = useState<ActiveRoom | null>(null);
  const roomRef = useRef<ActiveRoom | null>(room);
  roomRef.current = room;
  const [presenceUpdatedAt, setPresenceUpdatedAt] = useState(0);
  const [presenceClock, setPresenceClock] = useState(Date.now());
  const [tunnel, setTunnel] = useState<EngineStatus>({
    running: false,
    virtualIp: null,
    state: "stopped",
    error: null,
  });
  const [mode, setMode] = useState<"create" | "join" | "settings" | "profile" | null>(() =>
    localStorage.getItem("lanora.playerName") ? null : "settings",
  );
  const [onboardingStep, setOnboardingStep] = useState<"profile" | "server">(
    "profile",
  );
  const [serverHelp, setServerHelp] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ListedRoom | null>(null);
  const [busy, setBusy] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const settingsSnapshot = useRef<{ name: string; avatar: AvatarKind }>({ name, avatar });
  const [updateEntry, setUpdateEntry] = useState<Update | null>(null);
  const updateEntryRef = useRef<Update | null>(updateEntry);
  updateEntryRef.current = updateEntry;
  const updateStateTrace = useRef<UpdateState[]>(["idle"]);
  const [updateState, setUpdateStateValue] = useState<UpdateState>("idle");
  const setUpdateState = (next: UpdateState) => {
    if (LANORA_E2E_ENABLED) {
      updateStateTrace.current.push(next);
      if (updateStateTrace.current.length > 40) updateStateTrace.current.shift();
    }
    setUpdateStateValue(next);
  };
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateConfirmation, setUpdateConfirmation] = useState<PendingUpdateResult | null>(null);
  const [updateToast, setUpdateToast] = useState(false);
  const [updateActionBusy, setUpdateActionBusy] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ received: number; total: number | null } | null>(null);
  const e2eDownloadTrace = useRef<{ received: number; total: number | null; maxPercent: number | null }>({ received: 0, total: null, maxPercent: null });
  const updateCheckBusy = useRef(false);
  const updateInstallBusy = useRef(false);
  const [notice, setNotice] = useState("");
  const t = labels[lang];
  const connectionStatus = deriveConnectionStatus({
    serverReachable,
    stage: connectionStage,
    roomActive: Boolean(room),
    tunnelRunning: tunnel.running,
    virtualIp: tunnel.virtualIp,
    reachablePeerCount: room?.members?.some((member) =>
      member.userId !== room.selfUserId && Boolean(member.virtualIp) &&
      peerStatuses.some((peer) => peer.virtualIp === member.virtualIp && Date.now() - (peer.observedAt ?? 0) < 15000),
    ) ? 1 : 0,
  });
  const [onboarding, setOnboarding] = useState(
    () => !localStorage.getItem("lanora.playerName"),
  );
  useEffect(() => {
    let active = true;
    const revealTimer = window.setTimeout(() => {
      if (active) setShowStartupSkeleton(true);
    }, 120);
    const releaseTimer = window.setTimeout(() => {
      if (active) {
        setStartupReady(true);
        setShowStartupSkeleton(false);
      }
    }, 1500);
    const finish = () => {
      if (!active) return;
      window.clearTimeout(revealTimer);
      window.clearTimeout(releaseTimer);
      setStartupReady(true);
      setShowStartupSkeleton(false);
    };
    const initialize = async () => {
      if (!isTauri()) return;
      const [versionResult] = await Promise.allSettled([
        getVersion(),
        invoke<EngineStatus>("engine_status"),
      ]);
      if (active && versionResult.status === "fulfilled") {
        const actualVersion = versionResult.value;
        setAppVersion(actualVersion);
        setAppVersionLoaded(true);
        try {
          const expectedVersion = localStorage.getItem(PENDING_UPDATE_VERSION_KEY);
          const confirmation = reconcilePendingUpdate(expectedVersion, actualVersion);
          if (confirmation) {
            setUpdateConfirmation(confirmation);
            setUpdateState(confirmation.status === "installed" ? "installed" : "install_mismatch");
            setUpdateDialogOpen(true);
          }
          localStorage.removeItem(PENDING_UPDATE_VERSION_KEY);
        } catch {
          // A storage failure must never be reported as an installed update.
        }
      }
    };
    void Promise.race([
      initialize(),
      new Promise<void>((resolve) => window.setTimeout(resolve, 1450)),
    ]).finally(finish);
    return () => {
      active = false;
      window.clearTimeout(revealTimer);
      window.clearTimeout(releaseTimer);
    };
  }, []);
  useEffect(() => {
    if (!UPDATER_ENABLED || !isTauri() || !appVersionLoaded || updateConfirmation || updateDialogOpen) return;
    const checkInBackground = () => {
      if (document.visibilityState === "visible" && !updateInstallBusy.current) {
        void checkForUpdates(false);
      }
    };
    const initialTimer = window.setTimeout(checkInBackground, 7000);
    const periodicTimer = window.setInterval(checkInBackground, 60 * 60 * 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(periodicTimer);
    };
  }, [appVersionLoaded, updateConfirmation, updateDialogOpen]);
  function closeModal() {
    if (busy) return;
    if (onboarding) {
      try {
        localStorage.setItem("lanora.playerName", name);
        localStorage.setItem("lanora.avatar", avatar);
        setOnboarding(false);
      } catch {
        setSettingsError(
          lang === "fa"
            ? "ذخیرهٔ پروفایل روی این دستگاه ناموفق بود. فضای ذخیره‌سازی را بررسی کنید."
            : "Could not save the profile on this device. Check local storage and try again.",
        );
        return;
      }
    }
    if (mode === "settings" && !onboarding) setAvatar(settingsSnapshot.current.avatar);
    setMode(null);
  }
  function openSettings() {
    setSettingsError("");
    settingsSnapshot.current = { name, avatar };
    setMode("settings");
  }
  function openProfileEditor() {
    setSettingsError("");
    setMode("profile");
  }
  async function checkForUpdates(manual = false) {
    if (manual) setUpdateDialogOpen(true);
    if (!UPDATER_ENABLED || !isTauri()) {
      setUpdateState("unavailable");
      return;
    }
    if (updateCheckBusy.current) return;
    updateCheckBusy.current = true;
    setUpdateState("checking");
    try {
      const found = await tauriCheckForUpdate({ timeout: 12_000 });
      if (updateEntryRef.current && updateEntryRef.current !== found) {
        void updateEntryRef.current.close().catch(() => {});
      }
      setUpdateEntry(found);
      if (found) {
        setUpdateState("available");
        if (!manual) setUpdateToast(true);
      } else {
        setUpdateState("up_to_date");
        setUpdateToast(false);
      }
    } catch {
      setUpdateState("failed");
      setUpdateToast(false);
    } finally {
      updateCheckBusy.current = false;
    }
  }
  async function closeUpdateDialog() {
    if (updateInstallBusy.current || updateState === "checking" || updateState === "downloading" || updateState === "verifying" || updateState === "installing" || updateState === "restarting") return;
    if (updateEntry) await updateEntry.close().catch(() => {});
    setUpdateEntry(null);
    setUpdateConfirmation(null);
    setUpdateDialogOpen(false);
  }
  async function installUpdate() {
    const nextUpdate = updateEntry;
    if (!nextUpdate || updateInstallBusy.current) return;
    updateInstallBusy.current = true;
    setUpdateActionBusy(true);
    setUpdateToast(false);
    setDownloadProgress({ received: 0, total: null });
    if (LANORA_E2E_ENABLED) e2eDownloadTrace.current = { received: 0, total: null, maxPercent: 0 };
    try {
      setUpdateState("downloading");
      let received = 0;
      await nextUpdate.download((event) => {
        if (event.event === "Started") {
          const total = event.data.contentLength ?? null;
          if (LANORA_E2E_ENABLED) e2eDownloadTrace.current = { received, total, maxPercent: 0 };
          setDownloadProgress({ received, total });
        } else if (event.event === "Progress") {
          received += event.data.chunkLength;
          if (LANORA_E2E_ENABLED) {
            const total = e2eDownloadTrace.current.total;
            const percent = downloadPercent(received, total);
            e2eDownloadTrace.current = {
              received,
              total,
              maxPercent: percent === null ? e2eDownloadTrace.current.maxPercent : Math.max(e2eDownloadTrace.current.maxPercent ?? 0, percent),
            };
          }
          setDownloadProgress((current) => ({
            received,
            total: current?.total ?? null,
          }));
        } else if (event.event === "Finished") {
          setUpdateState("verifying");
        }
      }, { timeout: 180_000 });
      // Tauri verifies the signature before download() resolves. Recheck the live room
      // state after the asynchronous download before deciding whether installation may stop it.
      await completeUpdateInstallation(nextUpdate);
    } catch {
      setUpdateState("failed");
      updateInstallBusy.current = false;
      setUpdateActionBusy(false);
    }
  }
  async function completeUpdateInstallation(nextUpdate: Update, confirmed = false) {
    const activeRoom = roomRef.current;
    if (activeRoom && !confirmed) {
      setUpdateState("ready_to_install");
      updateInstallBusy.current = false;
      setUpdateActionBusy(false);
      return;
    }
    if (activeRoom) {
      const disconnected = await leave();
      if (!disconnected) throw new Error("Could not stop the local network tunnel.");
    } else {
      await invoke("engine_stop");
    }
    try {
      localStorage.setItem(PENDING_UPDATE_VERSION_KEY, nextUpdate.version);
    } catch {
      throw new Error("Could not save update confirmation state.");
    }
    setUpdateActionBusy(true);
    setUpdateState("installing");
    const windowsInstallerRestartsApp = /Windows/i.test(navigator.userAgent);
    if (windowsInstallerRestartsApp) {
      // The Windows updater exits this process after it launches the NSIS installer.
      // Show the handoff state before that process can terminate.
      setUpdateState("restarting");
      await new Promise<void>((resolve) =>
        window.setTimeout(resolve, LANORA_E2E_ENABLED ? 750 : 120),
      );
    }
    // Tauri verifies the downloaded artifact signature before download() resolves.
    await nextUpdate.install({ restartAfterInstall: true });
    if (windowsInstallerRestartsApp) return;
    setUpdateState("restarting");
    try {
      await relaunch();
    } catch {
      setUpdateState("restart_required");
      updateInstallBusy.current = false;
      setUpdateActionBusy(false);
    }
  }
  async function confirmUpdateInstall() {
    const nextUpdate = updateEntry;
    if (!nextUpdate || updateState !== "ready_to_install" || updateInstallBusy.current) return;
    updateInstallBusy.current = true;
    setUpdateActionBusy(true);
    try {
      await completeUpdateInstallation(nextUpdate, true);
    } catch {
      setUpdateState("failed");
      updateInstallBusy.current = false;
      setUpdateActionBusy(false);
    }
  }
  useEffect(() => {
    const timer = window.setInterval(() => setPresenceClock(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 1800);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    setLatencyMonitoring(Boolean(room));
  }, [room?.roomId, setLatencyMonitoring]);
  useEffect(() => {
    if (onboarding && room && tunnel.state === "tunnel_ready" && tunnel.virtualIp) {
      setOnboarding(false);
      setSettingsError("");
      setMode((current) => current === "settings" ? null : current);
    }
  }, [onboarding, room?.roomId, tunnel.state, tunnel.virtualIp]);
  function updateServerAddress(raw: string) {
    setServerInput(raw);
    setAddressError("");
    setError("");
    setNotice("");
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
    if (!failure) return;
    const message = friendlyError(failure, lang);
    if (onboarding && mode === "settings") setSettingsError(message);
    else setError(message);
  }, [failure, lang, onboarding, mode]);
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
        const current = await api<{ members: Member[]; networkGeneration: number }>(
          server,
          `/api/v1/rooms/${room.roomId}`,
          room.accessToken,
          undefined,
          undefined,
          { signal: controller.signal },
        );
        if (active) {
          if (networkGenerationRef.current.roomId !== room.roomId) {
            networkGenerationRef.current = {
              roomId: room.roomId,
              generation: room.networkGeneration ?? null,
            };
          }
          const previousGeneration = networkGenerationRef.current.generation;
          const rotate = previousGeneration != null && current.networkGeneration !== previousGeneration;
          networkGenerationRef.current.generation = current.networkGeneration;
          setRoom((old) => (old ? { ...old, members: current.members, networkGeneration: current.networkGeneration } : null));
          setPresenceUpdatedAt(Date.now());
          if (rotate && room.status === "approved") {
            try {
              await invoke("engine_stop");
              if (active) await startTunnel(room.roomId, room.accessToken, server);
            } catch (rotationError) {
              if (active) setError(friendlyError(rotationError, lang));
            }
          }
        }
      } catch (e) {
        if (active) {
          if (!(e instanceof RequestError && ["network", "timeout", "cancelled"].includes(e.code))) {
            setError(friendlyError(e, lang));
          }
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
    const recoverableEngineExit = tunnel.error?.startsWith("EasyTier exited:") === true;
    if (!room || room.status !== "approved" || !recoverableEngineExit || reconnectAttempt >= 3) {
      if (tunnel.state === "tunnel_ready" && tunnel.virtualIp) {
        setReconnectAttempt(0);
        setReconnecting(false);
      }
      return;
    }
    const attempt = reconnectAttempt + 1;
    const delay = Math.min(8000, 1000 * 2 ** reconnectAttempt) + Math.floor(Math.random() * 500);
    setReconnecting(true);
    const timer = window.setTimeout(async () => {
      setReconnectAttempt(attempt);
      setReconnecting(true);
      setTunnel({ running: false, virtualIp: null, state: "connecting", error: null });
      try {
        await invoke("engine_stop").catch(() => {});
        await startTunnel(room.roomId, room.accessToken, server, undefined, true);
      } finally {
        setReconnecting(false);
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [room?.roomId, room?.accessToken, room?.status, server, tunnel.error, tunnel.state, tunnel.virtualIp, reconnectAttempt]);
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
        if (active) {
          setRoom((old) => (old ? { ...old, members: current.members } : null));
          setPresenceUpdatedAt(Date.now());
        }
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
        if (active) {
          const observedAt = Date.now();
          setPeerStatuses(peers.map((peer) => ({ ...peer, observedAt })));
        }
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
    if (!rawAddress.trim()) {
      setAddressError(t.addressRequired);
      setError("");
      window.requestAnimationFrame(() => {
        const target = onboarding && mode === "settings" && onboardingStep === "server"
          ? onboardingServerInputRef.current
          : mainServerInputRef.current;
        target?.focus();
      });
      return;
    }
    setAddressError("");
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
      const message = friendlyError(e, lang);
      if (onboarding && mode === "settings") setSettingsError(message);
      else setError(message);
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
      avatar,
    });
    const active: ActiveRoom = {
      roomId: "shared",
      name: labels[lang].sharedNetwork,
      accessToken: joined.accessToken,
      selfUserId: joined.userId,
      role: "member",
      status: "approved",
      members: joined.members,
    };
    setPresenceUpdatedAt(Date.now());
    setConnectionStage("authorized");
    setRoom(active);
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
    automaticRecovery = false,
  ) {
    if (tunnelBusy.current) return;
    if (!automaticRecovery) {
      setReconnectAttempt(0);
      setReconnecting(false);
    }
    tunnelBusy.current = true;
    setTunnel({
      running: false,
      virtualIp: null,
      state: "connecting",
      error: null,
    });
    try {
      const cfg: Network =
        configuredNetwork ??
        (await api<Network>(
          serverUrl,
          id === "shared"
            ? "/api/v1/network/config"
            : `/api/v1/rooms/${id}/network`,
          token,
        ));
      if (id !== "shared" && cfg.networkGeneration != null) {
        networkGenerationRef.current = { roomId: id, generation: cfg.networkGeneration };
        setRoom((old) => old && old.roomId === id ? { ...old, networkGeneration: cfg.networkGeneration } : old);
      }
      if (id === "shared") setConnectionStage("tunnel");
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
      const message = friendlyError(e, lang);
      if (onboarding && mode === "settings") setSettingsError(message);
      else setError(message);
    } finally {
      tunnelBusy.current = false;
    }
  }
  async function syncProfile(nextName: string, nextAvatar: AvatarKind) {
    if (!room || !server) return;
    if (room.roomId === "shared") {
      const result = await api<{ members: Member[] }>(
        server,
        "/api/v1/network/profile",
        room.accessToken,
        { username: nextName, avatar: nextAvatar },
        "PATCH",
      );
      setRoom((old) => old ? { ...old, members: result.members } : null);
    } else {
      await api(
        server,
        `/api/v1/rooms/${room.roomId}/profile`,
        room.accessToken,
        { username: nextName, avatar: nextAvatar },
        "PATCH",
      );
      const current = await api<{ members: Member[]; networkGeneration: number }>(
        server,
        `/api/v1/rooms/${room.roomId}`,
        room.accessToken,
      );
      setRoom((old) => old ? { ...old, members: current.members, networkGeneration: current.networkGeneration } : null);
    }
    setPresenceUpdatedAt(Date.now());
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSettingsError("");
    const data = new FormData(event.currentTarget);
    try {
      if (mode === "settings" && !onboarding) {
        const avatarChanged = avatar !== settingsSnapshot.current.avatar;
        localStorage.setItem("lanora.avatar", avatar);
        if (avatarChanged && room && server) {
          try {
            await syncProfile(name, avatar);
          } catch {
            setNotice(lang === "fa"
              ? "آواتار روی این دستگاه ذخیره شد، اما همگام‌سازی با سرور انجام نشد."
              : "Avatar saved on this device, but server sync failed.");
          }
        }
        setOnboarding(false);
        setMode(null);
        return;
      }
      if (mode === "profile") {
        const next = String(data.get("name") || "").trim();
        if (next.length < 2 || next.length > 32)
          throw new RequestError("invalid_input");
        localStorage.setItem("lanora.playerName", next);
        setName(next);
        if (room && server) {
          try {
            await syncProfile(next, avatar);
          } catch {
            setNotice(lang === "fa"
              ? "نام روی این دستگاه ذخیره شد، اما همگام‌سازی با سرور انجام نشد."
              : "Name saved on this device, but server sync failed.");
          }
        }
        setMode(null);
        return;
      }
      if (mode === "settings") {
        const next = String(data.get("name") || name).trim();
        if (next.length < 2 || next.length > 32)
          throw new RequestError("invalid_input");
        localStorage.setItem("lanora.playerName", next);
        localStorage.setItem("lanora.avatar", avatar);
        setName(next);
        if (room && server) {
          try {
            if (room.roomId === "shared") {
              const result = await api<{ members: Member[] }>(
                server,
                "/api/v1/network/profile",
                room.accessToken,
                { username: next, avatar },
                "PATCH",
              );
              setRoom((old) => old ? { ...old, members: result.members } : null);
            } else {
              await api(
                server,
                `/api/v1/rooms/${room.roomId}/profile`,
                room.accessToken,
                { username: next, avatar },
                "PATCH",
              );
              const current = await api<{ members: Member[]; networkGeneration: number }>(
                server,
                `/api/v1/rooms/${room.roomId}`,
                room.accessToken,
              );
              setRoom((old) => old ? { ...old, members: current.members, networkGeneration: current.networkGeneration } : null);
            }
            setPresenceUpdatedAt(Date.now());
          } catch {
            setNotice(
              lang === "fa"
                ? "پروفایل روی این دستگاه ذخیره شد، اما همگام‌سازی با سرور انجام نشد."
                : "Profile saved on this device, but server sync failed.",
            );
          }
        }
        if (onboarding && onboardingStep === "profile") {
          setOnboardingStep("server");
          return;
        }
        if (onboarding && onboardingStep === "server") {
          const address = String(data.get("serverAddress") || "").trim();
          setServerInput(address);
          if (!address) {
            setAddressError(t.addressRequired);
            window.requestAnimationFrame(() => onboardingServerInputRef.current?.focus());
            return;
          }
          await connect(address);
          return;
        }
        setOnboarding(false);
        setMode(null);
        return;
      }
      if (!server) throw new Error("Connect to your server first.");
      if (!name || name.trim().length < 2) {
        openSettings();
        throw new Error("Set your display name first.");
      }
      if (mode === "create") {
        const created = await api<{
          roomId: string;
          accessToken: string;
          inviteCode: string;
          userId: string;
          room: { name: string };
        }>(server, "/api/v1/rooms", undefined, {
          name: String(data.get("roomName")),
          gameName: String(data.get("game") || ""),
          maxPlayers: Number(data.get("players")),
          visibility: data.get("visible") ? "public" : "private",
          password: String(data.get("password") || ""),
          requireApproval: Boolean(data.get("approval")),
          username: name,
          deviceId: localDeviceId(),
          avatar,
        });
        const active: ActiveRoom = {
          roomId: created.roomId,
          name: created.room.name,
          accessToken: created.accessToken,
          inviteCode: created.inviteCode,
          selfUserId: created.userId,
          role: "host",
          status: "approved",
        };
        setRoom(active);
        setPresenceUpdatedAt(Date.now());
        await startTunnel(active.roomId, active.accessToken);
      } else if (mode === "join") {
        const joined = await api<{
          roomId: string;
          roomName: string;
          accessToken: string;
          status: string;
          userId: string;
        }>(server, "/api/v1/rooms/join", undefined, {
          username: name,
          deviceId: localDeviceId(),
          avatar,
          password: String(data.get("password") || ""),
          ...(selectedRoom
            ? { roomId: selectedRoom.id }
            : { inviteCode: String(data.get("code") || "") }),
        });
        setRoom({
          roomId: joined.roomId,
          name: joined.roomName,
          accessToken: joined.accessToken,
          selfUserId: joined.userId,
          role: "member",
          status: joined.status,
        });
        setPresenceUpdatedAt(Date.now());
        if (joined.status === "approved")
          await startTunnel(joined.roomId, joined.accessToken);
      }
      setMode(null);
      setSelectedRoom(null);
    } catch (e) {
      if (mode === "settings" || mode === "profile") {
        setSettingsError(
          e instanceof RequestError
            ? friendlyError(e, lang)
            : lang === "fa"
              ? "ذخیرهٔ تنظیمات روی این دستگاه ناموفق بود. فضای ذخیره‌سازی را بررسی کنید."
              : "Could not save settings on this device. Check local storage and try again.",
        );
      } else {
        setError(friendlyError(e, lang));
      }
    } finally {
      setBusy(false);
    }
  }
  async function leave(): Promise<boolean> {
    if (!room || busy || tunnelBusy.current || leaveBusy.current) return false;
    leaveBusy.current = true;
    setDisconnecting(true);
    setBusy(true);
    setReconnectAttempt(0);
    setReconnecting(false);
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
      return true;
    } catch (e) {
      setError(friendlyError(e, lang));
      return false;
    } finally {
      leaveBusy.current = false;
      setDisconnecting(false);
      setBusy(false);
    }
  }
  async function retryTunnel() {
    if (!room || busy || tunnelBusy.current || retryBusy.current) return;
    retryBusy.current = true;
    setRetrying(true);
    setBusy(true);
    try {
      await invoke("engine_stop");
      await startTunnel(room.roomId, room.accessToken);
    } catch (e) {
      setError(friendlyError(e, lang));
    } finally {
      retryBusy.current = false;
      setRetrying(false);
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
  const updateStateLabel: Record<UpdateState, string> = {
    idle: "",
    checking: t.checkingForUpdates,
    up_to_date: t.upToDate,
    available: t.updateAvailable,
    downloading: t.updateDownloading,
    verifying: t.updateVerifying,
    installing: t.updateInstalling,
    restarting: t.updateRestarting,
    ready_to_install: t.updateReadyToInstall,
    restart_required: t.updateRestartRequired,
    installed: updateConfirmation?.status === "installed"
      ? t.updateInstalled.replace("{version}", updateConfirmation.version)
      : t.updateInstalled.replace("{version}", appVersion),
    install_mismatch: updateConfirmation?.status === "mismatch"
      ? t.updateInstallMismatch
        .replace("{expected}", updateConfirmation.expectedVersion)
        .replace("{actual}", updateConfirmation.actualVersion)
      : t.updateFailed,
    failed: t.updateFailed,
    unavailable: t.updateUnavailable,
  };
  const updaterBusy = updateActionBusy || updateState === "checking" ||
    updateState === "downloading" || updateState === "verifying" ||
    updateState === "installing" || updateState === "restarting";
  const e2eSnapshot = {
    version: appVersion,
    updateState,
    updateStates: updateStateTrace.current,
    downloadReceived: e2eDownloadTrace.current.received,
    downloadTotal: e2eDownloadTrace.current.total,
    maxDownloadPercent: e2eDownloadTrace.current.maxPercent,
    playerName: name,
    language: lang,
    theme,
    avatar,
    serverInput,
    connectedServer: server,
    serverReachable,
    serverPhase: phase,
    connectionStage,
    serverFailureCode: failure instanceof RequestError ? failure.code : failure ? "unknown" : null,
    serverFailureStatus: failure instanceof RequestError ? failure.status ?? null : null,
    rooms: publicRooms.length,
  };
  if (!startupReady) return <StartupSkeleton lang={lang} visible={showStartupSkeleton} />;
  return (
    <>
      <TitleBar
        lang={lang}
        appVersion={appVersion}
        status={
          checking || busy || reconnecting || tunnel.state === "connecting"
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
        profileMenuLabels={{ editProfile: t.editProfile, settings: t.settings }}
        updateMenuLabels={{ check: t.checkForUpdates, version: t.currentVersion }}
        onSettings={openSettings}
        onEditProfile={openProfileEditor}
        onCheckForUpdates={() => void checkForUpdates(true)}
      />
      {updateToast && updateEntry && (
        <button
          className="app-update-toast"
          type="button"
          onClick={() => { setUpdateToast(false); setUpdateDialogOpen(true); void installUpdate(); }}
          aria-label={`${t.updateAvailable}: ${updateEntry.version}. ${t.updateInstall}`}
          dir={lang === "fa" ? "rtl" : "ltr"}
        >
          <Info size={16} aria-hidden="true" />
          <span>{t.updateAvailable} · <bdi dir="ltr">{updateEntry.version}</bdi></span>
          <b>{t.updateInstall}</b>
        </button>
      )}
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
                {checking
                  ? t.checking
                  : server
                    ? serverReachable
                      ? server
                      : t.serverUnreachable
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
          {!room && <div className="side-tip">
            <Gamepad2 size={21} />
            <b>{lang === "fa" ? "برای بازی آماده شوید" : "Ready to play?"}</b>
            <p>
              {lang === "fa"
                ? "آی‌پی مجازی میزبان بازی را در گزینهٔ Direct IP وارد کنید."
                : "Use the game host’s virtual IP in the game’s Direct IP option."}
            </p>
          </div>}
          <div className="side-footer">
            <span className={connectionStatus === "peer-connected" ? "online" : ""} />
            {connectionStatus === "server-unreachable"
              ? t.disconnected
              : connectionStatus === "connection-interrupted"
                ? t.connectionInterrupted
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
            <div className={`app-main-content ${room ? "connected" : ""}`} key={room?.roomId ?? "connect"}>
            {!room && <>
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
                  ref={mainServerInputRef}
                  dir="ltr"
                  aria-label={t.server}
                  aria-invalid={Boolean(addressError)}
                  aria-describedby={addressError ? "server-address-error" : undefined}
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
                    ? t.checking
                    : busy
                      ? connectionStage === "server"
                        ? t.checking
                        : connectionStage === "authenticating"
                          ? t.authenticating
                          : connectionStage === "authorized"
                            ? t.accessApproved
                            : t.connectingNetwork
                      : t.connect}
                </button>
              </div>
              {addressError && (
                <p id="server-address-error" className="app-field-error" role="alert" dir={lang === "fa" ? "rtl" : "ltr"}>
                  {addressError}
                </p>
              )}
              <p className="app-hint">
                <ShieldCheck size={15} />
                <span dir={lang === "fa" ? "rtl" : "ltr"}>{t.backendOnly}</span>
              </p>
              {!passwordPromptMode && (
                <ConnectionJourney stage={connectionStage} lang={lang} />
              )}
            </section>
            </>}
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
                serverAddress={server}
                serverLatencyMs={serverLatencyMs}
                serverReachable={serverReachable}
                presenceFresh={presenceUpdatedAt > 0 && presenceClock - presenceUpdatedAt < PLAYER_PRESENCE_MAX_AGE_MS}
                presenceUpdatedAt={presenceUpdatedAt}
                reconnecting={reconnecting}
                reconnectAttempt={reconnectAttempt}
                tunnel={tunnel}
                peerStatuses={peerStatuses}
                lang={lang}
                avatar={avatar}
                playerName={name}
                busy={busy || tunnelBusy.current}
                disconnecting={disconnecting}
                retrying={retrying}
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
                onCopyDiagnostics={(value) =>
                  void navigator.clipboard
                    .writeText(value)
                    .then(() => setNotice(t.copied))
                    .catch(() => setError(lang === "fa" ? "کپی گزارش انجام نشد." : "Could not copy diagnostics."))
                }
                onRetry={() => void retryTunnel()}
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
            {notice && <p className="app-notice" role="status" aria-live="polite" dir={lang === "fa" ? "rtl" : "ltr"}>{notice}</p>}
            <footer className="app-footer">
              <LockKeyhole size={14} />
              <span dir={lang === "fa" ? "rtl" : "ltr"}>{t.dev}</span>
            </footer>
            </div>
          </main>
          {mode && (
            <Modal
              label={
                mode === "settings"
                  ? t.settings
                  : mode === "profile"
                    ? t.editProfile
                  : mode === "create"
                    ? t.create
                    : t.join
              }
              onClose={closeModal}
            >
              <div
                className={`app-dialog ${mode === "settings" || mode === "profile" ? "app-dialog-profile" : ""}`}
                dir="ltr"
              >
                <header className="app-dialog-header">
                  <button
                    className="app-dialog-close"
                    type="button"
                    onClick={closeModal}
                    aria-label={t.cancel}
                  >
                    <X size={19} />
                  </button>
                  <span className="app-eyebrow" dir={lang === "fa" ? "rtl" : "ltr"}>
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
                      : mode === "profile"
                        ? lang === "fa" ? "پروفایل شما" : "YOUR PROFILE"
                      : lang === "fa"
                        ? "فضای بازی"
                        : "GAME ROOM"}
                  </span>
                  <h2 dir={lang === "fa" ? "rtl" : "ltr"}>
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
                      : mode === "profile"
                        ? t.editProfile
                      : mode === "create"
                        ? t.create
                        : t.join}
                  </h2>
                  {mode === "settings" && onboarding && (
                    <>
                      <p className="app-dialog-description" dir={lang === "fa" ? "rtl" : "ltr"}>
                        {onboardingStep === "profile"
                          ? lang === "fa"
                            ? "یک نام نمایشی انتخاب کنید؛ حساب کاربری لازم نیست."
                            : "Choose a display name to get started. No account is needed."
                          : lang === "fa"
                            ? "نشانی سروری را وارد کنید که صاحبش برایتان فرستاده است."
                            : "Enter the server address shared by its owner."}
                      </p>
                      <div
                        className="onboarding-progress"
                        aria-label={lang === "fa" ? "مراحل راه‌اندازی" : "Setup steps"}
                      >
                        <div className={`onboarding-step ${onboardingStep === "profile" ? "active" : "done"}`}>
                          <span>{lang === "fa" ? "۱" : "1"}</span>
                          <small dir={lang === "fa" ? "rtl" : "ltr"}>{lang === "fa" ? "پروفایل" : "Profile"}</small>
                        </div>
                        <i aria-hidden="true" />
                        <div className={`onboarding-step ${onboardingStep === "server" ? "active" : ""}`}>
                          <span>{lang === "fa" ? "۲" : "2"}</span>
                          <small dir={lang === "fa" ? "rtl" : "ltr"}>{lang === "fa" ? "سرور" : "Server"}</small>
                        </div>
                      </div>
                    </>
                  )}
                </header>
                <form className="app-form app-dialog-form" onSubmit={submit}>
                  <div
                    className="app-dialog-body"
                    role="region"
                    tabIndex={0}
                    aria-label={mode === "settings" ? t.settings : mode === "profile" ? t.editProfile : mode === "create" ? t.create : t.join}
                  >
                  {mode === "settings" &&
                    onboarding &&
                    onboardingStep === "profile" && (
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
                        autoFocusAvatar
                      />
                    )}
                  {mode === "settings" &&
                    onboarding &&
                    onboardingStep === "server" && (
                      <>
                        <label dir={lang === "fa" ? "rtl" : "ltr"}>
                          {lang === "fa" ? "نشانی سرور" : "Server address"}
                          <input
                            ref={onboardingServerInputRef}
                            name="serverAddress"
                            dir="ltr"
                            inputMode="url"
                            autoComplete="url"
                            aria-invalid={Boolean(addressError)}
                            aria-describedby={addressError ? "onboarding-server-address-error" : undefined}
                            value={serverInput}
                            disabled={Boolean(room) || checking || busy}
                            onChange={(event) =>
                              updateServerAddress(event.target.value)
                            }
                            placeholder="https://games.example.com"
                            autoFocus
                          />
                          {addressError && (
                            <small id="onboarding-server-address-error" className="app-field-error" role="alert">
                              {addressError}
                            </small>
                          )}
                        </label>
                        {room && (
                          <div className="app-connection-progress" role="status" dir={lang === "fa" ? "rtl" : "ltr"}>
                            {tunnel.state === "failed" ? t.networkFailed : t.starting}
                            {tunnel.state === "failed" && (
                              <button
                                className="app-button subtle"
                                type="button"
                                disabled={busy}
                                onClick={() => void invoke("engine_stop").then(() => startTunnel(room.roomId, room.accessToken)).catch((e) => setSettingsError(friendlyError(e, lang)))}
                              >
                                {t.retry}
                              </button>
                            )}
                          </div>
                        )}
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
                    showDisplayName={false}
                    autoFocusAvatar
                    />
                  )}
                  {mode === "profile" && (
                    <ProfileFields
                      {...{ lang, theme, name, avatar, setLang, setTheme, setAvatar }}
                      showAvatarPicker={false}
                      showPreferences={false}
                      autoFocusAvatar={false}
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
                  {mode === "settings" && settingsError && (
                    <p className="app-error" role="alert" dir={lang === "fa" ? "rtl" : "ltr"}>
                      {settingsError}
                    </p>
                  )}
                  {mode !== "settings" && error && (
                    <p className="app-error" role="alert" dir={lang === "fa" ? "rtl" : "ltr"}>
                      {error}
                    </p>
                  )}
                  </div>
                  <footer className="app-dialog-footer" dir="ltr">
                    {mode === "settings" && onboarding && onboardingStep === "server" && (
                      <button
                        className="app-button subtle"
                        type="button"
                        disabled={busy || checking}
                        onClick={() => setOnboardingStep("profile")}
                      >
                        {lang === "fa" ? "بازگشت" : "Back"}
                      </button>
                    )}
                    <div className="app-dialog-footer-actions">
                      {mode === "settings" && onboarding && onboardingStep === "server" && (
                        <button
                          className="app-button subtle"
                          type="button"
                          disabled={busy || checking}
                          onClick={() => {
                            try {
                              localStorage.setItem("lanora.playerName", name);
                              localStorage.setItem("lanora.avatar", avatar);
                              setOnboarding(false);
                              setSettingsError("");
                              setMode(null);
                            } catch {
                              setSettingsError(
                                lang === "fa"
                                  ? "ذخیرهٔ پروفایل روی این دستگاه ناموفق بود. فضای ذخیره‌سازی را بررسی کنید."
                                  : "Could not save the profile on this device. Check local storage and try again.",
                              );
                            }
                          }}
                        >
                          {lang === "fa" ? "فعلاً بعداً" : "Connect later"}
                        </button>
                      )}
                      <button
                        className="app-button primary"
                        type="submit"
                        disabled={busy || (mode === "settings" && onboarding && onboardingStep === "server" && Boolean(room))}
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
                          : mode === "settings" && onboarding && onboardingStep === "profile"
                            ? lang === "fa" ? "ادامه" : "Continue"
                            : mode === "settings" && onboarding && onboardingStep === "server"
                              ? room
                                ? lang === "fa" ? "در حال راه‌اندازی شبکه…" : "Starting network…"
                                : lang === "fa"
                                ? checking ? "در حال اتصال…" : "اتصال به سرور"
                                : checking ? "Connecting…" : "Connect to server"
                              : mode === "settings"
                                ? t.save
                                : mode === "create"
                                  ? t.create
                                  : t.join}
                      </button>
                    </div>
                  </footer>
                </form>
              </div>
            </Modal>
          )}
          {passwordPromptMode && (
            <Modal label={t.serverPassword} onClose={cancelPasswordPrompt}>
              <div className="app-dialog" dir="ltr">
                <header className="app-dialog-header">
                  <span className="app-eyebrow">{t.server}</span>
                  <h2 dir={lang === "fa" ? "rtl" : "ltr"}>{t.serverPassword}</h2>
                </header>
                <form className="app-form app-dialog-form" onSubmit={submitServerPassword}>
                  <div className="app-dialog-body" role="region" tabIndex={0} aria-label={t.serverPassword}>
                    <p className="app-password-help" dir={lang === "fa" ? "rtl" : "ltr"}>
                      {passwordPromptMode === "legacy_password"
                        ? t.legacyPasswordHelp
                        : t.passwordRequiredHelp}
                    </p>
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
                  </div>
                  <footer className="app-dialog-footer" dir="ltr">
                    <div className="app-dialog-footer-actions">
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
                        <X size={15} aria-hidden="true" />
                        {t.cancel}
                      </button>
                    </div>
                  </footer>
                </form>
              </div>
            </Modal>
          )}
          {updateDialogOpen && (
            <Modal label={t.checkForUpdates} onClose={() => void closeUpdateDialog()}>
              <div className="app-dialog app-dialog-update" dir="ltr">
                <header className="app-dialog-header">
                  <button
                    className="app-dialog-close"
                    type="button"
                    onClick={() => void closeUpdateDialog()}
                    aria-label={t.updateLater}
                    disabled={updaterBusy}
                  >
                    <X size={18} />
                  </button>
                  <span className="app-eyebrow" dir={lang === "fa" ? "rtl" : "ltr"}>{t.currentVersion}</span>
                  <h2 dir={lang === "fa" ? "rtl" : "ltr"}>{t.checkForUpdates}</h2>
                </header>
                <div className="app-dialog-body update-dialog-body" dir={lang === "fa" ? "rtl" : "ltr"}>
                  <p className={`app-update-state ${updateState}`} role="status" aria-live="polite" aria-label={LANORA_E2E_ENABLED ? `LANORA_E2E_STATE:${JSON.stringify(e2eSnapshot)}` : undefined}>
                    {updateState === "checking" || updateState === "downloading" || updateState === "verifying" || updateState === "installing" || updateState === "restarting"
                      ? <RefreshCw size={16} className="spin" aria-hidden="true" />
                      : updateState === "up_to_date" || updateState === "installed"
                        ? <Check size={16} aria-hidden="true" />
                        : updateState === "failed" || updateState === "install_mismatch"
                          ? <Activity size={16} aria-hidden="true" />
                          : <Info size={16} aria-hidden="true" />}
                    <span>{updateStateLabel[updateState]}</span>
                  </p>
                  {updateEntry && (
                    <>
                      <dl className="app-update-versions">
                        <div><dt>{t.updateCurrent}</dt><dd dir="ltr">{updateEntry.currentVersion || appVersion}</dd></div>
                        <div><dt>{t.updateNew}</dt><dd dir="ltr">{updateEntry.version}</dd></div>
                      </dl>
                      {updateEntry.body && <div className="app-update-notes">{updateEntry.body}</div>}
                    </>
                  )}
                  {updateState === "downloading" && downloadProgress && (() => {
                    const percent = downloadPercent(downloadProgress.received, downloadProgress.total);
                    return (
                      <div className="app-update-progress">
                        <label htmlFor="lanora-update-progress">{t.updateProgress}</label>
                        {percent !== null ? (
                          <div className="app-update-progress-value">
                            <progress
                              id="lanora-update-progress"
                              value={percent}
                              max={100}
                              aria-valuetext={`${percent}%`}
                            />
                            <output htmlFor="lanora-update-progress" aria-live="off">{percent}%</output>
                          </div>
                        ) : (
                          <progress id="lanora-update-progress" />
                        )}
                      </div>
                    );
                  })()}
                  {room && updateEntry && (updateState === "available" || updateState === "ready_to_install") && (
                    <p className="app-update-warning" dir={lang === "fa" ? "rtl" : "ltr"}>{t.updateConnectedWarning}</p>
                  )}
                </div>
                <footer className="app-dialog-footer" dir="ltr">
                  <div className="app-dialog-footer-actions">
                    {updateState === "failed" && (
                      <button className="app-button subtle" type="button" onClick={() => void checkForUpdates(true)} disabled={updaterBusy}>
                        <RefreshCw size={15} aria-hidden="true" />{t.updateRetry}
                      </button>
                    )}
                    {updateState === "available" && updateEntry && (
                      <button className="app-button primary" type="button" onClick={() => void installUpdate()} disabled={updaterBusy}>
                        <Download size={15} aria-hidden="true" />{t.updateInstall}
                      </button>
                    )}
                    {updateState === "ready_to_install" && updateEntry && (
                      <button className="app-button primary" type="button" onClick={() => void confirmUpdateInstall()} disabled={updaterBusy}>
                        <Download size={15} aria-hidden="true" />{room ? t.updateDisconnectInstall : t.updateInstall}
                      </button>
                    )}
                    {updateState === "restart_required" && (
                      <button className="app-button primary" type="button" onClick={() => {
                        setUpdateState("restarting");
                        void relaunch().catch(() => setUpdateState("restart_required"));
                      }}>
                        <RefreshCw size={15} aria-hidden="true" />{t.updateRestartNow}
                      </button>
                    )}
                    <button className="app-button subtle" type="button" onClick={() => void closeUpdateDialog()} disabled={updaterBusy}>
                      {t.updateLater}
                    </button>
                  </div>
                </footer>
              </div>
            </Modal>
          )}
        </div>
      </div>
      {LANORA_E2E_ENABLED && !updateDialogOpen && (
        <output
          id="lanora-e2e-state"
          role="status"
          aria-live="off"
          aria-label={`LANORA_E2E_STATE:${JSON.stringify(e2eSnapshot)}`}
          style={{ position: "fixed", left: "-10000px", top: 0, width: 1, height: 1, overflow: "hidden", whiteSpace: "nowrap" }}
        >
          LANORA test state
        </output>
      )}
    </>
  );
}
