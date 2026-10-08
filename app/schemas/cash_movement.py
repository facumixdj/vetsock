from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


CashMovementType = Literal[
    "SALE",
    "INCOME",
    "EXPENSE",
    "WITHDRAWAL",
    "ADJUSTMENT_IN",
    "ADJUSTMENT_OUT",
]

PaymentMethod = Literal[
    "CASH",
    "TRANSFER",
    "DEBIT",
    "CREDIT",
    "OTHER",
]


class CashMovementCreate(BaseModel):
    movement_type: CashMovementType
    amount: Decimal = Field(gt=0)
    payment_method: PaymentMethod
    description: str | None = Field(
        default=None,
        max_length=255
    )
    reference: str | None = Field(
        default=None,
        max_length=100
    )


class CashMovementRead(BaseModel):
    id: int
    cash_session_id: int
    user_id: int
    movement_type: str
    amount: Decimal
    payment_method: str
    description: str | None
    reference: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
