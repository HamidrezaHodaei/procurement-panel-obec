"""Purchase files: list/read/create/update/delete + children (cheques, stages, guarantees)."""
import json
from datetime import date

from pydantic import ValidationError
from sqlalchemy import text

from . import audit
from .common import ApiError, parse_money, pydantic_field_errors
from .db import engine, fetch_all, fetch_one, row_dto, scalar
from .filters import PROCESS_FROM, build_where
from .schemas import ChequeIn, IssuedGuaranteeIn, ProcessIn, ReceivedGuaranteeIn, StageIn


def _validate(model, body):
    try:
        return model.model_validate(body or {})
    except ValidationError as e:
        raise ApiError(422, "اطلاعات واردشده معتبر نیست", pydantic_field_errors(e))


def _minor(c, value, currency_id, field):
    if value is None or str(value).strip() == "":
        return None
    if not currency_id:
        raise ApiError(422, "واحد پولی انتخاب نشده است", {field: "واحد پولی را انتخاب کنید"})
    dec = scalar(c, "SELECT decimals FROM currencies WHERE id = :i", {"i": currency_id})
    if dec is None:
        raise ApiError(422, "واحد پولی نامعتبر است", {field: "واحد پولی نامعتبر است"})
    try:
        n = parse_money(value, int(dec))
    except ValueError:
        raise ApiError(422, "مبلغ نامعتبر است", {field: "مبلغ معتبر وارد کنید (حداکثر به تعداد اعشار واحد پولی)"})
    if n is None or n < 0:
        raise ApiError(422, "مبلغ نامعتبر است", {field: "مبلغ معتبر وارد کنید"})
    return n


# ───────── list / read ─────────
SORTS = {"requestNumber": "p.request_number", "startDate": "p.start_date", "companyName": "co.name", "itemName": "it.name",
         "status": "p.status", "purchaseType": "p.purchase_type", "updatedAt": "p.updated_at"}


def list_processes(filters: dict, page: int, per_page: int, sort: list[dict]) -> dict:
    where, params = build_where(filters)
    order = [f"{SORTS[s['id']]} {'DESC' if s.get('desc') else 'ASC'}" for s in sort if s.get("id") in SORTS]
    order_by = ", ".join([*order, "p.start_date DESC", "p.id DESC"])
    with engine().connect() as c:
        total = scalar(c, f"SELECT COUNT(*) {PROCESS_FROM} {where}", params)
        rows = fetch_all(c, f"""SELECT p.id, p.request_number, co.name company_name, it.name item_name, ic.name category_name, p.start_date,
            p.status, p.purchase_type, ag.name agent_name, ex.name executor_name, br.name brand_name,
            p.purchase_amount, p.purchase_currency_id, p.proforma_amount, p.proforma_currency_id, p.updated_by, p.updated_at
            {PROCESS_FROM} {where} ORDER BY {order_by} LIMIT :_lim OFFSET :_off""",
                         {**params, "_lim": per_page, "_off": (page - 1) * per_page})
    return {"rows": [row_dto(r) for r in rows], "total": int(total)}


def get_process(pid: int, c=None) -> dict:
    def run(c):
        r = fetch_one(c, """SELECT p.*, it.category_id FROM purchase_processes p JOIN items it ON it.id = p.item_id WHERE p.id = :i""", {"i": pid})
        if not r:
            raise ApiError(404, "پرونده خرید یافت نشد")
        d = row_dto(r)
        d["paymentMethodIds"] = [x["payment_method_id"] for x in fetch_all(c, "SELECT payment_method_id FROM process_payment_methods WHERE process_id = :i ORDER BY payment_method_id", {"i": pid})]
        q = lambda sql: [row_dto(x) for x in fetch_all(c, sql, {"i": pid})]
        d["cheques"] = q("SELECT * FROM cheques WHERE process_id = :i ORDER BY cheque_date, id")
        d["stages"] = q("SELECT * FROM v_payment_stages WHERE process_id = :i ORDER BY seq, id")
        d["receivedGuarantees"] = q("SELECT * FROM received_guarantees WHERE process_id = :i ORDER BY issue_date, id")
        d["issuedGuarantees"] = q("SELECT * FROM issued_guarantees WHERE process_id = :i ORDER BY issue_date, id")
        return d

    if c is not None:
        return run(c)
    with engine().connect() as conn:
        return run(conn)


def get_audit(pid: int) -> list[dict]:
    with engine().connect() as c:
        out = []
        for r in fetch_all(c, "SELECT * FROM audit_log WHERE process_id = :i ORDER BY id DESC LIMIT 500", {"i": pid}):
            d = row_dto(r)
            d["changes"] = json.loads(d["changes"]) if d.get("changes") else None
            out.append(d)
        return out


# ───────── process write ─────────
def _usable(c, table, id_, previous, label):
    if not id_ or id_ == previous:
        return
    r = fetch_one(c, f"SELECT is_active FROM {table} WHERE id = :i", {"i": id_})
    if not r:
        raise ApiError(422, f"{label} نامعتبر است")
    if not r["is_active"]:
        raise ApiError(422, f"{label} غیرفعال است")


def _process_row(c, body, existing=None):
    v = _validate(ProcessIn, body)
    ex = existing or {}
    _usable(c, "companies", v.companyId, ex.get("company_id"), "شرکت متقاضی")
    _usable(c, "items", v.itemId, ex.get("item_id"), "کالا")
    _usable(c, "agents", v.agentId, ex.get("agent_id"), "مأمور خرید")
    _usable(c, "executors", v.executorId, ex.get("executor_id"), "مجری خرید")
    _usable(c, "brands", v.brandId, ex.get("brand_id"), "برند")
    if v.brandId:
        b = fetch_one(c, "SELECT kind FROM brands WHERE id = :i", {"i": v.brandId})
        if b and b["kind"] != v.purchaseType:
            raise ApiError(422, "برند با نوع خرید سازگار نیست", {"brandId": "برند باید متناسب با نوع خرید (داخلی/خارجی) باشد"})
    methods = sorted(set(v.paymentMethodIds))
    if methods:
        found = scalar(c, "SELECT COUNT(*) FROM payment_methods WHERE id IN :ids".replace(":ids", "(" + ",".join(str(int(m)) for m in methods) + ")"))
        if found != len(methods):
            raise ApiError(422, "روش پرداخت نامعتبر است")
    row = {
        "request_number": v.requestNumber, "company_id": v.companyId, "item_id": v.itemId, "start_date": v.startDate,
        "status": v.status, "completed_at": (v.completedAt or date.today().isoformat()) if v.status == "completed" else None,
        "agent_id": v.agentId, "agent_relation": v.agentRelation if (v.agentId or v.agentRelation) else None,
        "executor_id": v.executorId, "purchase_type": v.purchaseType, "brand_id": v.brandId,
        "actions_text": v.actionsText, "tender_winner": v.tenderWinner,
        "purchase_amount": _minor(c, v.purchaseAmount, v.purchaseCurrencyId, "purchaseAmount"),
        "purchase_currency_id": v.purchaseCurrencyId if v.purchaseAmount else None,
        "proforma_date": v.proformaDate,
        "proforma_amount": _minor(c, v.proformaAmount, v.proformaCurrencyId, "proformaAmount"),
        "proforma_currency_id": v.proformaCurrencyId if v.proformaAmount else None,
    }
    return row, methods


def _set_methods(c, pid, ids):
    c.execute(text("DELETE FROM process_payment_methods WHERE process_id = :p"), {"p": pid})
    for m in ids:
        c.execute(text("INSERT INTO process_payment_methods (process_id, payment_method_id) VALUES (:p,:m)"), {"p": pid, "m": m})


def _method_names(c, ids):
    if not ids:
        return "—"
    rows = fetch_all(c, "SELECT name FROM payment_methods WHERE id IN (" + ",".join(str(int(i)) for i in ids) + ") ORDER BY id")
    return "، ".join(r["name"] for r in rows)


def create_process(body, user: str) -> dict:
    with engine().begin() as c:
        row, methods = _process_row(c, body)
        cols = list(row)
        pid = c.execute(text(f"""INSERT INTO purchase_processes ({','.join(cols)}, created_by, created_at, updated_by, updated_at)
            VALUES ({','.join(':' + k for k in cols)}, :_u, UTC_TIMESTAMP(), :_u, UTC_TIMESTAMP())"""), {**row, "_u": user}).lastrowid
        _set_methods(c, pid, methods)
        audit.write(c, pid, "process", pid, "create", f"ایجاد پرونده خرید {row['request_number']}", user, audit.snapshot(c, row))
        return get_process(pid, c)


def update_process(pid: int, body, user: str) -> dict:
    with engine().begin() as c:
        ex = fetch_one(c, "SELECT * FROM purchase_processes WHERE id = :i FOR UPDATE", {"i": pid})
        if not ex:
            raise ApiError(404, "پرونده خرید یافت نشد")
        row, methods = _process_row(c, body, ex)
        c.execute(text(f"UPDATE purchase_processes SET {','.join(f'{k} = :{k}' for k in row)}, updated_by = :_u, updated_at = UTC_TIMESTAMP() WHERE id = :_id"),
                  {**row, "_u": user, "_id": pid})
        old = sorted(r["payment_method_id"] for r in fetch_all(c, "SELECT payment_method_id FROM process_payment_methods WHERE process_id = :p", {"p": pid}))
        _set_methods(c, pid, methods)
        changes = audit.diff(c, ex, row)
        if old != methods:
            changes["روش‌های پرداخت"] = [_method_names(c, old), _method_names(c, methods)]
        if changes:
            audit.write(c, pid, "process", pid, "update", f"ویرایش پرونده خرید {row['request_number']}", user, changes)
        return get_process(pid, c)


def delete_process(pid: int, user: str) -> dict:
    with engine().begin() as c:
        ex = fetch_one(c, "SELECT request_number FROM purchase_processes WHERE id = :i", {"i": pid})
        if not ex:
            raise ApiError(404, "پرونده خرید یافت نشد")
        c.execute(text("DELETE FROM purchase_processes WHERE id = :i"), {"i": pid})
        audit.write(c, pid, "process", pid, "delete", f"حذف پرونده خرید {ex['request_number']}", user)
    return {"ok": True}


# ───────── children ─────────
def _cheque(c, body, ex=None):
    v = _validate(ChequeIn, body)
    return {"cheque_number": v.chequeNumber, "cheque_date": v.chequeDate, "amount": _minor(c, v.amount, v.currencyId, "amount"),
            "currency_id": v.currencyId, "issuer_name": v.issuerName, "status": v.status, "notes": v.notes}


def _stage(c, body, ex=None):
    v = _validate(StageIn, body)
    bp = None
    if v.amountType == "percent":
        try:
            bp = parse_money(v.percent, 2)
        except ValueError:
            bp = None
        if bp is None or bp <= 0 or bp > 10000:
            raise ApiError(422, "درصد نامعتبر است", {"percent": "درصد باید بین ۰ تا ۱۰۰ باشد"})
    return {"amount_type": v.amountType,
            "amount": _minor(c, v.amount, v.currencyId, "amount") if v.amountType == "amount" else None,
            "currency_id": v.currencyId if v.amountType == "amount" else None, "percent_bp": bp,
            "condition_text": v.conditionText, "due_date": v.dueDate, "status": v.status,
            "paid_at": (v.paidAt or date.today().isoformat()) if v.status == "paid" else None, "notes": v.notes}


def _received(c, body, ex=None):
    v = _validate(ReceivedGuaranteeIn, body)
    _usable(c, "guarantee_types", v.guaranteeTypeId, (ex or {}).get("guarantee_type_id"), "نوع ضمانت")
    return {"guarantee_type_id": v.guaranteeTypeId, "reference_no": v.referenceNo, "amount": _minor(c, v.amount, v.currencyId, "amount"),
            "currency_id": v.currencyId, "issue_date": v.issueDate, "due_date": v.dueDate, "status": v.status, "notes": v.notes}


def _issued(c, body, ex=None):
    v = _validate(IssuedGuaranteeIn, body)
    e = ex or {}
    _usable(c, "guarantee_types", v.guaranteeTypeId, e.get("guarantee_type_id"), "نوع ضمانت")
    _usable(c, "companies", v.relatedCompanyId, e.get("related_company_id"), "شرکت مرتبط")
    return {"guarantee_type_id": v.guaranteeTypeId, "reference_no": v.referenceNo, "amount": _minor(c, v.amount, v.currencyId, "amount"),
            "currency_id": v.currencyId, "issue_date": v.issueDate, "valid_until": v.validUntil, "recipient_name": v.recipientName,
            "related_company_id": v.relatedCompanyId, "status": v.status, "notes": v.notes}


CHILDREN = {
    "cheques": {"table": "cheques", "label": "چک", "parse": _cheque},
    "stages": {"table": "payment_stages", "label": "مرحله پرداخت", "parse": _stage, "read": "v_payment_stages"},
    "received-guarantees": {"table": "received_guarantees", "label": "ضمانت دریافتی", "parse": _received},
    "issued-guarantees": {"table": "issued_guarantees", "label": "ضمانت صادرشده", "parse": _issued},
}


def _ref(kind, row):
    return {"cheques": lambda r: f"شماره {r.get('cheque_number')}", "stages": lambda r: f"مرحله {r.get('seq')}"}.get(kind, lambda r: str(r.get("reference_no")))(row)


def _touch(c, pid, user):
    c.execute(text("UPDATE purchase_processes SET updated_by = :u, updated_at = UTC_TIMESTAMP() WHERE id = :i"), {"u": user, "i": pid})


def create_child(kind: str, pid: int, body, user: str) -> dict:
    d = CHILDREN[kind]
    with engine().begin() as c:
        if not scalar(c, "SELECT 1 FROM purchase_processes WHERE id = :i", {"i": pid}):
            raise ApiError(404, "پرونده خرید یافت نشد")
        row = d["parse"](c, body)
        if kind == "stages":
            row["seq"] = int(scalar(c, "SELECT COALESCE(MAX(seq),0) FROM payment_stages WHERE process_id = :p", {"p": pid})) + 1
        cols = list(row)
        cid = c.execute(text(f"""INSERT INTO {d['table']} (process_id, {','.join(cols)}, created_by, created_at, updated_by, updated_at)
            VALUES (:_p, {','.join(':' + k for k in cols)}, :_u, UTC_TIMESTAMP(), :_u, UTC_TIMESTAMP())"""), {**row, "_p": pid, "_u": user}).lastrowid
        audit.write(c, pid, kind, cid, "create", f"افزودن {d['label']} ({_ref(kind, row)})", user, audit.snapshot(c, row))
        _touch(c, pid, user)
        return row_dto(fetch_one(c, f"SELECT * FROM {d.get('read', d['table'])} WHERE id = :i", {"i": cid}))


def update_child(kind: str, pid: int, cid: int, body, user: str) -> dict:
    d = CHILDREN[kind]
    with engine().begin() as c:
        ex = fetch_one(c, f"SELECT * FROM {d['table']} WHERE id = :i AND process_id = :p FOR UPDATE", {"i": cid, "p": pid})
        if not ex:
            raise ApiError(404, "رکورد یافت نشد")
        row = d["parse"](c, body, ex)
        c.execute(text(f"UPDATE {d['table']} SET {','.join(f'{k} = :{k}' for k in row)}, updated_by = :_u, updated_at = UTC_TIMESTAMP() WHERE id = :_id"),
                  {**row, "_u": user, "_id": cid})
        changes = audit.diff(c, ex, row)
        if changes:
            audit.write(c, pid, kind, cid, "update", f"ویرایش {d['label']} ({_ref(kind, {**ex, **row})})", user, changes)
        _touch(c, pid, user)
        return row_dto(fetch_one(c, f"SELECT * FROM {d.get('read', d['table'])} WHERE id = :i", {"i": cid}))


def delete_child(kind: str, pid: int, cid: int, user: str) -> dict:
    d = CHILDREN[kind]
    with engine().begin() as c:
        ex = fetch_one(c, f"SELECT * FROM {d['table']} WHERE id = :i AND process_id = :p", {"i": cid, "p": pid})
        if not ex:
            raise ApiError(404, "رکورد یافت نشد")
        c.execute(text(f"DELETE FROM {d['table']} WHERE id = :i"), {"i": cid})
        audit.write(c, pid, kind, cid, "delete", f"حذف {d['label']} ({_ref(kind, ex)})", user, audit.snapshot(c, ex))
        _touch(c, pid, user)
    return {"ok": True}
