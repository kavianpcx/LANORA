<p align="center"><img src="assets/lanora-wordmark.svg" alt="LANORA" width="230"></p>
<p align="center"><a href="README.md">English</a> · <a href="README.fa.md">فارسی</a></p>

# LANORA

**به شبکهٔ خصوصی بازی وصل شوید، آی‌پی میزبان را کپی کنید و بازی کنید.**

LANORA یک برنامهٔ متن‌باز برای ساخت شبکهٔ مجازی میان دوستانی است که می‌خواهند بازی‌های دارای LAN را از راه اینترنت اجرا کنند. یک نفر سرور را روی VPS لینوکس راه می‌اندازد. بقیه برنامه را نصب می‌کنند، نشانی سرور و کد خصوصی را می‌زنند و وصل می‌شوند. حساب کاربری یا سایت لازم نیست.

[![CI](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml/badge.svg?branch=release/0.2.x)](https://github.com/kavianpcx/LANORA/actions/workflows/ci.yml) [![Desktop builds](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml/badge.svg?branch=release/0.2.x)](https://github.com/kavianpcx/LANORA/actions/workflows/windows.yml) [![مجوز MIT](https://img.shields.io/badge/license-MIT-4355DB)](LICENSE) [![پیش‌انتشار](https://img.shields.io/github/v/release/kavianpcx/LANORA?include_prereleases&label=alpha)](https://github.com/kavianpcx/LANORA/releases)

## راه‌اندازی سرور

به یک VPS لینوکس با دامنه‌ای که به آن اشاره کند، Docker Engine و افزونهٔ Compose، Git و OpenSSL نیاز دارید. پورت‌های ورودی TCP شمارهٔ 80 و 443 و نیز TCP/UDP شمارهٔ 11010 را در فایروال VPS و پنل شرکت میزبان باز کنید.

این دستورها را در ترمینال VPS کپی کنید:

~~~sh
git clone --branch release/0.2.x https://github.com/kavianpcx/LANORA.git
cd LANORA
bash scripts/setup-server.sh
~~~

وقتی پرسید، دامنه را وارد کنید. اسکریپت کلیدهای خصوصی را می‌سازد، سرویس‌ها را اجرا می‌کند و یک **کد دسترسی شبکه** نشان می‌دهد. نشانی سرور و این کد را فقط برای دوستانتان بفرستید. وضعیت محلی سرویس‌ها:

~~~sh
bash scripts/server.sh status
~~~

وضعیت، کدها و کلیدها را نشان نمی‌دهد. اگر بعداً کد دسترسی را لازم داشتید، دستور 'bash scripts/server.sh code' را اجرا کنید. برای بررسی API از یک اینترنت دیگر، این دستور را با دامنهٔ خودتان بزنید: 'curl -f https://YOUR_DOMAIN/api/v1/health'. با گزینهٔ '-k' خطای گواهی را دور نزنید.

## اتصال به‌عنوان بازیکن

1. بستهٔ ویندوز یا لینوکس را از [GitHub Releases](https://github.com/kavianpcx/LANORA/releases/tag/v0.2.0-alpha.3) بگیرید و نصب کنید.
2. LANORA را باز کنید، نام نمایشی را انتخاب و نشانی سرور و کدی را که صاحب سرور داده وارد کنید.
3. **Connect** را بزنید. برنامه سرور و کد را بررسی می‌کند، EasyTier را اجرا می‌کند و منتظر آی‌پی مجازی می‌ماند.
4. بعد از نمایش آی‌پی مجازی، بازیکنی که Host بازی است آن را برای بقیه می‌فرستد. بقیه در گزینهٔ **Direct IP** بازی، آی‌پی مجازی میزبان را وارد می‌کنند.

همهٔ بازیکنان یک سرور به‌طور خودکار وارد یک شبکهٔ مشترک می‌شوند. ابزار روم‌های جداگانه برای تنظیمات قدیمی‌تر در بخش پیشرفته باقی مانده است.

## چه چیزی در این نسخه آزمایش شده است؟

- API قبل از دادن دسترسی شبکه، کد را بررسی می‌کند و برای هر دستگاه یک توکن جدا می‌سازد.
- دستگاه‌های مجاز، پیکربندی یکسان شبکهٔ EasyTier همین سرور را می‌گیرند.
- اگر برنامه Heartbeat نفرستد، وضعیت حضورش پس از مدتی منقضی می‌شود. «برنامه آنلاین است» به معنی دسترسی‌پذیری داخل تونل نیست.
- برنامه آی‌پی مجازی را از EasyTier می‌خواند و در صورت وجود، مسیر همتا و زمان پاسخ را نیز از EasyTier می‌گیرد. دادهٔ ناموجود، نامشخص نمایش داده می‌شود.
- EasyTier بدون Exit Node اجرا می‌شود؛ مسیر پیش‌فرض اینترنت و پروکسی سیستم تغییر نمی‌کند.
- GitHub Actions فایل نصب ویندوز را می‌سازد و اجرا می‌کند. تست لینوکس دو کلاینت ایزوله را از طریق رلهٔ واقعی EasyTier وصل می‌کند و آی‌پی و ترافیک TCP/UDP را بررسی می‌کند.

## محدودیت‌ها

LANORA هنوز نسخهٔ آزمایشی است. تست خودکار لینوکس از دو فضای شبکهٔ ایزوله استفاده می‌کند و ترافیک را از رله می‌فرستد. اتصال دو کامپیوتر واقعی از اینترنت‌های جدا، ترافیک بازی روی ویندوز، ارتباط مستقیم P2P، رفتار رله روی VPSهای واقعی و پیدا کردن بازی از طریق LAN در بازی‌های مختلف هنوز تأیید نشده است. بعضی بازی‌ها باید با **Direct IP** وصل شوند؛ پیدا کردن خودکار از راه Broadcast یا Multicast تضمین نمی‌شود.

پاسخ‌دادن API با HTTPS فقط یعنی سرور کنترل در دسترس است. گرفتن آی‌پی EasyTier هم به‌تنهایی دسترسی دوستتان را ثابت نمی‌کند. وضعیت مسیر کنار هر بازیکن را ببینید و داخل بازی امتحان کنید. برای گزارش مشکل، [راهنمای عیب‌یابی](docs/TROUBLESHOOTING.md) را ببینید.

## ساخت از سورس

پیش‌نیازها و فرمان‌های ساخت برنامه در [راهنمای Build](docs/BUILDING.md) آمده‌اند. برای API و میزبانی سرور، از [شروع کار](docs/GETTING_STARTED.md) و [راه‌اندازی سرور](docs/SELF_HOSTING.md) استفاده کنید.

~~~sh
cd apps/desktop
npm ci
npm test
npm run build
~~~

GitHub Actions فایل نصب NSIS ویندوز و بستهٔ Debian لینوکس را می‌سازد. کنار فایل‌ها Checksum از نوع SHA-256 منتشر می‌شود. اگر Checksum با فایل یکی نیست، آن را نصب نکنید.

## مستندات

- [معماری شبکه](docs/NETWORKING.md)
- [راهنمای API](docs/API.md)
- [تنظیمات](docs/CONFIGURATION.md)
- [امنیت](docs/SECURITY.md)
- [عیب‌یابی](docs/TROUBLESHOOTING.md)
- [نقشهٔ راه](docs/ROADMAP.md)
- [مشارکت در پروژه](CONTRIBUTING.md)
- [مجوزهای وابستگی‌ها](THIRD_PARTY_LICENSES.md)

مجوز کدهای LANORA، [MIT](LICENSE) است. EasyTier به‌صورت جداگانه با مجوز LGPL-3.0 توزیع می‌شود؛ جزئیات در [فهرست مجوزها](THIRD_PARTY_LICENSES.md) آمده است.
