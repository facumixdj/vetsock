from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


MovementType = Literal[
    "IN",
    "OUT",
    "ADJUSTMENT_IN",
    "ADJUSTMENT_OUT"
]


class StockMovementCreate(BaseModel):
    lot_id: int
    movement_type: MovementType
    quantity: int = Field(gt=0)
    reason: str | None = Field(default=None, max_length=255)
    reference: str | None = Field(default=None, max_length=100)


class StockMovementRead(BaseModel):
    id: int
    lot_id: int
    movement_type: str
    quantity: int
    reason: str | None
    reference: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
