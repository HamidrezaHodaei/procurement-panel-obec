"""Shared filter → SQL builder used by the list, dashboard and every report."""
PROCESS_FROM = """
  FROM purchase_processes p
  JOIN companies co ON co.id = p.company_id
  JOIN items it ON it.id = p.item_id
  JOIN item_categories ic ON ic.id = it.category_id
  LEFT JOIN agents ag ON ag.id = p.agent_id
  LEFT JOIN executors ex ON ex.id = p.executor_id
  LEFT JOIN brands br ON br.id = p.brand_id"""

_INTS = ["companyId", "categoryId", "itemId", "agentId", "executorId", "brandId", "currencyId", "paymentMethodId"]
_ENUMS = {
    "agentRelation": {"direct", "indirect"}, "purchaseType": {"domestic", "foreign"},
    "status": {"active", "completed", "cancelled"}, "stageStatus": {"paid", "unpaid", "overdue"},
    "guaranteeStatus": {"active", "returned", "collected", "cancelled"},
}
_STRS = ["q", "requestNumber", "tenderWinner", "dateFrom", "dateTo"]


def filters_from_args(args) -> dict:
    f: dict = {}
    for k in _INTS:
        v = args.get(k)
        if v not in (None, ""):
            try:
                f[k] = int(v)
            except ValueError:
                pass
    for k, allowed in _ENUMS.items():
        if args.get(k) in allowed:
            f[k] = args.get(k)
    for k in _STRS:
        if args.get(k):
            f[k] = args.get(k)
    return f


def build_where(f: dict) -> tuple[str, dict]:
    w, p = [], {}

    def eq(col, key):
        if f.get(key) not in (None, ""):
            w.append(f"{col} = :{key}"); p[key] = f[key]

    def like(cols, key, name):
        if f.get(key) and str(f[key]).strip():
            w.append("(" + " OR ".join(f"{c} LIKE :{name}" for c in cols) + ")")
            esc = str(f[key]).strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            p[name] = f"%{esc}%"

    like(["p.request_number", "co.name", "it.name"], "q", "q")
    like(["p.request_number"], "requestNumber", "rn")
    eq("p.company_id", "companyId"); eq("it.category_id", "categoryId"); eq("p.item_id", "itemId")
    eq("p.agent_id", "agentId"); eq("p.executor_id", "executorId"); eq("p.agent_relation", "agentRelation")
    eq("p.purchase_type", "purchaseType"); eq("p.brand_id", "brandId"); eq("p.status", "status")
    like(["p.tender_winner"], "tenderWinner", "tw")
    if f.get("dateFrom"):
        w.append("p.start_date >= :dateFrom"); p["dateFrom"] = f["dateFrom"]
    if f.get("dateTo"):
        w.append("p.start_date <= :dateTo"); p["dateTo"] = f["dateTo"]
    if f.get("currencyId") is not None:
        p["cur"] = f["currencyId"]
        w.append("""(p.purchase_currency_id = :cur OR p.proforma_currency_id = :cur
          OR EXISTS (SELECT 1 FROM cheques x WHERE x.process_id = p.id AND x.currency_id = :cur)
          OR EXISTS (SELECT 1 FROM v_payment_stages x WHERE x.process_id = p.id AND x.eff_currency_id = :cur)
          OR EXISTS (SELECT 1 FROM received_guarantees x WHERE x.process_id = p.id AND x.currency_id = :cur)
          OR EXISTS (SELECT 1 FROM issued_guarantees x WHERE x.process_id = p.id AND x.currency_id = :cur))""")
    if f.get("paymentMethodId") is not None:
        p["pm"] = f["paymentMethodId"]
        w.append("EXISTS (SELECT 1 FROM process_payment_methods x WHERE x.process_id = p.id AND x.payment_method_id = :pm)")
    if f.get("stageStatus"):
        p["ss"] = f["stageStatus"]
        w.append("EXISTS (SELECT 1 FROM v_payment_stages x WHERE x.process_id = p.id AND x.eff_status = :ss)")
    if f.get("guaranteeStatus"):
        p["gs"] = f["guaranteeStatus"]
        w.append("""(EXISTS (SELECT 1 FROM received_guarantees x WHERE x.process_id = p.id AND x.status = :gs)
          OR EXISTS (SELECT 1 FROM issued_guarantees x WHERE x.process_id = p.id AND x.status = :gs))""")
    return ("WHERE " + " AND ".join(w)) if w else "", p
