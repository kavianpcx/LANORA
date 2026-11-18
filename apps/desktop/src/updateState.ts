export const PENDING_UPDATE_VERSION_KEY = "lanora.pendingUpdateVersion";

export type PendingUpdateResult =
  | { status: "installed"; version: string }
  | { status: "mismatch"; expectedVersion: string; actualVersion: string };

/** Only confirm an update after the relaunched app reports the exact target version. */
export function reconcilePendingUpdate(
  expectedVersion: string | null,
  actualVersion: string,
): PendingUpdateResult | null {
  if (!expectedVersion) return null;
  return expectedVersion === actualVersion
    ? { status: "installed", version: actualVersion }
    : { status: "mismatch", expectedVersion, actualVersion };
}

/** Return a bounded percentage only when the updater knows the total byte count. */
export function downloadPercent(received: number, total: number | null): number | null {
  if (total === null || !Number.isFinite(total) || total <= 0) return null;
  if (!Number.isFinite(received) || received <= 0) return 0;
  return Math.max(0, Math.min(100, Math.floor((received / total) * 100)));
}
