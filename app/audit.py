"""Change history: human-readable before/after diffs stored in audit_log."""
import json

from sqlalchemy import text

from .common import fa_digits, fmt_money
from .constants import (AGENT_RELATION, AMOUNT_TYPE, CHEQUE_STATUS, GUARANTEE_STATUS, PROCESS_STATUS,
                        PURCHASE_TYPE, STAGE_STATUS)
from .db import fetch_one, ser
from .jalali import fmt_jalali

LABELS = {
    "request_number": "شماره درخواست", "company_id": "شرکت متقاضی", "item_id": "کالا", "start_date": "تاریخ شروع",
    "status": "وضعیت", "completed_at": "تاریخ پایان", "agent_id": "مأمور خرید", "agent_relation": "نوع ارتباط",
    "executor_id": "مجری خرید", "purchase_type": "نوع خرید", "brand_id": "برند", "actions_text": "شرح اقدامات",
    "tender_winner": "برنده مناقصه", "purchase_amount": "قیمت خرید", "purchase_currency_id": "واحد پولی خرید",
    "proforma_date": "تاریخ پیش‌فاکتور", "proforma_amount": "مبلغ پیش‌فاکتور", "proforma_currency_id": "واحد پولی پیش‌فاکتور",
    "cheque_number": "شماره چک", "cheque_date": "تاریخ چک", "amount": "مبلغ", "currency_id": "واحد پولی",
    "issuer_name": "شرکت صادرکننده", "notes": "توضیحات", "amount_type": "نوع مبلغ", "percent_bp": "درصد",
    "condition_text": "شرط پرداخت", "due_date": "تاریخ سررسید", "paid_at": "تاریخ پرداخت",
    "guarantee_type_id": "نوع ضمانت", "reference_no": "شماره/شناسه", "issue_date": "تاریخ صدور", "valid_until": "تاریخ اعتبار",
    "recipient_name": "دریافت‌کننده", "related_company_id": "شرکت مرتبط",
}
REF = {
    "company_id": ("companies", "name"), "item_id": ("items", "name"), "agent_id": ("agents", "name"),
    "executor_id": ("executors", "name"), "brand_id": ("brands", "name"), "purchase_currency_id": ("currencies", "code"),
    "proforma_currency_id": ("currencies", "code"), "currency_id": ("currencies", "code"),
    "guarantee_type_id": ("guarantee_types", "name"), "related_company_id": ("companies", "name"),
}
ENUMS = {"status": {**PROCESS_STATUS, **CHEQUE_STATUS, **STAGE_STATUS, **GUARANTEE_STATUS},
         "purchase_type": PURCHASE_TYPE, "agent_relation": AGENT_RELATION, "amount_type": AMOUNT_TYPE}
DATES = {"start_date", "completed_at", "proforma_date", "cheque_date", "due_date", "paid_at", "issue_date", "valid_until"}
MONEY_CUR = {"amount": "currency_id", "purchase_amount": "purchase_currency_id", "proforma_amount": "proforma_currency_id"}


def display(c, col: str, row: dict) -> str:
    v = row.get(col)
    if v is None or v == "":
        return "—"
    if col in DATES:
        return fmt_jalali(v)
    if col in REF:
        t, name = REF[col]
        r = fetch_one(c, f"SELECT {name} AS v FROM {t} WHERE id = :i", {"i": v})
        return str(r["v"]) if r else str(v)
    if col in ENUMS and str(v) in ENUMS[col]:
        return ENUMS[col][str(v)]
    if col == "percent_bp":
        return fa_digits(f"{int(v) / 100:g}") + "٪"
    if col in MONEY_CUR:
        cur = fetch_one(c, "SELECT code, decimals FROM currencies WHERE id = :i", {"i": row.get(MONEY_CUR[col])})
        return f"{fmt_money(int(v), cur['decimals'])} {cur['code']}" if cur else str(v)
    return str(v)


def diff(c, before: dict, after: dict) -> dict:
    out = {}
    for col in after:
        if col not in LABELS:
            continue
        if ser(before.get(col)) == ser(after.get(col)):
            continue
        out[LABELS[col]] = [display(c, col, before), display(c, col, after)]
    return out


def snapshot(c, row: dict) -> dict:
    return {LABELS[k]: ["—", display(c, k, row)] for k, v in row.items() if k in LABELS and v not in (None, "")}


def write(c, process_id: int, entity: str, entity_id, action: str, summary: str, user: str, changes: dict | None = None):
    c.execute(text("""INSERT INTO audit_log (process_id, entity, entity_id, action, summary, changes, user_name, at)
                      VALUES (:p,:e,:ei,:a,:s,:ch,:u,UTC_TIMESTAMP())"""),
              {"p": process_id, "e": entity, "ei": entity_id, "a": action, "s": summary,
               "ch": json.dumps(changes, ensure_ascii=False) if changes else None, "u": user})
