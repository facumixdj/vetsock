from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


PaymentMethod = Literal[
    "CASH",
    "TRANSFER",
    "DEBIT",
    "CREDIT",
    "OTHER",
]


class SaleItemCreate(BaseModel):
    lot_id: int
    quantity: int = Field(gt=0)

class SaleCreate(BaseModel):
    payment_method: PaymentMethod
    items: list[SaleItemCreate]
    notes: str | None = None


class SaleItemRead(BaseModel):
    id: int
    sale_id: int
    product_id: int
    lot_id: int
    quantity: int
    unit_price: Decimal
    price_unit_quantity: int
    subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)


class SaleRead(BaseModel):
    id: int
    cash_session_id: int
    user_id: int
    total_amount: Decimal
    payment_method: str
    status: str
    notes: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
class SaleCancel(BaseModel):
    reason: str = Field(
        min_length=3,
        max_length=255
    )
