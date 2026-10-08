from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Numeric,
    String,
    CheckConstraint,
    Index,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CashMovement(Base):
    __tablename__ = "cash_movements"

    id: Mapped[int] = mapped_column(primary_key=True)

    cash_session_id: Mapped[int] = mapped_column(
        ForeignKey("cash_sessions.id"),
        nullable=False
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    movement_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )

    payment_method: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
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
            "amount > 0",
            name="ck_cash_movement_amount_positive"
        ),
        CheckConstraint(
            "movement_type IN "
            "('SALE', 'INCOME', 'EXPENSE', 'WITHDRAWAL', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT')",
            name="ck_cash_movement_type"
        ),
        CheckConstraint(
            "payment_method IN "
            "('CASH', 'TRANSFER', 'DEBIT', 'CREDIT', 'OTHER')",
            name="ck_cash_payment_method"
        ),
        Index(
            "ix_cash_movements_session_id",
            "cash_session_id"
        ),
        Index(
            "ix_cash_movements_created_at",
            "created_at"
        ),
    )
