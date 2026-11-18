import logging
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Connection, Engine

from .schema import MIGRATIONS

log = logging.getLogger(__name__)
_engine: Engine | None = None


def init_engine(url: str) -> Engine:
    global _engine
    _engine = create_engine(url, pool_pre_ping=True, pool_recycle=1800, future=True)

    @event.listens_for(_engine, "connect")
    def _on_connect(dbapi_conn, _):  # relax ONLY_FULL_GROUP_BY (grouped reports select functionally-dependent names)
        cur = dbapi_conn.cursor()
        cur.execute("SET SESSION sql_mode = REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', '')")
        cur.close()

    return _engine


def engine() -> Engine:
    assert _engine is not None, "engine not initialised"
    return _engine


def migrate() -> None:
    """Run pending migrations (tracked in schema_version)."""
    with engine().begin() as c:
        c.execute(text("CREATE TABLE IF NOT EXISTS schema_version (v INT NOT NULL) ENGINE=InnoDB"))
        row = c.execute(text("SELECT MAX(v) FROM schema_version")).scalar()
        current = row or 0
    for i in range(current, len(MIGRATIONS)):
        log.info("applying migration %s", i + 1)
        with engine().begin() as c:  # DDL auto-commits in MySQL; version row written last
            for stmt in MIGRATIONS[i]:
                c.execute(text(stmt))
            c.execute(text("INSERT INTO schema_version (v) VALUES (:v)"), {"v": i + 1})


def ser(v):
    """JSON-friendly value: dates → ISO strings, Decimal → int/float."""
    if isinstance(v, datetime):
        return v.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, Decimal):
        return int(v) if v == v.to_integral_value() else float(v)
    return v


def camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.title() for p in parts[1:])


BOOL_COLS = {"is_active"}


def row_dto(r: dict) -> dict:
    return {camel(k): (bool(v) if k in BOOL_COLS else ser(v)) for k, v in r.items()}


def fetch_all(c: Connection, sql: str, params: dict | None = None) -> list[dict]:
    return [dict(r) for r in c.execute(text(sql), params or {}).mappings().all()]


def fetch_one(c: Connection, sql: str, params: dict | None = None) -> dict | None:
    r = c.execute(text(sql), params or {}).mappings().first()
    return dict(r) if r else None


def scalar(c: Connection, sql: str, params: dict | None = None):
    return c.execute(text(sql), params or {}).scalar()
