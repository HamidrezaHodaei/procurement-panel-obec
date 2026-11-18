from datetime import date

from .db import engine, fetch_all, fetch_one
from .filters import PROCESS_FROM, build_where
from .jalali import month_key, month_label


def get_dashboard(f: dict) -> dict:
    where, params = build_where(f)
    and_where = (where + " AND") if where else "WHERE"
    ids = f"(SELECT p.id {PROCESS_FROM} {where})"
    p = {**params, "today": date.today().isoformat()}
    with engine().connect() as c:
        one = lambda sql: fetch_one(c, sql, p)
        allr = lambda sql: fetch_all(c, sql, p)
        n = lambda v: int(v or 0)

        k = one(f"""SELECT COUNT(*) total, COALESCE(SUM(p.status='active'),0) active, COALESCE(SUM(p.purchase_type='domestic'),0) domestic,
            COALESCE(SUM(p.purchase_type='foreign'),0) foreign_t, COALESCE(SUM(p.proforma_amount IS NOT NULL),0) proformas {PROCESS_FROM} {where}""")
        chq = one(f"""SELECT COALESCE(SUM(status='pending' AND cheque_date >= :today),0) pending,
            COALESCE(SUM(status='pending' AND cheque_date < :today),0) overdue FROM cheques WHERE process_id IN {ids}""")
        rg = n(one(f"SELECT COUNT(*) c FROM received_guarantees WHERE status='active' AND process_id IN {ids}")["c"])
        ig = n(one(f"SELECT COUNT(*) c FROM issued_guarantees WHERE status='active' AND process_id IN {ids}")["c"])

        cur = allr("SELECT id, code, decimals FROM currencies WHERE is_active = 1 OR id IN (SELECT currency_id FROM cheques) ORDER BY id")
        sum_by = lambda sql: {int(r["c"]): int(r["s"]) for r in allr(sql)}
        purchases = sum_by(f"SELECT p.purchase_currency_id c, SUM(p.purchase_amount) s {PROCESS_FROM} {and_where} p.purchase_amount IS NOT NULL GROUP BY p.purchase_currency_id")
        proformas = sum_by(f"SELECT p.proforma_currency_id c, SUM(p.proforma_amount) s {PROCESS_FROM} {and_where} p.proforma_amount IS NOT NULL GROUP BY p.proforma_currency_id")
        stage = lambda cond: sum_by(f"SELECT eff_currency_id c, SUM(eff_amount) s FROM v_payment_stages WHERE eff_status {cond} AND eff_currency_id IS NOT NULL AND process_id IN {ids} GROUP BY eff_currency_id")
        paid_st, unpaid, overdue = stage("= 'paid'"), stage("IN ('unpaid','overdue')"), stage("= 'overdue'")
        cashed = sum_by(f"SELECT currency_id c, SUM(amount) s FROM cheques WHERE status='cashed' AND process_id IN {ids} GROUP BY currency_id")
        pending = sum_by(f"SELECT currency_id c, SUM(amount) s FROM cheques WHERE status='pending' AND process_id IN {ids} GROUP BY currency_id")
        by_currency = [{"currencyId": r["id"], "code": r["code"], "decimals": r["decimals"],
                        "purchases": purchases.get(r["id"], 0), "proformas": proformas.get(r["id"], 0),
                        "paid": paid_st.get(r["id"], 0) + cashed.get(r["id"], 0), "unpaid": unpaid.get(r["id"], 0),
                        "overdue": overdue.get(r["id"], 0), "chequesPending": pending.get(r["id"], 0)} for r in cur]

        def people(col, alias):
            rows = allr(f"""SELECT {alias}.name name, COUNT(*) total, SUM(p.status='completed') completed, SUM(p.status='active') active
                {PROCESS_FROM} {and_where} p.{col} IS NOT NULL GROUP BY {alias}.id, {alias}.name ORDER BY total DESC LIMIT 10""")
            return [{"name": r["name"], "total": n(r["total"]), "completed": n(r["completed"]), "active": n(r["active"])} for r in rows]

        buckets: dict[str, int] = {}
        for r in allr(f"SELECT p.start_date d {PROCESS_FROM} {where}"):
            key = month_key(r["d"])
            buckets[key] = buckets.get(key, 0) + 1
        trend = [{"key": key, "label": month_label(key), "count": cnt} for key, cnt in sorted(buckets.items())]

        sc = one(f"""SELECT COALESCE(SUM(eff_status='paid'),0) paid, COALESCE(SUM(eff_status='unpaid'),0) unpaid,
            COALESCE(SUM(eff_status='overdue'),0) overdue FROM v_payment_stages WHERE process_id IN {ids}""")
        guar = {"active": 0, "returned": 0, "collected": 0, "cancelled": 0}
        for t in ("received_guarantees", "issued_guarantees"):
            for r in allr(f"SELECT status, COUNT(*) c FROM {t} WHERE process_id IN {ids} GROUP BY status"):
                guar[r["status"]] += n(r["c"])

        grp = lambda sql: [{"name": r["name"], "count": n(r["count"])} for r in allr(sql)]
        return {
            "kpis": {"total": n(k["total"]), "active": n(k["active"]), "domestic": n(k["domestic"]), "foreign": n(k["foreign_t"]),
                     "proformas": n(k["proformas"]), "cheques": {"pending": n(chq["pending"]), "pendingOverdue": n(chq["overdue"])},
                     "guarantees": {"active": rg + ig, "received": rg, "issued": ig}},
            "byCurrency": by_currency,
            "byCompany": grp(f"SELECT co.name name, COUNT(*) count {PROCESS_FROM} {where} GROUP BY co.id, co.name ORDER BY count DESC LIMIT 10"),
            "byCategory": grp(f"SELECT ic.name name, COUNT(*) count {PROCESS_FROM} {where} GROUP BY ic.id, ic.name ORDER BY count DESC LIMIT 10"),
            "purchaseType": [{"type": r["type"], "count": n(r["count"])} for r in allr(f"SELECT p.purchase_type type, COUNT(*) count {PROCESS_FROM} {where} GROUP BY p.purchase_type")],
            "agents": people("agent_id", "ag"), "executors": people("executor_id", "ex"), "trend": trend,
            "paymentMethods": grp(f"SELECT pm.name name, COUNT(*) count FROM process_payment_methods x JOIN payment_methods pm ON pm.id = x.payment_method_id WHERE x.process_id IN {ids} GROUP BY pm.id, pm.name ORDER BY count DESC"),
            "obligations": {"stage": {"paid": n(sc["paid"]), "unpaid": n(sc["unpaid"]), "overdue": n(sc["overdue"])}, "guarantee": guar},
        }
