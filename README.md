# ماژول «مدیریت فرآیند خرید»

پنل مدیریت فرآیند خرید، پرداخت‌ها، چک‌ها و ضمانت‌ها؛ ساخته‌شده روی هویت بصری پروژه مرجع
(Next.js 16، Tailwind v4، shadcn روی Base UI، TanStack Table/Query، nuqs، Recharts).

## معماری و اجرا

دو بخش: **فرانت‌اند** Next.js (این پوشه) و **بک‌اند** Flask + MySQL (`backend/`، راهنمای کامل در `backend/README.md`).
فرانت‌اند درخواست‌های `/api/procurement/*` و `/api/auth/*` را با `rewrites` به Flask می‌فرستد.

```bash
# بک‌اند (ترمینال ۱)
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && cp .env.example .env     # DATABASE_URL و SECRET_KEY را تنظیم کنید
python run.py

# فرانت‌اند (ترمینال ۲)
npm install
npm run dev            # http://localhost:3000  → صفحهٔ ورود
npm run build && npm start
```

ورود اولیه: کاربر `ADMIN_USERNAME` با رمز `ADMIN_PASSWORD` (پیش‌فرض‌ها در `backend/.env.example`) — بعد از اولین ورود رمز را تغییر دهید.
کاربران بیشتر و نقش‌ها (مشاهده‌گر / کاربر / مدیر) از «تنظیمات ← کاربران و دسترسی‌ها» تعریف می‌شوند.

## مسیرها

- `/dashboard/procurement` داشبورد
- `/dashboard/procurement/processes` فهرست؛ `/new` و `/[id]` ثبت/ویرایش (تب‌های اطلاعات، پرداخت‌ها و ضمانت‌ها، سوابق)
- `/dashboard/procurement/reports` ۱۳ گزارش، فیلتر ترکیبی، خروجی Excel و PDF
- `/dashboard/procurement/settings` اطلاعات پایه

صفحات پروژه مرجع دست‌نخورده‌اند و در گروه «نمونه‌های پروژه مرجع» منو هستند.

## ساختار

- `src/features/procurement/` فرانت‌اند: `masters.ts`، `schemas.ts`، `types.ts`، `api/`، `components/`
- `src/lib/jalali.ts`, `src/lib/money.ts` تاریخ شمسی و مبلغ دقیق؛ `src/proxy.ts` هدایت به ورود؛ `src/app/login`, `src/app/print/report`
- `backend/app/` Flask: `schema.py` (MySQL)، `auth.py`، `processes.py`، `reports.py`، `dashboard.py`، `masters.py`، `export.py`، `routes.py`؛ `backend/tests/smoke_test.py`

## تصمیم‌ها

- مبالغ عدد صحیح (واحد کوچک‌تر) + `currencies.decimals`؛ هیچ جمعی بین ارزهای مختلف انجام نمی‌شود. اعشار ارز پس از ثبت تغییر نمی‌کند.
- تاریخ در دیتابیس میلادی ISO و در UI/Excel شمسی است.
- مراحل پرداخت درصدی از مبلغ پیش‌فاکتور (در نبود آن، قیمت خرید) زنده محاسبه می‌شوند؛ «سررسیدشده» از تاریخ سررسید محاسبه می‌شود.
- ضمانت‌های دریافتی و صادرشده دو جدول مستقل‌اند.
- روش‌های پرداخت `kind` دارند و تعیین می‌کنند کدام بخش‌ها نمایش داده شوند.
- `audit_log` تغییرات قبل/بعد را نگه می‌دارد؛ هر رکورد `created_by/updated_by` دارد.
- ورود با نام کاربری/رمز و سه نقش (viewer/editor/admin)؛ همهٔ بررسی‌های دسترسی در Flask انجام می‌شود و UI فقط ظاهر را تطبیق می‌دهد.
- PDF با چاپ مرورگر (Save as PDF) ساخته می‌شود تا حروف فارسی درست شکل بگیرند.
- فونت Vazirmatn محلی است.
