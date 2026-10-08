from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserRead,
    LoginRequest,
    UserStatusUpdate,
    UserPasswordUpdate,
)
from app.services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin,
)
from database import get_db


router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


@router.post("/", response_model=UserRead)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    existing = db.query(User).filter(
        User.username == user.username
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="El usuario ya existe"
        )

    if user.role not in ["ADMIN", "SELLER"]:
        raise HTTPException(
            status_code=400,
            detail="Rol inválido"
        )

    new_user = User(
        username=user.username,
        full_name=user.full_name,
        password_hash=hash_password(user.password),
        role=user.role,
        active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.username == data.username
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Usuario o contraseña incorrectos"
        )

    if not user.active:
        raise HTTPException(
            status_code=403,
            detail="Usuario deshabilitado"
        )

    if not verify_password(
        data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Usuario o contraseña incorrectos"
        )

    token = create_access_token({
        "sub": str(user.id),
        "username": user.username,
        "role": user.role
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role
        }
    }


@router.get("/", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(User).order_by(User.username).all()
@router.get("/me", response_model=UserRead)
def get_me(
    current_user: User = Depends(get_current_user)
):
    return current_user

@router.patch("/{user_id}/status", response_model=UserRead)
def update_user_status(
    user_id: int,
    data: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    if user.id == current_user.id and data.active is False:
        raise HTTPException(
            status_code=400,
            detail="No podés desactivar tu propio usuario"
        )

    user.active = data.active

    db.commit()
    db.refresh(user)

    return user

@router.patch("/{user_id}/password")
def update_user_password(
    user_id: int,
    data: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    user.password_hash = hash_password(
        data.new_password
    )

    db.commit()

    return {
        "message": "Contraseña actualizada correctamente"
    }

