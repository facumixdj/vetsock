from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func
from sqlalchemy.orm import Session


from app.models.user import User
from app.services.auth import get_current_user, require_admin
from app.models.lot import Lot
from app.models.stock_movement import StockMovement
from app.schemas.stock_movement import (
    StockMovementCreate,
    StockMovementRead,
)
from database import get_db
from app.models.product import Product


router = APIRouter(
    prefix="/stock-movements",
    tags=["Stock Movements"],
    dependencies=[Depends(get_current_user)]
)


def get_lot_stock(db: Session, lot_id: int) -> int:
    signed_quantity = case(
        (
            StockMovement.movement_type.in_(
                ["IN", "ADJUSTMENT_IN"]
            ),
            StockMovement.quantity
        ),
        else_=-StockMovement.quantity
    )

    stock = db.query(
        func.coalesce(func.sum(signed_quantity), 0)
    ).filter(
        StockMovement.lot_id == lot_id
    ).scalar()

    return int(stock or 0)


@router.post("/", response_model=StockMovementRead)
def create_stock_movement(
    movement: StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    lot = db.query(Lot).filter(
        Lot.id == movement.lot_id
    ).with_for_update().first()

    if not lot:
        raise HTTPException(
            status_code=404,
            detail="Lote no encontrado"
        )

    current_stock = get_lot_stock(
        db,
        movement.lot_id
    )

    if movement.movement_type in [
        "OUT",
        "ADJUSTMENT_OUT"
    ]:
        if movement.quantity > current_stock:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Stock insuficiente. "
                    f"Stock disponible del lote: {current_stock}"
                )
            )

    new_movement = StockMovement(
        lot_id=movement.lot_id,
        movement_type=movement.movement_type,
        quantity=movement.quantity,
        reason=movement.reason,
        reference=movement.reference
    )

    db.add(new_movement)
    db.commit()
    db.refresh(new_movement)

    return new_movement


@router.get("/", response_model=list[StockMovementRead])
def list_stock_movements(
    db: Session = Depends(get_db)
):
    return db.query(
        StockMovement
    ).order_by(
        StockMovement.created_at.desc()
    ).all()


@router.get(
    "/lot/{lot_id}",
    response_model=list[StockMovementRead]
)
def list_lot_movements(
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

    return db.query(
        StockMovement
    ).filter(
        StockMovement.lot_id == lot_id
    ).order_by(
        StockMovement.created_at.desc()
    ).all()


@router.get("/lot/{lot_id}/stock")
def get_stock(
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

    stock = get_lot_stock(
        db,
        lot_id
    )

    product = db.query(Product).filter(
        Product.id == lot.product_id
    ).first()

    return {
        "lot_id": lot_id,
        "stock": stock,
        "unit": product.stock_unit if product else None
    }

@router.get("/product/{product_id}/stock")
def get_product_stock(
    product_id: int,
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Producto no encontrado"
        )

    lots = db.query(Lot).filter(
        Lot.product_id == product_id
    ).all()

    total_stock = 0
    lot_details = []

    for lot in lots:
        lot_stock = get_lot_stock(db, lot.id)

        total_stock += lot_stock

        lot_details.append({
            "lot_id": lot.id,
            "lot_number": lot.lot_number,
            "expiration_date": lot.expiration_date,
            "stock": lot_stock
        })

    return {
        "product_id": product_id,
        "product_name": product.name,
        "total_stock": total_stock,
	"unit": product.stock_unit,
        "minimum_stock": product.minimum_stock,
        "low_stock": total_stock <= product.minimum_stock,
        "lots": lot_details
    }
