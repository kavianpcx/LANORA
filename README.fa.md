<p align="center"><img src="assets/lanora-wordmark.svg" alt="LANORA" width="230"></p>
<p align="center"><a href="README.md">English</a> · <a href="README.fa.md">فارسی</a></p>

# LANORA

**به شبکهٔ بازی وصل شو، آی‌پی مجازی میزبان را کپی کن و بازی کن.**

LANORA برنامه‌ای متن‌باز و خودمیزبان برای بازی‌های دارای قابلیت LAN است. یک نفر سرور را روی VPS لینوکس اجرا می‌کند. بازیکنان برنامه را نصب می‌کنند، نشانی سرور و کد خصوصی را می‌زنند و خودکار وارد شبکهٔ مشترک می‌شوند. حساب کاربری یا وب‌سایت لازم نیست.

> **وضعیت: آلفای آزمایشی.** نسخهٔ 0.2.0-alpha.3 تست‌های خودکار API، استقرار، بسته‌های دسکتاپ و شبکهٔ رله در محیط ایزوله را گذرانده است. اتصال دو رایانه روی اینترنت‌های جدا، ترافیک بازی از تونل ویندوز، اتصال مستقیم P2P و کشف خودکار بازی‌ها هنوز تأیید نشده‌اند.

[![CI](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml/badge.svg?branch=release/0.2.x)](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml) [![ساخت برنامه](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml/badge.svg?branch=release/0.2.x)](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml) [![مجوز MIT](https://img.shields.io/badge/license-MIT-4355DB)](LICENSE) [![آخرین آلفا](https://img.shields.io/github/v/release/kavianpcx/LANORA?include_prereleases&label=alpha)](https://github.com/kavianpcx/LANORA/releases)

## راه‌اندازی سادهٔ سرور

به یک VPS لینوکس، دامنه‌ای که به آن اشاره کند، Docker Engine همراه افزونهٔ Compose، Git و OpenSSL نیاز دارید. پورت‌های ورودی **80** و **443** و نیز **11010 با TCP و UDP** را در فایروال VPS و پنل شرکت میزبان باز کنید.

این دستورها را در ترمینال VPS کپی کنید:

```sh
git clone --branch release/0.2.x https://github.com/kavianpcx/LANORA.git
cd LANORA
bash scripts/setup-server.sh
```

وقتی پرسید، دامنه را وارد کنید. اسکریپت کلیدهای خصوصی را می‌سازد، سرویس‌ها را اجرا می‌کند و نشانی سرور و کد دسترسی شبکه را نشان می‌دهد. هر دو را فقط برای بازیکنان مورداعتماد بفرستید.

برای بررسی وضعیت یا دیدن دوبارهٔ کد:

```sh
bash scripts/server.sh status
bash scripts/server.sh code
```

دستور وضعیت اطلاعات محرمانه را نشان نمی‌دهد. سرور عمومی باید HTTPS داشته باشد؛ HTTP فقط برای نشانی‌های loopback مثل `127.0.0.1` مجاز است. راهنمای [کامل VPS](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/SELF_HOSTING.md) تنظیم DNS، پورت‌ها و TLS را توضیح می‌دهد.

## دانلود و اتصال بازیکنان

- **ویندوز ۱۰/۱۱، x64:** [دانلود نصب‌کننده](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.3/LANORA_0.2.0-alpha.3_x64-setup.exe)
- **لینوکس x64 (Debian/Ubuntu):** [دانلود بستهٔ .deb](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.3/LANORA_0.2.0-alpha.3_amd64.deb)
- [یادداشت انتشار و کدهای SHA-256](https://github.com/kavianpcx/LANORA/releases/tag/v0.2.0-alpha.3)

۱. برنامه را نصب و باز کنید. نام نمایشی انتخاب کنید؛ ثبت‌نام لازم نیست.
۲. نشانی سرور و کد دسترسی را وارد کنید و **Connect** را بزنید.
۳. وقتی برنامه IP مجازی را نشان داد، آن را برای دوستی که میزبان بازی است بفرستید.
۴. بقیهٔ بازیکنان IP مجازی میزبان را در گزینهٔ Direct IP بازی وارد کنند. IP سرور VPS برای اتصال به LANORA است، نه برای ورود به بازی.

کشف خودکار LAN برای همهٔ بازی‌ها تضمین نمی‌شود. بازی‌هایی که به Broadcast یا Multicast نیاز دارند ممکن است به اتصال با Direct IP احتیاج داشته باشند.

## چه چیزهایی آزمایش شده‌اند؟

در گردش انتشار، تست‌های مجوزدهی API و race، تست‌های رابط و Rust، بررسی استقرار Docker، ساخت/نصب/اجرای برنامهٔ ویندوز و ساخت/نصب/اجرای بستهٔ لینوکس موفق شدند. در تست ایزولهٔ Linux، دو کلاینت به شبکهٔ مشترک پیوستند، IPهای EasyTier متفاوت گرفتند، ترافیک واقعی TCP و UDP را از رله ردوبدل کردند و default route سیستمشان تغییر نکرد.

این آزمایش **اتصال دو اینترنت جداگانه، عبور ترافیک بازی از تونل ویندوز، P2P/NAT traversal، رله روی VPS بیرونی یا سازگاری با بازی مشخصی** را تأیید نمی‌کند. جزئیات در [محدودیت‌های تست شبکه](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/ROADMAP.md) است.

## LANORA چطور کار می‌کند؟

API خودمیزبان Go کد دسترسی را بررسی و عضویت‌ها را هماهنگ می‌کند. EasyTier ترافیک بازی را از شبکهٔ مجازی جداگانه عبور می‌دهد؛ API مسیر ترافیک بازی نیست. LANORA دروازهٔ پیش‌فرض اینترنت یا پراکسی سراسری سیستم را تغییر نمی‌دهد. وضعیت و تأخیر همتا فقط وقتی نمایش داده می‌شود که موتور شبکه اطلاعات واقعی ارائه کند.

## ساختار پروژه

| مسیر | کاربرد |
|---|---|
| `apps/desktop` | برنامهٔ دسکتاپ Tauri 2، React، TypeScript و Rust |
| `services/api` | API با Go و ذخیره‌سازی SQLite |
| `docker-compose.yml` و `deploy/docker` | API، پراکسی TLS و رلهٔ EasyTier برای میزبانی شخصی |
| `docs` | [شروع سریع](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/GETTING_STARTED.md)، [شبکه](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/NETWORKING.md)، [امنیت](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/SECURITY.md) و [عیب‌یابی](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/TROUBLESHOOTING.md) |

برای ساخت از سورس، [راهنمای Build](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/BUILDING.md) را ببینید. مشارکت‌ها خوش‌آمدند؛ از [راهنمای مشارکت](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/CONTRIBUTING.md) شروع کنید. کد LANORA مجوز MIT دارد و EasyTier مجوز جداگانه دارد؛ [اعلان مجوزهای شخص ثالث](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/THIRD_PARTY_LICENSES.md) را ببینید.
