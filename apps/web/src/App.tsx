import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  Activity, ArrowLeft, ArrowRight, ArrowUpLeft, Check, ChevronDown,
  CircleHelp, Copy, Gamepad2, Globe2, Home, Link2, LoaderCircle, LogOut, Menu, Moon,
  Network, Plus, Radio, Settings2, Shield, ShieldCheck, Sun, Users, Wifi, X,
} from 'lucide-react';
import { apiBase, healthCheck, request, type Account, type Member, type Room } from './api';
import { usePreferences, useSession } from './state';

const devMessage = 'در حال توسعه؛ تونل LAN واقعی به کلاینت دسکتاپ ویندوز نیاز دارد.';

function App() {
  const theme = usePreferences((s) => s.theme);
  const token = useSession((s) => s.token);
  const clearAuth = useSession((s) => s.clearAuth);
  const setAuth = useSession((s) => s.setAuth);
  const [booting, setBooting] = useState(Boolean(token));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = 'fa';
    document.documentElement.dir = 'rtl';
  }, [theme]);

  useEffect(() => {
    if (!token) { setBooting(false); return; }
    let active = true;
    request<{ user: Account }>('/api/v1/auth/me', token)
      .then(({ user }) => { if (active) setAuth(token, user); })
      .catch(() => { if (active) clearAuth(); })
      .finally(() => { if (active) setBooting(false); });
    return () => { active = false; };
  }, [token, setAuth, clearAuth]);

  if (booting) return <div className="boot-screen"><LoaderCircle className="spin"/><span>در حال بررسی نشست حساب…</span></div>;

  return <Routes>
    <Route path="/" element={<Landing/>}/>
    <Route path="/login" element={<AuthPage/>}/>
    <Route path="/register" element={<AuthPage register/>}/>
    <Route path="/download" element={<DownloadPage/>}/>
    <Route element={<RequireAuth/>}>
      <Route path="/app" element={<AppShell/>}>
        <Route index element={<Dashboard/>}/>
        <Route path="create" element={<CreateRoomPage/>}/>
        <Route path="join" element={<JoinRoomPage/>}/>
        <Route path="rooms" element={<ActiveRoomsPage/>}/>
        <Route path="rooms/:roomId" element={<ActiveRoomPage/>}/>
        <Route path="members" element={<MembersPage/>}/>
        <Route path="status" element={<StatusPage/>}/>
        <Route path="settings" element={<SettingsPage/>}/>
      </Route>
    </Route>
    <Route path="*" element={<NotFound/>}/>
  </Routes>;
}

function RequireAuth() {
  const token = useSession((s) => s.token);
  const location = window.location.hash.replace(/^#/, '') || '/app';
  return token ? <Outlet/> : <AuthGate location={location}/>;
}

function AuthGate({ location }: { location: string }) {
  return <main className="auth-gate"><Brand/><div className="auth-card"><div className="eyebrow">ورود لازم است</div><h1>برای ادامه وارد حساب شو</h1><p>دسترسی حساب و وضعیت روم از API سرور خودت خوانده می‌شود.</p><div className="stack"><Link className="btn btn-primary" to={`/login?next=${encodeURIComponent(location)}`}>ورود به حساب <ArrowLeft size={16}/></Link><Link className="btn btn-soft" to="/register">ساخت حساب</Link></div><ApiHint/></div></main>;
}

function Landing() {
  const account = useSession((s) => s.account);
  const theme = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);
  return <div className="landing-page">
    <header className="landing-nav wrap"><Brand/><nav><a href="#features">امکانات</a><a href="#how">روش کار</a><Link to="/download">نسخهٔ دسکتاپ</Link></nav><div className="nav-actions"><button className="icon-button" aria-label="تغییر پوسته" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>}</button>{account ? <Link className="btn btn-primary btn-small" to="/app">ورود به داشبورد</Link> : <><Link className="nav-login" to="/login">ورود</Link><Link className="btn btn-primary btn-small" to="/register">شروع کار <ArrowLeft size={15}/></Link></>}</div></header>
    <main>
      <section className="hero wrap">
        <div className="hero-copy"><div className="eyebrow"><span className="pulse-dot"/> فضای بازی خصوصی و خودمیزبان</div><h1>دور از هم،<br/><em>توی یک شبکه.</em></h1><p>یک روم بساز، دوست‌هایت را دعوت کن و بازی‌های دارای LAN را از راه دور تجربه کن. شبکه و کنترل سرور دست خودت می‌ماند.</p><div className="hero-actions"><Link to={account ? '/app' : '/register'} className="btn btn-primary btn-large">{account ? 'رفتن به داشبورد' : 'ساخت حساب و شروع'} <ArrowLeft size={17}/></Link><Link to="/download" className="btn btn-quiet btn-large"><Gamepad2 size={18}/> دربارهٔ کلاینت ویندوز</Link></div><div className="hero-note"><ShieldCheck size={16}/> اتصال بازی فقط پس از راه‌اندازی واقعی تونل دسکتاپ ممکن می‌شود.</div></div>
        <ConnectionIllustration/>
        <div className="hero-index"><span>01</span><span className="index-line"/><span>شبکهٔ بازی، با کنترل خودت</span></div>
      </section>
      <section id="features" className="feature-section wrap"><div className="section-head"><div><div className="eyebrow">کنترل ساده، تجربهٔ شفاف</div><h2>برای بازی ساخته شده،<br/>با وضعیت واقعی شبکه.</h2></div><p>LANORA اتاق و عضویت را مدیریت می‌کند. مسیر بسته‌های بازی از API عبور نمی‌کند و وضعیت تونل فقط از موتور شبکه خوانده می‌شود.</p></div><div className="feature-grid"><Feature icon={<Users/>} number="01" title="روم خصوصی" text="کد دعوت امن، ظرفیت مشخص و امکان تأیید دستی اعضا."/><Feature icon={<Network/>} number="02" title="مدیریت سرور" text="API و پایگاه‌داده روی سرور خودت اجرا می‌شوند."/><Feature icon={<Activity/>} number="03" title="شفافیت وضعیت" text="تا پیش از تکمیل موتور ویندوز، IP و اتصال LAN ساختگی نشان داده نمی‌شود."/></div></section>
      <section id="how" className="how-section"><div className="wrap how-inner"><div><div className="eyebrow">سرور یک‌بار، کلاینت برای هر بازیکن</div><h2>از نصب تا بازی</h2><p>مدیر سرور، سرویس LANORA را روی VPS لینوکس راه‌اندازی می‌کند. هر بازیکن در برنامهٔ ویندوز آدرس همان سرور را وارد می‌کند؛ سپس API روم‌ها را مدیریت می‌کند و موتور شبکه ترافیک بازی را جداگانه می‌فرستد.</p></div><div className="steps"><Step n="01" title="سرور را روی VPS اجرا کن" text="Docker Compose و دامنه یا IP عمومی؛ SSH فقط برای راه‌اندازی مدیر سرور است."/><Step n="02" title="کلاینت را به نشانی سرور وصل کن" text="در برنامه آدرس HTTPS و پورت سرور را وارد و سلامت API را بررسی کن."/><Step n="03" title="روم بساز و کد را بفرست" text="دوستت با همان سرور و کد دعوت وارد روم می‌شود."/><Step n="04" title="تونل بازی را برقرار کن" text="کلاینت ویندوز باید موتور EasyTier را اجرا کند؛ این یکپارچه‌سازی هنوز در حال توسعه است."/></div></div></section>
      <section className="cta-section wrap"><div className="cta-card"><div><span className="eyebrow">LANORA · نسخهٔ توسعه</span><h2>فضای خودت را راه بینداز.</h2><p>حساب کاربری به API خودمیزبان وصل می‌شود. API Base URL در تنظیمات قابل تغییر است.</p></div><Link className="btn btn-primary btn-large" to={account?'/app':'/register'}>{account?'رفتن به داشبورد':'ساخت حساب'} <ArrowLeft size={16}/></Link><div className="cta-mark"><Radio size={84}/></div></div></section>
    </main><Footer/>
  </div>;
}

function ConnectionIllustration() {
  return <div className="illustration" aria-label="تصویر مفهومی ارتباط چند بازیکن"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="orbit orbit-c"/><svg className="orbit-lines" viewBox="0 0 500 420" aria-hidden="true"><path d="M250 205 120 100M250 205 385 105M250 205 390 315M250 205 110 320"/><path d="M120 100 385 105" className="line-dash"/></svg><div className="node node-main"><div className="node-symbol"><Gamepad2/></div><span>LANORA</span></div><div className="node node-one"><span className="node-avatar">A</span><b>Host</b><small>روم خصوصی</small></div><div className="node node-two"><span className="node-avatar lime">B</span><b>Player 02</b><small>دعوت‌شده</small></div><div className="node node-three"><span className="node-avatar rose">C</span><b>Player 03</b><small>در انتظار</small></div><div className="node node-four"><span className="node-avatar teal">D</span><b>Player 04</b><small>عضو روم</small></div><div className="float-chip chip-top"><span className="tiny-status"/>شبکهٔ کنترل</div><div className="float-chip chip-bottom"><Shield size={15}/> دادهٔ بازی مستقیم</div></div>;
}

function Feature({ icon, number, title, text }: { icon: ReactNode; number: string; title: string; text: string }) {
  return <article className="feature-card"><div className="feature-top"><span className="feature-icon">{icon}</span><span>{number}</span></div><h3>{title}</h3><p>{text}</p></article>;
}
function Step({ n, title, text }: { n: string; title: string; text: string }) { return <div className="step"><span>{n}</span><div><b>{title}</b><p>{text}</p></div></div>; }

function Brand({ compact = false }: { compact?: boolean }) { return <Link className={`brand ${compact ? 'brand-compact' : ''}`} to="/"><span className="brand-mark"><Wifi size={18}/></span><span className="brand-word">LANORA</span></Link>; }
function Footer() { return <footer className="site-footer"><div className="wrap footer-inner"><Brand compact/><span>ساخته‌شده برای دورهمی‌های دور</span><div><Link to="/download">دانلود</Link><Link to="/login">ورود</Link><a href="https://github.com/kavianpcx/lanora" target="_blank" rel="noreferrer">GitHub <ArrowUpLeft size={13}/></a></div></div></footer>; }

function AuthPage({ register = false }: { register?: boolean }) {
  const navigate = useNavigate();
  const setAuth = useSession((s) => s.setAuth);
  const token = useSession((s) => s.token);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [server, setServer] = useState(apiBase());
  const [saved, setSaved] = useState(Boolean(apiBase()));
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true);
    const normalized = server.trim().replace(/\/+$/, '');
    if (!normalized || !/^https?:\/\//i.test(normalized)) { setBusy(false); setError('نشانی API باید با https:// شروع شود (برای توسعه localhost می‌تواند http باشد).'); return; }
    localStorage.setItem('lanora.apiBase', normalized); setSaved(true);
    try {
      const result = await request<{ accessToken: string; user: Account }>(`/api/v1/auth/${register ? 'register' : 'login'}`, undefined, { body: register ? form : { email: form.email, password: form.password } });
      setAuth(result.accessToken, result.user);
      navigate('/app', { replace: true });
    } catch (e) { setError(e instanceof Error ? e.message : 'ارتباط با سرور برقرار نشد.'); }
    finally { setBusy(false); }
  };
  if (token) return <NavigateToDashboard/>;
  return <div className="auth-page"><header className="auth-header wrap"><Brand/><Link className="nav-login" to="/">بازگشت به صفحهٔ اصلی</Link></header><main className="auth-layout wrap"><section className="auth-story"><div className="eyebrow"><span className="pulse-dot"/> کنترل روم‌ها روی سرور خودت</div><h1>{register?'یک حساب بساز،':'خوش برگشتی،'}<br/><em>بازی رو شروع کن.</em></h1><p>این فرم به API واقعی LANORA وصل می‌شود. سرور، حساب و نشست را بررسی می‌کند؛ این نسخه هنوز تونل بازی ایجاد نمی‌کند.</p><div className="auth-story-note"><ShieldCheck size={18}/><span>توکن نشست فقط در حافظهٔ نشست همین مرورگر نگه‌داری می‌شود.</span></div><ConnectionIllustration/></section><section className="auth-card"><div className="auth-card-head"><span className="eyebrow">{register?'حساب تازه':'ورود امن'}</span><h2>{register?'ثبت‌نام در LANORA':'ورود به LANORA'}</h2><p>برای ادامه، نشانی API خودمیزبان را وارد کن.</p></div><form className="form-stack" onSubmit={submit}>
    <label className="field"><span>نشانی API سرور</span><input dir="ltr" type="url" value={server} onChange={(e)=>setServer(e.target.value)} placeholder="https://lanora.example.com" required/><small>{saved?'ذخیره شده در همین مرورگر':'API URL فقط در همین مرورگر ذخیره می‌شود.'}</small></label>
    {register&&<label className="field"><span>نام نمایشی</span><input value={form.displayName} onChange={(e)=>setForm({...form,displayName:e.target.value})} minLength={2} maxLength={32} required placeholder="اسمی که دوستان می‌بینند"/></label>}
    <label className="field"><span>ایمیل</span><input dir="ltr" type="email" autoComplete="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} required placeholder="you@example.com"/></label>
    <label className="field"><span>رمز عبور</span><input type="password" autoComplete={register?'new-password':'current-password'} value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} minLength={register?10:1} maxLength={128} required placeholder={register?'حداقل ۱۰ نویسه':'رمز عبورت'}/></label>
    {error&&<div className="error-box" role="alert">{error}</div>}
    <button className="btn btn-primary btn-wide" disabled={busy}>{busy?<><LoaderCircle size={17} className="spin"/> در حال بررسی…</>:register?'ساخت حساب':'ورود به حساب'} {!busy&&<ArrowLeft size={16}/>}</button>
  </form><div className="auth-switch">{register?'حساب داری؟':'حساب نداری؟'} <Link to={register?'/login':'/register'}>{register?'وارد شو':'ثبت‌نام کن'}</Link></div><ApiHint/></section></main></div>;
}

function NavigateToDashboard() { return <main className="auth-gate"><div className="auth-card"><h2>وارد حساب شده‌ای.</h2><Link to="/app" className="btn btn-primary">رفتن به داشبورد</Link></div></main>; }

function ApiHint() { return <p className="api-hint"><CircleHelp size={14}/> API نمونه در حال حاضر اجرا نشده باشد، ورود و ساخت روم انجام نمی‌شود.</p>; }

function AppShell() {
  const account = useSession((s) => s.account);
  const clearAuth = useSession((s) => s.clearAuth);
  const room = useSession((s) => s.room);
  const theme = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const navigate = useNavigate();
  const signOut = async () => {
    const token = useSession.getState().token;
    if (token) { try { await request('/api/v1/auth/logout', token, { method: 'POST' }); } catch { setLogoutError('خروج روی سرور تأیید نشد؛ نشست محلی پاک شد.'); } }
    clearAuth(); navigate('/', { replace: true });
  };
  const nav = [
    { to: '/app', label: 'خانه', icon: <Home size={17}/>, end: true },
    { to: '/app/rooms', label: 'روم‌های فعال', icon: <Gamepad2 size={17}/> },
    { to: '/app/members', label: 'اعضای روم', icon: <Users size={17}/> },
    { to: '/app/status', label: 'وضعیت اتصال', icon: <Activity size={17}/> },
    { to: '/app/settings', label: 'تنظیمات', icon: <Settings2 size={17}/> },
  ];
  let serverLabel='تنظیم نشده';try{if(apiBase())serverLabel=new URL(apiBase()).host}catch{serverLabel='نشانی نامعتبر'}
  return <div className="app-shell"><aside className={`app-sidebar ${mobileOpen?'mobile-open':''}`}><div className="side-brand"><Brand compact/><button className="icon-button mobile-close" onClick={()=>setMobileOpen(false)}><X size={17}/></button></div><div className="server-pill"><span className="status-dot"/><div><small>سرور کنترل</small><b>{serverLabel}</b></div><ChevronDown size={14}/></div><nav className="side-nav">{nav.map((item)=><NavLink key={item.to} to={item.to} end={item.end} onClick={()=>setMobileOpen(false)} className={({isActive})=>`side-link ${isActive?'active':''}`}>{item.icon}<span>{item.label}</span>{item.to==='/app/rooms'&&room&&<i/>}</NavLink>)}</nav><div className="sidebar-bottom"><div className="user-tile"><span className="user-avatar">{account?.displayName.slice(0,1)||'L'}</span><div><b>{account?.displayName}</b><small>{account?.email}</small></div></div><button className="side-link signout" onClick={signOut}><LogOut size={17}/><span>خروج از حساب</span></button></div></aside><div className="main-column"><header className="app-topbar"><button className="icon-button mobile-menu" onClick={()=>setMobileOpen(true)}><Menu size={19}/></button><div className="breadcrumb">LANORA <span>/</span> فضای بازی</div><div className="top-controls"><button className="icon-button" title={theme==='light'?'پوستهٔ تیره':'پوستهٔ روشن'} onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?<Moon size={17}/>:<Sun size={17}/>}</button><span className="top-avatar">{account?.displayName.slice(0,1)}</span></div></header>{logoutError&&<div className="global-notice">{logoutError}</div>}<main className="app-content"><Outlet/></main></div></div>;
}

function PageTitle({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children?: ReactNode }) {
  return <div className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description&&<p>{description}</p>}</div>{children&&<div className="page-title-actions">{children}</div>}</div>;
}

function Dashboard() {
  const account = useSession((s) => s.account);
  const room = useSession((s) => s.room);
  return <><PageTitle eyebrow="داشبورد" title={`سلام ${account?.displayName}،`} description="روم‌ها را مدیریت کن و وضعیت سرور شخصی‌ات را ببین."><Link to="/app/create" className="btn btn-primary"><Plus size={16}/> ساخت روم</Link></PageTitle><div className="dashboard-hero"><div><span className="eyebrow"><span className="pulse-dot"/> شبکهٔ بازی خصوصی</span><h2>دوست‌ها نزدیک‌تر از<br/>یک کد دعوت‌اند.</h2><p>یک روم بساز یا با کد وارد شو. برای انتقال ترافیک بازی، به کلاینت ویندوز نیاز است.</p><div className="hero-actions"><Link className="btn btn-primary" to="/app/create"><Plus size={16}/> ساخت روم جدید</Link><Link className="btn btn-white" to="/app/join"><Link2 size={16}/> ورود با کد</Link></div></div><div className="dashboard-art"><ConnectionIllustration/></div></div><div className="section-row"><div><span className="eyebrow">فضای تو</span><h2>روم فعال</h2></div><Link className="text-link" to="/app/rooms">مشاهدهٔ همه <ArrowLeft size={15}/></Link></div>{room?<ActiveRoomSummary room={room}/>:<EmptyRoom/>}<div className="dashboard-bottom"><div className="info-card"><div className="info-icon blue"><Activity/></div><span className="eyebrow">API CONTROL PLANE</span><h3>مدیریت روم آمادهٔ اتصال است</h3><p>وضعیت تونل، IP مجازی و ping تا وقتی موتور دسکتاپ راه‌اندازی نشده، در دسترس نیست.</p><Link className="text-link" to="/app/status">بررسی وضعیت <ArrowLeft size={14}/></Link></div><div className="info-card"><div className="info-icon lime"><ShieldCheck/></div><span className="eyebrow">SELF-HOSTED</span><h3>سرور در کنترل تو</h3><p>API Base URL را از تنظیمات وارد کن. داده‌های حساب و روم به همان API ارسال می‌شوند.</p><Link className="text-link" to="/app/settings">تنظیم سرور <ArrowLeft size={14}/></Link></div></div></>;
}

function EmptyRoom() { return <div className="empty-room"><div className="empty-game-icon"><Gamepad2 size={25}/></div><div><h3>هنوز روم فعالی نداری</h3><p>با ساخت روم دعوت را بگیر یا کد دوستت را وارد کن.</p></div><div className="empty-actions"><Link className="btn btn-primary btn-small" to="/app/create">ساخت روم <Plus size={15}/></Link><Link className="btn btn-soft btn-small" to="/app/join">ورود با کد <ArrowLeft size={15}/></Link></div></div>; }

function ActiveRoomSummary({ room }: { room: { id:string; name:string; role:string; inviteCode?:string } }) { return <div className="active-summary"><span className="room-symbol"><Wifi size={20}/></span><div><h3>{room.name}</h3><p>روم کنترل‌پلین فعال · تونل شبکه در حال توسعه</p></div><span className="dev-pill">DEVELOPMENT</span><Link to={`/app/rooms/${room.id}`} className="btn btn-soft btn-small">مدیریت روم <ArrowLeft size={15}/></Link></div>; }

function CreateRoomPage() {
  const account = useSession((s) => s.account);
  const token = useSession((s) => s.token);
  const setRoom = useSession((s) => s.setRoom);
  const navigate = useNavigate();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name:'', password:'', maxPlayers:'8', visibility:'private', gameName:'', requireApproval:false });
  const submit = async (e:FormEvent) => { e.preventDefault(); setBusy(true);setError('');try{const res=await request<any>('/api/v1/rooms',token??undefined,{body:{name:form.name,username:account?.displayName,password:form.password,maxPlayers:Number(form.maxPlayers),visibility:form.visibility,gameName:form.gameName,requireApproval:form.requireApproval}});setRoom({id:res.roomId,name:form.name,accessToken:res.accessToken,userId:res.userId,role:'host',inviteCode:res.inviteCode,status:'created'});navigate(`/app/rooms/${res.roomId}`)}catch(err){setError(err instanceof Error?err.message:'ساخت روم انجام نشد.')}finally{setBusy(false)}};
  return <><PageTitle eyebrow="روم تازه" title="ساخت روم" description="تنظیمات کوتاه را انتخاب کن. کلید شبکه در رابط وب نمایش داده نمی‌شود."/><div className="form-card"><form className="form-grid" onSubmit={submit}><label className="field span-two"><span>نام روم</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required minLength={2} maxLength={64} placeholder="مثلاً دورهمی جمعه"/></label><label className="field"><span>نام بازی (اختیاری)</span><input value={form.gameName} onChange={e=>setForm({...form,gameName:e.target.value})} maxLength={64} placeholder="مثلاً Age of Empires"/></label><label className="field"><span>حداکثر بازیکن</span><select value={form.maxPlayers} onChange={e=>setForm({...form,maxPlayers:e.target.value})}><option value="2">۲ بازیکن</option><option value="4">۴ بازیکن</option><option value="8">۸ بازیکن</option><option value="16">۱۶ بازیکن</option><option value="32">۳۲ بازیکن</option></select></label><label className="field"><span>نمایش روم</span><select value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value})}><option value="private">خصوصی · فقط با کد</option><option value="public">عمومی · فهرست عمومی در حال توسعه</option></select></label><label className="field"><span>رمز عبور (اختیاری)</span><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} maxLength={128} placeholder="برای روم یک رمز انتخاب کن"/></label><label className="field span-two check-field"><input type="checkbox" checked={form.requireApproval} onChange={e=>setForm({...form,requireApproval:e.target.checked})}/><span><b>تأیید میزبان لازم باشد</b><small>اعضا تا تأیید تو در حالت انتظار می‌مانند.</small></span></label>{error&&<div className="error-box span-two">{error}</div>}<div className="form-footer span-two"><p><Shield size={15}/> هر عضو پس از پیوستن یک توکن جداگانه برای مدیریت روم می‌گیرد.</p><button className="btn btn-primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:<Plus size={16}/>} ساخت روم</button></div></form></div></>;
}

function JoinRoomPage() {
  const token=useSession((s)=>s.token);const setRoom=useSession((s)=>s.setRoom);const navigate=useNavigate();const [code,setCode]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{const res=await request<any>('/api/v1/rooms/join',token??undefined,{body:{inviteCode:code.trim(),password,username:useSession.getState().account?.displayName}});setRoom({id:res.roomId,name:res.roomName||'روم بازی',accessToken:res.accessToken,userId:res.userId,role:'member',status:res.status});navigate(`/app/rooms/${res.roomId}`)}catch(err){setError(err instanceof Error?err.message:'پیوستن انجام نشد.')}finally{setBusy(false)}};
  return <><PageTitle eyebrow="ورود به شبکه" title="با کد دعوت وارد شو" description="کدی را که میزبان فرستاده وارد کن. اگر روم رمز داشته باشد، رمز را هم لازم داری."/><div className="form-card join-card"><div className="join-icon"><Link2 size={22}/></div><form className="form-stack" onSubmit={submit}><label className="field"><span>کد دعوت</span><input className="invite-input" dir="ltr" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} required maxLength={32} autoCapitalize="characters" placeholder="ABCDE-FGHIJ"/></label><label className="field"><span>رمز روم (در صورت نیاز)</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} maxLength={128} placeholder="رمز عبور روم"/></label>{error&&<div className="error-box">{error}</div>}<button className="btn btn-primary btn-wide" disabled={busy}>{busy?<LoaderCircle size={17} className="spin"/>:'ورود به روم'} <ArrowLeft size={16}/></button></form></div></>;
}

function ActiveRoomsPage() {
  const room=useSession((s)=>s.room);
  return <><PageTitle eyebrow="اتاق‌ها" title="روم‌های فعال" description="این فهرست، روم ذخیره‌شده در همین نشست مرورگر را نشان می‌دهد."/><div className="section-actions"><Link to="/app/create" className="btn btn-primary btn-small"><Plus size={15}/> ساخت روم</Link><Link to="/app/join" className="btn btn-soft btn-small"><Link2 size={15}/> ورود با کد</Link></div>{room?<ActiveRoomSummary room={room}/>:<EmptyRoom/>}<DevelopmentNotice text="فهرست عمومی و تاریخچهٔ چند دستگاه هنوز در API پیاده‌سازی نشده‌اند."/></>;
}

function ActiveRoomPage() {
  const {roomId=''}=useParams();const session=useSession((s)=>s.room);const setRoom=useSession((s)=>s.setRoom);const [room,setData]=useState<Room|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const refresh=async()=>{if(!session||session.id!==roomId)return;try{if(session.status==='pending'){const membership=await request<{status:string}>(`/api/v1/rooms/${roomId}/membership`,session.accessToken);setLoading(false);if(membership.status==='approved'){setRoom({...session,status:'approved'});const result=await request<Room>(`/api/v1/rooms/${roomId}`,session.accessToken);setData(result);setError('')}else if(membership.status==='rejected'){setError('میزبان درخواست ورود را رد کرد.');setRoom(null)}return}const result=await request<Room>(`/api/v1/rooms/${roomId}`,session.accessToken);setData(result);setError('')}catch(e){setError(e instanceof Error?e.message:'وضعیت روم دریافت نشد.')}finally{setLoading(false)}};
  useEffect(()=>{void refresh();const id=window.setInterval(()=>void refresh(),session?.status==='pending'?2500:5000);return()=>window.clearInterval(id)},[roomId,session?.accessToken,session?.status]);
  const approve=async(userId:string,ok:boolean)=>{if(!session)return;try{await request(`/api/v1/rooms/${roomId}/approve`,session.accessToken,{body:{userId,approve:ok}});setNotice(ok?'درخواست عضو تأیید شد.':'درخواست رد شد.');await refresh()}catch(e){setError(e instanceof Error?e.message:'بررسی درخواست انجام نشد.')}};
  const leave=async()=>{if(!session)return;try{await request(session.role==='host'?`/api/v1/rooms/${roomId}`:`/api/v1/rooms/${roomId}/leave`,session.accessToken,{method:session.role==='host'?'DELETE':'POST'});setRoom(null);window.location.hash='#/app/rooms'}catch(e){setError(e instanceof Error?e.message:'خروج از روم انجام نشد.')}};
  const rotate=async()=>{if(!session)return;try{const result=await request<{inviteCode:string}>(`/api/v1/rooms/${roomId}/invite/rotate`,session.accessToken,{method:'POST'});setRoom({...session,inviteCode:result.inviteCode});setNotice('کد دعوت جدید شد.')}catch(e){setError(e instanceof Error?e.message:'تعویض کد انجام نشد.')}};
  if(!session||session.id!==roomId)return <><PageTitle eyebrow="روم" title="این روم در نشست مرورگر نیست" description="برای مشاهدهٔ روم، با کد دعوت دوباره وارد شو."/><Link to="/app/join" className="btn btn-primary">ورود با کد <ArrowLeft size={16}/></Link></>;
  return <><PageTitle eyebrow="اتاق فعال" title={room?.name||session.name} description="مدیریت اعضا از API واقعی انجام می‌شود؛ وضعیت تونل هنوز توسعه‌ای است."><button onClick={leave} className="btn btn-danger">{session.role==='host'?'بستن روم':'خروج از روم'}</button></PageTitle>{session.status==='pending'&&<div className="development-notice"><span className="notice-icon"><LoaderCircle size={15} className="spin"/></span><div><b>درخواست عضویت در انتظار میزبان است</b><p>پس از تأیید، وضعیت عضویت از API دوباره بررسی می‌شود.</p></div></div>}{loading&&<div className="loading-card"><LoaderCircle className="spin"/> در حال دریافت اعضای روم…</div>}{error&&<div className="error-box">{error}</div>}{notice&&<div className="success-box"><Check size={15}/>{notice}</div>}<div className="room-overview"><div className="overview-copy"><span className="dev-pill">CONTROL PLANE ACTIVE</span><h2>{room?.name||session.name}</h2><p>{room?.gameName||'بازی مشخص نشده'}</p>{session.inviteCode&&<div className="invite-code"><span>کد دعوت</span><code dir="ltr">{session.inviteCode}</code><button className="icon-button" aria-label="کپی کد" onClick={()=>void navigator.clipboard?.writeText(session.inviteCode!)}><Copy size={16}/></button></div>}<div className="room-actions">{session.role==='host'&&<button className="btn btn-soft btn-small" onClick={rotate}>تعویض کد دعوت <Activity size={14}/></button>}<Link to="/app/members" className="btn btn-soft btn-small">فهرست اعضا <Users size={14}/></Link></div></div><div className="connection-orbit"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="orbit-center"><Gamepad2/></div><span className="orbit-point point-a">{room?.members?.[0]?.username.slice(0,1)||'?'}</span><span className="orbit-point point-b">LAN</span><span className="orbit-caption">نمایش گرافیکی تونل<br/>در حال توسعه</span></div></div><div className="status-grid"><StatusMetric label="تونل LAN" value="Development" tone="amber"/><StatusMetric label="IP مجازی" value="نامشخص"/><StatusMetric label="Ping" value="نامشخص"/><StatusMetric label="اعضا" value={`${room?.members?.length??'—'} نفر`}/></div><DevelopmentNotice text={devMessage}/><MemberList members={room?.members||[]} isHost={session.role==='host'} onReview={approve}/></>;
}

function MembersPage() {
  const room=useSession((s)=>s.room);const [members,setMembers]=useState<Member[]>([]);const [error,setError]=useState('');
  useEffect(()=>{if(!room)return;request<Room>(`/api/v1/rooms/${room.id}`,room.accessToken).then((data)=>setMembers(data.members)).catch((e)=>setError(e.message))},[room?.id,room?.accessToken]);
  if(!room)return <><PageTitle eyebrow="اعضا" title="رومی انتخاب نشده" description="اول با کد دعوت وارد روم شو یا یک روم جدید بساز."/><Link to="/app/join" className="btn btn-primary">ورود به روم <ArrowLeft size={16}/></Link></>;
  return <><PageTitle eyebrow="اعضای روم" title="اعضای آنلاین" description="وضعیت عضویت از API خوانده می‌شود؛ وضعیت شبکهٔ هر همتا در حال توسعه است."/><div className="member-list-card"><MemberList members={members} isHost={room.role==='host'} onReview={async(userId,approve)=>{try{await request(`/api/v1/rooms/${room.id}/approve`,room.accessToken,{body:{userId,approve}});const updated=await request<Room>(`/api/v1/rooms/${room.id}`,room.accessToken);setMembers(updated.members)}catch(e){setError((e as Error).message)}}} onKick={async(userId)=>{try{await request(`/api/v1/rooms/${room.id}/members/${userId}/kick`,room.accessToken,{method:'POST'});setMembers(members.filter((m)=>m.userId!==userId))}catch(e){setError((e as Error).message)}}}/></div>{error&&<div className="error-box">{error}</div>}</>;
}

function MemberList({ members, isHost, onReview, onKick }: { members:Member[];isHost:boolean;onReview:(id:string,approve:boolean)=>void;onKick?:(id:string)=>void }) {
  if(!members.length)return <div className="empty-room"><Users size={22}/><div><h3>هنوز عضوی در فهرست نیست</h3><p>بعد از ورود عضو، اطلاعات از سرور نمایش داده می‌شود.</p></div></div>;
  return <div className="member-list-card"><div className="member-list-head"><div><span className="eyebrow">ROOM MEMBERS</span><h2>اعضا <small>{members.length}</small></h2></div><span className="member-head-dev">وضعیت تونل: Development</span></div>{members.map((member)=><div className="member-row" key={member.userId}><span className="member-avatar">{member.username.slice(0,1).toUpperCase()}</span><div className="member-identity"><b>{member.username}{member.role==='host'&&<span className="host-badge">میزبان</span>}</b><small dir="ltr">IP: —</small></div><span className={`member-status ${member.status==='approved'?'online':''}`}>{member.status==='approved'?'عضو تأییدشده':'در انتظار تأیید'}</span><span className="member-ping">Ping · نامشخص</span>{isHost&&member.role!=='host'&&member.status==='pending'&&<div className="member-actions"><button onClick={()=>onReview(member.userId,true)} aria-label="تأیید" className="member-approve"><Check size={15}/></button><button onClick={()=>onReview(member.userId,false)} aria-label="رد" className="member-reject"><X size={15}/></button></div>}{isHost&&member.role!=='host'&&member.status==='approved'&&onKick&&<button onClick={()=>onKick(member.userId)} className="text-button">خارج‌کردن</button>}</div>)}</div>;
}

function StatusMetric({ label, value, tone }: { label:string;value:string;tone?:string }) { return <div className="status-metric"><span>{label}</span><b className={tone||''}>{value}</b></div>; }
function DevelopmentNotice({ text = devMessage }: { text?:string }) { return <div className="development-notice"><span className="notice-icon"><CircleHelp size={16}/></span><div><b>وضعیت شبکه: Development</b><p>{text}</p></div></div>; }

function StatusPage() {
  const [apiStatus,setApiStatus]=useState<'unknown'|'loading'|'ok'|'failed'>('unknown');const [apiTime,setApiTime]=useState('');const [error,setError]=useState('');
  const check=async()=>{setApiStatus('loading');setError('');try{const value=await healthCheck();setApiStatus(value.status==='ok'?'ok':'failed');setApiTime(value.time)}catch(e){setApiStatus('failed');setError(e instanceof Error?e.message:'سرور در دسترس نیست.')}};
  useEffect(()=>{void check()},[]);
  const rows=[['دسترسی Backend',apiStatus==='ok'?'در دسترس':apiStatus==='failed'?'قطع':'در حال بررسی'],['موتور EasyTier','Development'],['آداپتور مجازی','راه‌اندازی نشده'],['IP مجازی','نامشخص'],['دسترسی همتاها','قابل اندازه‌گیری نیست'],['Ping و Packet Loss','قابل اندازه‌گیری نیست'],['مسیر P2P یا Relay','Development']];
  return <><PageTitle eyebrow="عیب‌یابی" title="وضعیت اتصال" description="هر مقدار فقط از سرور یا موتور واقعی خوانده می‌شود."><button onClick={()=>void check()} className="btn btn-soft btn-small"><Activity size={15}/> بررسی دوباره</button></PageTitle><div className="diagnostic-card"><div className="diagnostic-head"><div className={`diagnostic-orb ${apiStatus}`}><Wifi/></div><div><span className="eyebrow">CONTROL PLANE</span><h2>{apiStatus==='ok'?'API سرور پاسخ می‌دهد':apiStatus==='failed'?'اتصال API برقرار نیست':'در انتظار بررسی'}</h2><p>{apiTime?`آخرین بررسی: ${new Date(apiTime).toLocaleString('fa-IR')}`:'برای مشاهده وضعیت API سرور را بررسی کن.'}</p></div></div>{error&&<div className="error-box">{error}</div>}<div className="diagnostic-list">{rows.map(([name,value])=><div className="diagnostic-row" key={name}><span>{name}</span><b className={name==='دسترسی Backend'&&apiStatus==='ok'?'good':value==='Development'?'dev':''}>{name==='دسترسی Backend'&&apiStatus==='loading'&&<LoaderCircle className="spin" size={13}/>} {value}</b></div>)}</div></div><DevelopmentNotice/></>;
}

function SettingsPage() {
  const account=useSession((s)=>s.account);const token=useSession((s)=>s.token);const updateAccount=useSession((s)=>s.updateAccount);const theme=usePreferences((s)=>s.theme);const setTheme=usePreferences((s)=>s.setTheme);const [server,setServer]=useState(apiBase());const [displayName,setDisplayName]=useState(account?.displayName||'');const [notice,setNotice]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const saveServer=()=>{localStorage.setItem('lanora.apiBase',server.trim().replace(/\/+$/,''));setNotice('نشانی API در همین مرورگر ذخیره شد.');setError('')};
  const saveProfile=async(e:FormEvent)=>{e.preventDefault();if(!token)return;setBusy(true);setNotice('');setError('');try{const result=await request<{user:Account}>('/api/v1/auth/me',token,{method:'PATCH',body:{displayName}});updateAccount(result.user);setNotice('نام نمایشی از سرور به‌روزرسانی شد.')}catch(err){setError(err instanceof Error?err.message:'ذخیره انجام نشد.')}finally{setBusy(false)}};
  return <><PageTitle eyebrow="حساب و برنامه" title="تنظیمات" description="تنظیمات حساب و ترجیح‌های همین مرورگر."/><div className="settings-grid"><section className="settings-card"><div className="settings-card-head"><span className="settings-icon"><Globe2/></span><div><h2>اتصال سرور</h2><p>نشانی API سرور خودمیزبان؛ دامنه یا IP همراه پورت HTTPS</p></div></div><label className="field"><span>آدرس API سرور</span><input dir="ltr" value={server} onChange={e=>setServer(e.target.value)} placeholder="https://203.0.113.10:443"/><small>این آدرس برای حساب و مدیریت روم است. ترافیک بازی باید از تونل دسکتاپ عبور کند.</small></label><button className="btn btn-primary btn-small" onClick={saveServer}>ذخیرهٔ نشانی <Check size={15}/></button></section><section className="settings-card"><div className="settings-card-head"><span className="settings-icon lime-bg"><Users/></span><div><h2>حساب کاربری</h2><p>این تغییر روی Backend ذخیره می‌شود.</p></div></div><form className="form-stack" onSubmit={saveProfile}><label className="field"><span>نام نمایشی</span><input value={displayName} onChange={e=>setDisplayName(e.target.value)} minLength={2} maxLength={32} required/></label><label className="field"><span>ایمیل حساب</span><input dir="ltr" value={account?.email||''} disabled/></label><button className="btn btn-primary btn-small" disabled={busy}>{busy?'ذخیره…':'ذخیرهٔ پروفایل'}</button></form></section><section className="settings-card"><div className="settings-card-head"><span className="settings-icon purple-bg"><Sun/></span><div><h2>نمایش</h2><p>پوستهٔ محیط</p></div></div><div className="setting-control"><span>پوسته</span><div className="segmented"><button className={theme==='light'?'selected':''} onClick={()=>setTheme('light')}><Sun size={14}/> روشن</button><button className={theme==='dark'?'selected':''} onClick={()=>setTheme('dark')}><Moon size={14}/> تیره</button></div></div></section><section className="settings-card privacy-card"><div className="settings-card-head"><span className="settings-icon"><Shield/></span><div><h2>حریم خصوصی</h2><p>نشست حساب در حافظهٔ نشست مرورگر ذخیره می‌شود.</p></div></div><p>این وب‌اپ برای ساخت روم و عضویت، توکن روم را در sessionStorage همین نشست نگه می‌دارد. برای اتصال مجازی بازی از کلاینت ویندوز استفاده کن.</p><DevelopmentNotice text="ثبت هویت دستگاه و نگهداری امن کلید شبکه فقط در نسخهٔ دسکتاپ برنامه‌ریزی شده است."/></section></div>{notice&&<div className="success-box"><Check size={15}/>{notice}</div>}{error&&<div className="error-box">{error}</div>}</>;
}

function DownloadPage() {
  return <div className="download-page">
    <header className="landing-nav wrap"><Brand/><Link className="nav-login" to="/">خانه</Link></header>
    <main className="wrap download-main">
      <span className="eyebrow"><span className="pulse-dot"/> راه‌اندازی خودمیزبان LANORA</span>
      <h1>یک سرور برای روم‌ها،<br/><em>یک برنامه برای بازیکن‌ها.</em></h1>
      <p>مدیر، سرویس را روی VPS خودش نصب می‌کند. هر بازیکن برنامهٔ ویندوز را نصب می‌کند و نشانی سرور را داخل همان برنامه وارد می‌کند. لازم نیست بازیکن‌ها SSH بلد باشند.</p>
      <div className="setup-grid">
        <article className="setup-card">
          <div className="setup-card-top"><span className="setup-number">01</span><span className="dev-pill">Linux · Docker Compose</span></div>
          <h2>سمت سرور</h2>
          <p>یک مدیر با SSH به VPS لینوکس وصل می‌شود و استقرار سرور LANORA را انجام می‌دهد. پس از تنظیم دامنه و TLS، آدرس API و پورت HTTPS را به بازیکن‌ها می‌دهد.</p>
          <div className="setup-detail"><b>نمونهٔ نشانی برای کلاینت</b><code dir="ltr">https://games.example.com:443</code></div>
          <a className="btn btn-soft" href="https://github.com/kavianpcx/LANORA/blob/main/docs/SELF_HOSTING.md" target="_blank" rel="noreferrer">راهنمای نصب سرور <ArrowUpLeft size={15}/></a>
          <small className="setup-footnote">API و مدیریت روم در مخزن هستند؛ Relay و اتصال واقعی موتور شبکه هنوز آمادهٔ استفاده نیستند.</small>
        </article>
        <article className="setup-card setup-card-client">
          <div className="setup-card-top"><span className="setup-number">02</span><span className="dev-pill">Windows 10/11 · Development</span></div>
          <h2>سمت بازیکن</h2>
          <p>هر دوست برنامهٔ LANORA را روی ویندوز اجرا می‌کند، URL سرور و پورت را وارد می‌کند، آنلاین بودن API را می‌سنجد و بعد با کد دعوت وارد روم می‌شود.</p>
          <ol className="client-steps"><li>آدرس سرور: <code dir="ltr">https://IP-or-domain:port</code></li><li>ساخت روم یا ورود با کد دعوت</li><li>پس از آماده شدن موتور: اتصال مجازی و بازی LAN</li></ol>
          <div className="development-notice"><span className="notice-icon"><CircleHelp size={16}/></span><div><b>نصاب ویندوز هنوز منتشر نشده</b><p>پوستهٔ Tauri موجود است، اما EasyTier و آداپتور مجازی به آن وصل نشده‌اند؛ بنابراین این نسخه هنوز تونل LAN ایجاد نمی‌کند.</p></div></div>
        </article>
      </div>
      <div className="connection-explainer"><ShieldCheck size={19}/><p><b>آدرس سرور با تونل بازی فرق دارد.</b> کلاینت با HTTPS/WSS به سرور کنترل وصل می‌شود. بعد از پیوستن به روم، ترافیک بازی باید از مسیر مجازی P2P یا Relay عبور کند. سرور API نباید بسته‌های بازی را پراکسی کند و SSH فقط برای مدیریت VPS است.</p></div>
      <div className="download-actions"><a className="btn btn-primary btn-large" href="https://github.com/kavianpcx/LANORA" target="_blank" rel="noreferrer">مشاهدهٔ سورس در GitHub <ArrowUpLeft size={16}/></a><Link className="btn btn-quiet btn-large" to="/">بازگشت به صفحهٔ اصلی <ArrowRight size={16}/></Link></div>
    </main>
  </div>;
}

function NotFound() { return <main className="auth-gate"><div className="auth-card"><span className="eyebrow">404</span><h1>این صفحه پیدا نشد</h1><Link to="/" className="btn btn-primary">بازگشت به خانه <ArrowRight size={15}/></Link></div></main>; }

export default App;
