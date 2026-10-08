from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        nullable=False
    )

    contact_name: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    phone: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    email: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    address: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )
