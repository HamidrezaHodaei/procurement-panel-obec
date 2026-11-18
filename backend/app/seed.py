"""First-run data: base lists + the first administrator. SEED_DEMO=1 adds sample records for testing."""
import logging
from datetime import date, timedelta

from sqlalchemy import text
from werkzeug.security import generate_password_hash

from .config import Config
from .db import engine, scalar

log = logging.getLogger(__name__)


def seed_if_needed():
    with engine().begin() as c:
        fresh = scalar(c, "SELECT COUNT(*) FROM currencies") == 0
        if fresh:
            for code, name, sym, dec in [("IRR", "ریال", "ریال", 0), ("USD", "دلار", "$", 2), ("EUR", "یورو", "€", 2)]:
                c.execute(text("INSERT INTO currencies (code,name,symbol,decimals) VALUES (:a,:b,:c,:d)"), dict(a=code, b=name, c=sym, d=dec))
            for name, kind in [("نقدی", "cash"), ("چک", "cheque"), ("ضمانت", "guarantee")]:
                c.execute(text("INSERT INTO payment_methods (name,kind) VALUES (:n,:k)"), dict(n=name, k=kind))
            for name in ["ضمانت‌نامه بانکی", "چک ضمانت", "سفته", "سپرده نقدی"]:
                c.execute(text("INSERT INTO guarantee_types (name) VALUES (:n)"), dict(n=name))
        if scalar(c, "SELECT COUNT(*) FROM users") == 0:
            c.execute(text("INSERT INTO users (username, full_name, password_hash, role, created_at) VALUES (:u,:f,:h,'admin',UTC_TIMESTAMP())"),
                      dict(u=Config.ADMIN_USERNAME.lower(), f="مدیر سیستم", h=generate_password_hash(Config.ADMIN_PASSWORD)))
            log.warning("Created first admin '%s' — change its password after the first login.", Config.ADMIN_USERNAME)
        if fresh and Config.SEED_DEMO:
            _demo(c)


def _demo(c):
    ins = lambda sql, **p: c.execute(text(sql), p).lastrowid
    companies = [ins("INSERT INTO companies (name) VALUES (:n)", n=x) for x in ["شرکت آرمان صنعت", "شرکت پارس انرژی", "شرکت توسعه سپهر"]]
    cats = [ins("INSERT INTO item_categories (name) VALUES (:n)", n=x) for x in ["تجهیزات برقی", "تجهیزات اداری", "قطعات مکانیکی"]]
    items = [ins("INSERT INTO items (name,category_id) VALUES (:n,:c)", n=n, c=cat) for n, cat in
             [("ترانسفورماتور ۲۰ کیلوولت", cats[0]), ("کابل مسی", cats[0]), ("لپ‌تاپ", cats[1]), ("پمپ سانتریفیوژ", cats[2]), ("یاتاقان صنعتی", cats[2])]]
    agents = [ins("INSERT INTO agents (name) VALUES (:n)", n=x) for x in ["علی رضایی", "مریم احمدی"]]
    execs = [ins("INSERT INTO executors (name) VALUES (:n)", n=x) for x in ["حسین کریمی", "نرگس موسوی"]]
    brands = [ins("INSERT INTO brands (name,kind) VALUES (:n,:k)", n=n, k=k) for n, k in
              [("ایران ترانسفو", "domestic"), ("سیمکو", "domestic"), ("Siemens", "foreign"), ("ABB", "foreign"), ("Lenovo", "foreign")]]
    IRR, USD, EUR = 1, 2, 3
    who = "مدیر سیستم"
    d = lambda off: (date.today() + timedelta(days=off)).isoformat()
    rows = [
        ("PR-1405-001", companies[0], items[0], d(-150), "completed", d(-60), agents[0], "direct", execs[0], "domestic", brands[0], "استعلام از سه تأمین‌کننده و مذاکره نهایی انجام شد.", "شرکت برق‌صنعت", 4_800_000_000, IRR, d(-120), 5_000_000_000, IRR),
        ("PR-1405-002", companies[1], items[3], d(-90), "active", None, agents[1], "indirect", execs[1], "foreign", brands[2], "مکاتبه با نماینده زیمنس و دریافت پیش‌فاکتور.", "Siemens Middle East", 12_000_000, EUR, d(-45), 12_500_000, EUR),
        ("PR-1405-003", companies[2], items[2], d(-30), "active", None, agents[0], "direct", execs[0], "foreign", brands[4], "در انتظار تأیید پیش‌فاکتور.", "", 4_500_000, USD, d(-10), 4_650_000, USD),
        ("PR-1405-004", companies[0], items[1], d(-10), "active", None, agents[1], "direct", execs[1], "domestic", brands[1], "", "", None, None, None, None, None),
    ]
    ids = []
    for r in rows:
        ids.append(ins("""INSERT INTO purchase_processes (request_number,company_id,item_id,start_date,status,completed_at,agent_id,agent_relation,executor_id,purchase_type,brand_id,
            actions_text,tender_winner,purchase_amount,purchase_currency_id,proforma_date,proforma_amount,proforma_currency_id,created_by,created_at,updated_by,updated_at)
            VALUES (:a,:b,:c,:d,:e,:f,:g,:h,:i,:j,:k,:l,:m,:n,:o,:p,:q,:r,:u,UTC_TIMESTAMP(),:u,UTC_TIMESTAMP())""",
                       **dict(zip("abcdefghijklmnopqr", r)), u=who))
    for pid, m in [(0, 1), (0, 2), (1, 1), (1, 3), (2, 1)]:
        ins("INSERT INTO process_payment_methods VALUES (:p,:m)", p=ids[pid], m=m)
    ch = """INSERT INTO cheques (process_id,cheque_number,cheque_date,amount,currency_id,issuer_name,status,notes,created_by,created_at,updated_by,updated_at)
            VALUES (:p,:n,:d,:a,:c,:i,:s,:t,:u,UTC_TIMESTAMP(),:u,UTC_TIMESTAMP())"""
    ins(ch, p=ids[0], n="884512", d=d(25), a=2_000_000_000, c=IRR, i="شرکت آرمان صنعت", s="pending", t="چک اول", u=who)
    ins(ch, p=ids[0], n="884513", d=d(-20), a=1_500_000_000, c=IRR, i="شرکت آرمان صنعت", s="cashed", t="چک دوم", u=who)
    st = """INSERT INTO payment_stages (process_id,seq,amount_type,amount,currency_id,percent_bp,condition_text,due_date,status,paid_at,notes,created_by,created_at,updated_by,updated_at)
            VALUES (:p,:q,:t,:a,:c,:b,:x,:d,:s,:pa,'',:u,UTC_TIMESTAMP(),:u,UTC_TIMESTAMP())"""
    for q, bp, x, dd, s_, pa in [(1, 3000, "پیش‌پرداخت هنگام سفارش", d(-40), "paid", d(-40)), (2, 5000, "هنگام بارگیری", d(20), "unpaid", None), (3, 2000, "پس از تحویل", d(-3), "unpaid", None)]:
        ins(st, p=ids[1], q=q, t="percent", a=None, c=None, b=bp, x=x, d=dd, s=s_, pa=pa, u=who)
    ins(st, p=ids[2], q=1, t="amount", a=1_500_000, c=USD, b=None, x="پیش‌پرداخت", d=d(5), s="unpaid", pa=None, u=who)
    ins("""INSERT INTO received_guarantees (process_id,guarantee_type_id,reference_no,amount,currency_id,issue_date,due_date,status,notes,created_by,created_at,updated_by,updated_at)
        VALUES (:p,1,'BG-7781',500000000,:c,:i,:d,'active','',:u,UTC_TIMESTAMP(),:u,UTC_TIMESTAMP())""", p=ids[1], c=IRR, i=d(-60), d=d(120), u=who)
    ig = """INSERT INTO issued_guarantees (process_id,guarantee_type_id,reference_no,amount,currency_id,issue_date,valid_until,recipient_name,related_company_id,status,notes,created_by,created_at,updated_by,updated_at)
        VALUES (:p,:t,:r,:a,:c,:i,:v,:n,:co,:s,'',:u,UTC_TIMESTAMP(),:u,UTC_TIMESTAMP())"""
    ins(ig, p=ids[1], t=1, r="IG-2210", a=1_250_000, c=EUR, i=d(-50), v=d(200), n="Siemens Middle East", co=companies[1], s="active", u=who)
    ins(ig, p=ids[0], t=2, r="55120", a=300_000_000, c=IRR, i=d(-140), v=d(-70), n="شرکت برق‌صنعت", co=companies[0], s="returned", u=who)
