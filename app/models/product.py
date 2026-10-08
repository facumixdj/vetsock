from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Numeric, String, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)

    code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False
    )

    barcode: Mapped[str | None] = mapped_column(
        String(100),
        unique=True,
        nullable=True
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id"),
        nullable=True
    )

    purchase_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0
    )

    sale_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0
    )

    price_unit_quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default="1"
    )

    minimum_stock: Mapped[int] = mapped_column(
        nullable=False,
        default=0
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )
    stock_unit: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="UNIT",
        server_default="UNIT"
    )
