"""13 reports. Each returns {columns, rows, total, notes}; money cells are {v, c, d} so UI/Excel format them.
Totals are always per currency — amounts in different currencies are never added together."""
from datetime import date

from .common import ApiError
from .db import engine, fetch_all, ser
from .filters import PROCESS_FROM, build_where

LIMIT = 10000

REPORT_META = [
    ("processes", "فهرست فرآیندهای خرید", "جزئیات پرونده‌ها؛ با کلیک روی هر ردیف پرونده باز می‌شود."),
    ("byCompany", "فرآیندها به تفکیک شرکت", "تعداد پرونده‌ها و مجموع خرید هر شرکت (به تفکیک ارز)."),
    ("byItem", "خرید به تفکیک کالا", "تعداد و مبلغ خرید هر کالا."),
    ("byCategory", "خرید به تفکیک دسته‌بندی", "تعداد و مبلغ خرید هر دسته‌بندی کالا."),
    ("agents", "عملکرد مأموران خرید", "تعداد پرونده، وضعیت و میانگین مدت اجرا."),
    ("executors", "عملکرد مجریان خرید", "تعداد پرونده، وضعیت و میانگین مدت اجرا."),
    ("purchaseType", "مقایسه خرید داخلی و خارجی", "تعداد و مبلغ خرید داخلی در برابر خارجی."),
    ("totalsByCurrency", "مجموع مبالغ به تفکیک ارز", "مجموع هر ارز به‌صورت مستقل؛ بدون تبدیل نرخ."),
    ("proformas", "پیش‌فاکتورهای صادرشده", "پرونده‌های دارای پیش‌فاکتور."),
    ("cheques", "چک‌های دریافتی و سررسید", "همه چک‌ها با تاریخ سررسید و فاصله تا سررسید."),
    ("obligations", "تعهدات پرداخت‌نشده و پرداخت‌های آتی", "مراحل پرداخت‌نشده و سررسیدشده؛ با فیلتر «وضعیت پرداخت» می‌توانید همه وضعیت‌ها را ببینید."),
    ("guarantees", "ضمانت‌ها و وضعیت تسویه", "ضمانت‌های صادرشده (و دریافتی) با وضعیت آن‌ها."),
    ("durations", "مدت‌زمان اجرای فرآیندها", "از تاریخ شروع تا پایان (یا امروز برای پرونده‌های در جریان)."),
]
IDS = {m[0] for m in REPORT_META}


def money(v, c, d):
    return None if v is None or c is None else {"v": int(v), "c": c, "d": int(d or 0)}


def col(key, label, type_="text", badge=None):
    x = {"key": key, "label": label, "type": type_}
    if badge:
        x["badge"] = badge
    return x


def _grouped(conn, f, group_cols, select, group_by, key_expr, extra_cols=(), extra_select=""):
    where, params = build_where(f)
    aw = (where + " AND") if where else "WHERE"
    base = fetch_all(conn, f"SELECT {key_expr} AS _k, {select}, COUNT(*) cnt {',' + extra_select if extra_select else ''} {PROCESS_FROM} {where} GROUP BY {group_by} ORDER BY cnt DESC LIMIT {LIMIT}", params)
    sums = fetch_all(conn, f"SELECT {key_expr} AS _k, p.purchase_currency_id c, SUM(p.purchase_amount) s {PROCESS_FROM} {aw} p.purchase_amount IS NOT NULL GROUP BY {group_by}, p.purchase_currency_id", params)
    cur = fetch_all(conn, "SELECT id, code, decimals FROM currencies ORDER BY id")
    used = {int(s["c"]) for s in sums}
    cur_cols = [c for c in cur if c["id"] in used]
    columns = [*group_cols, col("cnt", "تعداد پرونده", "int"), *extra_cols, *[col(f"pur_{c['id']}", f"مجموع خرید ({c['code']})", "money") for c in cur_cols]]
    rows = []
    for b in base:
        row = {k: ser(v) for k, v in b.items()}
        for c in cur_cols:
            s = next((x for x in sums if x["_k"] == b["_k"] and int(x["c"]) == c["id"]), None)
            row[f"pur_{c['id']}"] = money(s["s"], c["code"], c["decimals"]) if s else None
        rows.append(row)
    return columns, rows


PEOPLE_EXTRA = [col("completed", "تکمیل‌شده", "int"), col("active", "فعال", "int"), col("avgDays", "میانگین مدت اجرا (روز)", "days")]
PEOPLE_SEL = "SUM(p.status='completed') completed, SUM(p.status='active') active, ROUND(AVG(DATEDIFF(COALESCE(p.completed_at, CURDATE()), p.start_date))) avgDays"


def _clean(rows):
    return [{k: ser(v) for k, v in r.items()} for r in rows]


def run_report(rid: str, f: dict) -> dict:
    if rid not in IDS:
        raise ApiError(404, "گزارش یافت نشد")
    meta = next(m for m in REPORT_META if m[0] == rid)
    where, params = build_where(f)
    aw = (where + " AND") if where else "WHERE"
    ids = f"(SELECT p.id {PROCESS_FROM} {where})"
    today = date.today().isoformat()
    notes = None
    with engine().connect() as c:
        if rid == "processes":
            raw = fetch_all(c, f"""SELECT p.id _processId, p.request_number rn, co.name company, it.name item, ic.name category, p.start_date sd,
                p.purchase_type pt, p.status st, ag.name agent, ex.name executor, br.name brand, p.tender_winner tw,
                p.purchase_amount pa, pc.code pcc, pc.decimals pcd, p.proforma_amount fa, fc.code fcc, fc.decimals fcd
                {PROCESS_FROM} LEFT JOIN currencies pc ON pc.id = p.purchase_currency_id LEFT JOIN currencies fc ON fc.id = p.proforma_currency_id
                {where} ORDER BY p.start_date DESC, p.id DESC LIMIT {LIMIT}""", params)
            columns = [col("rn", "شماره درخواست"), col("company", "شرکت"), col("item", "کالا"), col("category", "دسته‌بندی"), col("sd", "تاریخ شروع", "date"),
                       col("pt", "نوع خرید", "badge", "purchaseType"), col("st", "وضعیت", "badge", "processStatus"), col("agent", "مأمور"), col("executor", "مجری"),
                       col("brand", "برند"), col("tw", "برنده مناقصه"), col("purchase", "قیمت خرید", "money"), col("proforma", "پیش‌فاکتور", "money")]
            rows = [{**{k: ser(v) for k, v in r.items()}, "purchase": money(r["pa"], r["pcc"], r["pcd"]), "proforma": money(r["fa"], r["fcc"], r["fcd"])} for r in raw]
        elif rid == "byCompany":
            columns, rows = _grouped(c, f, [col("name", "شرکت")], "co.name name", "co.id, co.name", "co.id")
        elif rid == "byItem":
            columns, rows = _grouped(c, f, [col("name", "کالا"), col("category", "دسته‌بندی")], "it.name name, ic.name category", "it.id, it.name, ic.name", "it.id")
        elif rid == "byCategory":
            columns, rows = _grouped(c, f, [col("name", "دسته‌بندی")], "ic.name name", "ic.id, ic.name", "ic.id")
        elif rid in ("agents", "executors"):
            a, lbl = ("ag", "مأمور خرید") if rid == "agents" else ("ex", "مجری خرید")
            columns, rows = _grouped(c, f, [col("name", lbl)], f"{a}.name name", f"{a}.id, {a}.name", f"{a}.id", PEOPLE_EXTRA, PEOPLE_SEL)
            rows = [r for r in rows if r.get("name")]
        elif rid == "purchaseType":
            columns, rows = _grouped(c, f, [col("type", "نوع خرید", "badge", "purchaseType")], "p.purchase_type type", "p.purchase_type", "p.purchase_type")
        elif rid == "totalsByCurrency":
            def sm(sql):
                return {int(r["c"]): int(r["s"]) for r in fetch_all(c, sql, params)}
            pur = sm(f"SELECT p.purchase_currency_id c, SUM(p.purchase_amount) s {PROCESS_FROM} {aw} p.purchase_amount IS NOT NULL GROUP BY 1")
            prof = sm(f"SELECT p.proforma_currency_id c, SUM(p.proforma_amount) s {PROCESS_FROM} {aw} p.proforma_amount IS NOT NULL GROUP BY 1")
            st = lambda cond: sm(f"SELECT eff_currency_id c, SUM(eff_amount) s FROM v_payment_stages WHERE {cond} AND eff_currency_id IS NOT NULL AND process_id IN {ids} GROUP BY 1")
            paid, unpaid = st("eff_status = 'paid'"), st("eff_status IN ('unpaid','overdue')")
            cashed = sm(f"SELECT currency_id c, SUM(amount) s FROM cheques WHERE status='cashed' AND process_id IN {ids} GROUP BY 1")
            pend = sm(f"SELECT currency_id c, SUM(amount) s FROM cheques WHERE status='pending' AND process_id IN {ids} GROUP BY 1")
            columns = [col("cur", "واحد پولی"), col("pur", "مجموع خرید", "money"), col("prof", "مجموع پیش‌فاکتورها", "money"),
                       col("paid", "پرداخت‌شده (مراحل + چک وصول‌شده)", "money"), col("unpaid", "تعهدات پرداخت‌نشده", "money"), col("pend", "چک در انتظار سررسید", "money")]
            rows = []
            for cu in fetch_all(c, "SELECT id, code, decimals FROM currencies ORDER BY id"):
                m = lambda d, extra=0: money(d.get(cu["id"], 0) + extra, cu["code"], cu["decimals"])
                r = {"cur": cu["code"], "pur": m(pur), "prof": m(prof), "paid": m(paid, cashed.get(cu["id"], 0)), "unpaid": m(unpaid), "pend": m(pend)}
                if any(r[k]["v"] for k in ("pur", "prof", "paid", "unpaid", "pend")):
                    rows.append(r)
            notes = "هر ارز به‌صورت مستقل جمع زده شده است و هیچ تبدیل نرخی انجام نمی‌شود."
        elif rid == "proformas":
            raw = fetch_all(c, f"""SELECT p.id _processId, p.request_number rn, co.name company, it.name item, p.proforma_date pd, p.proforma_amount fa, fc.code fcc, fc.decimals fcd,
                p.purchase_amount pa, pc.code pcc, pc.decimals pcd, p.tender_winner tw {PROCESS_FROM}
                JOIN currencies fc ON fc.id = p.proforma_currency_id LEFT JOIN currencies pc ON pc.id = p.purchase_currency_id
                {aw} p.proforma_amount IS NOT NULL ORDER BY p.proforma_date DESC LIMIT {LIMIT}""", params)
            columns = [col("rn", "شماره درخواست"), col("company", "شرکت"), col("item", "کالا"), col("pd", "تاریخ پیش‌فاکتور", "date"), col("proforma", "مبلغ پیش‌فاکتور", "money"), col("purchase", "قیمت خرید", "money"), col("tw", "برنده مناقصه")]
            rows = [{**{k: ser(v) for k, v in r.items()}, "proforma": money(r["fa"], r["fcc"], r["fcd"]), "purchase": money(r["pa"], r["pcc"], r["pcd"])} for r in raw]
        elif rid == "cheques":
            p2 = {**params, "today": today, **({"cur_f": f["currencyId"]} if f.get("currencyId") else {})}
            raw = fetch_all(c, f"""SELECT p.id _processId, p.request_number rn, co.name company, ch.cheque_number num, ch.cheque_date cd, ch.amount a, cu.code cc, cu.decimals cdc,
                ch.issuer_name issuer, ch.status st, ch.notes notes, DATEDIFF(ch.cheque_date, :today) days
                FROM cheques ch JOIN purchase_processes p ON p.id = ch.process_id JOIN companies co ON co.id = p.company_id JOIN currencies cu ON cu.id = ch.currency_id
                WHERE ch.process_id IN {ids} {'AND ch.currency_id = :cur_f' if f.get('currencyId') else ''} ORDER BY ch.cheque_date LIMIT {LIMIT}""", p2)
            columns = [col("rn", "شماره درخواست"), col("company", "شرکت"), col("num", "شماره چک"), col("cd", "تاریخ سررسید چک", "date"), col("amount", "مبلغ", "money"),
                       col("issuer", "شرکت صادرکننده"), col("st", "وضعیت", "badge", "chequeStatus"), col("days", "روز تا سررسید", "days"), col("notes", "توضیحات")]
            rows = [{**{k: ser(v) for k, v in r.items()}, "amount": money(r["a"], r["cc"], r["cdc"]), "days": int(r["days"]) if r["st"] == "pending" else None} for r in raw]
        elif rid == "obligations":
            status = "AND s.eff_status = :ss_f" if f.get("stageStatus") else "AND s.eff_status IN ('unpaid','overdue')"
            p2 = {**params, "today": today, **({"ss_f": f["stageStatus"]} if f.get("stageStatus") else {}), **({"cur_f": f["currencyId"]} if f.get("currencyId") else {})}
            raw = fetch_all(c, f"""SELECT p.id _processId, p.request_number rn, co.name company, s.seq seq, s.condition_text cond, s.due_date dd, s.eff_amount a, cu.code cc, cu.decimals cdc,
                s.eff_status st, s.notes notes, CASE WHEN s.due_date IS NULL THEN NULL ELSE DATEDIFF(s.due_date, :today) END days
                FROM v_payment_stages s JOIN purchase_processes p ON p.id = s.process_id JOIN companies co ON co.id = p.company_id LEFT JOIN currencies cu ON cu.id = s.eff_currency_id
                WHERE s.process_id IN {ids} {status} {'AND s.eff_currency_id = :cur_f' if f.get('currencyId') else ''}
                ORDER BY (s.due_date IS NULL), s.due_date LIMIT {LIMIT}""", p2)
            columns = [col("rn", "شماره درخواست"), col("company", "شرکت"), col("seq", "مرحله", "int"), col("cond", "زمان/شرط پرداخت"), col("dd", "تاریخ سررسید", "date"),
                       col("amount", "مبلغ", "money"), col("st", "وضعیت", "badge", "stageStatus"), col("days", "روز تا سررسید", "days"), col("notes", "توضیحات")]
            rows = [{**{k: ser(v) for k, v in r.items()}, "amount": money(r["a"], r["cc"], r["cdc"])} for r in raw]
            notes = "مبلغ مراحل درصدی بر پایهٔ مبلغ پیش‌فاکتور (یا قیمت خرید) محاسبه می‌شود. عدد منفی در «روز تا سررسید» یعنی سررسید گذشته است."
        elif rid == "guarantees":
            def q(table, direction, date_col, who):
                return f"""SELECT p.id _processId, p.request_number rn, co.name company, '{direction}' dir, gt.name gtype, g.reference_no ref, g.amount a, cu.code cc, cu.decimals cdc,
                    g.issue_date idate, g.{date_col} edate, {who} who, g.status st, g.notes notes
                    FROM {table} g JOIN purchase_processes p ON p.id = g.process_id JOIN companies co ON co.id = p.company_id
                    JOIN guarantee_types gt ON gt.id = g.guarantee_type_id JOIN currencies cu ON cu.id = g.currency_id
                    WHERE g.process_id IN {ids} {'AND g.status = :gs_f' if f.get('guaranteeStatus') else ''} {'AND g.currency_id = :cur_f' if f.get('currencyId') else ''}"""
            p2 = {**params, **({"gs_f": f["guaranteeStatus"]} if f.get("guaranteeStatus") else {}), **({"cur_f": f["currencyId"]} if f.get("currencyId") else {})}
            raw = fetch_all(c, f"{q('issued_guarantees', 'صادرشده', 'valid_until', 'g.recipient_name')} UNION ALL {q('received_guarantees', 'دریافتی', 'due_date', 'NULL')} ORDER BY idate DESC LIMIT {LIMIT}", p2)
            columns = [col("rn", "شماره درخواست"), col("company", "شرکت"), col("dir", "جهت"), col("gtype", "نوع ضمانت"), col("ref", "شماره/شناسه"), col("amount", "مبلغ", "money"),
                       col("idate", "تاریخ صدور", "date"), col("edate", "سررسید/اعتبار", "date"), col("who", "دریافت‌کننده"), col("st", "وضعیت", "badge", "guaranteeStatus"), col("notes", "توضیحات")]
            rows = [{**{k: ser(v) for k, v in r.items()}, "amount": money(r["a"], r["cc"], r["cdc"])} for r in raw]
        else:  # durations
            raw = fetch_all(c, f"""SELECT p.id _processId, p.request_number rn, co.name company, it.name item, p.start_date sd, p.completed_at ca, p.status st,
                DATEDIFF(COALESCE(p.completed_at, :today), p.start_date) days {PROCESS_FROM} {where} ORDER BY days DESC LIMIT {LIMIT}""", {**params, "today": today})
            columns = [col("rn", "شماره درخواست"), col("company", "شرکت"), col("item", "کالا"), col("sd", "تاریخ شروع", "date"), col("ca", "تاریخ پایان", "date"),
                       col("st", "وضعیت", "badge", "processStatus"), col("days", "مدت اجرا (روز)", "days")]
            rows = _clean(raw)
            done = [int(r["days"]) for r in raw if r["st"] == "completed"]
            notes = (f"میانگین مدت اجرای پرونده‌های تکمیل‌شده: {round(sum(done) / len(done))} روز. برای پرونده‌های در جریان، مدت تا امروز محاسبه شده است."
                     if done else "پرونده تکمیل‌شده‌ای برای محاسبهٔ میانگین وجود ندارد.")
    return {"id": rid, "title": meta[1], "description": meta[2], "columns": columns, "rows": rows, "total": len(rows), "notes": notes}
