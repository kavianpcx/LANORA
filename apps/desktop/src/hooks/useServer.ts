import { useCallback, useEffect, useRef, useState } from "react";
import { health, normalize } from "../api";
type Phase = "idle" | "validating" | "connecting" | "connected" | "failed";
export function useServer() {
  const [server, setServer] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [reachable, setReachable] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [trackLatency, setTrackLatency] = useState(false);
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
      const startedAt = performance.now();
      await health(url, controller.signal);
      if (controller.signal.aborted) return;
      setServer(url);
      setReachable(true);
      setLatencyMs(Math.max(0, Math.round(performance.now() - startedAt)));
      setPhase("connected");
      return url;
    } catch (error) {
      if (!controller.signal.aborted) {
        setServer("");
        setPhase("failed");
        setFailure(error);
        setLatencyMs(null);
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
      const startedAt = trackLatency ? performance.now() : 0;
      try {
        await health(server, controller.signal);
        if (!disposed) {
          setReachable(true);
          setLatencyMs(trackLatency ? Math.max(0, Math.round(performance.now() - startedAt)) : null);
        }
      } catch {
        if (!disposed) {
          setReachable(false);
          setLatencyMs(null);
        }
      }
      // Schedule after completion: no overlapping polling requests.
      if (!disposed) timer = setTimeout(check, 15000);
    }
    timer = setTimeout(check, 15000);
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [server, trackLatency]);
  function clear() {
    attempt.current?.abort();
    attempt.current = null;
    setServer("");
    setReachable(false);
    setLatencyMs(null);
    setPhase("idle");
  }
  const setLatencyMonitoring = useCallback((enabled: boolean) => {
    setTrackLatency(enabled);
    if (!enabled) setLatencyMs(null);
  }, []);
  return {
    server,
    phase,
    reachable,
    latencyMs,
    setLatencyMonitoring,
    failure,
    checking: phase === "validating" || phase === "connecting",
    connect,
    clear,
  };
}
