"""Errors, JSON helpers, money parsing and Persian formatting shared by every module."""
import re
from decimal import Decimal

from flask import jsonify
from pydantic import ValidationError


class ApiError(Exception):
    def __init__(self, status: int, message: str, field_errors: dict | None = None):
        super().__init__(message)
        self.status, self.message, self.field_errors = status, message, field_errors


def error_response(status: int, message: str, field_errors: dict | None = None):
    body = {"error": message}
    if field_errors:
        body["fieldErrors"] = field_errors
    r = jsonify(body)
    r.status_code = status
    return r


_FA = "۰۱۲۳۴۵۶۷۸۹"
_AR = "٠١٢٣٤٥٦٧٨٩"


def fa_digits(v) -> str:
    return re.sub(r"\d", lambda m: _FA[int(m.group())], str(v))


def en_digits(s: str) -> str:
    return "".join(str(_FA.index(ch)) if ch in _FA else str(_AR.index(ch)) if ch in _AR else ch for ch in s)


def parse_money(value, decimals: int) -> int | None:
    """'1,250.50' → 125050 (decimals=2). None for empty; ValueError for invalid / loses precision."""
    if value is None:
        return None
    s = en_digits(str(value)).strip()
    if s == "":
        return None
    s = re.sub(r"[,٬،\s]", "", s).replace("٫", ".")
    if not re.fullmatch(r"\d+(\.\d+)?", s):
        raise ValueError("invalid")
    whole, _, frac = s.partition(".")
    if len(frac) > decimals and re.search(r"[1-9]", frac[decimals:]):
        raise ValueError("precision")
    minor = int(whole + (frac + "0" * decimals)[:decimals])
    if minor > 9_007_199_254_740_991:  # keep JSON/JS safe-integer range
        raise ValueError("range")
    return minor


def fmt_money(minor: int, decimals: int) -> str:
    q = Decimal(minor) / (Decimal(10) ** decimals)
    s = f"{q:,.{decimals}f}"
    return fa_digits(s.replace(",", "٬").replace(".", "٫"))


def pydantic_field_errors(e: ValidationError) -> dict:
    out: dict[str, str] = {}
    for err in e.errors():
        key = ".".join(str(x) for x in err["loc"]) or "_"
        if key in out:
            continue
        t = err["type"]
        if t == "missing":
            msg = "این فیلد الزامی است"
        elif t == "value_error":
            msg = str(err["msg"]).removeprefix("Value error, ")
        elif t.startswith("string_pattern"):
            msg = "مقدار معتبر نیست"
        elif t in ("int_parsing", "int_type", "float_parsing", "bool_parsing"):
            msg = "مقدار عددی معتبر وارد کنید"
        elif t in ("literal_error", "enum"):
            msg = "گزینه نامعتبر است"
        elif t.startswith("string_too") or t == "too_short":
            msg = "طول مقدار معتبر نیست"
        else:
            msg = "مقدار معتبر نیست"
        out[key] = msg
    return out
