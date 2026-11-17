<p align="center"><img src="https://raw.githubusercontent.com/kavianpcx/LANORA/release/0.2.x/apps/desktop/src-tauri/icons/icon.png" alt="LANORA desktop app icon" width="128"></p>
<p align="center"><a href="README.md">English</a> · <a href="README.fa.md">فارسی</a></p>

# LANORA

**به شبکهٔ بازی وصل شو، آی‌پی مجازی میزبان را کپی کن و بازی کن.**

LANORA برنامه‌ای متن‌باز و خودمیزبان برای بازی‌های دارای قابلیت LAN است. یک نفر سرور را روی VPS لینوکس اجرا می‌کند. بازیکنان برنامه را نصب می‌کنند، نشانی سرور را وارد می‌کنند و فقط اگر صاحب سرور لازم بداند رمز می‌زنند. حساب کاربری یا وب‌سایت لازم نیست.

> **وضعیت: آلفای آزمایشی.** نسخهٔ 0.2.0-alpha.8 اعتبارسنجی نشانی سرور و آزمایش HTTP محلی را بهبود می‌دهد، وضعیت مسیر همتا و تازگی حضور بازیکنان را دقیق‌تر گزارش می‌کند و کنترل‌های قطع اتصال و فهرست بازیکنان را مرتب‌تر می‌سازد. اتصال دو رایانهٔ مستقل ویندوز از اینترنت عمومی، ترافیک بازی از تونل ویندوز، P2P مستقیم و کشف خودکار بازی‌ها هنوز تأیید نشده‌اند.
>
> **محدودیت امنیتی:** تغییر سیاست رمز، نشست‌های API را باطل و هویت شبکهٔ فعلی را عوض می‌کند؛ اما نمی‌تواند کلاینت تغییریافته‌ای را که به شبکهٔ قدیمی EasyTier وصل است مجبور به قطع کند. پس از تغییر سیاست از همهٔ بازیکنان بخواهید کامل قطع شوند و دوباره وصل شوند.

[![CI](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml/badge.svg?branch=release/0.2.x)](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml) [![ساخت برنامه](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml/badge.svg?branch=release/0.2.x)](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml) [![مجوز MIT](https://img.shields.io/badge/license-MIT-4355DB)](LICENSE) [![آخرین آلفا](https://img.shields.io/github/v/release/kavianpcx/LANORA?include_prereleases&label=alpha)](https://github.com/kavianpcx/LANORA/releases)

## راه‌اندازی سادهٔ سرور

به یک VPS لینوکس، دامنه‌ای که به آن اشاره کند، Docker Engine همراه افزونهٔ Compose، Git و OpenSSL نیاز دارید. پورت‌های ورودی **80** و **443** و نیز **11010 با TCP و UDP** را در فایروال VPS و پنل شرکت میزبان باز کنید.

این دستورها را در ترمینال VPS کپی کنید:

```sh
git clone --branch release/0.2.x https://github.com/kavianpcx/LANORA.git
cd LANORA
bash scripts/setup-server.sh
```

وقتی پرسید، دامنه را وارد کنید. در نصب تازه، اسکریپت می‌پرسد که بازیکنان باید رمز داشته باشند یا نه. گزینهٔ پیش‌فرض **بله** است؛ رمز را دو بار وارد می‌کنید و در ترمینال نمایش داده نمی‌شود. برای سرور عمومی، محافظت با رمز پیشنهاد می‌شود. با انتخاب **خیر**، هر کسی که بتواند به سرور دسترسی پیدا کند می‌تواند وارد شبکهٔ بازی شود.

برای بررسی وضعیت و سیاست رمز بازیکنان:

```sh
bash scripts/server.sh status
bash scripts/server.sh doctor
bash scripts/server.sh player-auth status
```

بدون نصب دوباره، محافظت با رمز را مدیریت کنید:

```sh
bash scripts/server.sh player-auth enable
bash scripts/server.sh player-auth change
bash scripts/server.sh player-auth disable
```

با غیرفعال‌کردن رمز، هر کسی که به سرور دسترسی داشته باشد می‌تواند وارد شبکه شود. این کار احراز هویت مدیر یا اعتبارنامه‌های رلهٔ EasyTier را غیرفعال نمی‌کند. تغییر سیاست، نشست‌های فعلی API را باطل می‌کند. دستور `doctor` سرویس‌های محلی، سیاست رمز، پورت‌ها و دسترسی پایگاه‌داده را بررسی می‌کند؛ دسترسی HTTPS و رله از اینترنت بیرونی را بررسی‌شده اعلام نمی‌کند. محدودیت نشست‌های EasyTier در [راهنمای VPS](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/SELF_HOSTING.md) توضیح داده شده است. سرور عمومی باید HTTPS داشته باشد؛ HTTP فقط برای نشانی‌های loopback مجاز است.

## دانلود و اتصال بازیکنان

- **ویندوز ۱۰/۱۱، x64:** [دانلود نصب‌کننده](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.8/LANORA_0.2.0-alpha.8_x64-setup.exe) · [SHA-256](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.8/LANORA_0.2.0-alpha.8_x64-setup.exe.sha256)
- **لینوکس x64 (Debian/Ubuntu):** [دانلود بستهٔ .deb](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.8/LANORA_0.2.0-alpha.8_amd64.deb) · [SHA-256](https://github.com/kavianpcx/LANORA/releases/download/v0.2.0-alpha.8/LANORA_0.2.0-alpha.8_amd64.deb.sha256)
- [یادداشت انتشار و همهٔ کدهای SHA-256](https://github.com/kavianpcx/LANORA/releases/tag/v0.2.0-alpha.8)

۱. برنامه را نصب و باز کنید. نام نمایشی انتخاب کنید؛ ثبت‌نام لازم نیست.
۲. نشانی سرور را وارد کنید و **Connect** را بزنید. فقط اگر سرور رمز بخواهد، LANORA آن را می‌پرسد.
۳. وقتی برنامه IP مجازی را نشان داد، آن را برای دوستی که میزبان بازی است بفرستید.
۴. بقیهٔ بازیکنان IP مجازی میزبان را در گزینهٔ Direct IP بازی وارد کنند. IP سرور VPS برای اتصال به LANORA است، نه برای ورود به بازی.

کشف خودکار LAN برای همهٔ بازی‌ها تضمین نمی‌شود. بازی‌هایی که به Broadcast یا Multicast نیاز دارند ممکن است به اتصال با Direct IP احتیاج داشته باشند.

## چه چیزهایی آزمایش شده‌اند؟

گردش انتشار تست‌های مجوزدهی API و race، رابط و Rust، استقرار Docker، ساخت/نصب/اجرای برنامهٔ ویندوز و ساخت/نصب/اجرای بستهٔ لینوکس را اجرا می‌کند. تست API همگام‌سازی آواتار، دو عضویت مستقل، تغییر پروفایل، اعتبارسنجی و ماندگاری پس از اتصال دوباره را پوشش می‌دهد؛ این تست، آزمایش دو رایانهٔ مستقل نیست. در تست ایزولهٔ Linux، دو کلاینت به شبکهٔ مشترک می‌پیوندند، IPهای EasyTier متفاوت می‌گیرند، ترافیک واقعی TCP و UDP را از رله ردوبدل می‌کنند و default route سیستمشان تغییر نمی‌کند.

این آزمایش **اتصال دو اینترنت جداگانه، عبور ترافیک بازی از تونل ویندوز، P2P/NAT traversal، رله روی VPS بیرونی یا سازگاری با بازی مشخصی** را تأیید نمی‌کند. جزئیات در [محدودیت‌های تست شبکه](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/ROADMAP.md) است.

## LANORA چطور کار می‌کند؟

API خودمیزبان Go مشخص می‌کند که سرور برای بازیکنان رمز می‌خواهد یا نه، سپس دسترسی و عضویت هر بازیکن را مدیریت می‌کند. رمزها با PBKDF2-SHA256 به‌صورت Hash ذخیره می‌شوند. سرور بدون رمز هم نشست معتبر بازیکن می‌سازد، اما هر کسی که به آن دسترسی داشته باشد می‌تواند درخواست عضویت بدهد. نام و آواتار انتخاب‌شده با درخواست مجاز همان بازیکن به دیگر اعضا همگام می‌شود. تأخیر سرور از زمان رفت‌وبرگشت درخواست واقعی API محاسبه می‌شود؛ تأخیر همتا و مسیر Direct/Relay جداگانه از وضعیت EasyTier می‌آیند. احراز هویت مدیر و اعتبارنامه‌های داخلی رلهٔ EasyTier جداگانه محافظت می‌شوند. EasyTier ترافیک بازی را از شبکهٔ مجازی جداگانه عبور می‌دهد؛ LANORA دروازهٔ پیش‌فرض اینترنت یا پراکسی سراسری سیستم را تغییر نمی‌دهد. وضعیت همتا فقط با شواهد تازهٔ موتور شبکه نمایش داده می‌شود.

## ساختار پروژه

| مسیر | کاربرد |
|---|---|
| `apps/desktop` | برنامهٔ دسکتاپ Tauri 2، React، TypeScript و Rust |
| `services/api` | API با Go و ذخیره‌سازی SQLite |
| `docker-compose.yml` و `deploy/docker` | API، پراکسی TLS و رلهٔ EasyTier برای میزبانی شخصی |
| `docs` | [شروع سریع](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/GETTING_STARTED.md)، [شبکه](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/NETWORKING.md)، [امنیت](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/SECURITY.md) و [عیب‌یابی](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/TROUBLESHOOTING.md) |

برای ساخت از سورس، [راهنمای Build](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/docs/BUILDING.md) را ببینید. مشارکت‌ها خوش‌آمدند؛ از [راهنمای مشارکت](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/CONTRIBUTING.md) شروع کنید. کد LANORA مجوز MIT دارد و EasyTier مجوز جداگانه دارد؛ [اعلان مجوزهای شخص ثالث](https://github.com/kavianpcx/LANORA/blob/release/0.2.x/THIRD_PARTY_LICENSES.md) را ببینید.
