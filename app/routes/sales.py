from collections import Counter
from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.cash_movement import CashMovement
from app.models.cash_session import CashSession
from app.models.lot import Lot
from app.models.product import Product
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.stock_movement import StockMovement
from app.models.user import User
from app.routes.stock_movements import get_lot_stock
from app.schemas.sale import SaleCancel, SaleCreate, SaleRead
from app.services.auth import get_current_user, require_admin
from database import get_db


router = APIRouter(
    prefix="/sales",
    tags=["Sales"]
)


@router.post("/", response_model=SaleRead)
def create_sale(
    data: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cash_session = db.query(CashSession).filter(
        CashSession.status == "OPEN"
    ).first()

    if not cash_session:
        raise HTTPException(
            status_code=400,
            detail="No hay una caja abierta"
        )

    if not data.items:
        raise HTTPException(
            status_code=400,
            detail="La venta debe contener al menos un producto"
        )

    # Un mismo lote no debe aparecer más de una vez dentro de la venta.
    # Esto evita validar dos líneas contra el mismo stock inicial.
    lot_ids = [item.lot_id for item in data.items]
    duplicated_lots = sorted(
        lot_id
        for lot_id, count in Counter(lot_ids).items()
        if count > 1
    )

    if duplicated_lots:
        duplicated_text = ", ".join(
            str(lot_id) for lot_id in duplicated_lots
        )
        raise HTTPException(
            status_code=400,
            detail=(
                "La venta contiene lotes repetidos: "
                f"{duplicated_text}. Agrupe la cantidad en una sola línea."
            )
        )

    prepared_items = []
    total_amount = Decimal("0")
    today = date.today()

    try:
        for item in data.items:
            lot = db.query(Lot).filter(
                Lot.id == item.lot_id
            ).with_for_update().first()

            if not lot:
                raise HTTPException(
                    status_code=404,
                    detail=f"Lote {item.lot_id} no encontrado"
                )

            # Regla de seguridad: un lote vencido jamás se vende,
            # aunque un cliente intente llamar al endpoint directamente.
            if (
                lot.expiration_date is not None
                and lot.expiration_date < today
            ):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"El lote {lot.lot_number} está vencido "
                        f"({lot.expiration_date.isoformat()}) y no puede venderse"
                    )
                )

            product = db.query(Product).filter(
                Product.id == lot.product_id
            ).first()

            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Producto {lot.product_id} no encontrado"
                )

            # El frontend ya oculta productos inactivos, pero esta regla
            # debe vivir también en backend para proteger la integridad.
            if not product.active:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f'El producto "{product.name}" está inactivo '
                        "y no puede venderse"
                    )
                )

            available_stock = get_lot_stock(
                db,
                lot.id
            )

            if item.quantity > available_stock:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Stock insuficiente en lote {lot.lot_number}. "
                        f"Disponible: {available_stock}"
                    )
                )

            if product.price_unit_quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Producto {product.id} tiene "
                        "configuración de precio inválida"
                    )
                )

            subtotal = (
                Decimal(item.quantity)
                * Decimal(product.sale_price)
                / Decimal(product.price_unit_quantity)
            )

            subtotal = subtotal.quantize(Decimal("0.01"))
            total_amount += subtotal

            prepared_items.append({
                "lot": lot,
                "product": product,
                "quantity": item.quantity,
                "unit_price": product.sale_price,
                "price_unit_quantity": product.price_unit_quantity,
                "subtotal": subtotal,
            })

        sale = Sale(
            cash_session_id=cash_session.id,
            user_id=current_user.id,
            total_amount=total_amount,
            payment_method=data.payment_method,
            status="COMPLETED",
            notes=data.notes,
        )

        db.add(sale)
        db.flush()

        for item in prepared_items:
            lot = item["lot"]

            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=lot.product_id,
                lot_id=lot.id,
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                price_unit_quantity=item["price_unit_quantity"],
                subtotal=item["subtotal"],
            )

            stock_movement = StockMovement(
                lot_id=lot.id,
                movement_type="OUT",
                quantity=item["quantity"],
                reason=f"Venta #{sale.id}",
                reference=f"SALE-{sale.id}",
            )

            db.add(sale_item)
            db.add(stock_movement)

        cash_movement = CashMovement(
            cash_session_id=cash_session.id,
            user_id=current_user.id,
            movement_type="SALE",
            amount=total_amount,
            payment_method=data.payment_method,
            description=f"Venta #{sale.id}",
            reference=f"SALE-{sale.id}",
        )

        db.add(cash_movement)

        db.commit()
        db.refresh(sale)

        return sale

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise


@router.get("/")
def list_sales(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sales = db.query(Sale).order_by(
        Sale.created_at.desc()
    ).all()

    result = []

    for sale in sales:
        items = db.query(SaleItem).filter(
            SaleItem.sale_id == sale.id
        ).all()

        result.append({
            "id": sale.id,
            "cash_session_id": sale.cash_session_id,
            "user_id": sale.user_id,
            "total_amount": sale.total_amount,
            "payment_method": sale.payment_method,
            "status": sale.status,
            "notes": sale.notes,
            "created_at": sale.created_at,
            "items": [
                {
                    "id": item.id,
                    "product_id": item.product_id,
                    "lot_id": item.lot_id,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "price_unit_quantity": item.price_unit_quantity,
                    "subtotal": item.subtotal,
                }
                for item in items
            ]
        })

    return result


@router.get("/{sale_id}")
def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sale = db.query(Sale).filter(
        Sale.id == sale_id
    ).first()

    if not sale:
        raise HTTPException(
            status_code=404,
            detail="Venta no encontrada"
        )

    items = db.query(SaleItem).filter(
        SaleItem.sale_id == sale.id
    ).all()

    return {
        "id": sale.id,
        "cash_session_id": sale.cash_session_id,
        "user_id": sale.user_id,
        "total_amount": sale.total_amount,
        "payment_method": sale.payment_method,
        "status": sale.status,
        "notes": sale.notes,
        "created_at": sale.created_at,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "lot_id": item.lot_id,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "price_unit_quantity": item.price_unit_quantity,
                "subtotal": item.subtotal,
            }
            for item in items
        ]
    }


@router.post("/{sale_id}/cancel")
def cancel_sale(
    sale_id: int,
    data: SaleCancel,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    try:
        sale = db.query(Sale).filter(
            Sale.id == sale_id
        ).with_for_update().first()

        if not sale:
            raise HTTPException(
                status_code=404,
                detail="Venta no encontrada"
            )

        if sale.status == "CANCELED":
            raise HTTPException(
                status_code=400,
                detail="La venta ya está anulada"
            )

        if sale.status != "COMPLETED":
            raise HTTPException(
                status_code=400,
                detail=f"No se puede anular una venta con estado {sale.status}"
            )

        current_cash_session = db.query(CashSession).filter(
            CashSession.status == "OPEN"
        ).first()

        if not current_cash_session:
            raise HTTPException(
                status_code=400,
                detail="Debe existir una caja abierta para anular una venta"
            )

        items = db.query(SaleItem).filter(
            SaleItem.sale_id == sale.id
        ).all()

        if not items:
            raise HTTPException(
                status_code=400,
                detail="La venta no tiene ítems"
            )

        for item in items:
            lot = db.query(Lot).filter(
                Lot.id == item.lot_id
            ).with_for_update().first()

            if not lot:
                raise HTTPException(
                    status_code=404,
                    detail=f"Lote {item.lot_id} no encontrado"
                )

            stock_movement = StockMovement(
                lot_id=item.lot_id,
                movement_type="ADJUSTMENT_IN",
                quantity=item.quantity,
                reason=f"Anulación venta #{sale.id}",
                reference=f"CANCEL-SALE-{sale.id}",
            )

            db.add(stock_movement)

        reversal_cash_movement = CashMovement(
            cash_session_id=current_cash_session.id,
            user_id=current_user.id,
            movement_type="ADJUSTMENT_OUT",
            amount=sale.total_amount,
            payment_method=sale.payment_method,
            description=f"Anulación venta #{sale.id}: {data.reason}",
            reference=f"CANCEL-SALE-{sale.id}",
        )

        db.add(reversal_cash_movement)

        sale.status = "CANCELED"
        sale.canceled_by_user_id = current_user.id
        sale.canceled_at = datetime.now(timezone.utc)
        sale.cancel_reason = data.reason

        db.commit()
        db.refresh(sale)

        return {
            "id": sale.id,
            "status": sale.status,
            "total_amount": sale.total_amount,
            "payment_method": sale.payment_method,
            "canceled_by_user_id": sale.canceled_by_user_id,
            "canceled_at": sale.canceled_at,
            "cancel_reason": sale.cancel_reason,
            "message": "Venta anulada correctamente"
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise
