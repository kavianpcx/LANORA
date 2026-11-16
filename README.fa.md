<p align="center"><img src="assets/lanora-wordmark.svg" alt="LANORA" width="230"></p>
<p align="center"><a href="README.md">English</a> · <a href="README.fa.md">فارسی</a></p>

# LANORA

برای بازی LAN با دوستانی که کنار شما نیستند: یک نفر سرور را روی VPS لینوکس اجرا می‌کند. همه نرم‌افزار دسکتاپ را نصب می‌کنند، آدرس همان سرور را وارد می‌کنند و روم می‌سازند یا وارد روم می‌شوند. **ثبت‌نام، حساب کاربری، سایت و اشتراک ندارد.**

**نسخهٔ آزمایشی:** `0.2.0-alpha.1` فعلاً نامزد بررسی است و منتشر نشده. دسترسی به API، عضویت روم، اجرای EasyTier، آی‌پی گزارش‌شده و ارتباط واقعی با دوستتان مراحل جدا هستند. داشتن آی‌پی به‌تنهایی اتصال به بازیکن دیگر را ثابت نمی‌کند. آزمایش بازی ویندوز روی دو اینترنت متفاوت هنوز **تأیید نشده**. [گزارش بررسی و تست‌ها](docs/AUDIT_0.2.0.md).

## ۱. صاحب VPS: سرور را راه‌اندازی کنید

ابتدا [Docker Engine و Compose](https://docs.docker.com/engine/install/)، ابزار Git و OpenSSL را نصب کنید. رکورد DNS دامنه را به VPS وصل کنید. پورت‌های **TCP 80/443 و TCP/UDP 11010** باید در فایروال VPS باز باشند. در ترمینال SSH بنویسید:

```sh
git clone https://github.com/kavianpcx/LANORA.git
cd LANORA
bash scripts/setup-server.sh
```

وقتی اسکریپت پرسید، دامنهٔ خودتان، مثلاً `games.example.com` را وارد کنید. کلیدهای خصوصی ساخته و سرویس‌ها اجرا می‌شوند. فایل `.env` موجود بازنویسی نمی‌شود.

```sh
bash scripts/server.sh status
curl --fail https://games.example.com/api/v1/health
```

به‌جای `games.example.com` دامنهٔ **خودتان** را بنویسید. بعد از موفقیت بررسی HTTPS، آدرس `https://games.example.com` را به دوستانتان بدهید. سالم‌بودن کانتینر در خود VPS، دسترسی از اینترنت را ثابت نمی‌کند.

فرمان‌های روزمره از داخل پوشهٔ `LANORA`:

```sh
bash scripts/server.sh logs
bash scripts/server.sh restart
bash scripts/server.sh stop
bash scripts/server.sh update
```

به‌ترتیب: دیدن لاگ‌های API، راه‌اندازی دوباره، توقف و به‌روزرسانی. توقف و به‌روزرسانی دیتابیس و گواهی‌ها را حذف نمی‌کنند. فایل برنامه از GitHub دانلود می‌شود؛ VPS شما میزبان دانلود نیست. [راهنمای کامل سرور و پشتیبان‌گیری](docs/SELF_HOSTING.md).

## ۲. بازیکن‌ها: برنامه را نصب کنید

آخرین نسخهٔ منتشرشده **v0.1.0-alpha.5** است. اصلاحات این شاخه را ندارد و یک VPN بازی تأییدشده محسوب نمی‌شود. فایل‌های نامزد `0.2.0-alpha.1` فقط خروجی آزمایش GitHub Actions در [PR شمارهٔ ۱۳](https://github.com/kavianpcx/LANORA/pull/13) هستند؛ Release عمومی نیستند.

- ویندوز ۱۰/۱۱ x64: [دانلود EXE آزمایشی منتشرشده](https://github.com/kavianpcx/LANORA/releases/download/v0.1.0-alpha.5/LANORA_0.1.0_x64-setup.exe).
- Debian/Ubuntu x64: [دانلود DEB آزمایشی منتشرشده](https://github.com/kavianpcx/LANORA/releases/download/v0.1.0-alpha.5/LANORA_0.1.0_amd64.deb).

دستور نصب نسخهٔ منتشرشده روی لینوکس:

```sh
curl --fail --location --output LANORA.deb https://github.com/kavianpcx/LANORA/releases/download/v0.1.0-alpha.5/LANORA_0.1.0_amd64.deb
sudo apt install ./LANORA.deb
```

نصب بستهٔ لینوکس دسترسی شبکه به فایل EasyTier می‌دهد؛ [محدودیت دسترسی‌ها](docs/SECURITY.md) را بخوانید. ساخت آداپتور و مجوزهای ویندوز هنوز نیازمند تست روی ویندوز تمیز هستند. برای رفع خطا فایروال را خاموش نکنید.

## ۳. وصل شوید و بازی را امتحان کنید

1. برنامه را باز کنید. یک نام نمایشی و آواتار انتخاب کنید. نام، آواتار، زبان و تم بعداً در **Settings** قابل تغییرند.
2. آدرس **HTTPS مشترک سرور** را بزنید؛ پورت اختیاری است. دامنهٔ بدون پیشوند، HTTPS در نظر گرفته می‌شود. برای آی‌پی خام، گواهی باید برای همان آی‌پی معتبر باشد. روی اتصال بزنید.
3. بازیکن **A** روم می‌سازد. **B** و **C** روم عمومی را انتخاب می‌کنند یا کد دعوت را می‌زنند. اگر تأیید میزبان فعال است، A باید آن‌ها را تأیید کند.
4. صبر کنید EasyTier آی‌پی مجازی گزارش کند. A بازی را با گزینهٔ LAN میزبانی می‌کند و **آی‌پی مجازی خودش** را می‌فرستد. B و C آن را در **Direct IP** بازی وارد می‌کنند. **این آدرس، آی‌پی VPS نیست.**
5. ارتباط داخل بازی را بررسی کنید. وضعیت واقعی همتا فعلاً **نامشخص** نمایش داده می‌شود. کشف خودکار LAN به بازی بستگی دارد؛ بعضی بازی‌ها به Broadcast یا Multicast نیاز دارند.

API مسئول روم‌ها، مجوزها و تنظیمات است. ترافیک بازی را EasyTier v2.6.4 از شبکهٔ مجازی رمزگذاری‌شدهٔ هر روم عبور می‌دهد، مستقیم یا از Relay سرور خودتان. LANORA مسیر پیش‌فرض اینترنت را تغییر نمی‌دهد. استفادهٔ پیش‌فرض از STUN عمومی در کلاینت نامزد غیرفعال است؛ در NAT محدود ممکن است Relay لازم شود.

## توسعه و محدودیت‌ها

کلاینت در `apps/desktop`، API در `services/api`، فایل‌های استقرار در `deploy/docker`، اسکریپت‌های سرور در `scripts` و تست‌ها در `tests` هستند.

```sh
cd apps/desktop
npm ci
npm test
npm run build
cd ../../services/api
go test -race ./...
```

[راهنمای Build](docs/BUILDING.md)، [معماری](docs/ARCHITECTURE.md)، [شبکه](docs/NETWORKING.md)، [عیب‌یابی](docs/TROUBLESHOOTING.md)، [نقشهٔ راه](docs/ROADMAP.md) و [مشارکت](CONTRIBUTING.md).

مجوزهای ویندوز، P2P و بازی روی اینترنت واقعی، شناسایی اتصال اعضا، بازیابی پس از Crash و ابطال کلید شبکهٔ اعضای قبلی هنوز محدودیت دارند. برای مقابله با بازیکن غیرقابل اعتماد به این آلفا اتکا نکنید. [امنیت](docs/SECURITY.md).

کد خود LANORA تحت [MIT](LICENSE) است؛ مجوز کد شخص ثالث تغییر نمی‌کند. پیش از توزیع برنامه [مجوزهای وابستگی‌ها](THIRD_PARTY_LICENSES.md) را بخوانید.
