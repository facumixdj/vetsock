from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from uuid import uuid4


from app.models.user import User
from app.services.auth import get_current_user, require_admin
from app.models.product import Product
from app.models.product_conversion import ProductConversion
from app.schemas.product_conversion import (
    ProductConversionCreate,
    ProductConversionRead,
)
from database import get_db
from app.models.lot import Lot
from app.models.stock_movement import StockMovement
from app.routes.stock_movements import get_lot_stock
from app.schemas.product_conversion import ProductConversionExecute

router = APIRouter(
    prefix="/product-conversions",
    tags=["Product Conversions"],
    dependencies=[Depends(get_current_user)]
)


@router.post("/", response_model=ProductConversionRead)
def create_product_conversion(
    conversion: ProductConversionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if conversion.source_product_id == conversion.target_product_id:
        raise HTTPException(
            status_code=400,
            detail="El producto origen y destino no pueden ser el mismo"
        )

    source_product = db.query(Product).filter(
        Product.id == conversion.source_product_id
    ).first()

    if not source_product:
        raise HTTPException(
            status_code=404,
            detail="Producto origen no encontrado"
        )

    target_product = db.query(Product).filter(
        Product.id == conversion.target_product_id
    ).first()

    if not target_product:
        raise HTTPException(
            status_code=404,
            detail="Producto destino no encontrado"
        )

    existing = db.query(ProductConversion).filter(
        ProductConversion.source_product_id
        == conversion.source_product_id,
        ProductConversion.target_product_id
        == conversion.target_product_id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Ya existe una conversión entre estos productos"
        )

    new_conversion = ProductConversion(
        source_product_id=conversion.source_product_id,
        target_product_id=conversion.target_product_id,
        source_quantity=conversion.source_quantity,
        target_quantity=conversion.target_quantity,
        name=conversion.name,
    )

    db.add(new_conversion)
    db.commit()
    db.refresh(new_conversion)

    return new_conversion


@router.get("/", response_model=list[ProductConversionRead])
def list_product_conversions(
    db: Session = Depends(get_db)
):
    return db.query(
        ProductConversion
    ).order_by(
        ProductConversion.name
    ).all()


@router.get(
    "/{conversion_id}",
    response_model=ProductConversionRead
)
def get_product_conversion(
    conversion_id: int,
    db: Session = Depends(get_db)
):
    conversion = db.query(ProductConversion).filter(
        ProductConversion.id == conversion_id
    ).first()

    if not conversion:
        raise HTTPException(
            status_code=404,
            detail="Conversión no encontrada"
        )

    return conversion
@router.post("/{conversion_id}/execute")
def execute_product_conversion(
    conversion_id: int,
    data: ProductConversionExecute,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conversion = db.query(ProductConversion).filter(
        ProductConversion.id == conversion_id
    ).first()

    if not conversion:
        raise HTTPException(
            status_code=404,
            detail="Conversión no encontrada"
        )

    source_lot = db.query(Lot).filter(
        Lot.id == data.source_lot_id
    ).with_for_update().first()

    if not source_lot:
        raise HTTPException(
            status_code=404,
            detail="Lote origen no encontrado"
        )

    if source_lot.product_id != conversion.source_product_id:
        raise HTTPException(
            status_code=400,
            detail="El lote seleccionado no pertenece al producto origen"
        )

    source_required = (
        conversion.source_quantity * data.times
    )

    target_generated = (
        conversion.target_quantity * data.times
    )

    current_stock = get_lot_stock(
        db,
        source_lot.id
    )

    if current_stock < source_required:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Stock insuficiente. "
                f"Disponible: {current_stock}"
            )
        )

    target_lot = db.query(Lot).filter(
        Lot.product_id == conversion.target_product_id,
        Lot.lot_number == source_lot.lot_number
    ).first()

    if not target_lot:
        target_lot = Lot(
            product_id=conversion.target_product_id,
            supplier_id=source_lot.supplier_id,
            lot_number=source_lot.lot_number,
            entry_date=date.today(),
            expiration_date=source_lot.expiration_date,
            purchase_cost=0
        )

        db.add(target_lot)
        db.flush()

    operation_reference = (
        f"CONV-{uuid4().hex[:12].upper()}"
    )

    source_movement = StockMovement(
        lot_id=source_lot.id,
        movement_type="OUT",
        quantity=source_required,
        reason=f"Conversión: {conversion.name}",
        reference=operation_reference
    )

    target_movement = StockMovement(
        lot_id=target_lot.id,
        movement_type="IN",
        quantity=target_generated,
        reason=f"Conversión: {conversion.name}",
        reference=operation_reference
    )

    db.add(source_movement)
    db.add(target_movement)

    db.commit()

    return {
        "message": "Conversión realizada correctamente",
        "conversion": conversion.name,
        "reference": operation_reference,
        "source": {
            "lot_id": source_lot.id,
            "quantity_removed": source_required
        },
        "target": {
            "lot_id": target_lot.id,
            "quantity_added": target_generated
        }
    }
