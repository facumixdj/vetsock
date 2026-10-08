from pydantic import BaseModel, ConfigDict, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    full_name: str = Field(min_length=2, max_length=150)
    password: str = Field(min_length=6)
    role: str = "SELLER"


class UserRead(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    active: bool

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    username: str
    password: str


class UserStatusUpdate(BaseModel):
    active: bool

class UserPasswordUpdate(BaseModel):
    new_password: str = Field(min_length=8)
