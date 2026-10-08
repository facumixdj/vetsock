from decimal import Decimal
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CashSessionOpen(BaseModel):
    opening_amount: Decimal = Field(default=0, ge=0)
    notes: str | None = None


class CashSessionClose(BaseModel):
    closing_amount: Decimal = Field(ge=0)
    notes: str | None = None


class CashSessionRead(BaseModel):
    id: int
    opened_by_user_id: int
    opened_at: datetime
    opening_amount: Decimal

    status: str

    closed_by_user_id: int | None
    closed_at: datetime | None
    closing_amount: Decimal | None

    theoretical_cash: Decimal | None
    cash_difference: Decimal | None

    notes: str | None

    model_config = ConfigDict(from_attributes=True)
