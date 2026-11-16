export class RequestError extends Error {
  constructor(
    public code: string,
    public status?: number,
  ) {
    super(code);
  }
}
export function normalize(raw: string) {
  try {
    const url = new URL(
      /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`,
    );
    const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    const ipv4Parts = hostname.split(".");
    const ipv4Loopback =
      ipv4Parts.length === 4 &&
      ipv4Parts[0] === "127" &&
      ipv4Parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
    const loopback =
      hostname === "localhost" || hostname === "::1" || ipv4Loopback;
    if (
      !url.hostname ||
      url.username ||
      url.password ||
      url.hash ||
      url.search ||
      url.pathname !== "/" ||
      (url.protocol !== "https:" &&
        !(url.protocol === "http:" && loopback))
    )
      throw new Error();
    return url.origin;
  } catch {
    throw new RequestError("address");
  }
}
export async function api<T>(
  server: string,
  path: string,
  token?: string,
  data?: unknown,
  method?: string,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(cancel, options.timeoutMs ?? 10000);
  try {
    const response = await fetch(server + path, {
      signal: controller.signal,
      method: method ?? (data ? "POST" : "GET"),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
    const body = await response.json().catch(() => {
      throw new RequestError("response", response.status);
    });
    if (!response.ok)
      throw new RequestError(body.error?.code || "http", response.status);
    return body as T;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError(
      options.signal?.aborted
        ? "cancelled"
        : controller.signal.aborted
          ? "timeout"
          : "network",
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
}
export function friendlyError(error: unknown, lang: "en" | "fa") {
  const code = error instanceof RequestError ? error.code : "native";
  const messages: Record<string, [string, string]> = {
    address: [
      "Use HTTPS for public servers. HTTP is allowed only for localhost.",
      "برای سرور عمومی HTTPS لازم است. HTTP فقط برای localhost مجاز است.",
    ],
    timeout: [
      "The server took too long to respond. Check VPS status and retry.",
      "پاسخ سرور بیش از حد طول کشید. وضعیت VPS را بررسی و دوباره تلاش کنید.",
    ],
    network: [
      "Couldn’t reach the server. Check the address, internet, VPS and HTTPS certificate.",
      "سرور در دسترس نیست. نشانی، اینترنت، VPS و گواهی HTTPS را بررسی کنید.",
    ],
    network_code_invalid: [
      "That access code does not match this server. Check it and try again.",
      "این کد دسترسی برای این سرور نیست. کد را بررسی و دوباره تلاش کنید.",
    ],
    shared_network_unconfigured: [
      "Shared access is not set up on this server yet. Ask its owner to run the latest server setup command.",
      "دسترسی شبکهٔ مشترک هنوز روی این سرور راه‌اندازی نشده است. از صاحب سرور بخواهید دستور راه‌اندازی جدید را اجرا کند.",
    ],
    relay_unconfigured: [
      "The server relay is not configured. Ask the server owner to check the VPS setup.",
      "رلهٔ سرور تنظیم نشده است. از صاحب سرور بخواهید تنظیم VPS را بررسی کند.",
    ],
    room_full: [
      "This room is full. Choose another room.",
      "روم پر است. روم دیگری انتخاب کنید.",
    ],
    invalid_password: ["The room password is incorrect.", "رمز روم درست نیست."],
    room_not_found: [
      "Room or invitation not found. Check the code.",
      "روم یا دعوت پیدا نشد. کد را بررسی کنید.",
    ],
    rate_limited: [
      "Too many attempts. Wait a minute and retry.",
      "تعداد تلاش‌ها زیاد است. یک دقیقه بعد دوباره تلاش کنید.",
    ],
    invalid_input: [
      "Check the name, invitation and room fields.",
      "نام، کد دعوت و فیلدهای روم را بررسی کنید.",
    ],
    password_invalid: ["The room password is incorrect.", "رمز روم درست نیست."],
    unauthorized: [
      "Your membership is no longer authorized. Rejoin the room.",
      "عضویت شما دیگر معتبر نیست. دوباره وارد روم شوید.",
    ],
    native: [
      "The network engine could not complete this action. Check installation and adapter permissions.",
      "موتور شبکه نتوانست این کار را انجام دهد. نصب و مجوز آداپتور را بررسی کنید.",
    ],
  };
  return (messages[code] || [
    "The server rejected this request. Check room permissions and server status.",
    "سرور درخواست را نپذیرفت. مجوز روم و وضعیت سرور را بررسی کنید.",
  ])[lang === "fa" ? 1 : 0];
}

export async function health(server: string, signal?: AbortSignal) {
  const result = await api<{ status: string; service: string }>(
    server,
    "/api/v1/health",
    undefined,
    undefined,
    undefined,
    { signal },
  );
  if (result.service !== "lanora-api" || result.status !== "ok")
    throw new RequestError("response");
}
