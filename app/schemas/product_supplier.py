from pydantic import BaseModel, ConfigDict


class ProductSupplierCreate(BaseModel):
    product_id: int
    supplier_id: int


class ProductSupplierRead(BaseModel):
    id: int
    product_id: int
    supplier_id: int

    model_config = ConfigDict(from_attributes=True)
