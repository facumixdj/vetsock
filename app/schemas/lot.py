from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class LotCreate(BaseModel):
    product_id: int
    supplier_id: int | None = None
    lot_number: str = Field(min_length=1, max_length=100)
    entry_date: date
    expiration_date: date | None = None
    purchase_cost: Decimal = Field(default=0, ge=0)


class LotRead(BaseModel):
    id: int
    product_id: int
    supplier_id: int | None
    lot_number: str
    entry_date: date
    expiration_date: date | None
    purchase_cost: Decimal

    model_config = ConfigDict(from_attributes=True)

class LotUpdate(BaseModel):
    supplier_id: int | None = None
    lot_number: str | None = None
    entry_date: date | None = None
    expiration_date: date | None = None
    purchase_cost: Decimal | None = Field(default=None, ge=0)
