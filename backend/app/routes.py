"""HTTP API. Same URLs/JSON as the original Next.js route handlers, so the frontend needs no change."""
import json
from urllib.parse import quote

from flask import Blueprint, Response, jsonify, request

from . import dashboard as dash
from . import masters, processes, reports
from .auth import actor_name, current_user, require
from .common import ApiError
from .export import report_to_xlsx
from .filters import filters_from_args
from .jalali import fmt_jalali

bp = Blueprint("api", __name__, url_prefix="/api/procurement")


def body():
    b = request.get_json(silent=True)
    if b is None:
        raise ApiError(400, "بدنهٔ درخواست باید JSON معتبر باشد")
    return b


@bp.get("/lookups")
@require("viewer")
def lookups():
    return jsonify(masters.get_lookups())


@bp.get("/dashboard")
@require("viewer")
def dashboard():
    return jsonify(dash.get_dashboard(filters_from_args(request.args)))


# ───────── base data (admin writes) ─────────
@bp.get("/masters/<key>")
@require("viewer")
def master_list(key):
    return jsonify(masters.list_master(key))


@bp.post("/masters/<key>")
@require("admin")
def master_create(key):
    return jsonify(masters.create_master(key, body()))


@bp.patch("/masters/<key>/<int:id_>")
@require("admin")
def master_update(key, id_):
    return jsonify(masters.update_master(key, id_, body()))


# ───── purchase files ─────
@bp.get("/processes")
@require("viewer")
def process_list():
    try:
        sort = json.loads(request.args.get("sort") or "[]")
        assert isinstance(sort, list)
    except Exception:
        raise ApiError(400, "پارامتر مرتب‌سازی نامعتبر است")
    per = min(max(request.args.get("perPage", 10, type=int), 1), 200)
    page = max(request.args.get("page", 1, type=int), 1)
    return jsonify(processes.list_processes(filters_from_args(request.args), page, per, sort))


@bp.post("/processes")
@require("editor")
def process_create():
    return jsonify(processes.create_process(body(), actor_name()))


@bp.get("/processes/<int:pid>")
@require("viewer")
def process_get(pid):
    return jsonify(processes.get_process(pid))


@bp.patch("/processes/<int:pid>")
@require("editor")
def process_update(pid):
    return jsonify(processes.update_process(pid, body(), actor_name()))


@bp.delete("/processes/<int:pid>")
@require("editor")
def process_delete(pid):
    return jsonify(processes.delete_process(pid, actor_name()))


@bp.get("/processes/<int:pid>/audit")
@require("viewer")
def process_audit(pid):
    return jsonify(processes.get_audit(pid))


def _kind(kind):
    if kind not in processes.CHILDREN:
        raise ApiError(404, "بخش نامعتبر است")
    return kind


@bp.post("/processes/<int:pid>/<kind>")
@require("editor")
def child_create(pid, kind):
    return jsonify(processes.create_child(_kind(kind), pid, body(), actor_name()))


@bp.patch("/processes/<int:pid>/<kind>/<int:cid>")
@require("editor")
def child_update(pid, kind, cid):
    return jsonify(processes.update_child(_kind(kind), pid, cid, body(), actor_name()))


@bp.delete("/processes/<int:pid>/<kind>/<int:cid>")
@require("editor")
def child_delete(pid, kind, cid):
    return jsonify(processes.delete_child(_kind(kind), pid, cid, actor_name()))


# ───── reports ─────
@bp.get("/reports/<rid>")
@require("viewer")
def report(rid):
    return jsonify(reports.run_report(rid, filters_from_args(request.args)))


@bp.get("/reports/<rid>/export")
@require("viewer")
def report_export(rid):
    rep = reports.run_report(rid, filters_from_args(request.args))
    name = quote(f"{rep['title']}-{fmt_jalali(__import__('datetime').date.today(), False).replace('/', '-')}.xlsx")
    return Response(report_to_xlsx(rep), mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f"attachment; filename*=UTF-8''{name}"})
