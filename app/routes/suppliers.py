from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.user import User
from app.services.auth import get_current_user, require_admin
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierRead, SupplierUpdate
from database import get_db


router = APIRouter(
    prefix="/suppliers",
    tags=["Suppliers"],
    dependencies=[Depends(get_current_user)]
)


@router.post("/", response_model=SupplierRead)
def create_supplier(
    supplier: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    existing = db.query(Supplier).filter(
        Supplier.name == supplier.name
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="El proveedor ya existe"
        )

    new_supplier = Supplier(
        name=supplier.name,
        contact_name=supplier.contact_name,
        phone=supplier.phone,
        email=supplier.email,
        address=supplier.address,
        notes=supplier.notes,
        active=supplier.active
    )

    db.add(new_supplier)
    db.commit()
    db.refresh(new_supplier)

    return new_supplier


@router.get("/", response_model=list[SupplierRead])
def list_suppliers(
    db: Session = Depends(get_db)
):
    return db.query(Supplier).order_by(Supplier.name).all()


@router.get("/{supplier_id}", response_model=SupplierRead)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db)
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id
    ).first()

    if not supplier:
        raise HTTPException(
            status_code=404,
            detail="Proveedor no encontrado"
        )

    return supplier


@router.delete("/{supplier_id}")
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id
    ).first()

    if not supplier:
        raise HTTPException(
            status_code=404,
            detail="Proveedor no encontrado"
        )

    try:
        db.delete(supplier)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar el proveedor porque tiene lotes o relaciones asociadas"
    )

    return {
        "message": "Proveedor eliminado correctamente"
    }

@router.patch("/{supplier_id}", response_model=SupplierRead)
def update_supplier(
    supplier_id: int,
    data: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id
    ).first()

    if not supplier:
        raise HTTPException(
            status_code=404,
            detail="Proveedor no encontrado"
        )

    update_data = data.model_dump(exclude_unset=True)

    if "name" in update_data:
        existing = db.query(Supplier).filter(
            Supplier.name == update_data["name"],
            Supplier.id != supplier_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Ya existe otro proveedor con ese nombre"
            )

    for field, value in update_data.items():
        setattr(supplier, field, value)

    try:
        db.commit()
        db.refresh(supplier)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="No se pudo actualizar el proveedor por un conflicto de datos"
        )

    return supplier
