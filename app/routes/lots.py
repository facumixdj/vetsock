from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from sqlalchemy.exc import IntegrityError
from app.models.user import User
from app.services.auth import get_current_user, require_admin
from app.models.lot import Lot
from app.models.product import Product
from app.models.supplier import Supplier
from app.schemas.lot import LotCreate, LotRead, LotUpdate
from database import get_db


router = APIRouter(
    prefix="/lots",
    tags=["Lots"],
    dependencies=[Depends(get_current_user)]
)


@router.post("/", response_model=LotRead)
def create_lot(
    lot: LotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    product = db.query(Product).filter(
        Product.id == lot.product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Producto no encontrado"
        )

    if lot.supplier_id is not None:
        supplier = db.query(Supplier).filter(
            Supplier.id == lot.supplier_id
        ).first()

        if not supplier:
            raise HTTPException(
                status_code=404,
                detail="Proveedor no encontrado"
            )

    existing = db.query(Lot).filter(
        Lot.product_id == lot.product_id,
        Lot.lot_number == lot.lot_number
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Ese lote ya existe para este producto"
        )

    if (
        lot.expiration_date is not None
        and lot.expiration_date < lot.entry_date
    ):
        raise HTTPException(
            status_code=400,
            detail="La fecha de vencimiento no puede ser anterior a la fecha de ingreso"
        )

    new_lot = Lot(
        product_id=lot.product_id,
        supplier_id=lot.supplier_id,
        lot_number=lot.lot_number,
        entry_date=lot.entry_date,
        expiration_date=lot.expiration_date,
        purchase_cost=lot.purchase_cost
    )

    db.add(new_lot)
    db.commit()
    db.refresh(new_lot)

    return new_lot


@router.get("/", response_model=list[LotRead])
def list_lots(
    db: Session = Depends(get_db)
):
    return db.query(Lot).order_by(
        Lot.expiration_date.asc()
    ).all()


@router.get("/{lot_id}", response_model=LotRead)
def get_lot(
    lot_id: int,
    db: Session = Depends(get_db)
):
    lot = db.query(Lot).filter(
        Lot.id == lot_id
    ).first()

    if not lot:
        raise HTTPException(
            status_code=404,
            detail="Lote no encontrado"
        )

    return lot


@router.delete("/{lot_id}")
def delete_lot(
    lot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    lot = db.query(Lot).filter(
        Lot.id == lot_id
    ).first()

    if not lot:
        raise HTTPException(
            status_code=404,
            detail="Lote no encontrado"
        )

    try:
        db.delete(lot)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar el lote porque tiene movimientos de stock o ventas asociadas"
        )

    return {
        "message": "Lote eliminado correctamente"
    }

@router.patch("/{lot_id}", response_model=LotRead)
def update_lot(
    lot_id: int,
    data: LotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    lot = db.query(Lot).filter(
        Lot.id == lot_id
    ).first()

    if not lot:
        raise HTTPException(
            status_code=404,
            detail="Lote no encontrado"
        )

    update_data = data.model_dump(exclude_unset=True)

    if "expiration_date" in update_data:
        entry_date = update_data.get(
            "entry_date",
            lot.entry_date
        )

        expiration_date = update_data["expiration_date"]

        if (
            expiration_date is not None
            and expiration_date < entry_date
        ):
            raise HTTPException(
                status_code=400,
                detail="La fecha de vencimiento no puede ser anterior a la fecha de ingreso"
            )

    if "entry_date" in update_data:
        expiration_date = update_data.get(
            "expiration_date",
            lot.expiration_date
        )

        if (
            expiration_date is not None
            and expiration_date < update_data["entry_date"]
        ):
            raise HTTPException(
                status_code=400,
                detail="La fecha de ingreso no puede ser posterior al vencimiento"
            )

    for field, value in update_data.items():
        setattr(lot, field, value)

    try:
        db.commit()
        db.refresh(lot)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="No se pudo actualizar el lote por un conflicto de datos"
        )

    return lot
