import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { Minus, Square, Copy, X, Settings2, ChevronDown, UserRound, Info, RefreshCw } from "lucide-react";
import { Avatar, type AvatarKind } from "./Avatar";
import brand from "../brand.svg";
export function TitleBar({
  lang,
  appVersion,
  status,
  statusLabels,
  name,
  avatar,
  settingsLabel,
  profileMenuLabels,
  updateMenuLabels,
  onSettings,
  onEditProfile,
  onCheckForUpdates,
}: {
  lang: "en" | "fa";
  appVersion: string;
  status: "idle" | "checking" | "server" | "connected" | "failed";
  statusLabels: Record<"idle" | "checking" | "server" | "connected" | "failed", string>;
  name: string;
  avatar: AvatarKind;
  settingsLabel: string;
  profileMenuLabels: { editProfile: string; settings: string };
  updateMenuLabels: { check: string; version: string };
  onSettings: () => void;
  onEditProfile: () => void;
  onCheckForUpdates: () => void;
}) {
  const [maximized, setMaximized] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [failure, setFailure] = useState(false);
  const [openMenu, setOpenMenu] = useState<"profile" | "updates" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const safe = (work: Promise<unknown>) =>
    void work.catch(() => setFailure(true));
  useEffect(() => {
    if (!isTauri()) return;
    const window = getCurrentWindow();
    let disposed = false;
    const update = () => {
      safe(
        Promise.all([window.isMaximized(), window.isFullscreen()]).then(
          ([max, full]) => {
            if (!disposed) {
              setMaximized(max);
              setFullscreen(full);
            }
          },
        ),
      );
    };
    update();
    const listener = window.onResized(update);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "F11") {
        event.preventDefault();
        safe(window.isFullscreen().then((full) => window.setFullscreen(!full)));
      }
      if (event.key === "Escape" && !document.querySelector("dialog[open]"))
        safe(
          window
            .isFullscreen()
            .then((full) => (full ? window.setFullscreen(false) : undefined)),
        );
    };
    document.addEventListener("keydown", onKey);
    return () => {
      disposed = true;
      document.removeEventListener("keydown", onKey);
      safe(listener.then((stop) => stop()));
    };
  }, []);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target))
        setOpenMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);
  if (!isTauri()) return null;
  const window = getCurrentWindow();
  return (
    <div
      className="titlebar"
      ref={menuRef}
      dir="ltr"
      data-fullscreen={fullscreen}
      title={
        failure
          ? lang === "fa"
            ? "کنترل پنجره ناموفق بود. دوباره تلاش کنید."
            : "Window action failed. Please retry."
          : undefined
      }
    >
      <div
        className="titlebar-leading"
        data-tauri-drag-region
        onDoubleClick={() => safe(window.toggleMaximize())}
      >
        <img src={brand} alt="" data-tauri-drag-region />
        <b data-tauri-drag-region>LANORA</b>
        <button
          type="button"
          className="titlebar-version"
          aria-label={`${updateMenuLabels.check} · ${appVersion}`}
          aria-expanded={openMenu === "updates"}
          onClick={() => setOpenMenu((value) => value === "updates" ? null : "updates")}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          {appVersion}
        </button>
      </div>
      <div
        className="titlebar-drag-fill"
        data-tauri-drag-region
        onDoubleClick={() => safe(window.toggleMaximize())}
      />
      <div className="titlebar-tools">
        <button
          type="button"
          className="titlebar-update-check"
          aria-label={updateMenuLabels.check}
          title={updateMenuLabels.check}
          onClick={() => {
            setOpenMenu(null);
            onCheckForUpdates();
          }}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <RefreshCw size={15} aria-hidden="true" />
        </button>
        <span className={`titlebar-status ${status}`} role="status" aria-live="polite">
          <i />
          <span dir={lang === "fa" ? "rtl" : "ltr"}>{statusLabels[status]}</span>
        </span>
        <div className="titlebar-menu-anchor">
          <button
            className="titlebar-profile"
            aria-label={settingsLabel}
            title={settingsLabel}
            aria-expanded={openMenu === "profile"}
            onClick={() => setOpenMenu((value) => value === "profile" ? null : "profile")}
          >
            <Avatar kind={avatar} size={30} decorative />
            <span dir="auto">{name || settingsLabel}</span>
            <ChevronDown size={15} />
          </button>
          {openMenu === "profile" && (
            <div className="titlebar-popover" role="menu">
              <button role="menuitem" onClick={() => { setOpenMenu(null); onEditProfile(); }}>
                <UserRound size={15} />{profileMenuLabels.editProfile}
              </button>
              <button role="menuitem" onClick={() => { setOpenMenu(null); onSettings(); }}>
                <Settings2 size={15} />{profileMenuLabels.settings}
              </button>
            </div>
          )}
        </div>
      </div>
      {openMenu === "updates" && (
        <div className="titlebar-update-popover" role="menu">
          <span><Info size={15} />{updateMenuLabels.version}: <bdi dir="ltr">{appVersion}</bdi></span>
          <button role="menuitem" onClick={() => { setOpenMenu(null); onCheckForUpdates(); }}>
            <RefreshCw size={15} />{updateMenuLabels.check}
          </button>
        </div>
      )}
      <button
        aria-label={lang === "fa" ? "کوچک‌کردن" : "Minimize"}
        onClick={() => safe(window.minimize())}
      >
        <Minus size={14} />
      </button>
      <button
        aria-label={
          maximized || fullscreen
            ? lang === "fa"
              ? "بازگردانی"
              : "Restore"
            : lang === "fa"
              ? "بزرگ‌کردن"
              : "Maximize"
        }
        onClick={() =>
          safe(
            fullscreen ? window.setFullscreen(false) : window.toggleMaximize(),
          )
        }
      >
        {maximized || fullscreen ? <Copy size={13} /> : <Square size={13} />}
      </button>
      <button
        className="window-close"
        aria-label={lang === "fa" ? "بستن" : "Close"}
        onClick={() => safe(window.close())}
      >
        <X size={16} />
      </button>
    </div>
  );
}
