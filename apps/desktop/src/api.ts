export class RequestError extends Error {
  constructor(
    public code: string,
    public status?: number,
    public causeName?: string,
  ) {
    super(code);
  }
}

function isLoopbackHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const ipv4Parts = host.split(".");
  const ipv4Loopback =
    ipv4Parts.length === 4 &&
    ipv4Parts[0] === "127" &&
    ipv4Parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
  return host === "localhost" || host === "::1" || ipv4Loopback;
}

export function normalize(raw: string) {
  const input = raw.trim();
  if (!input) throw new RequestError("empty_address");

  const explicitScheme = input.match(/^([a-z][a-z0-9+.-]*):\/\//i)?.[1]?.toLowerCase();
  if (explicitScheme && explicitScheme !== "http" && explicitScheme !== "https")
    throw new RequestError("unsupported_protocol");

  try {
    // Use HTTP only for explicit development loopback addresses. Bare public
    // addresses remain HTTPS, and a non-loopback HTTP URL is rejected below.
    const inferred = explicitScheme ? null : new URL(`https://${input}`);
    const protocol = explicitScheme ?? (inferred && isLoopbackHost(inferred.hostname) ? "http" : "https");
    const url = new URL(explicitScheme ? input : `${protocol}://${input}`);
    const loopback = isLoopbackHost(url.hostname);
    if (
      !url.hostname ||
      url.username ||
      url.password ||
      url.hash ||
      url.search ||
      url.pathname !== "/"
    ) throw new RequestError("invalid_address");
    if (url.protocol !== "https:" && url.protocol !== "http:")
      throw new RequestError("unsupported_protocol");
    if (url.protocol === "http:" && !loopback)
      throw new RequestError("insecure_http");
    return url.origin;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError("invalid_address");
  }
}

function looksLikeTlsCertificateError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /ERR_CERT|CERTIFICATE|SSL_ERROR|TLS HANDSHAKE|CERT_AUTHORITY/i.test(message);
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
    const parsedServer = new URL(server);
    const requestOptions: RequestInit & { targetAddressSpace?: "loopback" } = {
      signal: controller.signal,
      method: method ?? (data ? "POST" : "GET"),
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    };
    if (parsedServer.protocol === "http:" && isLoopbackHost(parsedServer.hostname)) {
      requestOptions.targetAddressSpace = "loopback";
    }
    const response = await fetch(server + path, requestOptions);
    const body = await response.json().catch(() => {
      throw new RequestError("response", response.status);
    });
    if (!response.ok)
      throw new RequestError(body.error?.code || "http", response.status);
    return body as T;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    const code = options.signal?.aborted
      ? "cancelled"
      : controller.signal.aborted
        ? "timeout"
        : looksLikeTlsCertificateError(error)
          ? "tls_certificate"
          : "network";
    const causeName = error instanceof Error ? error.name : "UnknownError";
    throw new RequestError(code, undefined, causeName);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
}
export function friendlyError(error: unknown, lang: "en" | "fa") {
  const code = error instanceof RequestError ? error.code : "native";
  const messages: Record<string, [string, string]> = {
    empty_address: [
      "Enter a server address to continue.",
      "برای ادامه، نشانی سرور را وارد کنید.",
    ],
    invalid_address: [
      "That does not look like a valid server address. Check the host and port.",
      "این نشانی سرور معتبر به نظر نمی‌رسد. میزبان و درگاه را بررسی کنید.",
    ],
    unsupported_protocol: [
      "Use an HTTPS server address, or HTTP for localhost only.",
      "از نشانی HTTPS استفاده کنید؛ HTTP فقط برای localhost مجاز است.",
    ],
    insecure_http: [
      "Public servers must use HTTPS. Plain HTTP is allowed only for localhost.",
      "سرورهای عمومی باید HTTPS داشته باشند. HTTP ساده فقط برای localhost مجاز است.",
    ],
    address: [
      "Use HTTPS for public servers. HTTP is allowed only for localhost.",
      "برای سرور عمومی HTTPS لازم است. HTTP فقط برای localhost مجاز است.",
    ],
    timeout: [
      "The server took too long to respond. Check VPS status and retry.",
      "پاسخ سرور بیش از حد طول کشید. وضعیت VPS را بررسی و دوباره تلاش کنید.",
    ],
    network: [
      "Could not reach the server. Check the address, port, internet connection, and server status.",
      "سرور در دسترس نیست. نشانی، درگاه، اینترنت و وضعیت سرور را بررسی کنید.",
    ],
    tls_certificate: [
      "The server’s HTTPS certificate could not be validated. Check its certificate and system clock.",
      "گواهی HTTPS سرور تأیید نشد. گواهی و ساعت دستگاه را بررسی کنید.",
    ],
    response: [
      "This address did not return a valid LANORA API response. Check the server address, port, and version.",
      "این نشانی پاسخ معتبر API لانورا را برنگرداند. نشانی، درگاه و نسخهٔ سرور را بررسی کنید.",
    ],
    lanora_api_invalid: [
      "This server did not return a valid LANORA health response. Check the address and port.",
      "این سرور پاسخ سلامت معتبر لانورا را برنگرداند. نشانی و درگاه را بررسی کنید.",
    ],
    network_code_invalid: [
      "That server password or existing access code is incorrect. Check it and try again.",
      "رمز سرور یا کد دسترسی قبلی درست نیست. آن را بررسی و دوباره تلاش کنید.",
    ],
    network_password_invalid: [
      "The server password is incorrect. Check it and try again.",
      "رمز سرور درست نیست. آن را بررسی و دوباره تلاش کنید.",
    ],
    player_auth_unconfigured: [
      "Player access is not configured yet. Ask the server owner to finish setup.",
      "دسترسی بازیکنان هنوز تنظیم نشده است. از صاحب سرور بخواهید راه‌اندازی را کامل کند.",
    ],
    connection_info_invalid: [
      "The server returned invalid connection information. Update the server and try again.",
      "اطلاعات اتصال سرور معتبر نیست. سرور را به‌روزرسانی کنید و دوباره تلاش کنید.",
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
    throw new RequestError("lanora_api_invalid");
}
