import { useEffect, useState, type FormEvent } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Activity, ArrowRight, Check, Copy, Gamepad2, Globe2, Link2, LogOut, Moon, Plus, Server, ShieldCheck, Sun, Users, Wifi, X } from 'lucide-react';
import './style.css';

type Lang = 'en' | 'fa';
type Account = { id: string; displayName: string; email: string };
type Member = { userId: string; username: string; role: string; status: string };
type Room = { roomId: string; name: string; accessToken: string; role: 'host' | 'member'; inviteCode?: string; members?: Member[]; status: string };
type Network = { networkName: string; networkSecret: string; peerUrl: string };
type EngineStatus = { running: boolean; virtualIp: string | null; state: 'stopped' | 'connecting' | 'tunnel_ready' | 'failed'; error: string | null };

const copy = {
  en: { headline: 'Far apart. One game room.', subtitle: 'Connect to your own server, invite friends, and play games that support LAN.', server: 'Your server address', serverHelp: 'The VPS owner gives you the HTTPS domain or IP and port.', check: 'Check server', apiReady: 'Server API reachable', create: 'Create room', join: 'Join with code', signIn: 'Sign in', signUp: 'Create account', email: 'Email', password: 'Password', name: 'Display name', roomName: 'Room name', invite: 'Invite code', players: 'Max players', save: 'Continue', cancel: 'Cancel', members: 'Members', leave: 'Leave room', close: 'Close room', copied: 'Copied', pending: 'Waiting for host approval', tunnel: 'Virtual LAN', empty: 'No active room', emptyDetail: 'Sign in, connect to your server, then create or join a room.', apiOnly: 'Server API is reachable. That does not confirm a game connection.', install: 'EasyTier needs to be bundled with the Windows installer and run with adapter permission.', connecting: 'Starting virtual adapter…', ready: 'Virtual adapter has an IP. Peer reachability is not yet verified.', unknown: 'Virtual LAN is not connected.', approve: 'Approve', reject: 'Reject', logout: 'Sign out' },
  fa: { headline: 'از هم دور، در یک روم.', subtitle: 'به سرور خودت وصل شو، دوست‌هایت را دعوت کن و بازی‌های دارای LAN را اجرا کن.', server: 'آدرس سرور خودت', serverHelp: 'صاحب VPS دامنه یا IP و پورت HTTPS را به تو می‌دهد.', check: 'بررسی سرور', apiReady: 'API سرور در دسترس است', create: 'ساخت روم', join: 'ورود با کد', signIn: 'ورود', signUp: 'ساخت حساب', email: 'ایمیل', password: 'رمز عبور', name: 'نام نمایشی', roomName: 'نام روم', invite: 'کد دعوت', players: 'حداکثر بازیکن', save: 'ادامه', cancel: 'انصراف', members: 'اعضا', leave: 'خروج از روم', close: 'بستن روم', copied: 'کپی شد', pending: 'در انتظار تأیید میزبان', tunnel: 'شبکهٔ مجازی', empty: 'هنوز رومی فعال نیست', emptyDetail: 'وارد حسابت شو، به سرور وصل شو و روم بساز یا با کد وارد شو.', apiOnly: 'API سرور پاسخ می‌دهد؛ این به معنی اتصال بازی نیست.', install: 'EasyTier باید همراه نصاب ویندوز باشد و اجازهٔ ساخت آداپتور داشته باشد.', connecting: 'در حال راه‌اندازی آداپتور…', ready: 'آداپتور IP گرفته است؛ دسترسی به همتا هنوز تأیید نشده.', unknown: 'شبکهٔ مجازی وصل نیست.', approve: 'تأیید', reject: 'رد', logout: 'خروج از حساب' },
};
function normalize(raw: string) {
  const url = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
  if (!url.hostname || url.username || url.password || url.hash || url.search || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('Use HTTPS for your server address. HTTP is only allowed on localhost.');
  return url.origin + url.pathname.replace(/\/+$/, '');
}
async function request<T>(server: string, path: string, token?: string, data?: unknown, method?: string): Promise<T> {
  const res = await fetch(`${server}${path}`, { method: method ?? (data ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error?.message ?? `Server returned ${res.status}`);
  return body as T;
}

export default function App() {
  const [lang, setLang] = useState<Lang>('en');
  const [theme, setTheme] = useState<'light'|'dark'>('light');
  const [serverInput, setServerInput] = useState(() => localStorage.getItem('lanora.desktopServer') ?? '');
  const [server, setServer] = useState('');
  const [apiState, setApiState] = useState<'idle'|'checking'|'ready'|'failed'>('idle');
  const [account, setAccount] = useState<Account | null>(null);
  const [accountToken, setAccountToken] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [tunnel, setTunnel] = useState<EngineStatus>({ running: false, virtualIp: null, state: 'stopped', error: null });
  const [mode, setMode] = useState<'login'|'register'|'create'|'join'|null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const t = copy[lang];
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.lang = lang; document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr'; }, [theme, lang]);
  useEffect(() => {
    if (!room || !server) return;
    let active = true;
    const refresh = async () => {
      try {
        const data = await request<{ members: Member[] }>(server, `/api/v1/rooms/${room.roomId}`, room.accessToken);
        if (active) setRoom(old => old ? { ...old, members: data.members } : null);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : String(e)); }
    };
    void refresh(); const id = window.setInterval(refresh, 5000);
    return () => { active = false; window.clearInterval(id); };
  }, [room?.roomId, room?.accessToken, server]);
  useEffect(() => {
    if (!room || room.status === 'pending' || !tunnel.running) return;
    let active = true;
    const refresh = async () => {
      try { const status = await invoke<EngineStatus>('engine_status'); if (active) setTunnel(status); }
      catch (e) { if (active) setError(String(e)); }
    };
    void refresh(); const id = window.setInterval(refresh, 3000);
    return () => { active = false; window.clearInterval(id); };
  }, [room?.roomId, room?.status, tunnel.running]);
  useEffect(() => {
    if (!room || room.status !== 'pending' || !server) return;
    let active = true;
    const poll = async () => {
      try {
        const membership = await request<{status: string}>(server, `/api/v1/rooms/${room.roomId}/membership`, room.accessToken);
        if (!active) return;
        if (membership.status === 'approved') {
          setRoom(old => old ? { ...old, status: 'approved' } : null);
          await startTunnel(room.roomId, room.accessToken);
        } else if (membership.status === 'rejected') { setRoom(null); setError('Host rejected the request.'); }
      } catch (e) { if (active) setError(String(e)); }
    };
    const id = window.setInterval(poll, 2500);
    return () => { active = false; window.clearInterval(id); };
  }, [room?.roomId, room?.status, server]);
  async function checkServer() {
    setError(''); setApiState('checking');
    try { const url = normalize(serverInput); await request(url, '/api/v1/health'); localStorage.setItem('lanora.desktopServer', url); setServer(url); setApiState('ready'); }
    catch (e) { setApiState('failed'); setError(String(e)); }
  }
  async function startTunnel(id: string, token: string) {
    try {
      const cfg = await request<Network>(server, `/api/v1/rooms/${id}/network`, token);
      await invoke('engine_start', { cfg });
      setTunnel({ running: true, virtualIp: null, state: 'connecting', error: null });
    } catch (e) { setTunnel({ running: false, virtualIp: null, state: 'failed', error: String(e) }); setError(String(e)); }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    const form = new FormData(e.currentTarget);
    try {
      if (!server) throw new Error('Check your server address first.');
      if (mode === 'login' || mode === 'register') {
        const data = await request<{accessToken:string;user:Account}>(server, `/api/v1/auth/${mode}`, undefined, { email: String(form.get('email')), password: String(form.get('password')), ...(mode === 'register' ? { displayName: String(form.get('displayName')) } : {}) });
        setAccount(data.user); setAccountToken(data.accessToken);
      } else if (mode === 'create') {
        if (!accountToken) throw new Error('Sign in first.');
        const data = await request<{roomId:string;accessToken:string;inviteCode:string;room:{name:string}}>(server, '/api/v1/rooms', accountToken, { name: String(form.get('roomName')), maxPlayers: Number(form.get('players')), visibility: 'private' });
        const next: Room = { roomId: data.roomId, name: data.room.name, accessToken: data.accessToken, inviteCode: data.inviteCode, role: 'host', status: 'approved' };
        setRoom(next); await startTunnel(next.roomId, next.accessToken);
      } else if (mode === 'join') {
        if (!accountToken) throw new Error('Sign in first.');
        const data = await request<{roomId:string;roomName:string;accessToken:string;status:string}>(server, '/api/v1/rooms/join', accountToken, { inviteCode: String(form.get('code')), password: String(form.get('password') || '') });
        setRoom({ roomId: data.roomId, name: data.roomName, accessToken: data.accessToken, role: 'member', status: data.status });
        if (data.status === 'approved') await startTunnel(data.roomId, data.accessToken);
      }
      setMode(null);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  async function leave() {
    if (!room) return;
    setBusy(true); setError('');
    try {
      await request(server, `/api/v1/rooms/${room.roomId}${room.role === 'host' ? '' : '/leave'}`, room.accessToken, undefined, room.role === 'host' ? 'DELETE' : 'POST');
      await invoke('engine_stop'); setRoom(null); setTunnel({ running: false, virtualIp: null, state: 'stopped', error: null });
    } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  async function approve(userId: string, approved: boolean) {
    if (!room) return;
    try { await request(server, `/api/v1/rooms/${room.roomId}/approve`, room.accessToken, { userId, approve: approved }); }
    catch (e) { setError(String(e)); }
  }
  return <div className="lanora-app" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
    <header className="app-header"><div className="app-brand"><span className="app-logo"><Wifi size={19}/></span><b>LANORA</b></div><div className="app-header-actions"><span className={`app-api ${apiState}`}>{apiState === 'ready' ? t.apiReady : apiState === 'checking' ? 'Checking…' : 'Server not checked'}</span><button className="app-icon" onClick={() => setLang(lang === 'en' ? 'fa' : 'en')} aria-label="Change language"><Globe2 size={17}/>{lang === 'en' ? 'EN' : 'فا'}</button><button className="app-icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Toggle theme">{theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>}</button></div></header>
    <main className="app-main"><section className="app-hero"><span className="app-eyebrow">SELF-HOSTED GAME NETWORK</span><h1>{t.headline}</h1><p>{t.subtitle}</p></section>
      <section className="app-server-card"><div className="app-section-title"><span className="app-card-icon"><Server size={19}/></span><div><h2>{t.server}</h2><p>{t.serverHelp}</p></div></div><div className="app-server-form"><input dir="ltr" aria-label="Server URL" value={serverInput} onChange={e => { setServerInput(e.target.value); setServer(''); setApiState('idle'); }} placeholder="https://your-domain.example:443"/><button className="app-button primary" onClick={() => void checkServer()} disabled={apiState === 'checking'}>{apiState === 'checking' ? 'Checking…' : t.check}<ArrowRight size={16}/></button></div>{apiState === 'ready' && <div className="app-hint"><ShieldCheck size={15}/>{t.apiOnly}</div>}</section>
      {apiState === 'ready' && !account && <section className="app-account"><div><h2>{t.signIn}</h2><p>{lang === 'en' ? 'Use an account on this server to create or join rooms.' : 'برای ساخت یا ورود به روم، در همین سرور حساب داشته باش.'}</p></div><div className="app-actions"><button className="app-button primary" onClick={() => setMode('login')}>{t.signIn}</button><button className="app-button secondary" onClick={() => setMode('register')}>{t.signUp}</button></div></section>}
      {account && <div className="app-player"><span>{account.displayName}</span><button onClick={() => { setAccount(null); setAccountToken(''); }} disabled={Boolean(room)} title={t.logout}><LogOut size={16}/></button></div>}
      {account && !room && <div className="app-actions big"><button className="app-button primary" onClick={() => setMode('create')}><Plus size={18}/>{t.create}</button><button className="app-button secondary" onClick={() => setMode('join')}><Link2 size={18}/>{t.join}</button></div>}
      {room ? <section className="app-room"><div className="app-room-top"><div><span className="app-eyebrow">ACTIVE ROOM</span><h2>{room.name}</h2></div><span className="app-room-state">{room.status === 'pending' ? t.pending : tunnel.state === 'tunnel_ready' ? t.ready : tunnel.state === 'connecting' ? t.connecting : t.unknown}</span></div>{room.inviteCode && <div className="app-invite"><span>{t.invite}</span><code dir="ltr">{room.inviteCode}</code><button className="app-icon" onClick={() => { void navigator.clipboard.writeText(room.inviteCode!); setNotice(t.copied); }} aria-label="Copy invite"><Copy size={16}/></button></div>}<div className="app-network"><div><Wifi size={18}/><span>{t.tunnel}</span></div><strong dir="ltr">{tunnel.virtualIp ?? '—'}</strong><small>{tunnel.state === 'tunnel_ready' ? 'Adapter IP reported by EasyTier' : 'No verified adapter IP'}</small></div><h3>{t.members} <span>{room.members?.length ?? '—'}</span></h3><div className="app-members">{room.members?.map(m => <div key={m.userId} className="app-member"><span className="app-avatar">{m.username.slice(0,1)}</span><b>{m.username}</b><small>{m.status === 'pending' ? t.pending : 'Room member · peer not verified'}</small>{room.role === 'host' && m.status === 'pending' && <><button onClick={() => void approve(m.userId, true)}>{t.approve}</button><button onClick={() => void approve(m.userId, false)}>{t.reject}</button></>}</div>)}</div><button className="app-button danger" disabled={busy} onClick={() => void leave()}>{room.role === 'host' ? t.close : t.leave}</button></section> : <section className="app-empty"><Gamepad2 size={26}/><h2>{t.empty}</h2><p>{t.emptyDetail}</p></section>}
      {error && <div className="app-error" role="alert"><Activity size={16}/>{error}</div>}{notice && <p className="app-notice">{notice}</p>}
    </main>
    {mode && <div className="app-overlay"><div className="app-dialog"><button className="app-dialog-close" onClick={() => setMode(null)} aria-label="Close"><X size={18}/></button><span className="app-eyebrow">LANORA</span><h2>{mode === 'login' ? t.signIn : mode === 'register' ? t.signUp : mode === 'create' ? t.create : t.join}</h2><form onSubmit={submit} className="app-form">{(mode === 'login' || mode === 'register') && <><label>{t.email}<input name="email" dir="ltr" type="email" autoComplete="email" required/></label><label>{t.password}<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={8} required/></label>{mode === 'register' && <label>{t.name}<input name="displayName" minLength={2} maxLength={32} required/></label>}</>}{mode === 'create' && <><label>{t.roomName}<input name="roomName" minLength={2} maxLength={64} required/></label><label>{t.players}<select name="players" defaultValue="8"><option>4</option><option>8</option><option>16</option><option>32</option></select></label></>}{mode === 'join' && <><label>{t.invite}<input dir="ltr" name="code" required placeholder="XXXXX-XXXXX"/></label><label>{t.password}<input name="password" type="password"/></label></>}<button className="app-button primary" disabled={busy} type="submit">{busy ? 'Please wait…' : t.save}<Check size={16}/></button></form>{error && <div className="app-error" role="alert">{error}</div>}</div></div>}
  </div>;
}
