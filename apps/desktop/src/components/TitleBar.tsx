import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { Minus, Square, Copy, X } from "lucide-react";
export function TitleBar({ lang }: { lang: "en" | "fa" }) {
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
      title={
        failure
          ? lang === "fa"
            ? "کنترل پنجره ناموفق بود. دوباره تلاش کنید."
            : "Window action failed. Please retry."
          : undefined
      }
    >
      <div data-tauri-drag-region>
        LANORA <span data-tauri-drag-region>0.2.0 alpha</span>
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
