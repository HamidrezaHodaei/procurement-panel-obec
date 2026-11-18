"""Declarative base-data tables (mirror of the frontend's masters.ts) + generic CRUD."""
from sqlalchemy import text

from .common import ApiError
from .db import engine, fetch_all, fetch_one, row_dto

PAYMENT_KINDS = ["cash", "cheque", "guarantee", "other"]
NAME = {"key": "name", "column": "name", "label": "نام", "type": "text", "required": True}

MASTERS: dict[str, dict] = {
    "companies": {"table": "companies", "fields": [NAME], "order": "name"},
    "itemCategories": {"table": "item_categories", "fields": [NAME], "order": "name"},
    "items": {"table": "items", "order": "name", "fields": [
        NAME, {"key": "categoryId", "column": "category_id", "label": "دسته‌بندی", "type": "ref", "required": True}]},
    "agents": {"table": "agents", "fields": [NAME], "order": "name"},
    "executors": {"table": "executors", "fields": [NAME], "order": "name"},
    "brandsDomestic": {"table": "brands", "fixed": {"kind": "domestic"}, "fields": [NAME], "order": "name"},
    "brandsForeign": {"table": "brands", "fixed": {"kind": "foreign"}, "fields": [NAME], "order": "name"},
    "currencies": {"table": "currencies", "order": "id", "fields": [
        {"key": "code", "column": "code", "label": "کد", "type": "text", "required": True, "upper": True, "immutable": True},
        NAME,
        {"key": "symbol", "column": "symbol", "label": "نماد", "type": "text"},
        {"key": "decimals", "column": "decimals", "label": "تعداد اعشار", "type": "number", "min": 0, "max": 4, "required": True, "immutable": True}]},
    "paymentMethods": {"table": "payment_methods", "order": "id", "fields": [
        NAME, {"key": "kind", "column": "kind", "label": "نوع", "type": "select", "options": PAYMENT_KINDS, "required": True}]},
    "guaranteeTypes": {"table": "guarantee_types", "fields": [NAME], "order": "id"},
}


def _def(key: str) -> dict:
    d = MASTERS.get(key)
    if not d:
        raise ApiError(404, "جدول اطلاعات پایه یافت نشد")
    return d


def list_master(key: str) -> list[dict]:
    d = _def(key)
    where, params = "", {}
    if d.get("fixed"):
        where = "WHERE " + " AND ".join(f"{c} = :{c}" for c in d["fixed"])
        params = d["fixed"]
    with engine().connect() as c:
        return [row_dto(r) for r in fetch_all(c, f"SELECT * FROM {d['table']} {where} ORDER BY is_active DESC, {d['order']}", params)]


def _read(d: dict, body: dict, existing: dict | None = None) -> dict:
    out, errs = {}, {}
    for f in d["fields"]:
        if f["key"] not in body:
            continue
        v = body[f["key"]]
        if existing is not None and f.get("immutable") and str(existing[f["column"]]) != str(v):
            errs[f["key"]] = "این فیلد پس از ثبت قابل تغییر نیست"
            continue
        if f["type"] in ("number", "ref"):
            try:
                v = None if v in ("", None) else int(v)
            except (TypeError, ValueError):
                errs[f["key"]] = "عدد معتبر وارد کنید"
                continue
            if v is not None and ((f.get("min") is not None and v < f["min"]) or (f.get("max") is not None and v > f["max"])):
                errs[f["key"]] = f"مقدار باید بین {f['min']} و {f['max']} باشد"
        else:
            v = v.strip() if isinstance(v, str) else v
            if f.get("upper") and isinstance(v, str):
                v = v.upper()
            if f["type"] == "select" and v not in f["options"]:
                errs[f["key"]] = "گزینه نامعتبر است"
        if f.get("required") and v in (None, ""):
            errs[f["key"]] = f"{f['label']} الزامی است"
        out[f["column"]] = v
    if existing is None:
        for f in d["fields"]:
            if f.get("required") and f["column"] not in out:
                errs[f["key"]] = f"{f['label']} الزامی است"
    if errs:
        raise ApiError(422, "اطلاعات واردشده معتبر نیست", errs)
    return out


def create_master(key: str, body: dict) -> dict:
    d = _def(key)
    values = {**_read(d, body), **(d.get("fixed") or {})}
    cols = list(values)
    with engine().begin() as c:
        i = c.execute(text(f"INSERT INTO {d['table']} ({','.join(cols)}) VALUES ({','.join(':' + k for k in cols)})"), values).lastrowid
        return row_dto(fetch_one(c, f"SELECT * FROM {d['table']} WHERE id = :i", {"i": i}))


def update_master(key: str, id_: int, body: dict) -> dict:
    d = _def(key)
    with engine().begin() as c:
        ex = fetch_one(c, f"SELECT * FROM {d['table']} WHERE id = :i", {"i": id_})
        if not ex or any(ex[k] != v for k, v in (d.get("fixed") or {}).items()):
            raise ApiError(404, "رکورد یافت نشد")
        values = _read(d, body, ex)
        if isinstance(body.get("isActive"), bool):
            values["is_active"] = 1 if body["isActive"] else 0
        if values:
            c.execute(text(f"UPDATE {d['table']} SET {','.join(f'{k} = :{k}' for k in values)} WHERE id = :_id"), {**values, "_id": id_})
        return row_dto(fetch_one(c, f"SELECT * FROM {d['table']} WHERE id = :i", {"i": id_}))


def get_lookups() -> dict:
    with engine().connect() as c:
        q = lambda sql: [row_dto(r) for r in fetch_all(c, sql)]
        return {
            "companies": q("SELECT id,name,is_active FROM companies ORDER BY name"),
            "categories": q("SELECT id,name,is_active FROM item_categories ORDER BY name"),
            "items": q("SELECT id,name,category_id,is_active FROM items ORDER BY name"),
            "agents": q("SELECT id,name,is_active FROM agents ORDER BY name"),
            "executors": q("SELECT id,name,is_active FROM executors ORDER BY name"),
            "brands": q("SELECT id,name,kind,is_active FROM brands ORDER BY name"),
            "currencies": q("SELECT id,code,name,symbol,decimals,is_active FROM currencies ORDER BY id"),
            "paymentMethods": q("SELECT id,name,kind,is_active FROM payment_methods ORDER BY id"),
            "guaranteeTypes": q("SELECT id,name,is_active FROM guarantee_types ORDER BY id"),
        }
