from pydantic import BaseModel, ConfigDict, Field


class ProductConversionCreate(BaseModel):
    source_product_id: int
    target_product_id: int

    source_quantity: int = Field(default=1, gt=0)
    target_quantity: int = Field(gt=0)

    name: str = Field(min_length=1, max_length=150)


class ProductConversionRead(BaseModel):
    id: int

    source_product_id: int
    target_product_id: int

    source_quantity: int
    target_quantity: int

    name: str

    model_config = ConfigDict(from_attributes=True)

class ProductConversionExecute(BaseModel):
    source_lot_id: int
    times: int = Field(default=1, gt=0)
