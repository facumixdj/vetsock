from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CashSession(Base):
    __tablename__ = "cash_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)

    opened_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    opening_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="OPEN"
    )

    closed_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True
    )

    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    closing_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True
    )

    notes: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )
    theoretical_cash: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True
    )

    cash_difference: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True
    )
