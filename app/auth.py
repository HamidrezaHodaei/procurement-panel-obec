"""Authentication (signed session cookie), roles and user management.

Roles: viewer (read only) < editor (create/edit/delete purchase files) < admin (base data + users).
"""
import time
from functools import wraps

from flask import Blueprint, current_app, g, jsonify, request, session
from sqlalchemy import text
from werkzeug.security import check_password_hash, generate_password_hash

from .common import ApiError
from .db import engine, fetch_all, fetch_one, row_dto, scalar

RANK = {"viewer": 1, "editor": 2, "admin": 3}
ROLE_LABELS = {"viewer": "مشاهده‌گر", "editor": "کاربر (ثبت و ویرایش)", "admin": "مدیر سیستم"}
bp = Blueprint("auth", __name__, url_prefix="/api/auth")

_fails: dict[str, list[float]] = {}  # naive in-memory brute-force limiter (per process)
MAX_FAILS, WINDOW = 5, 300


def _user_dto(u: dict) -> dict:
    return {"id": u["id"], "username": u["username"], "fullName": u["full_name"], "role": u["role"]}


def current_user() -> dict | None:
    if "user" in g:
        return g.user
    uid = session.get("uid")
    user = None
    if uid:
        with engine().connect() as c:
            user = fetch_one(c, "SELECT * FROM users WHERE id = :i AND is_active = 1", {"i": uid})
    g.user = user
    return user


def require(role: str = "viewer"):
    """Route decorator: 401 if not logged in, 403 if the role is too low."""

    def deco(fn):
        @wraps(fn)
        def wrapper(*a, **kw):
            u = current_user()
            if not u:
                raise ApiError(401, "برای ادامه وارد شوید")
            if RANK[u["role"]] < RANK[role]:
                raise ApiError(403, "شما دسترسی لازم برای این عملیات را ندارید")
            return fn(*a, **kw)

        return wrapper

    return deco


def actor_name() -> str:
    u = current_user()
    return u["full_name"] if u else "سیستم"


def validate_password(p: str):
    if not isinstance(p, str) or len(p) < 8:
        raise ApiError(422, "رمز عبور معتبر نیست", {"password": "رمز عبور باید حداقل ۸ نویسه باشد"})


@bp.post("/login")
def login():
    body = request.get_json(silent=True) or {}
    username = str(body.get("username", "")).strip().lower()
    password = str(body.get("password", ""))
    key = f"{request.remote_addr}|{username}"
    now = time.time()
    recent = [t for t in _fails.get(key, []) if now - t < WINDOW]
    if len(recent) >= MAX_FAILS:
        raise ApiError(429, "تعداد تلاش‌های ناموفق زیاد است؛ چند دقیقه بعد دوباره تلاش کنید")
    with engine().begin() as c:
        u = fetch_one(c, "SELECT * FROM users WHERE username = :u", {"u": username})
        if not u or not u["is_active"] or not check_password_hash(u["password_hash"], password):
            _fails[key] = recent + [now]
            raise ApiError(401, "نام کاربری یا رمز عبور اشتباه است")
        c.execute(text("UPDATE users SET last_login = UTC_TIMESTAMP() WHERE id = :i"), {"i": u["id"]})
    _fails.pop(key, None)
    session.clear()
    session["uid"] = u["id"]
    session.permanent = True
    return jsonify(_user_dto(u))


@bp.post("/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@bp.get("/me")
@require("viewer")
def me():
    return jsonify(_user_dto(current_user()))


@bp.post("/password")
@require("viewer")
def change_password():
    body = request.get_json(silent=True) or {}
    u = current_user()
    if not check_password_hash(u["password_hash"], str(body.get("currentPassword", ""))):
        raise ApiError(422, "رمز فعلی اشتباه است", {"currentPassword": "رمز فعلی اشتباه است"})
    validate_password(body.get("newPassword"))
    with engine().begin() as c:
        c.execute(text("UPDATE users SET password_hash = :h WHERE id = :i"), {"h": generate_password_hash(body["newPassword"]), "i": u["id"]})
    return jsonify({"ok": True})


# ───────── user management (admin) ─────────
def _public(r: dict) -> dict:
    d = row_dto({k: v for k, v in r.items() if k != "password_hash"})
    return d


@bp.get("/users")
@require("admin")
def list_users():
    with engine().connect() as c:
        return jsonify([_public(r) for r in fetch_all(c, "SELECT * FROM users ORDER BY is_active DESC, id")])


def _admin_guard(c, user_id: int | None, new_role: str | None, new_active: bool | None):
    """Never allow the system to end up without an active admin."""
    if user_id is None:
        return
    others = scalar(c, "SELECT COUNT(*) FROM users WHERE role='admin' AND is_active=1 AND id <> :i", {"i": user_id})
    losing = (new_role is not None and new_role != "admin") or (new_active is False)
    target = fetch_one(c, "SELECT role, is_active FROM users WHERE id = :i", {"i": user_id})
    if target and target["role"] == "admin" and target["is_active"] and losing and others == 0:
        raise ApiError(409, "حداقل یک مدیر فعال باید در سیستم باقی بماند")


@bp.post("/users")
@require("admin")
def create_user():
    b = request.get_json(silent=True) or {}
    username = str(b.get("username", "")).strip().lower()
    full_name = str(b.get("fullName", "")).strip()
    role = b.get("role", "editor")
    errs = {}
    if not username or not username.replace("_", "").replace(".", "").replace("-", "").isalnum():
        errs["username"] = "نام کاربری فقط شامل حروف لاتین، عدد و _ . - باشد"
    if not full_name:
        errs["fullName"] = "نام نمایشی الزامی است"
    if role not in RANK:
        errs["role"] = "نقش نامعتبر است"
    if not isinstance(b.get("password"), str) or len(b["password"]) < 8:
        errs["password"] = "رمز عبور باید حداقل ۸ نویسه باشد"
    if errs:
        raise ApiError(422, "اطلاعات واردشده معتبر نیست", errs)
    with engine().begin() as c:
        if scalar(c, "SELECT COUNT(*) FROM users WHERE username = :u", {"u": username}):
            raise ApiError(409, "این نام کاربری قبلاً ثبت شده است", {"username": "تکراری است"})
        i = c.execute(text("INSERT INTO users (username, full_name, password_hash, role, created_at) VALUES (:u,:f,:h,:r,UTC_TIMESTAMP())"),
                      {"u": username, "f": full_name, "h": generate_password_hash(b["password"]), "r": role}).lastrowid
        return jsonify(_public(fetch_one(c, "SELECT * FROM users WHERE id = :i", {"i": i}))), 201


@bp.patch("/users/<int:uid>")
@require("admin")
def update_user(uid: int):
    b = request.get_json(silent=True) or {}
    sets, params, errs = [], {"i": uid}, {}
    if "fullName" in b:
        if not str(b["fullName"]).strip():
            errs["fullName"] = "نام نمایشی الزامی است"
        sets.append("full_name = :f"); params["f"] = str(b["fullName"]).strip()
    if "role" in b:
        if b["role"] not in RANK:
            errs["role"] = "نقش نامعتبر است"
        sets.append("role = :r"); params["r"] = b["role"]
    if "isActive" in b:
        sets.append("is_active = :a"); params["a"] = 1 if b["isActive"] else 0
    if b.get("password"):
        validate_password(b["password"])
        sets.append("password_hash = :h"); params["h"] = generate_password_hash(b["password"])
    if errs:
        raise ApiError(422, "اطلاعات واردشده معتبر نیست", errs)
    with engine().begin() as c:
        if not fetch_one(c, "SELECT id FROM users WHERE id = :i", {"i": uid}):
            raise ApiError(404, "کاربر یافت نشد")
        _admin_guard(c, uid, b.get("role"), b.get("isActive") if "isActive" in b else None)
        if sets:
            c.execute(text(f"UPDATE users SET {', '.join(sets)} WHERE id = :i"), params)
        return jsonify(_public(fetch_one(c, "SELECT * FROM users WHERE id = :i", {"i": uid})))
