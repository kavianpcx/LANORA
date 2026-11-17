export type ConnectionStage =
  | "idle"
  | "server"
  | "authenticating"
  | "authorized"
  | "tunnel"
  | "connected"
  | "auth-failed"
  | "failed";

export type ConnectionStatus =
  | "server-unreachable"
  | "server-reachable"
  | "authentication-pending"
  | "authentication-failed"
  | "authorized"
  | "tunnel-starting"
  | "virtual-adapter-ready"
  | "peer-connected"
  | "peer-unverified"
  | "connection-failed";

export function deriveConnectionStatus(input: {
  serverReachable: boolean;
  stage: ConnectionStage;
  roomActive: boolean;
  tunnelRunning: boolean;
  virtualIp: string | null;
  reachablePeerCount: number;
}): ConnectionStatus {
  if (input.stage === "auth-failed") return "authentication-failed";
  if (input.stage === "authenticating") return "authentication-pending";
  if (input.stage === "failed") return "connection-failed";
  if (!input.serverReachable) return "server-unreachable";
  if (!input.roomActive) return "server-reachable";
  if (input.stage === "authorized") return "authorized";
  if (!input.tunnelRunning) return "tunnel-starting";
  if (!input.virtualIp) return "tunnel-starting";
  if (input.reachablePeerCount > 0) return "peer-connected";
  return "peer-unverified";
}
