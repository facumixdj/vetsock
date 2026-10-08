from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    barcode: str | None = Field(default=None, max_length=100)
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=255)

    category_id: int | None = None

    purchase_price: Decimal = Field(default=0, ge=0)
    sale_price: Decimal = Field(default=0, ge=0)
    price_unit_quantity: int = Field(default=1, gt=0)
    minimum_stock: int = Field(default=0, ge=0)

    stock_unit: str = "UNIT"

    active: bool = True


class ProductRead(BaseModel):
    id: int
    code: str
    barcode: str | None
    name: str
    description: str | None
    category_id: int | None
    purchase_price: Decimal
    sale_price: Decimal
    price_unit_quantity: int
    minimum_stock: int
    stock_unit: str
    active: bool

    model_config = ConfigDict(from_attributes=True)

class ProductUpdate(BaseModel):
    code: str | None = None
    barcode: str | None = None
    name: str | None = None
    description: str | None = None
    category_id: int | None = None

    purchase_price: Decimal | None = Field(default=None, ge=0)
    sale_price: Decimal | None = Field(default=None, gt=0)

    minimum_stock: int | None = Field(default=None, ge=0)

    stock_unit: str | None = None

    price_unit_quantity: int | None = Field(
        default=None,
        gt=0
    )

    active: bool | None = None
