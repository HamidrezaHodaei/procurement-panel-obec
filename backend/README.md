# بک‌اند Flask (MySQL / MariaDB)

API دقیقاً با همان آدرس‌ها و JSON فرانت‌اند Next.js است. فرانت‌اند درخواست‌های `/api/procurement/*` و `/api/auth/*` را
با `rewrites` به این سرویس می‌فرستد، پس مرورگر هم‌مبدأ می‌ماند و cookie ورود بدون تنظیم CORS کار می‌کند.

## راه‌اندازی

```bash
# ۱) ساخت دیتابیس (utf8mb4)
mysql -uroot -p -e "CREATE DATABASE procurement CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER 'proc'@'localhost' IDENTIFIED BY 'رمز-قوی'; GRANT ALL ON procurement.* TO 'proc'@'localhost';"

# ۲) محیط پایتون
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # DATABASE_URL, SECRET_KEY, ADMIN_PASSWORD را تنظیم کنید

# ۳) اجرا (اولین اجرا جدول‌ها، داده‌های پایه و مدیر اول را می‌سازد)
python run.py                                   # توسعه  → http://127.0.0.1:5000
gunicorn -w 4 -b 127.0.0.1:5000 "app:create_app()"   # تولید
```

اسکیمای خام SQL هم در `schema.sql` هست (برای DBA)؛ ولی لازم نیست دستی اجرایش کنید — مهاجرت‌ها خودکارند
(جدول `schema_version`؛ مهاجرت جدید = افزودن یک لیست به `MIGRATIONS` در `app/schema.py`).

## ورود، کاربران و نقش‌ها

- مدیر اول از `ADMIN_USERNAME` / `ADMIN_PASSWORD` ساخته می‌شود (فقط وقتی جدول کاربران خالی است). **بعد از اولین ورود رمز را عوض کنید.**
- رمزها با scrypt/PBKDF2 (werkzeug) هش می‌شوند؛ نشست با cookie امضاشده (`HttpOnly`, `SameSite=Lax`، ۱۲ ساعت).
- محدودیت تلاش ناموفق: ۵ بار در ۵ دقیقه به‌ازای هر IP+کاربر (در حافظهٔ هر پروسه؛ با چند worker سهمیه جدا حساب می‌شود).
- نقش‌ها: **viewer** فقط مشاهده، **editor** ثبت/ویرایش/حذف پرونده‌ها، **admin** علاوه بر آن اطلاعات پایه و کاربران.
- همیشه حداقل یک مدیر فعال می‌ماند؛ کاربر غیرفعال بلافاصله از نشست‌های باز هم بیرون می‌افتد.
- نام «ثبت‌کننده / آخرین ویرایش» از نام نمایشی کاربر واردشده گرفته می‌شود.

## تولید (HTTPS)

`SECRET_KEY` را تصادفی و طولانی بگذارید و با HTTPS `COOKIE_SECURE=1` کنید. فرانت‌اند را با
`BACKEND_URL=http://127.0.0.1:5000 npm run build && npm start` اجرا کنید.

## تست

```bash
# یک دیتابیس خالیِ جدا بسازید — تست همهٔ جدول‌های آن را پاک می‌کند!
TEST_DATABASE_URL='mysql+pymysql://proc:رمز@127.0.0.1/procurement_test?charset=utf8mb4' python tests/smoke_test.py
```

## نکته‌ها

- مبالغ `BIGINT` به کوچک‌ترین واحد ارز (ریال=۱، سنت=۱۰۰)؛ حداکثر ۲^۵۳−۱ (محدودیت امن JSON/JS).
- تاریخ‌ها `DATE` میلادی؛ زمان ثبت/ویرایش `DATETIME` به UTC.
- نیازمند MySQL ≥ 8.0.16 یا MariaDB ≥ 10.5 (برای CHECK constraint). تست‌شده روی MariaDB 10.11.
