import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { Minus, Square, Copy, X, Settings2 } from "lucide-react";
import { Avatar, type AvatarKind } from "./Avatar";
import brand from "../brand.svg";
export function TitleBar({
  lang,
  status,
  statusLabels,
  name,
  avatar,
  settingsLabel,
  onSettings,
}: {
  lang: "en" | "fa";
  status: "idle" | "checking" | "connected" | "failed";
  statusLabels: Record<"idle" | "checking" | "connected" | "failed", string>;
  name: string;
  avatar: AvatarKind;
  settingsLabel: string;
  onSettings: () => void;
}) {
  const [maximized, setMaximized] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [failure, setFailure] = useState(false);
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
  if (!isTauri()) return null;
  const window = getCurrentWindow();
  return (
    <div
      className="titlebar"
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
        <span data-tauri-drag-region>0.2.0-alpha.2</span>
      </div>
      <div
        className="titlebar-drag-fill"
        data-tauri-drag-region
        onDoubleClick={() => safe(window.toggleMaximize())}
      />
      <div className="titlebar-tools">
        <span className={`titlebar-status ${status}`} role="status" aria-live="polite">
          <i />
          {statusLabels[status]}
        </span>
        <button
          className="titlebar-profile"
          aria-label={settingsLabel}
          title={settingsLabel}
          onClick={onSettings}
        >
          <Avatar kind={avatar} />
          <span>{name || settingsLabel}</span>
          <Settings2 size={16} />
        </button>
      </div>
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
