"""End-to-end API smoke test against a real MySQL/MariaDB (uses an EMPTY database — it is wiped!).

    TEST_DATABASE_URL=mysql+pymysql://user:pass@127.0.0.1/procurement_test?charset=utf8mb4 python tests/smoke_test.py
"""
import os, sys, io
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
url = os.environ["TEST_DATABASE_URL"]
os.environ.update(DATABASE_URL=url, SECRET_KEY="test", SEED_DEMO="1", ADMIN_USERNAME="admin", ADMIN_PASSWORD="TestPass-123")

from sqlalchemy import create_engine, text  # noqa: E402
e = create_engine(url)
with e.begin() as c:
    c.execute(text("SET FOREIGN_KEY_CHECKS=0"))
    for (t,) in c.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type='BASE TABLE'")).fetchall():
        c.execute(text(f"DROP TABLE IF EXISTS `{t}`"))
    for (v,) in c.execute(text("SELECT table_name FROM information_schema.views WHERE table_schema = DATABASE()")).fetchall():
        c.execute(text(f"DROP VIEW IF EXISTS `{v}`"))
    c.execute(text("SET FOREIGN_KEY_CHECKS=1"))

from app import create_app  # noqa: E402
app = create_app()
ok = fail = 0


def check(name, cond, extra=""):
    global ok, fail
    if cond:
        ok += 1
    else:
        fail += 1
        print("FAIL:", name, extra)


A = app.test_client()
B = app.test_client()
P = "/api/procurement"

# ── auth ──
check("unauthenticated → 401", A.get(f"{P}/lookups").status_code == 401)
check("bad password → 401", A.post("/api/auth/login", json={"username": "admin", "password": "x"}).status_code == 401)
r = A.post("/api/auth/login", json={"username": "admin", "password": "TestPass-123"})
check("admin login", r.status_code == 200 and r.json["role"] == "admin", r.text)
check("me", A.get("/api/auth/me").json["username"] == "admin")

# ── users & roles ──
r = A.post("/api/auth/users", json={"username": "viewer1", "fullName": "مشاهده‌گر", "password": "short", "role": "viewer"})
check("weak password rejected", r.status_code == 422 and "password" in r.json["fieldErrors"])
r = A.post("/api/auth/users", json={"username": "viewer1", "fullName": "مشاهده‌گر", "password": "Viewer-1234", "role": "viewer"})
check("create viewer", r.status_code == 201 and "passwordHash" not in r.json, r.text)
check("dup username 409", A.post("/api/auth/users", json={"username": "viewer1", "fullName": "x", "password": "Viewer-1234", "role": "viewer"}).status_code == 409)
A.post("/api/auth/users", json={"username": "ed", "fullName": "کارشناس", "password": "Editor-1234", "role": "editor"})
check("viewer login", B.post("/api/auth/login", json={"username": "viewer1", "password": "Viewer-1234"}).status_code == 200)
check("viewer can read", B.get(f"{P}/lookups").status_code == 200)
check("viewer cannot write process", B.post(f"{P}/processes", json={}).status_code == 403)
check("viewer cannot write masters", B.post(f"{P}/masters/companies", json={"name": "x"}).status_code == 403)
check("viewer cannot list users", B.get("/api/auth/users").status_code == 403)
uid = A.get("/api/auth/me").json["id"]
check("last admin cannot be deactivated", A.patch(f"/api/auth/users/{uid}", json={"isActive": False}).status_code == 409)
check("last admin cannot be demoted", A.patch(f"/api/auth/users/{uid}", json={"role": "editor"}).status_code == 409)

# ── editor workflow ──
E = app.test_client()
E.post("/api/auth/login", json={"username": "ed", "password": "Editor-1234"})
lk = E.get(f"{P}/lookups").json
usd = next(c["id"] for c in lk["currencies"] if c["code"] == "USD")
foreign_brand = next(b["id"] for b in lk["brands"] if b["kind"] == "foreign")
dom_brand = next(b["id"] for b in lk["brands"] if b["kind"] == "domestic")
base = {"requestNumber": "T-1", "companyId": lk["companies"][0]["id"], "itemId": lk["items"][0]["id"], "startDate": "2026-11-01",
        "status": "active", "purchaseType": "foreign", "brandId": foreign_brand, "purchaseAmount": "1,250.5", "purchaseCurrencyId": usd,
        "proformaAmount": "1300", "proformaCurrencyId": usd, "paymentMethodIds": [1, 2]}
r = E.post(f"{P}/processes", json=base)
check("create process", r.status_code == 200 and r.json["purchaseAmount"] == 125050, r.text)
pid = r.json["id"]
check("created_by is the editor", r.json["createdBy"] == "کارشناس")
check("duplicate request number 409", E.post(f"{P}/processes", json=base).status_code == 409)
check("brand/type mismatch 422", E.post(f"{P}/processes", json={**base, "requestNumber": "T-2", "purchaseType": "domestic"}).status_code == 422)
r = E.post(f"{P}/processes", json={**base, "requestNumber": "T-3", "purchaseAmount": "1.234"})
check("too many decimals 422", r.status_code == 422 and "purchaseAmount" in r.json["fieldErrors"], r.text)
check("missing required → fieldErrors", "companyId" in E.post(f"{P}/processes", json={}).json["fieldErrors"])

r = E.post(f"{P}/processes/{pid}/stages", json={"amountType": "percent", "percent": "40", "conditionText": "پیش", "dueDate": "2020-01-01"})
check("percent stage", r.status_code == 200 and r.json["effAmount"] == 52000 and r.json["effStatus"] == "overdue", r.text)
sid = r.json["id"]
check("stage → paid", E.patch(f"{P}/processes/{pid}/stages/{sid}", json={"amountType": "percent", "percent": "40", "status": "paid"}).json["effStatus"] == "paid")
r = E.post(f"{P}/processes/{pid}/cheques", json={"chequeNumber": "1", "chequeDate": "2026-12-10", "amount": "100", "currencyId": usd, "issuerName": "X"})
check("cheque", r.status_code == 200 and r.json["amount"] == 10000, r.text)
gt = lk["guaranteeTypes"][0]["id"]
r = E.post(f"{P}/processes/{pid}/received-guarantees", json={"guaranteeTypeId": gt, "referenceNo": "R1", "amount": "5", "currencyId": usd, "issueDate": "2026-11-02"})
check("received guarantee", r.status_code == 200, r.text)
r = E.post(f"{P}/processes/{pid}/issued-guarantees", json={"guaranteeTypeId": gt, "referenceNo": "I1", "amount": "7", "currencyId": usd, "issueDate": "2026-11-02", "recipientName": "Z"})
check("issued guarantee", r.status_code == 200, r.text)
check("issued needs recipient", E.post(f"{P}/processes/{pid}/issued-guarantees", json={"guaranteeTypeId": gt, "referenceNo": "I2", "amount": "7", "currencyId": usd, "issueDate": "2026-11-02"}).status_code == 422)
d = E.get(f"{P}/processes/{pid}").json
check("detail has children", len(d["cheques"]) == 1 and len(d["stages"]) == 1 and len(d["issuedGuarantees"]) == 1 and len(d["receivedGuarantees"]) == 1)

r = E.patch(f"{P}/processes/{pid}", json={**base, "status": "completed", "paymentMethodIds": [1]})
check("update → completed sets completedAt", r.status_code == 200 and r.json["completedAt"], r.text)
au = E.get(f"{P}/processes/{pid}/audit").json
check("audit has entries with diffs", len(au) >= 6 and any(a["changes"] and "وضعیت" in a["changes"] for a in au), str(au[:2]))
check("audit user", all(a["userName"] == "کارشناس" for a in au))

# ── list / filters / dashboard / reports ──
r = E.get(f"{P}/processes?q=T-1&perPage=5&sort=[{{\"id\":\"startDate\",\"desc\":true}}]").json
check("list search", r["total"] == 1)
check("filter by type", E.get(f"{P}/processes?purchaseType=foreign").json["total"] >= 3)
dash = E.get(f"{P}/dashboard").json
check("dashboard kpis", dash["kpis"]["total"] == 5 and len(dash["trend"]) > 0, str(dash["kpis"]))
check("dashboard per-currency", any(c["code"] == "USD" and c["purchases"] > 0 for c in dash["byCurrency"]))
for rid in ["processes", "byCompany", "byItem", "byCategory", "agents", "executors", "purchaseType", "totalsByCurrency", "proformas", "cheques", "obligations", "guarantees", "durations"]:
    r = E.get(f"{P}/reports/{rid}")
    check(f"report {rid}", r.status_code == 200 and isinstance(r.json["rows"], list), r.text[:200])
    x = E.get(f"{P}/reports/{rid}/export")
    check(f"export {rid}", x.status_code == 200 and x.data[:2] == b"PK")
check("report filters combine", E.get(f"{P}/reports/processes?purchaseType=foreign&currencyId={usd}&stageStatus=paid").status_code == 200)
tot = E.get(f"{P}/reports/totalsByCurrency").json
check("totals never mixed: one row per currency", len({r["cur"] for r in tot["rows"]}) == len(tot["rows"]))
check("unknown report 404", E.get(f"{P}/reports/nope").status_code == 404)

# ── masters ──
check("admin creates master", A.post(f"{P}/masters/brandsForeign", json={"name": "Bosch"}).status_code == 200)
check("dup master 409", A.post(f"{P}/masters/brandsForeign", json={"name": "Bosch"}).status_code == 409)
check("currency decimals immutable", A.patch(f"{P}/masters/currencies/{usd}", json={"decimals": 0, "code": "USD", "name": "دلار"}).status_code == 422)
check("deactivate master", A.patch(f"{P}/masters/companies/{lk['companies'][0]['id']}", json={"isActive": False}).json["isActive"] is False)
check("inactive company rejected for new file", E.post(f"{P}/processes", json={**base, "requestNumber": "T-9"}).status_code == 422)

# ── delete ──
check("delete child", E.delete(f"{P}/processes/{pid}/cheques/{d['cheques'][0]['id']}").status_code == 200)
check("delete process", E.delete(f"{P}/processes/{pid}").status_code == 200)
check("deleted → 404", E.get(f"{P}/processes/{pid}").status_code == 404)

# ── password / logout ──
check("change password wrong current", E.post("/api/auth/password", json={"currentPassword": "bad", "newPassword": "NewPass-1234"}).status_code == 422)
check("change password", E.post("/api/auth/password", json={"currentPassword": "Editor-1234", "newPassword": "NewPass-1234"}).status_code == 200)
E.post("/api/auth/logout")
check("after logout 401", E.get(f"{P}/lookups").status_code == 401)
check("deactivated user cannot use session", (A.patch(f"/api/auth/users/{B.get('/api/auth/me').json['id']}", json={"isActive": False}), B.get(f"{P}/lookups").status_code)[1] == 401)

print(f"\n{ok} passed, {fail} failed")
sys.exit(1 if fail else 0)
