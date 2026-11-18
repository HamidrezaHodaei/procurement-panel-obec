"""Excel export (openpyxl): RTL sheet, Jalali dates, numeric money cells with a currency-code number format."""
import io
from datetime import date

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from .constants import (AGENT_RELATION, CHEQUE_STATUS, GUARANTEE_STATUS, PROCESS_STATUS, PURCHASE_TYPE, STAGE_STATUS)
from .jalali import fmt_jalali

BADGES = {"purchaseType": PURCHASE_TYPE, "processStatus": PROCESS_STATUS, "stageStatus": STAGE_STATUS,
          "chequeStatus": CHEQUE_STATUS, "guaranteeStatus": GUARANTEE_STATUS, "agentRelation": AGENT_RELATION}


def report_to_xlsx(report: dict) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = report["title"][:31]
    ws.sheet_view.rightToLeft = True
    ws.append([report["title"]])
    ws["A1"].font = Font(bold=True, size=14)
    ws.append([f"تاریخ گزارش: {fmt_jalali(date.today())}" + (f" — {report['notes']}" if report.get("notes") else "")])
    ws["A2"].font = Font(color="666666")
    cols = report["columns"]
    ws.append([c["label"] for c in cols])
    for i in range(1, len(cols) + 1):
        h = ws.cell(row=3, column=i)
        h.font = Font(bold=True, color="FFFFFF")
        h.fill = PatternFill("solid", fgColor="27272A")
        h.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    for r in report["rows"]:
        out, fmts = [], {}
        for i, c in enumerate(cols, 1):
            v = r.get(c["key"])
            if v is None:
                out.append("")
            elif c["type"] == "date":
                out.append(fmt_jalali(v, False))
            elif c["type"] == "badge":
                out.append(BADGES.get(c.get("badge", ""), {}).get(str(v), str(v)))
            elif c["type"] == "money":
                out.append(v["v"] / 10 ** v["d"])
                fmts[i] = f'#,##0{"." + "0" * v["d"] if v["d"] else ""} "{v["c"]}"'
            else:
                out.append(v)
        ws.append(out)
        for i, f in fmts.items():
            ws.cell(row=ws.max_row, column=i).number_format = f
    for i, c in enumerate(cols, 1):
        width = max([len(c["label"])] + [len(str(r.get(c["key"]) or "")) if not isinstance(r.get(c["key"]), dict) else 18 for r in report["rows"][:200]])
        ws.column_dimensions[get_column_letter(i)].width = min(width + 3, 48)
    ws.freeze_panes = "A4"
    if cols:
        ws.auto_filter.ref = f"A3:{get_column_letter(len(cols))}{max(ws.max_row, 3)}"
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
