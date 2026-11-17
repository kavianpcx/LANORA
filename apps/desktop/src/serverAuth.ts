import { RequestError } from "./api.js";

export type PlayerAuthMode = "password_required" | "passwordless" | "legacy_password";

export function playerJoinCredentials(
  mode: PlayerAuthMode,
  credential: string,
): { password?: string; code?: string } {
  if (mode === "password_required") return { password: credential };
  if (mode === "legacy_password") return { code: credential.trim() };
  return {};
}

type ApiRequest = <T>(server: string, path: string) => Promise<T>;

export async function discoverPlayerAuth(
  server: string,
  request: ApiRequest,
): Promise<PlayerAuthMode> {
  try {
    const info = await request<{ playerAuth?: string }>(
      server,
      "/api/v1/connection-info",
    );
    if (info.playerAuth === "password_required" || info.playerAuth === "passwordless") {
      return info.playerAuth;
    }
    throw new RequestError("connection_info_invalid");
  } catch (error) {
    if (error instanceof RequestError && error.status === 404) {
      // Alpha 0.2.0-alpha.4 and earlier require the old shared access code.
      return "legacy_password";
    }
    throw error;
  }
}
