import { useEffect, useRef, useState } from "react";
import { health, normalize } from "../api";
type Phase = "idle" | "validating" | "connecting" | "connected" | "failed";
export function useServer() {
  const [server, setServer] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [reachable, setReachable] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const attempt = useRef<AbortController | null>(null);
  useEffect(() => () => attempt.current?.abort(), []);
  async function connect(raw: string) {
    if (attempt.current) return;
    const controller = new AbortController();
    attempt.current = controller;
    setPhase("validating");
    setFailure(null);
    setReachable(false);
    try {
      const url = normalize(raw);
      setPhase("connecting");
      await health(url, controller.signal);
      if (controller.signal.aborted) return;
      setServer(url);
      setReachable(true);
      setPhase("connected");
      return url;
    } catch (error) {
      if (!controller.signal.aborted) {
        setServer("");
        setPhase("failed");
        setFailure(error);
      }
    } finally {
      if (attempt.current === controller) attempt.current = null;
    }
  }
  useEffect(() => {
    if (!server) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function check() {
      try {
        await health(server, controller.signal);
        if (!disposed) setReachable(true);
      } catch {
        if (!disposed) setReachable(false);
      }
      // Schedule after completion: no overlapping polling requests.
      if (!disposed) timer = setTimeout(check, 10000);
    }
    timer = setTimeout(check, 10000);
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [server]);
  function clear() {
    attempt.current?.abort();
    attempt.current = null;
    setServer("");
    setReachable(false);
    setPhase("idle");
  }
  return {
    server,
    phase,
    reachable,
    failure,
    checking: phase === "validating" || phase === "connecting",
    connect,
    clear,
  };
}
