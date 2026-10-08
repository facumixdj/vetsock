from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ProductConversion(Base):
    __tablename__ = "product_conversions"

    id: Mapped[int] = mapped_column(primary_key=True)

    source_product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"),
        nullable=False
    )

    target_product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"),
        nullable=False
    )

    source_quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1
    )

    target_quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "source_product_id",
            "target_product_id",
            name="uq_product_conversion"
        ),
    )
