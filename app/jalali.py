from datetime import date, datetime

import jdatetime

from .common import fa_digits


def to_date(v) -> date | None:
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    return date.fromisoformat(str(v)[:10])


def fmt_jalali(v, persian_digits: bool = True) -> str:
    d = to_date(v)
    if not d:
        return ""
    j = jdatetime.date.fromgregorian(date=d)
    s = f"{j.year}/{j.month:02d}/{j.day:02d}"
    return fa_digits(s) if persian_digits else s


def month_key(v) -> str:
    d = to_date(v)
    j = jdatetime.date.fromgregorian(date=d)
    return f"{j.year}/{j.month:02d}"


MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"]


def month_label(key: str) -> str:
    y, m = key.split("/")
    return f"{MONTHS[int(m) - 1]} {fa_digits(y)}"
