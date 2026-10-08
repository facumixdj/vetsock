from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Lot(Base):
    __tablename__ = "lots"

    id: Mapped[int] = mapped_column(primary_key=True)

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False
    )

    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("suppliers.id"),
        nullable=True
    )

    lot_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    entry_date: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    expiration_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    purchase_cost: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0
    )

    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "lot_number",
            name="uq_product_lot"
        ),
    )
