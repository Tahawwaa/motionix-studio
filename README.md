# NOVA Motion Studio

**استودیوی محلی ساخت و ویرایش ویدیو، موشن‌گرافیک و معرفی محصول، با پشتیبانی از متن فارسی، پیش‌نمایش زنده، رندر واقعی و کنترل از طریق ایجنت.**

NOVA یک برنامهٔ قابل اجرا با ادیتور React، بک‌اند Laravel، پایگاه دادهٔ SQLite و موتور Remotion / Three.js است. صحنه‌ها، متن، تصاویر، صدا و حرکت‌ها در یک پروژهٔ ساختاریافته ذخیره می‌شوند و همان ترکیب‌بندی در پیش‌نمایش و خروجی استفاده می‌شود.

روش اصلی ساخت ویدیو، **موشن‌گرافیک برنامه‌پذیر و مبتنی بر فریم** است؛ برنامه مدل diffusion یا سرویس تولید فوتورئالیستی ویدیو از متن نیست. استفادهٔ دستی، وارد کردن پروژه، ویرایش، پیش‌نمایش و رندر به حساب ابری یا اشتراک API هوش مصنوعی وابسته نیست.

- نسخهٔ برنامه: `0.1.0`
- نسخهٔ مدل پروژه: `schemaVersion: 1`
- کاربرد اصلی: ورک‌استیشن شخصی، محلی و تک‌کاربره؛ بهینه برای ویدیوهای عمودی و ریلز.
- وضعیت: هستهٔ عملیاتی همراه با محدودیت‌های مشخص؛ تمام قابلیت‌های پرامپت اولیه هنوز تکمیل نشده‌اند.
- تاریخ بازبینی این راهنما: **۲۰۲۶-۱۱-۲۲**؛ مشخصات زیر از کد همین مخزن استخراج شده‌اند.

## راهنمای بخش‌ها

- [اجرای سریع](#quick-start)
- [پیش‌نیازها و نصب](#installation)
- [ساختار و معماری](#architecture)
- [صفحه‌ها و جریان کار](#workflow)
- [تایم‌لاین و میانبرها](#timeline)
- [رسانه، فونت و فارسی](#media-and-persian)
- [صحنه‌ها، حرکت و سه‌بعدی](#motion-and-3d)
- [قالب‌های داخلی](#templates)
- [مدل پروژه و نمونهٔ JSON](#project-schema)
- [رندر و فرمت خروجی](#rendering)
- [تنظیمات و متغیرهای محیطی](#configuration)
- [ذخیره‌سازی و پشتیبان‌گیری](#storage-and-backup)
- [API بک‌اند](#backend-api)
- [API سرویس رندر](#render-api)
- [ایجنت، MCP و Director](#agent-and-mcp)
- [نمونه‌های واقعی و بازتولید](#examples)
- [تست‌ها و شواهد اعتبارسنجی](#testing)
- [امنیت و حریم خصوصی](#security)
- [محدودیت‌های فعلی](#limitations)
- [عیب‌یابی](#troubleshooting)
- [توسعه، منشأ و مجوزها](#development-and-licenses)

<a id="quick-start"></a>

## اجرای سریع

تمام دستورهای این راهنما، مگر آنکه خلافش نوشته شده باشد، از **ریشهٔ مخزن** اجرا می‌شوند؛ همان پوشه‌ای که `package.json` اصلی در آن است.

اگر نصب اولیه قبلاً انجام شده است:

```bash
npm run dev
```

سپس [NOVA را در مرورگر باز کنید](http://127.0.0.1:5173/).

برای نصب تازه:

```bash
npm ci --legacy-peer-deps
npm run setup
npm run dev
```

دستور `npm run dev` این سه سرویس را راه‌اندازی می‌کند، یا در صورت پاسخ‌دادن سرویس موجود از آن استفاده می‌کند:

- رابط Studio: [http://127.0.0.1:5173/](http://127.0.0.1:5173/)
- API و رسانهٔ محلی: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- رندر و اعتبارسنجی پروژه: [http://127.0.0.1:8001/worker/health](http://127.0.0.1:8001/worker/health)

ترمینالی را که سرویس‌ها را راه انداخته باز نگه دارید. برای توقف فرایندهای ساخته‌شده توسط همان اجرا، `Ctrl+C` بزنید. فرمان زیر نیز فرایندهای ثبت‌شدهٔ راه‌انداز را متوقف می‌کند:

```bash
npm run stop
```

**دامنهٔ توقف:** سرویس‌هایی که راه‌انداز صرفاً از آن‌ها استفاده کرده، یا جداگانه در ترمینال دیگری اجرا شده‌اند، متعلق به آن اجرای راه‌انداز نیستند. برای توقف آن‌ها به ترمینال اصلی‌شان مراجعه کنید. اگر همهٔ سرویس‌ها از قبل فعال باشند، راه‌انداز می‌تواند پس از اعلام آمادگی با موفقیت خارج شود.

برای بررسی زندهٔ دسترسی سرویس‌ها:

```bash
npm run health
```

### اجرای نسخهٔ buildشده

```bash
npm run build
npm start
```

`npm start` به وجود `dist/index.html` نیاز دارد. در این حالت کلاینت از `vite preview` ارائه می‌شود و درخواست‌های API، رندر و رسانه همچنان به سرویس‌های محلی فرستاده می‌شوند. این فرمان بستهٔ استقرار عمومی، سرویس سیستم‌عامل یا وب‌سرور production عمومی ایجاد نمی‌کند.

اگر قبلاً سرور توسعه روی پورت ۵۱۷۳ فعال است، راه‌انداز همان سرویس را استفاده می‌کند؛ برای آزمایش واقعی کلاینت buildشده، ابتدا سرور توسعهٔ مربوط را متوقف کنید.

<a id="installation"></a>

## پیش‌نیازها و نصب

### ابزارهای لازم

- **Node.js نسخهٔ ۲۴ یا بالاتر** و npm؛ محیط اجرا با Node `24.22.3` آزمایش شده است.
- **PHP نسخهٔ ۸٫۴ یا بالاتر**؛ مقدار `^8.4` در Composer ثبت شده و PHP `8.5.4` در اجرای تأییدشده استفاده شده است.
- **Composer نسخهٔ ۲** برای وابستگی‌های بک‌اند.
- Google Chrome یا Chromium قابل اجرا روی میزبان برای رندر.
- دسترسی نوشتن در پوشهٔ پروژه، SQLite، فایل‌های رسانه و مسیر موقت سیستم.
- اینترنت هنگام نصب وابستگی‌ها و، در صورت لزوم، دریافت مرورگر سازگار Remotion.

اسکریپت setup این افزونه‌های PHP را بررسی می‌کند:

```text
pdo_sqlite, mbstring, fileinfo, zip, curl, dom, gd
```

سایر نیازهای Laravel و پکیج‌های قفل‌شده را Composer بررسی می‌کند. فعال‌بودن `sqlite3` و افزونه‌های معمول نصب Laravel نیز توصیه می‌شود. هستهٔ برنامه به Python، Redis، PostgreSQL، Docker یا API پولی وابسته نیست.

FFmpeg مورد استفادهٔ رندر از بسته‌های Remotion تأمین می‌شود و FFprobe از وابستگی بسته‌بندی‌شدهٔ پروژه استفاده می‌کند؛ برای مسیر اصلی رندر لازم نیست حتماً فرمان `ffmpeg` در PATH سیستم نصب باشد.

### Ubuntu

پس از نصب نسخه‌های سازگار Node، PHP و Composer:

```bash
bash scripts/setup.sh
npm run dev
```

معادل دستی اسکریپت نصب:

```bash
npm ci --legacy-peer-deps
npm run setup
```

نسخهٔ دقیق بسته‌های سیستم‌عامل به توزیع و مخازن نصب شما وابسته است؛ این پروژه نصب سراسری PHP یا Chrome را خودکار انجام نمی‌دهد.

### Windows 11 / PowerShell

Node، PHP و Composer باید در PATH قابل اجرا باشند. افزونه‌های PHP را در `php.ini` فعال کنید. سپس در ریشهٔ مخزن:

```powershell
npm ci --legacy-peer-deps
npm run setup
npm run dev
```

اسکریپت کمکی نیز موجود است، مشروط به آنکه سیاست اجرای PowerShell دستگاه اجازه بدهد:

```powershell
.\scripts\setup.ps1
npm run dev
```

اگر Chrome در مسیر معمول تشخیص داده نشد، مسیر نصب واقعی را تعیین کنید:

```powershell
$env:NOVA_CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run dev
```

دستورها و مسیرهای Windows مستند و از نظر کد بررسی شده‌اند؛ **اجرای کامل روی Windows 11 هنوز آزمایش نشده است**. شواهد اجرای فعلی مربوط به Ubuntu هستند.

### setup دقیقاً چه می‌کند؟

اسکریپت [setup](scripts/setup.ts):

1. نسخه و افزونه‌های لازم PHP را بررسی می‌کند.
2. `composer install` را داخل `apps/backend` اجرا می‌کند.
3. اگر `.env` بک‌اند وجود نداشته باشد، آن را از نمونه می‌سازد.
4. در صورت نبودن فایل SQLite، فایل خالی آن را ایجاد می‌کند.
5. اگر کلید معتبر Laravel موجود نباشد، `APP_KEY` تولید می‌کند.
6. migrationها را اجرا و پوشهٔ `.nova` را آماده می‌کند.

setup فایل `.env` موجود را بازنویسی نمی‌کند و برای اجرای دوباره طراحی شده است. نصب وابستگی‌های Node مرحله‌ای جداست و باید پیش از setup انجام شود.

### اجرای جداگانه برای عیب‌یابی

ترمینال اول، از ریشه:

```bash
npm run dev:worker
```

ترمینال دوم:

```bash
cd apps/backend
php -d upload_max_filesize=100M -d post_max_size=105M -S 127.0.0.1:8000 -t public public/index.php
```

ترمینال سوم، از ریشه:

```bash
npm run dev:studio
```

راه‌اندازی مستقیم PHP در مسیر بالا عمدی است: اجرای `php -d ... artisan serve` می‌تواند در فرایند فرزند تنظیمات upload را از دست بدهد. از `composer dev` یا frontend باقی‌ماندهٔ اسکلت Laravel به‌جای فرمان اصلی ریشه استفاده نکنید.

<a id="architecture"></a>

## ساختار و معماری

```text
motionix-studio/
├── apps/
│   ├── studio/src/           رابط React، ادیتور، تایم‌لاین و تنظیمات
│   └── backend/              Laravel، SQLite، دارایی‌ها و نسخه‌های پروژه
├── packages/
│   ├── project-schema/       مدل Zod، قواعد اعتبارسنجی و عملیات فریم
│   ├── video-engine/         ترکیب‌بندی مشترک Remotion و صحنه‌های Three.js
│   └── templates/            دوازده خانوادهٔ قالب و پروژه‌های نمونه
├── services/
│   ├── render-worker/        صف، Chromium، FFmpeg و بررسی خروجی
│   └── mcp-server/           MCP SDK، ابزارها، stdio و HTTP
├── public/
│   ├── fonts/               Inter و Vazirmatn همراه مجوزها
│   └── schema/              JSON Schema تولیدشده
├── scripts/                  نصب، اجرا، بررسی و تولید نمونه‌ها
├── tests/                    تست‌های هسته، موتور، MCP و مرورگر
├── docs/                     معماری، ADR، API، MCP و گزارش وضعیت
├── examples/
│   ├── output/              دموها و شواهد رندر
│   └── nova-intro/          معرفی فارسی ۳۰ ثانیه‌ای همین برنامه
├── .nova/                    دادهٔ زمان اجرا؛ خارج از Git
├── package.json              فرمان‌ها و وابستگی‌های Node
└── package-lock.json         نسخه‌های قفل‌شدهٔ Node
```

ساختار پروژه چندبخشی است، اما پکیج‌های TypeScript با یک `package.json` اصلی نصب می‌شوند؛ این مخزن در حال حاضر چند workspace مستقل منتشرشوندهٔ npm تعریف نمی‌کند. بک‌اند وابستگی‌ها و lockfile مستقل Composer دارد.

### مسئولیت هر بخش

- **Studio:** ویرایش پروژه، پیش‌نمایش، انتخاب، تاریخچهٔ موقت undo/redo، نمایش وضعیت سرویس‌ها و ارسال درخواست ذخیره/رندر.
- **Laravel:** پروژه‌ها، revisionها، دارایی‌ها، تنظیمات، پروفایل‌های برند، قالب‌های ذخیره‌شده، فعالیت‌ها و پشتیبان ZIP.
- **Render Worker:** اعتبارسنجی canonical، باندل Remotion، صف واقعی، اجرای مرورگر و encode، لغو و بررسی خروجی.
- **MCP Server:** واسط ایجنت روی عملیات معتبر API و renderer؛ بدون دسترسی آزاد به shell یا فایل‌سیستم.
- **Project Schema:** قرارداد مشترک frontend، renderer و ابزارهای ایجنت.

**مرز فعلی صف:** اجرای رندر و journal صف متعلق به Node و فایل `.nova/jobs.json` است. Laravel فعلاً صف رندر را با database queue خود orchestration نمی‌کند؛ وجود `QUEUE_CONNECTION=database` یا جدول رزروشدهٔ `render_records` به معنی استفادهٔ واقعی renderer از آن‌ها نیست.

پیش‌نمایش و خروجی هر دو از `NovaComposition` استفاده می‌کنند. فریم‌محور بودن و حذف تصادف کنترل‌نشده، تضمین بایت‌به‌بایت یکسان روی همهٔ مرورگرها، درایورهای WebGL، فونت‌های سیستم و encoderها نیست. Laravel برای ذخیره یا restore پروژه، مدل را از طریق `/worker/validate` بررسی می‌کند؛ بنابراین **worker باید حتی برای ذخیرهٔ پروژه هم فعال باشد**.

نمودار و تصمیم‌ها در [معماری](docs/ARCHITECTURE.md) و [ADRها](docs/adr) آمده‌اند.

### فناوری‌ها و نسخه‌های مستقیم مهم

نسخه‌های دقیق وابستگی‌های Node در `package.json` و نسخه‌های PHP در `apps/backend/composer.json` تثبیت شده‌اند. lockfileها وابستگی‌های غیرمستقیم را نیز ثبت می‌کنند.

- React / React DOM: `19.3.1`
- TypeScript: `7.0.2`، با strict mode.
- Vite: `8.3.8`
- Tailwind CSS: `4.3.5`
- Zustand: `5.1.0`
- TanStack React Query: `5.108.2`
- Zod: `4.6.7`
- Remotion، Player، Renderer، Bundler و Three: همگی `4.0.545`
- Three.js: `0.187.0`
- React Three Fiber: `9.8.2`
- React Three Drei: `10.7.9`
- MCP SDK: `1.32.2`
- Express: `5.3.0`
- Sharp: `0.35.5`
- Laravel Framework: `13.43.0`
- PHPUnit: `12.5.45`
- Vitest: `5.1.1`
- Playwright Test: `1.65.1`

Radix برای dialog و tooltip و Lucide برای آیکن‌ها استفاده می‌شود. نصب بودن کتابخانه‌ای در dependencies به معنی استفادهٔ تمام قابلیت‌های آن در UI نیست؛ برای نمونه، تعامل اصلی تایم‌لاین با pointer eventهای خود برنامه پیاده شده است.

<a id="workflow"></a>

## صفحه‌ها و جریان کار

### Projects

- نمایش پروژه‌های ذخیره‌شده، thumbnail، زمان و تعداد صحنه‌ها.
- ساخت پروژهٔ جدید بر پایهٔ پیش‌فرض فعلی؛ پروژهٔ اولیه یک قالب وب‌سایت است، نه تایم‌لاین کاملاً خالی.
- جست‌وجو، تغییر نام، تکثیر، آرشیو و بازگرداندن از آرشیو.
- باز کردن پروژه برای ویرایش.
- ورود JSON یا ZIP پشتیبان.
- حذف دائمی با تأیید صریح؛ آرشیو با حذف دائمی متفاوت است.

### Studio

- کتابخانهٔ صحنه‌ها، دارایی‌ها، متن، حرکت و صدا.
- Player زنده، پخش، توقف، حرکت فریم‌به‌فریم و جابه‌جایی playhead.
- Inspector با بخش‌های Design و Motion.
- تایم‌لاین مستقل صحنه و لایه‌ها.
- انتخاب و جابه‌جایی لایهٔ انتخاب‌شده روی پیش‌نمایش.
- تغییر اندازهٔ پنل‌ها، جمع‌کردن کتابخانه/Inspector و کنترل Inspector روی نمایشگر کوچک.
- نمایش محدودهٔ راهنمای safe zone؛ این خطوط کمکی هستند، نه تضمین تطبیق با تمام نسخه‌های رابط Instagram.
- undo/redo و ذخیرهٔ خودکار.

### Templates

- جست‌وجو و فیلتر خانواده‌های قالب.
- پیش‌نمایش واقعی ترکیب‌بندی با Player.
- ساخت پروژه از قالب.
- ذخیرهٔ پروژهٔ جاری به‌عنوان قالب شخصی و استفادهٔ دوباره از آن.

تصویر معرفی کارت قالب می‌تواند artwork برنامه‌نویسی‌شده باشد؛ پنجرهٔ Preview، ترکیب‌بندی واقعی را نشان می‌دهد. API و ابزار MCP فهرست قالب‌های داخلی را از پکیج مشترک می‌گیرند؛ قالب‌های ذخیره‌شدهٔ کاربر مسیر API جدا دارند.

### Assets

- آپلود با انتخاب فایل یا drag-and-drop.
- جست‌وجو و فیلتر بر اساس نوع رسانه.
- افزودن دارایی به صحنه، با کلیک یا انداختن روی preview.
- افزودن فونت واردشده به پروژه و استفاده از آن در لایهٔ متن.
- ذخیرهٔ metadata شامل نام، نوع، MIME، اندازه، tag و folder.

API ویرایش tag/folder دارد؛ UI فعلی یک مدیریت کامل پوشه‌ها یا ویرایشگر جامع metadata ارائه نمی‌دهد.

### Renders

- صف و وضعیت واقعی کارها: در انتظار، در حال رندر، کامل، ناموفق یا لغوشده.
- درصد پیشرفت و log واقعی renderer.
- دانلود فایل تکمیل‌شده.
- لغو کار در انتظار/فعال و retry کار ناموفق یا لغوشده.

برنامه دکمهٔ بازکردن آزاد مسیرهای سیستم‌عامل یا مدیریت فایل عمومی ندارد.

### Settings

- اندازه و FPS پیش‌فرض پروژه‌های جدید.
- تعداد frame workerهای هر رندر.
- تنظیمات اتصال ایجنت و Ollama.
- توکن API برای نشست مرورگر.
- پروفایل برند و اعمال رنگ/فونت برند روی پروژه.
- export JSON و backup پروژه.
- نمایش پاسخ واقعی health موتور.

برخی فیلدهای تنظیمات فقط ذخیره می‌شوند و هنوز رفتار اجرایی کامل ندارند؛ جزئیات در [تنظیمات](#configuration) آمده است.

### یک جریان کار معمول

1. از Templates یک قالب انتخاب کنید یا در Projects پروژه بسازید.
2. صحنه را انتخاب و عنوان، توضیح، رنگ، مدت و انتقال را تنظیم کنید.
3. تصویر، اسکرین‌شات، ویدیو یا صدای خود را وارد کنید.
4. لایهٔ متن/رسانه را روی تایم‌لاین انتخاب کنید و transform یا keyframe بدهید.
5. پیش‌نمایش را پخش و نقاط مهم را scrub کنید.
6. ذخیره را در toolbar بررسی کنید؛ پیام خطا به معنی ذخیرهٔ موفق نیست.
7. از Export ابتدا frame، contact sheet یا draft بگیرید.
8. نتیجه را ببینید و سپس نسخهٔ نهایی را رندر کنید.
9. برای انتقال پروژه به نصب دیگر، ZIP پشتیبان بگیرید.

<a id="timeline"></a>

## تایم‌لاین و میانبرها

زمان داخلی با عدد صحیح فریم ذخیره می‌شود. تایم‌کد رابط به شکل `MM:SS:FF` است؛ بخش آخر شمارهٔ فریم در ثانیه است، نه میلی‌ثانیه.

قابلیت‌های فعلی:

- جابه‌جایی صحنه و لایه در محدودهٔ معتبر.
- trim انتهای راست کلیپ.
- split در playhead.
- duplicate، حذف، copy/paste و انتخاب چندگانه با Shift.
- snapping به مرز صحنه‌ها؛ آستانهٔ فعلی `fps / 4` فریم است.
- ripple برای عملیات پشتیبانی‌شدهٔ صحنه‌ها.
- lock و visibility تراک‌ها.
- mute و solo تراک صوتی.
- zoom تایم‌لاین و playhead فریم‌محور.
- grouping پایه و انتخاب گروهی لایه‌ها.
- تاریخچهٔ undo تا ۵۰ snapshot در نشست فعلی.

لایه به صحنهٔ والد تعلق دارد و نمی‌تواند از بازهٔ زمانی آن بیرون بزند. جابه‌جایی آزاد بین تراک‌ها، nested scene، slip/roll و trim لبهٔ چپ هنوز وجود ندارند. split صحنه یک نمونهٔ جدید از preset ایجاد می‌کند؛ تضمین تداوم فاز تمام انیمیشن‌های preset یا منحنی‌ها مانند NLE حرفه‌ای ارائه نشده است.

میانبرها:

- `Space`: پخش/توقف در ادیتور.
- `←` / `→`: یک فریم عقب/جلو.
- `Shift + ←` / `Shift + →`: یک ثانیه عقب/جلو.
- `S`: split انتخاب در playhead.
- `Ctrl/Cmd + D`: تکثیر انتخاب.
- `Delete` / `Backspace`: حذف انتخاب.
- `Ctrl/Cmd + C` و `Ctrl/Cmd + V`: کپی و چسباندن انتخاب داخل برنامه.
- `Ctrl/Cmd + Z`: undo.
- `Ctrl/Cmd + Shift + Z` یا `Ctrl/Cmd + Y`: redo.
- `Ctrl/Cmd + S`: ذخیره.
- `Esc`: بستن dialogها و Director.
- `?`: راهنمای میانبرها.

میانبرهای ویرایش هنگام تایپ داخل input، textarea یا select اجرا نمی‌شوند؛ ذخیره و Escape استثناهای مستقل دارند. نمایش `⌘ K` کنار بعضی جست‌وجوها در UI به معنی پیاده‌سازی command palette یا میانبر سراسری جست‌وجو نیست.

<a id="media-and-persian"></a>

## رسانه، فونت و فارسی

### ورودی‌های پذیرفته‌شدهٔ بک‌اند

- تصویر: PNG، JPEG، WebP، GIF و SVG ایستای محدودشده.
- ویدیو: MP4 و WebM؛ سازگاری نهایی به codec داخل container نیز وابسته است.
- صدا: WAV، MP3، OGG و FLAC.
- فونت: **WOFF2**.
- مدل سه‌بعدی: **GLB نسخهٔ ۲، مستقل و بدون فشرده‌سازی وابسته به decoder شبکه‌ای**.

نمایش پسوندی در file picker یا پذیرش container، تضمین decode همهٔ فایل‌های دارای آن پسوند نیست. TTF، OTF، WOFF و GLTF متنی در مسیر upload فعلی پشتیبانی کامل ندارند. SVG دارای script، event، stylesheet یا ارجاع خارجی رد می‌شود. GLB دارای ارجاع فایل/شبکهٔ خارجی یا وابستگی Draco / meshopt رد می‌شود.

محدودیت‌ها:

- upload از Studio/API: حداکثر `100 MiB` برای هر فایل.
- upload از MCP: حداکثر `8 MiB` بایت decodeشده؛ base64 سقف جدا دارد.
- تصویر: حداکثر ضلع ۱۶۳۸۴ و مجموع ۶۴ مگاپیکسل.
- waveform صوت: decode واقعی در مرورگر تا `25 MiB`؛ بزرگ‌تر بودن فایل صدا الزاماً مانع رندر آن نیست، اما waveform آن نمایش داده نمی‌شود.

نوع فایل از signature بررسی می‌شود و نام فایل اصلی مسیر ذخیره‌سازی نیست. فایل‌های ثبت‌شده با UUID در storage خصوصی نگهداری می‌شوند.

### فونت و متن فارسی

- Inter و Vazirmatn به‌صورت محلی همراه مجوز فونت ارائه می‌شوند.
- متن فارسی، RTL، متن ترکیبی و جهت `auto` / `rtl` / `ltr` قابل استفاده است.
- متن در DOM/Remotion شکل‌دهی می‌شود؛ برای رسم حروف فارسی از تولید تصویر استفاده نمی‌شود.
- presetهای فونت داخلی: `Inter`، `Vazirmatn`، `Georgia` و `monospace`.
- برای فونت آپلودی، دارایی فونت را به پروژه اضافه و مقدار `fontFamily` را به شکل `asset:<font-id>` انتخاب کنید.
- رندر منتظر بارگذاری فونت لازم می‌ماند؛ نبود فونت اجباری نباید پنهانی به یک خروجی ظاهراً موفق تبدیل شود.
- reveal تایپی RTL با ماسک روی متن شکل‌گرفته اجرا می‌شود تا اتصال حروف حفظ شود.

**مرز پشتیبانی:** محتوای ویدیو فارسی است، اما رابط برنامه هنوز ترجمهٔ کامل فارسی ندارد. ذخیرهٔ `language: fa` به معنی ترجمه‌شدن همهٔ UI نیست. فرمت خودکار اعداد فارسی و حل حرفه‌ای تمام حالت‌های mixed-direction هنوز تکمیل نشده‌اند. Georgia و monospace به فونت‌های سیستم نیز وابسته‌اند؛ برای جابه‌جایی مطمئن‌تر از فونت بسته‌بندی‌شده/ثبت‌شده استفاده کنید.

### صدا

لایه‌های صوتی از فایل واقعی استفاده می‌کنند و زمان شروع، `trimStart`، volume و keyframe حجم دارند. fade کوتاه ورود/خروج روی صدای لایه اعمال می‌شود و mute/solo در ترکیب‌بندی لحاظ می‌شود. waveform از decode واقعی ساخته می‌شود، نه شکل موج تصادفی.

تولید گویندگی، ترنسکریپت، تشخیص ضرب، ducking خودکار و normalization صوت در UI فعلی ارائه نشده‌اند. نمونه‌های همراه موسیقی سنتزشدهٔ اختصاصی دارند؛ آهنگ تجاری یا کتابخانهٔ دارای مجوز مبهم بسته‌بندی نشده است.

<a id="motion-and-3d"></a>

## صحنه‌ها، حرکت و سه‌بعدی

مدل فعلی ۱۲ نوع صحنه دارد:

```text
website, saas, glass, product, mobile, tech,
typography, education, before-after, brand, orbit, business
```

صحنه شامل نام و شناسه، زمان، رنگ زمینه و accent، عنوان و زیرعنوان، لایه‌ها، انتقال، افکت و دوربین است. لایه‌های کاربر از نوع `text`، `image`، `video`، `audio`، `shape` یا `model` هستند.

تراک‌ها علاوه بر این نوع‌ها، نوع‌های metadata مانند `effect` و `camera` را در schema می‌پذیرند؛ این پذیرش به معنی وجود ادیتور مستقل و کامل برای adjustment/camera track نیست.

### presetهای انیمیشن

```text
none, fade, slide, scale, spring, stagger, typewriter,
float, orbit, mask, perspective, parallax, elastic
```

انیمیشن‌های رندر با شمارهٔ فریم، interpolation، spring و مقادیر seeded محاسبه می‌شوند. timer رابط کاربری و autosave بخشی از زمان ویدیوی خروجی نیستند.

پارامترهای keyframe فعلی:

```text
x, y, scale, rotation, opacity, blur, fontSize, volume,
cameraX, cameraY, cameraZ
```

- keyframeهای عمومی لایه، transform/متن/صدا را کنترل می‌کنند.
- مختصات دوربین keyframeشده در مسیر مدل GLB پشتیبانی می‌شوند؛ همهٔ صحنه‌های آماده تمام این propertyها را مصرف نمی‌کنند.
- easingهای موجود: `linear`، `ease-in`، `ease-out`، `ease-in-out` و `spring`.
- graph فعلی نمایش مقادیر keyframe است؛ ویرایشگر حرفه‌ای منحنی با handleهای cubic Bézier نیست.
- keyframe رنگ و keyframe عمومی camera target / FOV هنوز در قرارداد فعلی وجود ندارند.

### انتقال و افکت

انتقال‌های پذیرفته‌شده:

```text
fade, slide, zoom, blur, wipe, flash, glitch, rotate, none
```

مدت انتقال بر حسب فریم تنظیم می‌شود؛ مدل فعلی مجموعهٔ کامل پارامترهای مستقل direction/intensity برای همهٔ انتقال‌ها ندارد.

نام‌های کاتالوگ افکت:

```text
grain, vignette, bloom, scanlines, chromatic, particles, light-sweep, glass
```

پیاده‌سازی‌ها متناسب با preset هستند. برای مثال، bloom / chromatic می‌توانند تقریب روی تایپوگرافی باشند و ظاهر glass در صحنه‌های خاص ساخته می‌شود؛ فعال‌کردن یک نام، تضمین شبیه‌سازی اپتیکی کامل یا اثر یکسان روی همهٔ صحنه‌ها نیست.

### سه‌بعدی واقعی و نمایش دوبعدی

بخشی از صحنه‌ها از ThreeCanvas، Three.js و React Three Fiber برای هندسهٔ واقعی، نور، material و دوربین استفاده می‌کنند. بخش دیگری، مانند نمایش دوبعدی برخی browser/UI cardها، با CSS perspective و حرکت فریم‌محور ساخته شده است.

پارامترهای فعلی دوربین:

- projection: `perspective` یا `orthographic`.
- path: `orbit`، `dolly-in`، `dolly-out`، `truck`، `crane` یا `static`.
- intensity بین صفر و ۳.
- FOV بین ۱۵ و ۱۲۰.

مدل GLB واردشده و تصویر ثبت‌شده می‌توانند در مسیرهای پشتیبانی‌شده استفاده شوند. تغییر تمام پارامترهای دوربین روی هر artwork دوبعدی اثر مستقل ندارد. در نبود WebGL مسیر fallback وجود دارد؛ این مسیر به معنی اجرای موفق رندر سه‌بعدی با GPU نیست.

جزئیات artwork داخلی presetها همیشه به‌صورت لایهٔ مستقل UI در دسترس نیستند. برای تغییر ساختار داخلی browser، chart یا material، workflow توسعهٔ محلی در [راهنمای تألیف](docs/AUTHORING.md) را ببینید.

<a id="templates"></a>

## قالب‌های داخلی

مدت‌ها، مدت پیش‌فرض `createProject(templateId)` در ۳۰ FPS هستند و قابل تغییرند:

1. `website` — **Cinematic Website Showcase**، معرفی وب‌سایت؛ ۲۰ ثانیه.
2. `saas` — **Luxury SaaS Commercial**، داشبورد و analytics؛ ۳۰ ثانیه.
3. `glass` — **Floating Glass UI**، پنل‌های شفاف؛ ۱۸ ثانیه.
4. `product` — **Product, Elevated**، معرفی محصول؛ ۲۰ ثانیه.
5. `mobile` — **Mobile Application Showcase**، معرفی اپ موبایل؛ ۱۸ ثانیه.
6. `tech` — **Dark Technology Commercial**، فضای تکنولوژی؛ ۲۰ ثانیه.
7. `typography` — **Kinetic Typography Reel**، تایپوگرافی متحرک؛ ۱۵ ثانیه.
8. `education` — **Ideas in Motion**، توضیح مرحله‌ای؛ ۲۴ ثانیه.
9. `before-after` — **Website Before & After**، مقایسهٔ قبل و بعد؛ ۲۰ ثانیه.
10. `brand` — **Premium Brand Reveal**، معرفی هویت؛ ۱۲ ثانیه.
11. `orbit` — **3D Product Orbit**، نمایش محصول سه‌بعدی؛ ۱۸ ثانیه.
12. `business` — **Cinematic Business Advertisement**، متن پیش‌فرض فارسی؛ ۱۸ ثانیه.

این‌ها خانواده‌های متفاوت‌اند؛ همهٔ صحنه‌های یک پروژه لزوماً از نوع یکسان نیستند. بیشتر قالب‌ها سه صحنه دارند و بخش پایانی می‌تواند `brand` باشد. مشخصات دقیق در [پکیج قالب‌ها](packages/templates/index.ts) است.

<a id="project-schema"></a>

## مدل پروژه و نمونه JSON

منبع حقیقت، [ProjectSchema](packages/project-schema/index.ts) است. نسخهٔ JSON Schema تولیدشده در [public/schema/project-v1.json](public/schema/project-v1.json) قرار دارد:

```bash
npm run schema
```

JSON Schema ساختار را توصیف می‌کند؛ قواعد معنایی اضافی مانند یکتا بودن شناسه‌ها، ارجاع تراک و قرارگرفتن لایه داخل صحنه در Zod اجرا می‌شوند. اعتبارسنجی صرف با یک JSON Schema خارجی جایگزین validator برنامه نیست.

قواعد زمان و مختصات:

- `scene.startFrame`: زمان مطلق روی پروژه.
- `layer.startFrame`: نسبت به شروع صحنه.
- `keyframe.frame`: نسبت به شروع لایه.
- `duration`: تعداد فریم مثبت؛ FPS از پروژه می‌آید.
- `trimStart`: offset رسانه بر حسب فریم.
- `x`، `y`، `width` و `height` لایه: درصد ترکیب‌بندی؛ x/y در transform معمول نقطهٔ مرکزی لایه هستند.
- `fontSize`: اندازهٔ مرجع متناسب با عرض ۱۰۸۰ در renderer لایه؛ خروجی در رزولوشن دیگر scale می‌شود.
- رشته‌ها و فیلدهای اضافهٔ اجرایی پذیرفته نمی‌شوند؛ JSON حاوی JavaScript یا expression قابل اجرا نیست.

یک ورودی معتبر کوتاه؛ مقادیر اختیاری پس از parse با پیش‌فرض‌های schema تکمیل می‌شوند:

```json
{
  "schemaVersion": 1,
  "id": "readme-example-project",
  "name": "اولین ویدیوی من",
  "description": "نمونهٔ پنج ثانیه‌ای فارسی",
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "createdAt": "2026-11-22T00:00:00Z",
  "updatedAt": "2026-11-22T00:00:00Z",
  "archived": false,
  "brand": {
    "name": "NOVA Studio",
    "primary": "#2563EB",
    "secondary": "#06B6D4",
    "background": "#09090B",
    "font": "Vazirmatn",
    "cta": "ایدهٔ بعدی را بساز"
  },
  "tracks": [
    {
      "id": "visual",
      "name": "صحنه‌ها",
      "type": "scene"
    }
  ],
  "assets": [],
  "scenes": [
    {
      "id": "scene-01",
      "name": "آغاز",
      "type": "business",
      "startFrame": 0,
      "duration": 150,
      "title": "ایدهٔ بعدی را بساز.",
      "subtitle": "ساخته شده با NOVA",
      "eyebrow": "استودیوی موشن شخصی",
      "layers": []
    }
  ]
}
```

شناسهٔ نمونه را برای هر پروژهٔ جدید عوض کنید؛ ساخت دوباره با شناسهٔ موجود خطای conflict می‌دهد. این نمونه را می‌توان در فایل `project.json` ذخیره و در UI یا API اعتبارسنجی کرد.

### سقف‌های مدل

- حداکثر ۱۰۰ صحنه.
- حداکثر ۲۰۰ لایه در هر صحنه.
- حداکثر ۳۰ تراک.
- حداکثر ۵۰۰ دارایی در پروژه.
- حداکثر ۱۰۰۰ keyframe در هر لایه.
- بیشینهٔ طول پروژه: ۱۸۰۰ ثانیه، با رعایت سقف‌های عددی فریم.
- فیلدهای زمان سقف مستقل ۱۰۸۰۰۰ فریم دارند و سقف انتهای پروژه نیز `fps × 1800` است؛ هر دو قاعده بررسی می‌شوند.
- عرض و ارتفاع پروژه، هرکدام عدد صحیح بین ۲۵۶ و ۳۸۴۰.
- FPS مجاز: ۲۴، ۲۵، ۳۰ و ۶۰.
- فقط `schemaVersion: 1` پشتیبانی می‌شود؛ migration بین نسخه‌های تاریخی schema هنوز ارائه نشده است.

برای ساخت معتبر از کد محلی، `createProject` / `createScene`، `makeLayer`، `uid` و `rescaleFps` در پکیج‌های مشترک وجود دارند. تغییر صرف عدد FPS بدون rescale زمان‌ها می‌تواند مدت واقعی ویدیو را تغییر دهد.

<a id="rendering"></a>

## رندر و فرمت خروجی

### خط لولهٔ واقعی

1. دریافت snapshot کامل پروژه و بررسی schema/محدودیت‌ها.
2. بررسی ارجاع رسانه و فونت لازم.
3. ایجاد job واقعی و ثبت hash پروژه و تنظیمات.
4. تهیه یا استفادهٔ مجدد از bundle مشترک Remotion.
5. بارگذاری فونت‌ها و رسانهٔ ثبت‌شده در Chromium.
6. رندر فریم‌ها و ترکیب صدا.
7. encode و بررسی خروجی با FFprobe.
8. ساخت thumbnail، ثبت metadata و ارائهٔ URL محلی خروجی.

وجود job یا رسیدن به انتهای encode به‌تنهایی وضعیت `completed` ایجاد نمی‌کند؛ خروجی باید بررسی شود. برای MP4، renderer ابعاد، FPS، مدت و وجود H.264 / AAC / `yuv420p` را بررسی می‌کند.

### فرمت‌های فعلی

- **MP4:** H.264، AAC، `yuv420p`، BT.709 و `+faststart`.
- **WebM:** VP8 و Opus.
- **PNG:** یک فریم یا contact sheet.

renderer یک تراک صوتی را الزام می‌کند؛ پروژهٔ بدون صدای کاربر می‌تواند تراک صوتی سکوت داشته باشد. وجود AAC به‌تنهایی نشانهٔ داشتن موسیقی یا گوینده نیست.

PNG sequence، GIF، ویدیوی شفاف و مسیر NVENC/hardware encoding فعلاً خروجی‌های پیاده‌شده نیستند.

### presetها

- `draft`: عرض ۵۴۰ برای عمودی یا ۹۶۰ برای افقی؛ CRF برابر ۲۸.
- `instagram`: عرض ۱۰۸۰ برای عمودی یا ۱۹۲۰ برای افقی؛ CRF برابر ۲۰.
- `high`: ابعاد خود پروژه، با گردکردن خروجی به عدد زوج؛ CRF برابر ۱۶.
- `4k`: عرض هدف ۲۱۶۰ برای عمودی یا ۳۸۴۰ برای افقی؛ CRF برابر ۲۰.

نسبت تصویر پروژه حفظ می‌شود. اگر ضلع بلند از ۳۸۴۰ بیشتر شود، خروجی کوچک می‌شود. عنوان preset الزاماً به معنی یک نسبت تصویر ثابت نیست؛ در پروژهٔ استاندارد ۹:۱۶، Instagram برابر ۱۰۸۰×۱۹۲۰ و 4K برابر ۲۱۶۰×۳۸۴۰ است.

بدنهٔ JSON ورودی worker حداکثر حدود `5 MiB` است. بک‌اند سند پروژه را نیز با سقف سریال‌شدهٔ `8 MiB` بررسی می‌کند، اما چون اعتبارسنجی به worker واگذار می‌شود، سقف پایین‌تر worker می‌تواند زودتر اعمال شود.

برای frame و contact sheet، بزرگ‌ترین ضلع فریم ورودی بازبینی حداکثر ۹۶۰ می‌شود. contact sheet داخلی نمایندهٔ صحنه‌هاست، نه خروجی تمام فریم‌ها: برای پروژه‌های بیش از سه صحنه، از ابتدا، میانه و انتها نمونه‌برداری می‌کند. در معرفی NOVA، اسکریپت اختصاصی جداگانه از هر هفت صحنه فریم گرفته است.

### صف و منابع

- فقط **یک job هم‌زمان** اجرا می‌شود.
- تعداد jobهای فعال و در انتظار روی هم حداکثر ۱۲ است.
- frame workerهای یک job بین ۱ و ۴ محدود می‌شوند؛ پیش‌فرض ۲.
- `NOVA_RENDER_CONCURRENCY` در صورت تعیین، بر مقدار ذخیره‌شدهٔ `settings.concurrency` مقدم است.
- سقف pixel ثبت‌شدهٔ worker برابر `3840 × 3840` است؛ این سقف مجوز توصیه‌شدهٔ اجرای رندر سنگین روی همهٔ سخت‌افزارها نیست.
- progress مقدار واقعی صفر تا یک است، نه عدد صفر تا صد.
- وضعیت‌ها: `queued`، `rendering`، `completed`، `failed` و `cancelled`.
- retry یک job جدید با شناسهٔ جدید می‌سازد.
- پس از restart، کارهای نیمه‌تمام به `failed` تبدیل می‌شوند و باید retry شوند؛ ادامهٔ رندر از فریم نیمه‌تمام پیاده نشده است.
- لغو ویدیو از cancel signal استفاده می‌کند؛ در عملیات still/contact sheet توقف می‌تواند در مرز مرحلهٔ جاری انجام شود.

برای یک storage مشترک فقط یک worker فعال اجرا کنید. روی هدف ۸ گیگابایت VRAM، شروع با یک job و ۲ frame worker محافظه‌کارانه‌تر است؛ کارایی واقعی باید روی میزبان خودتان اندازه‌گیری شود. مقدار حافظه در Settings هنوز محدودیت سخت RAM/VRAM ایجاد نمی‌کند.

<a id="configuration"></a>

## تنظیمات و متغیرهای محیطی

### فایل‌ها

- `.env` در ریشه: متغیرهای فرایندهای Node؛ نمونه در [.env.example](.env.example).
- `apps/backend/.env`: تنظیمات Laravel؛ نمونه در [نمونهٔ بک‌اند](apps/backend/.env.example).
- `NOVA_API_TOKEN`، اگر فعال شود، باید بین backend، worker و MCP سازگار باشد.

فرمان‌های Node اصلی با `--env-file-if-exists=.env` اجرا می‌شوند. نبود فایل ریشه خطا نیست؛ پیام Node دربارهٔ ادامه‌دادن بدون `.env` به‌تنهایی نشانهٔ شکست برنامه نیست. فرمان‌های مستقیم `node --import tsx ...` خودکار این فایل را بارگذاری نمی‌کنند؛ برای آن‌ها همین flag را اضافه یا متغیر را در محیط export کنید. متغیرهای فایل `.env` نیز خودکار متغیر shell برای فرمانی مانند curl نمی‌شوند.

### متغیرهای شناخته‌شده

- `NOVA_RENDER_CONCURRENCY`: تعداد frame worker، محدودشده به ۱ تا ۴؛ اولویت بالاتر از Settings.
- `NOVA_CHROME_PATH`: مسیر واقعی Chrome/Chromium.
- `NOVA_API_TOKEN`: توکن اختیاری API؛ backend روی `/api/*` آن را بررسی می‌کند. worker برای درخواست فاقد Origin نیز آن را بررسی می‌کند و Originهای محلی مجاز را جداگانه اعتماد می‌کند.
- `NOVA_MCP_TOKEN`: توکن لازم HTTP MCP؛ حداقل ۳۲ نویسه و بدون فاصلهٔ ابتدا/انتها.
- `NOVA_MCP_SCOPE`: فقط برای HTTP MCP؛ `read` یا `full`، پیش‌فرض `full`.
- `NOVA_WORKER_PORT`: پورت listener سرویس رندر؛ پیش‌فرض ۸۰۰۱.
- `NOVA_WORKER_URL`: URL validator در تنظیمات Laravel؛ پیش‌فرض `http://127.0.0.1:8001`.
- `NOVA_BACKEND_URL`، `NOVA_WORKER_URL` و `NOVA_DEMO_PRESET`: overrideهای اسکریپت `scripts/render-demos.ts`؛ این‌ها تنظیم عمومی تمام کلاینت‌ها نیستند.

**پورت‌ها به‌طور کامل قابل تعویض از یک متغیر نیستند.** راه‌انداز، proxy، MCP و مسیر برخی رسانه‌ها همچنان از پورت‌های ثابت پیش‌فرض استفاده می‌کنند. تغییر تنها `NOVA_WORKER_PORT` همهٔ آن‌ها را به‌روز نمی‌کند. برای اجرای معمول همان ۵۱۷۳، ۸۰۰۰ و ۸۰۰۱ را نگه دارید. سرور Studio با `strictPort` روی پورت اشغال‌شده شکست می‌خورد و پنهانی به پورت دیگر نمی‌رود.

اگر `.env.example` را به `.env` کپی کنید، `NOVA_RENDER_CONCURRENCY=2` فعال خواهد بود. برای کنترل این مقدار از Settings، خط override را کامنت یا حذف و worker را restart کنید.

### وضعیت واقعی تنظیمات ذخیره‌شده

- `defaultWidth`، `defaultHeight` و `defaultFps`: در ساخت پروژهٔ جدید از UI استفاده می‌شوند؛ پروژهٔ موجود را خودکار تغییر نمی‌دهند.
- `concurrency`: تعداد frame workerهای رندر، در صورت نبود override محیطی.
- `maxConcurrentRenders`: در قرارداد فعلی فقط مقدار ۱؛ صف واقعی Node نیز serial است.
- `provider`، `providerModel` و `providerUrl`: تنظیمات adapter داخلی Ollama.
- `memoryLimitMb`: ذخیره می‌شود، اما محدودکنندهٔ سخت حافظهٔ renderer نیست.
- `cacheLimitMb`: ذخیره می‌شود، اما پاک‌سازی خودکار cache بر اساس آن پیاده نشده است.
- `quality`: ذخیره می‌شود؛ انتخاب واقعی export با preset درخواست رندر انجام می‌شود و این فیلد را پیش‌فرض اجباری همهٔ dialogها فرض نکنید.
- `language`: ذخیره می‌شود؛ ترجمهٔ کامل UI هنوز وجود ندارد.
- `safeZones`: preference ذخیره‌شده است؛ راهنمای روی preview کنترل موقت خودش را دارد و همگام‌سازی کامل پیش‌فرض آن با همهٔ نشست‌ها تضمین نشده است.
- `storageLocation`: مسیر پیش‌فرض را گزارش می‌کند؛ ابزار کامل جابه‌جایی storage از UI وجود ندارد.

### توکن مرورگر

در صورت فعال‌کردن API token، از **Settings → AI & connections → Local API access** آن را برای نشست مرورگر وارد کنید. مقدار در `sessionStorage` همان نشست نگهداری می‌شود؛ برنامه در این بخش توکن جدید صادر یا OAuth راه‌اندازی نمی‌کند. توکن را در پروژهٔ JSON، source control یا prompt عمومی قرار ندهید.

<a id="storage-and-backup"></a>

## ذخیره‌سازی و پشتیبان‌گیری

مسیرهای پیش‌فرض:

- SQLite: `apps/backend/database/database.sqlite`
- فایل‌های ثبت‌شده: `apps/backend/storage/app/private/assets/`
- فایل موقت backup: `apps/backend/storage/app/private/backups/`
- journal صف و snapshot رندرها: `.nova/jobs.json`
- bundle cache: `.nova/bundle/`
- خروجی renderer و metadata: `.nova/outputs/`
- وضعیت فرایندهای راه‌انداز: `.nova/processes.json`
- نمونه‌های تحویلی: `examples/output/` و `examples/nova-intro/`

SQLite و storage خصوصی و `.nova` عمداً از Git کنار گذاشته شده‌اند. clone کردن مخزن به معنی کپی پروژه‌های شخصیِ ذخیره‌شده در SQLite نیست؛ نمونه‌های همراه مسیرهای تحویلی جدا دارند.

### سه نوع تاریخچهٔ متفاوت

1. **draft مرورگر:** پروژهٔ جاری در `localStorage` با کلید `nova-draft`؛ کمک به بازیابی نشست، نه backup همهٔ پروژه‌ها.
2. **undo/redo:** snapshotهای نشست ادیتور؛ بعد از بارگذاری مجدد نشست جدید محسوب می‌شود.
3. **revision سرور:** ذخیره‌های تأییدشده در SQLite؛ restore یک revision جدید می‌سازد و تاریخچهٔ قبلی را جایگزینِ بی‌ردپا نمی‌کند.

autosave با debounce حدود یک ثانیه انجام می‌شود. اگر API یا validator در دسترس نباشد، پیام خطا نمایش داده می‌شود؛ نگهداری draft محلی جای ذخیرهٔ موفق سرور را نمی‌گیرد.

### JSON در برابر ZIP

- **JSON:** مدل، برند داخل پروژه و ارجاع رسانه‌ها را دارد؛ بایت رسانه‌ها را ندارد.
- **ZIP پروژه:** `project.json` و فایل‌های موجود در `project.assets`، از جمله فونت آپلودی، را همراه می‌کند.
- فونت‌های داخلی را نصب سازگار NOVA فراهم می‌کند؛ همهٔ فونت‌های سیستم در ZIP جمع‌آوری نمی‌شوند.
- ZIP یک پروژه، revisionها، همهٔ برندهای ذخیره‌شده، تنظیمات عمومی، تمام قالب‌ها یا خروجی‌های رندر را شامل نمی‌شود.

برای backup در UI، ابتدا ذخیرهٔ موفق را بررسی و سپس از **Settings → Workspace** فایل ZIP بگیرید. در نصب مقصد، از **Projects → Import project** ZIP را وارد کنید. پروژه و دارایی‌ها شناسهٔ جدید می‌گیرند و ارجاع رسانه/فونت remap می‌شود؛ پروژهٔ قبلی حذف نمی‌شود.

محدودیت import ZIP: فایل upload تا `100 MiB`، حداکثر ۵۰۱ entry، مجموع uncompressed تا `200 MiB`، هر entry تا `100 MiB` و manifest تا `8 MiB`؛ سقف مؤثر JSON می‌تواند به validator پایین‌دستی نیز محدود شود. entry ناشناخته، مسیر traversal، نام تکراری یا symlink رد می‌شود. اگر دارایی لازم موجود نباشد، backup/restore باید خطا بدهد.

### backup کامل ورک‌استیشن و نگهداری دیسک

برای backup کامل، سرویس‌ها را متوقف و SQLite، storage خصوصی و در صورت نیاز `.nova` و خروجی‌ها را با هم کپی کنید. فایل `.env` حاوی رازهاست و باید جداگانه و امن نگهداری شود؛ archive قابل اشتراک عمومی مناسبی نیست.

حذف cache، تغییر ریشهٔ storage و retention خروجی‌ها خودکار و کامل نیستند. worker هنگام شروع فقط آخرین ۲۰۰ رکورد journal را بارگذاری می‌کند؛ این کار فایل‌های قدیمی خروجی را لزوماً از دیسک پاک نمی‌کند. قبل از پاک‌سازی دستی، backup و وضعیت jobهای فعال را بررسی کنید. فایل‌های موردنیاز پروژه را صرفاً با پاک‌کردن پوشه حذف نکنید.

<a id="backend-api"></a>

## API بک‌اند

مبنای آدرس: `http://127.0.0.1:8000`. frontend همین مسیرها را از proxy پورت ۵۱۷۳ مصرف می‌کند.

پاسخ collectionها معمولاً آرایهٔ مستقیم است و پروژه به‌صورت سند کامل canonical برمی‌گردد، نه لزوماً envelope از نوع `{data: ...}`. upload فایل و restore ZIP با `multipart/form-data` و فیلد `file` هستند.

### پروژه و نسخه‌ها

```text
GET     /api/health
GET     /api/projects
POST    /api/projects
GET     /api/projects/{id}
PUT     /api/projects/{id}
DELETE  /api/projects/{id}
GET     /api/projects/{id}/versions
GET     /api/projects/{id}/versions/{version}
POST    /api/projects/{id}/versions/{version}/restore
GET     /api/projects/{id}/backup
POST    /api/projects/import-backup
```

- POST / PUT پروژه، سند کامل را می‌گیرند؛ PUT شناسهٔ سند را تغییر نمی‌دهد.
- آرشیو با `archived: true` در ذخیرهٔ پروژه انجام می‌شود.
- DELETE به بدنهٔ `{"confirm": true}` نیاز دارد.
- `version` شمارهٔ revision همان پروژه است، نه شناسهٔ دلخواه یک ردیف دیگر.
- restore مستقیم API revision تازه ایجاد می‌کند؛ ابزار MCP برای این کار تأیید صریح جداگانه می‌خواهد.
- حذف پروژه را معادل حذف خودکار تمام فایل‌های رسانه یا خروجی‌های رندر فرض نکنید.

### دارایی‌ها و رسانه

```text
GET     /api/assets
GET     /api/assets/{id}
POST    /api/assets
PATCH   /api/assets/{id}
DELETE  /api/assets/{id}
GET     /storage/assets/{generated-filename}
```

PATCH metadata شامل `name`، `tags` و `folder` است. حذف دارایی تأیید می‌خواهد و اگر در پروژهٔ جاری ثبت‌شده‌ای ارجاع شود رد می‌شود؛ این محافظت را garbage collector جامع تمام revisionها و رندرهای تاریخی فرض نکنید.

### تنظیمات، برند، قالب و فعالیت

```text
GET     /api/settings
PUT     /api/settings
GET     /api/brands
POST    /api/brands
PUT     /api/brands/{id}
GET     /api/templates
POST    /api/templates
GET     /api/activity
POST    /api/activity
GET     /api/storage
GET     /api/director/status
POST    /api/director
```

- POST قالب شخصی: `{ "project": <canonical-project> }`.
- POST فعالیت: `{ "action": "...", "subject": "...", "details": {} }`؛ جزئیات محدود و کلیدهای دارای نام رازها redact می‌شوند.
- POST Director: `{ "prompt": "...", "project": <canonical-project> }`؛ نتیجه پیشنهادی را برمی‌گرداند و خودکار ذخیره یا رندر نمی‌کند.
- برند ذخیره‌شده شامل نام، primary، secondary، background، font و CTA است؛ فونت brand profile فعلاً از چهار preset داخلی است.

### نمونهٔ اعتبارسنجی و upload

با داشتن `project.json` معتبر در پوشهٔ فعلی:

```bash
curl -sS -H 'Content-Type: application/json' \
  --data-binary @project.json \
  http://127.0.0.1:8001/worker/validate
```

وارد کردن تصویر محلی:

```bash
curl -sS -F 'file=@screenshot.png' http://127.0.0.1:8000/api/assets
```

در صورت فعال بودن token، header مجاز `Authorization: Bearer ...` را نیز از محیط امن خود اضافه کنید. این نمونه‌ها فایل‌ها را به سرویس محلی می‌فرستند؛ URL اینترنتی یا مسیر آزاد سمت سرور ثبت نمی‌کنند.

نمونه‌های curl بالا با syntax شل Bash نوشته شده‌اند؛ در PowerShell در صورت وجود alias از `curl.exe` و شکل مناسب نقل‌قول/ادامهٔ خط استفاده کنید.

خطاهای قابل انتظار شامل ۴۰۱ احراز هویت، ۴۰۳ مبدأ/میزبان نامجاز، ۴۰۴ مورد ناموجود، ۴۰۹ تعارض، ۴۱۳ حجم، ۴۲۲ اعتبارسنجی، ۴۲۹ محدودیت نرخ و ۵۰۳ سرویس validator ناموجود هستند. همهٔ مسیرها الزاماً برای یک نوع خطا کد کاملاً یکسانی تولید نمی‌کنند؛ متن پاسخ را هم بررسی کنید.

جزئیات پیاده‌سازی در [راهنمای بک‌اند](docs/backend.md) و [routes/api.php](apps/backend/routes/api.php) قرار دارد.

<a id="render-api"></a>

## API سرویس رندر

مبنای آدرس: `http://127.0.0.1:8001`.

```text
GET   /worker/health
POST  /worker/validate
GET   /worker/schema
GET   /worker/catalog
GET   /worker/jobs
POST  /worker/jobs
GET   /worker/jobs/{id}
POST  /worker/jobs/{id}/cancel
POST  /worker/jobs/{id}/retry
POST  /worker/frame
POST  /worker/contact-sheet
GET   /worker/outputs/{generated-file}
```

بدنهٔ job ویدیو شامل `project` کامل، `preset` و `format` است. با همان `project.json` معتبر بخش قبل، می‌توان درخواست واقعی را بدون تکرار سند در راهنما ساخت:

```bash
node --input-type=module -e "import fs from 'node:fs'; const project = JSON.parse(fs.readFileSync('project.json', 'utf8')); fs.writeFileSync('render-request.json', JSON.stringify({project, preset: 'draft', format: 'mp4'}));"
curl -sS -H 'Content-Type: application/json' \
  --data-binary @render-request.json \
  http://127.0.0.1:8001/worker/jobs
```

برای کیفیت نهایی مقدار preset را مثلاً به `instagram` تغییر دهید. `frame` در درخواست `/worker/frame` شمارهٔ فریم مطلق است؛ renderer آن را در محدودهٔ قابل رندر clamp می‌کند.

POSTهای render با `202` یک job واقعی برمی‌گردانند. شناسه را از همان پاسخ بگیرید و `GET /worker/jobs/{id}` را poll کنید. درخواست شروع رندر تا پایان encode باز نمی‌ماند.

فیلدهای مهم job: `id`، `kind`، `status`، `progress`، `logs`، `projectId`، `projectName`، `projectHash`، زمان‌ها، `output`، `thumbnail`، `metadata` و در صورت شکست `error`.

metadata خروجی ویدیو شامل ابعاد/FPS/تنظیمات، تعداد frame worker، hashها و اطلاعات stream و container از FFprobe است. هش منبع موتور در حال حاضر از فایل اصلی ترکیب‌بندی ساخته می‌شود؛ آن را hash جامع همهٔ وابستگی‌ها و فایل‌های رسانه فرض نکنید.

فایل تنها وقتی از endpoint خروجی قابل دریافت است که job مربوط تکمیل شده و نام فایل generated مجاز باشد. URL محلی را نمی‌توان از دستگاه یا کلاینت ابری فاقد دسترسی به میزبان مستقیماً دانلود کرد.

<a id="agent-and-mcp"></a>

## ایجنت، MCP و Director

### سه روش کنترل

1. **ویرایش دستی:** بدون مدل هوش مصنوعی.
2. **ایجنت خارجی:** ساخت/ویرایش مدل پروژه با MCP یا JSON؛ renderer محلی مستقل از اشتراک آن ایجنت کار می‌کند.
3. **Ollama اختیاری:** پیشنهاد پروژه از متن، با مدل نصب‌شدهٔ محلی و adapter داخلی.

ایجنت برای بیشتر ویرایش‌ها کد اصلی برنامه را تغییر نمی‌دهد؛ صحنه، لایه، زمان‌بندی و keyframeها را تنظیم می‌کند. افزودن artwork یا قابلیت جدیدِ خارج از مدل موجود، workflow توسعهٔ محلی و تغییر کد trusted است؛ JSON یا MCP عمومی کد دلخواه اجرا نمی‌کند.

### اتصال stdio

ابتدا سرویس‌های برنامه را اجرا کنید و سپس در کلاینت سازگار تنظیمی مشابه زیر قرار دهید. `cwd` باید مسیر واقعی و مطلق مخزن خودتان باشد:

```json
{
  "mcpServers": {
    "nova": {
      "command": "npm",
      "args": ["run", "mcp", "--silent"],
      "cwd": "/absolute/path/to/motionix-studio"
    }
  }
}
```

کلاینت مالک عمر فرایند stdio است؛ در حالت معمول لازم نیست همان server را دستی هم در ترمینال باز کنید. سازگاری قالب فایل config و اجرای `npm` روی Windows به کلاینت MCP شما نیز وابسته است.

### اتصال HTTP

برای HTTP، توکن تصادفی بلند را در `.env` ریشه یا محیط فرایند تعیین و سپس اجرا کنید:

```bash
npm run mcp:http
```

endpoint: [http://127.0.0.1:8002/mcp](http://127.0.0.1:8002/mcp).

- transport: Streamable HTTP، به‌صورت stateless.
- احراز هویت: Bearer با `NOVA_MCP_TOKEN` حداقل ۳۲ نویسه.
- scope: `NOVA_MCP_SCOPE=read` یا `full`؛ مقدار نامعتبر پذیرفته نمی‌شود.
- scope محیطی مذکور مربوط به HTTP است؛ stdio محلی در اجرای فعلی ابزارهای کامل را ثبت می‌کند.
- درخواست MCP با POST؛ GET و DELETE نشست پایدار ارائه نمی‌کنند و ۴۰۵ می‌دهند.
- سقف body حدود `12 MiB` و rate limit برابر ۱۲۰ درخواست در دقیقه.
- OAuth discovery، مدیریت کاربر یا احراز هویت چندمستاجری پیاده نشده است.

وجود endpoint HTTP به معنی اتصال خودکار هر حساب ChatGPT نیست. دسترسی و نوع احراز هویت کلاینت باید جداگانه بررسی شوند. راهنمای [MCP](docs/mcp.md) منابع رسمی و توضیح tunnel را دارد؛ بخش‌های وابسته به پلن و سرویس بیرونی باید هنگام اتصال دوباره با مستندات رسمی تطبیق داده شوند. NOVA tunnel عمومی نصب یا اجرا نمی‌کند. stdio محلی و JSON import/export جایگزین‌های مستقل هستند.

### فهرست ۵۴ ابزار موجود

پروژه و نسخه‌ها:

```text
list_projects, create_project, get_project, update_project,
import_project, export_project, validate_project, get_project_schema,
duplicate_project, delete_project, get_project_versions, restore_project_version
```

صحنه و لایه:

```text
list_scenes, get_scene, create_scene, update_scene, delete_scene,
duplicate_scene, reorder_scenes, set_scene_duration,
add_layer, update_layer, remove_layer
```

حرکت، دوربین و افکت:

```text
list_animation_presets, apply_animation,
add_keyframe, update_keyframe, remove_keyframe,
configure_camera, apply_visual_effect, configure_transition
```

دارایی:

```text
list_assets, get_asset, upload_asset
```

قالب و برند:

```text
list_templates, get_template, create_from_template,
get_scene_catalog, get_effect_catalog,
get_brand_profile, update_brand_profile
```

رندر و بازبینی:

```text
start_render, render_preview, render_frame, render_contact_sheet,
get_render_status, get_render_image, get_render_result,
cancel_render, list_render_jobs
```

سیستم:

```text
get_system_capabilities, get_renderer_health,
get_storage_usage, get_supported_formats
```

این فهرست، ابزارهای واقعی همین نسخه است؛ ابزارهایی مانند اجرای shell، کد React دلخواه، fetch آزاد URL، browse فایل‌سیستم، `configure_lighting` یا ثبت دلخواه فایل با مسیر آزاد ارائه نشده‌اند. retry رندر endpoint HTTP دارد، اما ابزار مستقلی به نام `retry_render` در فهرست فعلی MCP نیست.

resourceها:

```text
nova://schema/project
nova://docs/authoring
```

نتیجهٔ معمول ابزارها text و structured content است. `get_render_image` برای PNG تکمیل‌شده، محتوای native تصویر نیز می‌دهد؛ سقف دریافت تصویر از این مسیر `10 MiB` است.

### نمونهٔ جریان ایجنت

1. `get_project_schema` و `list_templates`.
2. `create_from_template` با `templateId` معتبر و نام پروژه.
3. `get_project` برای گرفتن شناسه‌های واقعی صحنه/لایه.
4. تغییر با `update_scene`، `add_layer`، `apply_animation` و `add_keyframe`.
5. `validate_project` و رفع خطا/هشدار رسانه و متن.
6. `render_frame` یا `render_contact_sheet` و poll وضعیت.
7. دریافت PNG با `get_render_image` و مشاهدهٔ واقعی توسط کاربر یا ایجنت چندوجهی.
8. `render_preview` و بررسی ویدیوی draft.
9. پس از تأیید خروجی مورد نظر، `start_render` با preset نهایی.

نمونهٔ ورودی برای ساخت از قالب:

```json
{
  "templateId": "business",
  "name": "معرفی فارسی محصول"
}
```

ابزارهای تخریبی تأیید صریح، از جمله `confirm: true` در ورودی مربوط، می‌خواهند. `export_project` خروجی JSON است، نه archive باینری همهٔ رسانه‌ها. هر render واقعی شناسهٔ job برمی‌گرداند؛ تولید contact sheet به‌تنهایی اثبات مشاهده و ارزیابی بصری نیست.

### Director داخلی و Ollama

از Settings، provider را روی `ollama`، نام مدل را روی نام مدل **واقعاً نصب‌شده** و URL را روی یکی از این دو مقدار قرار دهید:

```text
http://127.0.0.1:11434
http://localhost:11434
```

برنامه خودکار مدل دانلود نمی‌کند. وضعیت از endpoint واقعی `/api/tags` می‌آید و حالت‌های connected، disconnected و unavailable از هم جدا هستند. درخواست تولید به `/api/chat`، با schema و خروجی غیرstreaming ارسال می‌شود؛ پاسخ دوباره اعتبارسنجی می‌شود و پیش از اعمال قابل بررسی است.

adapter داخلی فقط loopback روی پورت ۱۱۴۳۴ را می‌پذیرد؛ redirect، userinfo، query و مسیر دلخواه مجاز نیستند. مهلت تولید تا ۱۲۰ ثانیه و سقف پاسخ `8 MiB` است. مقدار `openai-compatible` ممکن است در تنظیمات ذخیره شود، اما adapter اجرایی آن در این نسخه unavailable است.

تست‌های مسیر Ollama با پاسخ mock انجام شده‌اند؛ تولید واقعی با یک مدل نصب‌شده در این محیط تأیید نشده است. در نبود provider، UI پاسخ AI یا موفقیت تولید ساختگی نمایش نمی‌دهد.

<a id="examples"></a>

## نمونه‌های واقعی و بازتولید

**وضعیت فایل‌های ویدیو در Git:** خروجی‌های ویدیویی نمونه موقتاً از tracking مخزن خارج شده‌اند و روی این سیستم باقی می‌مانند. لینک‌های MP4 این بخش مسیر خروجی محلی‌اند؛ در clone تازه باید ابتدا نمونه‌ها را تولید یا رسانه‌ها را بازیابی کنید. source، اسکرین‌شات‌ها، مشخصات و سایر فایل‌های پروژه با حذف ویدیو از tracking پاک نمی‌شوند.

### دموهای پایه

هر سه فایل زیر ویدیوی واقعی با H.264 / AAC، `yuv420p`، ۳۰ FPS و ابعاد ۵۴۰×۹۶۰ هستند:

- [Website Commercial](examples/output/website-commercial.mp4): تصویر ویدیویی ۲۰ ثانیه؛ زمان ثبت‌شدهٔ job حدود ۵۴٫۹ ثانیه.
- [SaaS Product Commercial](examples/output/saas-product-commercial.mp4): تصویر ویدیویی ۳۰ ثانیه؛ زمان job حدود ۸۱٫۶ ثانیه.
- [Persian Business Reel](examples/output/persian-business-reel.mp4): تصویر ویدیویی ۱۸ ثانیه؛ زمان job حدود ۴۹٫۲ ثانیه.

این زمان‌ها از [metadata اجرای واقعی](examples/output/verification.json) هستند و شامل انتظار بیرون صف نیستند. مدت container به‌علت padding صوتی می‌تواند چند میلی‌ثانیه بیشتر از ویدیوی فریم‌محور باشد. اندازه‌ها، زمان‌ها و عملکرد، وعدهٔ benchmark روی سخت‌افزار هدف نیستند.

برای ساخت/بازتولید از سرویس‌های فعال:

```bash
npm run demo:render
```

اسکریپت، موسیقی اصلی را آماده و پروژه‌ها را از طریق سرویس محلی ثبت می‌کند. ممکن است job تکمیل‌شدهٔ سازگار را استفادهٔ مجدد کند. JSON خام به تنهایی برای نصب دیگری که همان asset IDها را ندارد، بستهٔ انتقال کامل نیست؛ در آن حالت از backup/import و ثبت مجدد رسانه استفاده کنید.

کنار هر دمو، project JSON، PNG، contact sheet و metadata وجود دارد. رندر یک‌ثانیه‌ای [MCP smoke](examples/output/mcp-smoke.mp4) و [گزارش آن](examples/output/mcp-verification.json) نیز مسیر واقعی SDK → MCP → Laravel → Remotion را ثبت کرده‌اند.

### معرفی فارسی خود برنامه

- [ویدیوی نهایی معرفی NOVA](examples/nova-intro/nova-intro-fa.mp4)
- [پروژهٔ قابل انتقال ZIP](examples/nova-intro/nova-intro-project.zip)
- [مشخصات و شواهد خروجی](examples/nova-intro/verification.json)
- [راهنمای همان تولید](examples/nova-intro/README.md)
- [هفت فریم بازبینی کنار هم](examples/nova-intro/contact-sheet.png)

مشخصات تأییدشدهٔ این نمونه:

- ۹۰۰ فریم؛ مدت ویدیو دقیقاً ۳۰ ثانیه در ۳۰ FPS.
- ابعاد ۱۰۸۰×۱۹۲۰، H.264 / AAC و `yuv420p`.
- مدت container برابر ۳۰٫۰۱۶ ثانیه.
- اندازهٔ فایل ۵٬۶۵۱٬۷۶۶ بایت؛ حدود ۵٫۳۹ MiB.
- زمان ثبت‌شدهٔ رندر ۱۵۴٫۲۹۸ ثانیه.
- پنج اسکرین‌شات واقعی ۱۲۸۰×۷۲۰ از رابط برنامه.
- متن فارسی قابل ویرایش، موسیقی سنتزشدهٔ اختصاصی و بخشی از رندر واقعی سه‌بعدی.
- بدون گوینده؛ فارسی در این نسخه متن روی تصویر است.
- هفت فریم نماینده بررسی و یک فریم از MP4 نهایی نیز مشاهده شده است.
- decode کامل تصویر و صدا با FFmpeg موفق بوده است.

برای بازتولید، پس از فعال‌کردن سرویس‌ها و از ریشه:

```bash
node --env-file-if-exists=.env --import tsx scripts/create-nova-intro.ts
node --env-file-if-exists=.env --import tsx scripts/render-nova-intro.ts --review
node --env-file-if-exists=.env --import tsx scripts/render-nova-intro.ts --final
node --env-file-if-exists=.env --import tsx scripts/package-nova-intro.ts
node --import tsx scripts/verify-nova-intro.ts
```

اسکریپت ساخت از اسکرین‌شات‌های موجود استفاده می‌کند؛ مجدداً مرورگر را خودکار برای عکس‌گرفتن کنترل نمی‌کند. همچنین نمونهٔ سه‌بعدیِ قبلی را از `examples/output/persian-business-reel.mp4` می‌خواند. source تولید، storyboard، فایل موسیقی و provenance تصاویر در `examples/nova-intro` نگهداری شده‌اند.

<a id="testing"></a>

## تست‌ها و شواهد اعتبارسنجی

فرمان‌ها:

```bash
npm run typecheck
npm run lint
npm test
npm run test:backend
npm run build
```

برای تست مرورگر، ابتدا برنامه را در ترمینال دیگری اجرا کنید:

```bash
npm run test:e2e
```

Playwright به Chrome قابل اجرا نیاز دارد. config فعلی به‌صورت پیش‌فرض `/usr/bin/google-chrome` را انتخاب می‌کند؛ در سیستم دیگر `NOVA_CHROME_PATH` را در محیط اجرای تست تعیین کنید. فایل `.env` ریشه در خود فرمان Playwright خودکار بارگذاری نمی‌شود.

حدود تست‌ها:

- `tests/project.test.ts`: schema، دادهٔ نامعتبر، زمان‌بندی، split/ripple، history، گروه و lock.
- `tests/engine.test.ts`: interpolation، حرکت، محدودیت concurrency و صف/لغو/Retry.
- `tests/mcp.test.ts`: dispatch، SDK واقعی، resource، پاسخ خطا و مرزهای HTTP/token/origin/Host.
- `tests/e2e/studio.spec.ts`: ویرایش/ذخیره، قالب‌ها، Director قطع‌شده، PNG واقعی، موبایل و جریان waveform/template.
- تست‌های Laravel در `apps/backend/tests`: persistence، revision، upload، امنیت، backup، برند و adapter محلی.

سوابق ثبت‌شده:

- آخرین اجرای متمرکز schema/timeline/engine: **۲۵ تست موفق**.
- اجرای مستقل MCP: **۱۲ تست موفق**، شامل تبادل واقعی SDK و HTTP موقت.
- اجرای ثبت‌شدهٔ Laravel: **۲۹ تست و ۱۱۷ assertion موفق**.
- پنج سناریوی متمایز مرورگر پس از اصلاح labelهای Inspector موفق شده‌اند؛ سناریوی اضافه‌شدهٔ waveform/multi-select/template در گزارش قبلی اجرای کامل مجدد نشده و نباید شش تست مرورگر را بدون اجرای تازه همگی تأییدشده دانست.
- رندرهای واقعی MP4، WebM، PNG، فونت آپلودی، متن فارسی، نبود فونت، لغو فعال و backup/restore با رسانه آزموده شده‌اند.

این تعدادها **سوابق اجرای مستند** هستند، نه تضمین اجرای تازهٔ تمام suiteها در هر ویرایش README. وضعیت جاری checkout را با فرمان‌های بالا بسنجید. تست مرورگر fixture فایل صوتی نمونه را نیز انتظار دارد و در نصب خالی ممکن است به ساخت دمو نیاز داشته باشد.

`npm run lint` در این پروژه **بررسی قالب‌بندی Prettier** است؛ آن را تحلیل امنیتی، ESLint یا جایگزین typecheck فرض نکنید. pipeline CI جامع تازه‌ای با این README ایجاد نمی‌شود.

شواهد بیشتر در [گزارش اعتبارسنجی](docs/VERIFICATION.md)، [backend](docs/backend.md) و metadata نمونه‌ها هستند. بخش‌هایی از گزارش قدیمی‌تر دربارهٔ محدودیت موقت محیط اجرا، سابقهٔ همان مرحله‌اند؛ راه‌انداز در تولید بعدی معرفی NOVA نیز برای بالا آوردن سرویس محلی استفاده شده است.

<a id="security"></a>

## امنیت و حریم خصوصی

مرز اعتماد این نسخه، ورک‌استیشن شخصی روی loopback است:

- listenerهای برنامه به `127.0.0.1` متصل می‌شوند.
- backend مبدأ کلاینت، Host و Originهای محلی را بررسی می‌کند و headerهای forwarded را مبنای هویت بیرونی قرار نمی‌دهد.
- API token اختیاری روی API بک‌اند و Bearer اجباری روی HTTP MCP وجود دارد؛ این مدل یک سامانهٔ حساب کاربری چندنفره نیست.
- رسانه از route کنترل‌شده و UUID عرضه می‌شود؛ public-storage symlink برای raw assetها لازم نیست.
- media CORS برای مبدأهای loopback پورت‌های موقت Remotion مجاز است؛ فایل‌های رسانهٔ محلی bearer-protected نیستند و همچنان در مرز اعتماد دستگاه قرار دارند.
- worker برای Originهای محلی مجاز رفتار اعتماد جدا دارد؛ API token worker را محافظ عمومی یک سرویس منتشرشده در اینترنت فرض نکنید.
- schema مسیر asset را به `/storage/assets/<safe-id>.<extension>` محدود می‌کند.
- upload محدودیت حجم، signature و بررسی‌های متناسب container دارد؛ سلامت decode کامل ویدیو/صدا تنها با signature اثبات نمی‌شود.
- GLB/SVG دارای ارجاع یا رفتار فعال نامجاز رد می‌شوند.
- adapter Ollama فقط endpoint محلی مشخص را می‌پذیرد و redirect را دنبال نمی‌کند.
- عملیات حذف، تأیید می‌خواهند؛ ابزارهای MCP annotation خواندن/نوشتن/تخریب دارند.
- audit شامل نام عملیات و metadata محدود است؛ نام کلیدهای حساس در مسیر log اختصاصی redact می‌شوند.
- پروژه و prompt داده هستند، نه مجوز اجرای JavaScript، shell یا دسترسی آزاد به فایل.

محدودیت‌های نرخ فعلی:

- بک‌اند: ۱۸۰ درخواست در دقیقه در گروه API.
- upload: bucket اختصاصی ۲۰ در دقیقه.
- restore پشتیبان و درخواست Director: هرکدام bucket اختصاصی ۵ در دقیقه.
- worker: ۱۲۰ درخواست غیر GET در دقیقه.
- HTTP MCP: ۱۲۰ درخواست در دقیقه.

NOVA خودش تله‌متری محصولی، ارسال خودکار پروژه به ابر، public tunnel، آپلود اجتماعی یا حساب خارجی ایجاد نمی‌کند. نصب dependencies و انتخاب provider/ایجنت خارجی می‌تواند ارتباط شبکه‌ای جداگانه داشته باشد؛ حریم خصوصی آن سرویس‌ها خارج از کنترل موتور محلی است.

روی دستگاه شخصی نیز هر فرایند مجاز همان کاربر می‌تواند در محدودهٔ مجوزهای سیستم به فایل‌ها یا سرویس loopback دسترسی داشته باشد. این نسخه برای اینترنت عمومی، چند کاربر نامطمئن، OAuth سازمانی یا نگهداری رمز در مدل پروژه تأیید امنیتی نشده است.

<a id="limitations"></a>

## محدودیت‌های فعلی

موارد زیر در این نسخه نباید به‌عنوان قابلیت تکمیل‌شده معرفی شوند:

- برابری کامل با After Effects یا NLE حرفه‌ای.
- nested scene، scene graph آزاد، parenting/anchor پیشرفته، blend mode و mask عمومی تمام لایه‌ها.
- trim لبهٔ چپ، slip/roll و drag آزاد لایه بین scene/track.
- grouping حرفه‌ای تمام عملیات و حفظ بی‌نقص فاز انیمیشن بعد از همهٔ splitها.
- graph editor با cubic Bézier handle، keyframe رنگ و انیمیشن عمومی همهٔ پارامترهای دوربین.
- ویرایش مستقل تمام اجزای artwork داخلی preset از UI.
- ادیتور عمومی نور/material، environment lighting و تمام presetهای دستگاه به‌صورت 3D واقعی.
- bloom/DOF/motion blur اپتیکی کامل یا تمام shaderهای مطرح‌شده در brief اولیه.
- تشخیص beat، ducking، normalization و subtitle alignment خودکار.
- گویندگی یا تبدیل متن به صدای داخلی.
- رابط کاملاً فارسی و تبدیل خودکار همهٔ اعداد/جهت‌ها.
- adapter اجرایی OpenAI-compatible داخلی یا اتصال آمادهٔ همهٔ حساب‌های ChatGPT.
- OAuth discovery، remote hosting عمومی، multi-user، Sanctum token lifecycle یا permissionهای چندنقشی.
- orchestration واقعی رندر با Laravel database queue یا Redis.
- تأیید NVENC/GPU encoding، enforce حافظه، proxy media و cache manager کامل.
- GIF، تصویر sequence، ویدیوی شفاف و codecهای اضافی خارج از مسیرهای ذکرشده.
- بستهٔ Docker Compose آزمایش‌شده یا installer بومی دسکتاپ.
- اجرای تأییدشده روی Windows 11 یا benchmark روی i5-13400F / RTX 4060 Ti 8GB / RAM 32GB.
- migration schema بین نسخه‌های مختلف یا restore کامل ورک‌استیشن از ZIP تک‌پروژه.

اولویت‌های منطقی توسعه: تکمیل عملیات تایم‌لاین و منحنی‌ها، بهبود مدل scene/layer، ادیتور صدا، فارسی‌سازی UI، یکپارچه‌سازی queue/cleanup و آزمون Windows/GPU. وضعیت مرحله‌ها در [چک‌لیست پیاده‌سازی](docs/IMPLEMENTATION.md) ثبت شده است.

<a id="troubleshooting"></a>

## عیب‌یابی

### صفحه باز نمی‌شود

از ریشه `npm run dev` را اجرا و [آدرس صحیح](http://127.0.0.1:5173/) را باز کنید. خروجی ترمینال را برای نبود PHP/Composer، setup ناقص یا اشغال پورت بررسی کنید. هر سرویس باید جداگانه پاسخ بدهد؛ `npm run health` وضعیت را نشان می‌دهد. bind عمومی یا پورت جایگزین خودکار راه‌حل پیش‌فرض این برنامه نیست.

### رابط باز است ولی ذخیره خطا می‌دهد

Laravel و worker هر دو باید فعال باشند. validator خاموش، حتی با SQLite سالم، می‌تواند ذخیره را با خطای ۵۰۳ متوقف کند. در حالت token، مقدار سازگار را برای نشست مرورگر تعیین کنید. draft محلی را تا زمان ذخیره/backup موفق پاک نکنید.

### upload با محدودیت ۲ مگابایت مواجه می‌شود

برنامه را با راه‌انداز ریشه یا فرمان PHP مستقیم همین راهنما اجرا کنید. سقف Node schema یا تنظیم UI، مقدار `upload_max_filesize` فرایند PHP را خودکار تغییر نمی‌دهد.

### تصویر در preview دیده می‌شود ولی در رندر بارگذاری نمی‌شود

فایل باید ثبت‌شده، path آن معتبر و backend برای Chromium قابل دسترس باشد. مبدأ محلی رندر و CORS رسانه را بررسی کنید. مؤلفه‌های Img مشترک با `crossOrigin="anonymous"` از مسیر مجاز رسانه استفاده می‌کنند؛ نسخهٔ قدیمی bundle یا بازنویسی نادرست headerها می‌تواند خطا ایجاد کند. برای حل مشکل، policyها را عمومی یا غیرفعال نکنید.

### فریم اول سیاه یا کم‌نور است

برخی entranceها از opacity صفر شروع می‌شوند. Play بزنید یا کمی جلو بروید. برای بررسی نتیجهٔ واقعی، فریم میانی بگیرید؛ frame صفر الزاماً thumbnail مناسبی نیست.

### رندر شکست می‌خورد یا فونت تغییر کرده است

log همان job را ببینید. مسیر Chrome، فایل‌های ثبت‌شده، WOFF2 لازم و فضای دیسک را بررسی کنید. ابتدا draft و concurrency کم را امتحان کنید. مقدار `browserAvailable` در health صرفاً تشخیص مسیر مرورگر محلی است؛ مرورگر قابل دانلود Remotion و نتیجهٔ واقعی اجرا نیز باید در نظر گرفته شوند.

### تغییر concurrency در Settings اثر ندارد

وجود `NOVA_RENDER_CONCURRENCY` در محیط را بررسی کنید؛ این override مقدم است. تعداد frame worker را با تعداد job هم‌زمان اشتباه نگیرید. jobها همچنان serial هستند.

### GLB باز نمی‌شود

از GLB مستقل، معتبر، بدون Draco/meshopt اجباری و بدون ارجاع خارجی استفاده کنید. فایل GLTF متنی به‌همراه پوشهٔ texture مسیر import کامل فعلی نیست. نبود WebGL را نیز از نبود فایل جدا بررسی کنید.

### MP4 برای دستگاه دیگر قابل دانلود نیست

آدرس `/worker/outputs/...` محلی است. ابتدا فایل واقعی را دانلود یا از پوشهٔ خروجی کپی کنید. URL localhost را به‌جای فایل برای شخص دیگر نفرستید.

### پروژهٔ JSON در نصب دیگر رسانه ندارد

JSON بایت فایل‌ها را حمل نمی‌کند. ZIP قابل‌انتقال بگیرید یا رسانه‌ها را در نصب مقصد مجدداً وارد و referenceها را اصلاح کنید. صرف کپی asset ID از نصب اول فایل را ایجاد نمی‌کند.

### تغییر کد در خروجی دیده نمی‌شود

باندل renderer cache دارد. تغییر فایل‌های ورودی ثبت‌شده در cache آن را invalidate می‌کند؛ برای تغییر ماژول‌های جدید یا حالات مبهم، پس از تمام‌شدن کارهای فعال worker را restart کنید. `npm start` نیز اگر Studio قبلی را پیدا کند همان را استفاده می‌کند؛ dev و preview را با هم اشتباه نگیرید.

### تست مرورگر در نصب تازه شکست می‌خورد

سرویس‌ها، Chrome و دادهٔ نمونهٔ موردنیاز را بررسی کنید. حالت disconnected Director و بعضی fixtureها به وضعیت Settings/دارایی‌های این نصب وابسته‌اند. نصب خالی، تغییر provider یا حذف صوت نمونه می‌تواند پیش‌فرض سناریوهای فعلی را تغییر دهد.

<a id="development-and-licenses"></a>

## توسعه، منشأ و مجوزها

### فرمان‌های توسعه

فرمان‌های ثبت‌شده در `package.json`:

- `npm run setup`: آماده‌سازی Laravel و SQLite.
- `npm run dev`: راه‌انداز سرویس‌ها.
- `npm run dev:studio`: فقط Vite.
- `npm run dev:worker`: فقط renderer/validator.
- `npm run build`: strict typecheck و build کلاینت.
- `npm start`: راه‌انداز با کلاینت buildشده.
- `npm run stop`: توقف فرایندهای ثبت‌شدهٔ راه‌انداز.
- `npm run migrate`: migration دیتابیس.
- `npm run health`: بررسی دسترسی سرویس‌ها.
- `npm run typecheck`: TypeScript strict.
- `npm run lint`: Prettier check.
- `npm test`: Vitest.
- `npm run test:backend`: اجرای تست Laravel با cwd مناسب.
- `npm run test:e2e`: Playwright با سرویس‌های از قبل فعال.
- `npm run schema`: بازتولید JSON Schema.
- `npm run mcp`: stdio MCP.
- `npm run mcp:http`: HTTP MCP.
- `npm run demo:render`: تولید دموهای پایه.

اسکریپت‌های مستقل مانند `collect-demos.ts` و اسکریپت‌های `nova-intro` فرمان npm جدا ندارند؛ آن‌ها را با `node --import tsx scripts/<file>.ts` و در صورت نیاز flag بارگذاری `.env` اجرا کنید. `collect-demos.ts` تنها خروجی‌های تکمیل‌شده و metadata واقعی موجود را جمع‌آوری می‌کند و رندر جدید آغاز نمی‌کند.

### افزودن صحنه یا حرکت

1. مدل پذیرفته‌شده و محدودیت‌ها را در `packages/project-schema` بررسی کنید.
2. artwork را در `packages/video-engine` با فریم جاری و محاسبهٔ deterministic پیاده کنید.
3. نوع و پیش‌فرض‌ها را در مدل/پکیج قالب‌ها هماهنگ کنید.
4. کاتالوگ‌ها، UI و مستندات را با renderer واقعی تطبیق دهید.
5. typecheck و تست مناسب را اجرا و یک PNG/MP4 واقعی بررسی کنید.

از `Math.random()`، ساعت مرورگر یا timer کنترل‌نشده برای خروجی ویدیو استفاده نکنید. افزودن React/Three.js جدید کار توسعهٔ محلی trusted است و به ایجنت remote مجوز اجرای کد دلخواه نمی‌دهد.

### ارزیابی Abekyo

بنیاد [Abekyo Editor](https://github.com/abekyo/abekyo-editor) در commit زیر بررسی شده است:

```text
d4428949cacb5d119c39c264ce811f1bcf61cb10
```

مدل clipهای ترتیبی، روایت با سرعت ثابت و ذخیره‌سازی upstream با نیاز صحنه/لایه/تراک مستقل NOVA یکسان نبود. تصمیم، مدل فریم‌محور مشترک و persistence محلی جدا بود. فایل source از upstream در این پیاده‌سازی کپی نشده و upstream وابستگی پنهان زمان اجرا نیست. بررسی source و تست‌های upstream انجام شده است؛ اجرای موفق suite upstream ادعا نشده است.

[گزارش ممیزی](docs/upstream-audit.md) و ADRها دلیل انتخاب‌ها را توضیح می‌دهند.

### مجوزها و محتوا

- notice و اعتبار وابستگی‌ها در [NOTICE.md](NOTICE.md) آمده است.
- فونت‌های بسته‌بندی‌شده، فایل مجوز خود را در `public/fonts` دارند.
- موسیقی نمونه‌ها با کد همین پروژه ساخته شده است؛ آهنگ تجاری بسته‌بندی نشده است.
- artwork داخلی قالب‌ها برنامه‌نویسی‌شده است؛ برای نمایش محصول واقعی از تصویر/اسکرین‌شات همان محصول استفاده کنید.
- وابستگی‌ها مجوز مستقل خود را دارند؛ نبود API پولی اجباری به معنی یکسان‌بودن شرایط مجوز تمام کتابخانه‌ها نیست.
- شرایط استفادهٔ Remotion را در [صفحهٔ رسمی مجوز](https://www.remotion.dev/license) بررسی کنید.
- در ریشهٔ فعلی فایل `LICENSE` مستقل وجود ندارد؛ مقدار مجوز در Composer بک‌اند را مجوز سراسری همهٔ sourceها و وابستگی‌ها فرض نکنید.

### مستندات تکمیلی

- [معماری و نمودار](docs/ARCHITECTURE.md)
- [مدل پروژه و تألیف صحنه](docs/AUTHORING.md)
- [API و رفتار بک‌اند](docs/backend.md)
- [اتصال MCP و شواهد اجرای ایجنت](docs/mcp.md)
- [گزارش ارزیابی upstream](docs/upstream-audit.md)
- [تصمیم‌های معماری](docs/adr)
- [چک‌لیست و موارد باقی‌مانده](docs/IMPLEMENTATION.md)
- [سوابق اعتبارسنجی](docs/VERIFICATION.md)
- [تولید معرفی فارسی خود برنامه](examples/nova-intro/README.md)

این README قرارداد رفتاری کد فعلی را شرح می‌دهد. برای قابلیت جدید، ابتدا پیاده‌سازی و خروجی واقعی را تأیید و سپس ادعای مربوط را به مستندات اضافه کنید.
