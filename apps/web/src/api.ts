export type Account = { id: string; email: string; displayName: string; createdAt: string };
export type Member = { userId: string; username: string; role: string; status: string; joinedAt: string };
export type Room = {
  id?: string;
  roomId?: string;
  name: string;
  maxPlayers: number;
  visibility: 'private' | 'public';
  gameName?: string;
  requireApproval: boolean;
  acceptingMembers: boolean;
  createdAt?: string;
  members: Member[];
};
export type RoomSession = {
  id: string;
  name: string;
  accessToken: string;
  userId: string;
  role: 'host' | 'member';
  inviteCode?: string;
  status: string;
};
export type ApiProblem = Error & { status?: number; code?: string };

export function apiBase() {
  return (localStorage.getItem('lanora.apiBase') || '').trim().replace(/\/+$/, '');
}

export async function request<T>(path: string, token?: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error('ابتدا نشانی API سرور خودت را در تنظیمات وارد کن.');
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: options.method ?? (options.body ? 'POST' : 'GET'),
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch {
    throw new Error('اتصال به API ممکن نشد. نشانی سرور و اتصال اینترنت را بررسی کن.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const problem = new Error(data?.error?.message || `خطای سرور (${response.status})`) as ApiProblem;
    problem.status = response.status;
    problem.code = data?.error?.code;
    throw problem;
  }
  return data as T;
}

export async function healthCheck() {
  return request<{ status: string; service: string; time: string }>('/api/v1/health');
}
