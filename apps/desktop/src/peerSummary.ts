export type PeerCandidate = {
  virtualIp?: string;
  online?: boolean;
};

/** Summarize the expected route state without treating missing evidence as a failure. */
export function summarizePeerRoutes(
  players: PeerCandidate[],
  freshRouteIps: Set<string>,
  presenceFresh: boolean,
) {
  const expectedPlayers = presenceFresh
    ? players.filter((player) => player.online !== false)
    : players;
  const awaitingVirtualIp = expectedPlayers.filter((player) => !player.virtualIp).length;
  const playersWithVirtualIp = expectedPlayers.filter((player) => Boolean(player.virtualIp)).length;
  const reachable = expectedPlayers.filter(
    (player) => player.virtualIp && freshRouteIps.has(player.virtualIp),
  ).length;
  const unknown = Math.max(0, playersWithVirtualIp - reachable);
  const expected = expectedPlayers.length;
  const status = expected === 0
    ? "not_checked"
    : !presenceFresh
      ? "unknown"
      : awaitingVirtualIp === 0 && unknown === 0
        ? "pass"
        : reachable > 0
          ? "partial"
          : "unknown";

  return {
    totalOtherPlayers: players.length,
    expectedPlayers: expected,
    awaitingVirtualIp,
    playersWithVirtualIp,
    reachable,
    unknown,
    status,
  } as const;
}
