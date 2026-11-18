export const PEER_STATUS_MAX_AGE_MS = 15_000;
export const PLAYER_PRESENCE_MAX_AGE_MS = 35_000;

export type DiagnosticState =
  | "pass"
  | "fail"
  | "unknown"
  | "pending"
  | "stale"
  | "partial"
  | "not_checked"
  | "observed"
  | "none_observed";

export type ConnectionDiagnostics = {
  checkedAt: string;
  backend: "pass" | "fail";
  playerAuthorization: "pass" | "fail" | "pending";
  easyTierProcess: "pass" | "fail" | "unknown";
  virtualIpAssigned: "pass" | "fail" | "unknown";
  playerPresence: "pass" | "stale" | "unknown";
  peerRoute: {
    status: "pass" | "partial" | "unknown" | "not_checked";
    totalPlayers: number;
    reachable: number;
    expected: number;
    awaitingVirtualIp: number;
    playersWithVirtualIp: number;
    unknown: number;
  };
  observedRelayRoutes: {
    status: "observed" | "none_observed" | "unknown";
    count: number;
  };
  relayReachabilityTest: "not_checked";
};

type DiagnosticInput = {
  checkedAt?: string;
  serverReachable: boolean;
  authorization: "approved" | "pending" | "rejected";
  tunnelRunning: boolean;
  tunnelFailed: boolean;
  virtualIpAssigned: boolean;
  presenceKnown: boolean;
  presenceFresh: boolean;
  expectedPeerCount: number;
  reachablePeerCount: number;
  observedRelayRouteCount: number;
  hasFreshPeerObservations: boolean;
  totalOtherPlayerCount?: number;
  awaitingVirtualIpCount?: number;
  playersWithVirtualIpCount?: number;
  unknownPeerCount?: number;
};

function count(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function buildConnectionDiagnostics(input: DiagnosticInput): ConnectionDiagnostics {
  const expected = count(input.expectedPeerCount);
  const reachable = Math.min(count(input.reachablePeerCount), expected);
  const relayCount = Math.min(count(input.observedRelayRouteCount), expected);
  const routeStatus = expected === 0
    ? "not_checked"
    : !input.presenceKnown || !input.presenceFresh
      ? "unknown"
      : reachable === expected && count(input.awaitingVirtualIpCount ?? 0) === 0
      ? "pass"
      : reachable > 0
        ? "partial"
        : "unknown";

  return {
    checkedAt: input.checkedAt ?? new Date().toISOString(),
    backend: input.serverReachable ? "pass" : "fail",
    playerAuthorization: input.authorization === "approved"
      ? "pass"
      : input.authorization === "pending"
        ? "pending"
        : "fail",
    easyTierProcess: input.tunnelRunning ? "pass" : input.tunnelFailed ? "fail" : "unknown",
    virtualIpAssigned: input.virtualIpAssigned ? "pass" : input.tunnelFailed ? "fail" : "unknown",
    playerPresence: !input.presenceKnown ? "unknown" : input.presenceFresh ? "pass" : "stale",
    peerRoute: {
      status: routeStatus,
      totalPlayers: count(input.totalOtherPlayerCount ?? expected),
      reachable,
      expected,
      awaitingVirtualIp: Math.min(count(input.awaitingVirtualIpCount ?? 0), expected),
      playersWithVirtualIp: Math.min(count(input.playersWithVirtualIpCount ?? expected), expected),
      unknown: Math.min(count(input.unknownPeerCount ?? Math.max(0, expected - reachable)), expected),
    },
    observedRelayRoutes: {
      status: !input.hasFreshPeerObservations
        ? "unknown"
        : relayCount > 0
          ? "observed"
          : "none_observed",
      count: relayCount,
    },
    // No independent relay test is performed by the desktop client today.
    relayReachabilityTest: "not_checked",
  };
}

export function serializeSafeDiagnostics(snapshot: ConnectionDiagnostics) {
  // Whitelist only the fields intended for support. In particular, never
  // serialize server addresses, member IDs, IPs, auth tokens, or network keys.
  const safe = {
    checkedAt: snapshot.checkedAt,
    backend: snapshot.backend,
    playerAuthorization: snapshot.playerAuthorization,
    easyTierProcess: snapshot.easyTierProcess,
    virtualIpAssigned: snapshot.virtualIpAssigned,
    playerPresence: snapshot.playerPresence,
    peerRoute: {
      status: snapshot.peerRoute.status,
      totalPlayers: count(snapshot.peerRoute.totalPlayers),
      reachable: count(snapshot.peerRoute.reachable),
      expected: count(snapshot.peerRoute.expected),
      awaitingVirtualIp: count(snapshot.peerRoute.awaitingVirtualIp),
      playersWithVirtualIp: count(snapshot.peerRoute.playersWithVirtualIp),
      unknown: count(snapshot.peerRoute.unknown),
    },
    observedRelayRoutes: {
      status: snapshot.observedRelayRoutes.status,
      count: count(snapshot.observedRelayRoutes.count),
    },
    relayReachabilityTest: snapshot.relayReachabilityTest,
  };
  return JSON.stringify(safe, null, 2);
}
