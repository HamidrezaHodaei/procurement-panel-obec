"""Request validation (pydantic). Money travels as decimal strings, never floats."""
import re
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _blank_to_none(v):
    return None if isinstance(v, str) and v.strip() == "" else v


class _Base(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    @field_validator("*", mode="before")
    @classmethod
    def _blank(cls, v, info):
        # empty strings → None for optional scalars (dates, ids, money)
        f = cls.model_fields[info.field_name]
        if f.annotation is not str and isinstance(v, str) and v.strip() == "":
            return None
        return v


def _date(v: Optional[str], msg="تاریخ معتبر نیست"):
    if v is not None and not ISO.match(v):
        raise ValueError(msg)
    return v


class ProcessIn(_Base):
    requestNumber: str
    companyId: int
    itemId: int
    startDate: str
    status: Literal["active", "completed", "cancelled"] = "active"
    completedAt: Optional[str] = None
    agentId: Optional[int] = None
    agentRelation: Optional[Literal["direct", "indirect"]] = None
    executorId: Optional[int] = None
    purchaseType: Literal["domestic", "foreign"]
    brandId: Optional[int] = None
    actionsText: str = ""
    tenderWinner: str = ""
    purchaseAmount: Optional[str] = None
    purchaseCurrencyId: Optional[int] = None
    proformaDate: Optional[str] = None
    proformaAmount: Optional[str] = None
    proformaCurrencyId: Optional[int] = None
    paymentMethodIds: list[int] = []

    @field_validator("requestNumber")
    @classmethod
    def _rn(cls, v):
        if not v:
            raise ValueError("شماره درخواست خرید الزامی است")
        return v

    @field_validator("startDate", "completedAt", "proformaDate")
    @classmethod
    def _d(cls, v):
        return _date(v)

    @model_validator(mode="after")
    def _pairs(self):
        if self.purchaseAmount and not self.purchaseCurrencyId:
            raise ValueError("واحد پولی قیمت خرید را انتخاب کنید")
        if self.proformaAmount and not self.proformaCurrencyId:
            raise ValueError("واحد پولی پیش‌فاکتور را انتخاب کنید")
        if self.completedAt and self.completedAt < self.startDate:
            raise ValueError("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد")
        return self


class ChequeIn(_Base):
    chequeNumber: str
    chequeDate: str
    amount: str
    currencyId: int
    issuerName: str
    status: Literal["pending", "cashed", "bounced"] = "pending"
    notes: str = ""

    @field_validator("chequeNumber", "issuerName", "amount")
    @classmethod
    def _req(cls, v):
        if not v:
            raise ValueError("این فیلد الزامی است")
        return v

    @field_validator("chequeDate")
    @classmethod
    def _d(cls, v):
        return _date(v)


class StageIn(_Base):
    amountType: Literal["amount", "percent"]
    amount: Optional[str] = None
    currencyId: Optional[int] = None
    percent: Optional[str] = None
    conditionText: str = ""
    dueDate: Optional[str] = None
    status: Literal["paid", "unpaid"] = "unpaid"
    paidAt: Optional[str] = None
    notes: str = ""

    @field_validator("dueDate", "paidAt")
    @classmethod
    def _d(cls, v):
        return _date(v)

    @model_validator(mode="after")
    def _by_type(self):
        if self.amountType == "amount":
            if not self.amount:
                raise ValueError("مبلغ را وارد کنید")
            if not self.currencyId:
                raise ValueError("واحد پولی را انتخاب کنید")
        elif not self.percent:
            raise ValueError("درصد را وارد کنید")
        return self


class _GuaranteeBase(_Base):
    guaranteeTypeId: int
    referenceNo: str
    amount: str
    currencyId: int
    issueDate: str
    status: Literal["active", "returned", "collected", "cancelled"] = "active"
    notes: str = ""

    @field_validator("referenceNo", "amount")
    @classmethod
    def _req(cls, v):
        if not v:
            raise ValueError("این فیلد الزامی است")
        return v

    @field_validator("issueDate")
    @classmethod
    def _d(cls, v):
        return _date(v)


class ReceivedGuaranteeIn(_GuaranteeBase):
    dueDate: Optional[str] = None

    @field_validator("dueDate")
    @classmethod
    def _d2(cls, v):
        return _date(v)


class IssuedGuaranteeIn(_GuaranteeBase):
    validUntil: Optional[str] = None
    recipientName: str
    relatedCompanyId: Optional[int] = None

    @field_validator("validUntil")
    @classmethod
    def _d2(cls, v):
        return _date(v)

    @field_validator("recipientName")
    @classmethod
    def _rec(cls, v):
        if not v:
            raise ValueError("نام دریافت‌کننده الزامی است")
        return v
