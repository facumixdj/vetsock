from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(primary_key=True)

    lot_id: Mapped[int] = mapped_column(
        ForeignKey("lots.id"),
        nullable=False
    )

    movement_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    reference: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "quantity > 0",
            name="ck_stock_movement_quantity_positive"
        ),
        CheckConstraint(
            "movement_type IN ('IN', 'OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT')",
            name="ck_stock_movement_type"
        ),
        Index("ix_stock_movements_lot_id", "lot_id"),
        Index("ix_stock_movements_created_at", "created_at"),
    )
