from pydantic import BaseModel, ConfigDict, EmailStr


class SupplierCreate(BaseModel):
    name: str
    contact_name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    notes: str | None = None
    active: bool = True


class SupplierRead(BaseModel):
    id: int
    name: str
    contact_name: str | None
    phone: str | None
    email: str | None
    address: str | None
    notes: str | None
    active: bool

    model_config = ConfigDict(from_attributes=True)

class SupplierUpdate(BaseModel):
    name: str | None = None
    contact_name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    notes: str | None = None
    active: bool | None = None
