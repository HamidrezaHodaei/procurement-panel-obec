import logging

from flask import Flask, jsonify
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError, OperationalError
from werkzeug.exceptions import HTTPException

from . import auth, db, routes
from .common import ApiError, error_response, pydantic_field_errors
from .config import Config
from .seed import seed_if_needed

log = logging.getLogger(__name__)


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    app.json.ensure_ascii = False
    if Config.SECRET_KEY == "dev-only-change-me":
        log.warning("SECRET_KEY is the insecure default — set SECRET_KEY in the environment for production!")

    db.init_engine(Config.DATABASE_URL)
    db.migrate()
    seed_if_needed()

    app.register_blueprint(auth.bp)
    app.register_blueprint(routes.bp)

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True})

    @app.after_request
    def _no_cache(r):  # API responses are per-user; never cache
        r.headers["Cache-Control"] = "no-store"
        return r

    @app.errorhandler(ApiError)
    def _api(e: ApiError):
        return error_response(e.status, e.message, e.field_errors)

    @app.errorhandler(ValidationError)
    def _val(e):
        return error_response(422, "اطلاعات واردشده معتبر نیست", pydantic_field_errors(e))

    @app.errorhandler(IntegrityError)
    def _integrity(e):
        code = getattr(getattr(e.orig, "args", [None]), "__getitem__", lambda i: None)(0)
        if code == 1062:
            return error_response(409, "این مقدار قبلاً ثبت شده است (تکراری)")
        if code in (1451, 1452):
            return error_response(409, "این رکورد در جای دیگری استفاده شده و قابل حذف نیست" if code == 1451 else "مقدار انتخاب‌شده نامعتبر است")
        log.exception("integrity error")
        return error_response(422, "اطلاعات ارسالی با قواعد پایگاه داده سازگار نیست")

    @app.errorhandler(OperationalError)
    def _op(e):
        log.exception("database error")
        return error_response(503, "ارتباط با پایگاه داده برقرار نیست")

    @app.errorhandler(HTTPException)
    def _http(e: HTTPException):
        return error_response(e.code or 500, {404: "آدرس یافت نشد", 405: "روش درخواست مجاز نیست"}.get(e.code, e.description or "خطا"))

    @app.errorhandler(Exception)
    def _any(e):
        log.exception("unhandled error")
        return error_response(500, "خطای داخلی سرور")

    return app
