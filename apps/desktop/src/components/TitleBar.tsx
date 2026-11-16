import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { Minus, Square, Copy, X } from "lucide-react";
export function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    if (!isTauri()) return;
    const window = getCurrentWindow();
    let disposed = false;
    const update = () => {
      void window.isMaximized().then((v) => {
        if (!disposed) setMaximized(v);
      });
    };
    update();
    const listener = window.onResized(update);
    return () => {
      disposed = true;
      void listener.then((stop) => stop());
    };
  }, []);
  if (!isTauri()) return null;
  const window = getCurrentWindow();
  return (
    <div className="titlebar" dir="ltr">
      <div data-tauri-drag-region>
        LANORA <span data-tauri-drag-region>0.2.0 alpha</span>
      </div>
      <button aria-label="Minimize" onClick={() => void window.minimize()}>
        <Minus size={14} />
      </button>
      <button
        aria-label={maximized ? "Restore" : "Maximize"}
        onClick={() => void window.toggleMaximize()}
      >
        {maximized ? <Copy size={13} /> : <Square size={13} />}
      </button>
      <button
        className="window-close"
        aria-label="Close"
        onClick={() => void window.close()}
      >
        <X size={16} />
      </button>
    </div>
  );
}
