from datetime import date, timedelta
from app.services.auth import get_current_user
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.models.lot import Lot
from app.models.product import Product
from app.routes.stock_movements import get_lot_stock
from database import get_db


router = APIRouter(
    prefix="/alerts",
    tags=["Alerts"],
    dependencies=[Depends(get_current_user)]
)


@router.get("/low-stock")
def low_stock_alerts(
    db: Session = Depends(get_db)
):
    products = db.query(Product).filter(
        Product.active.is_(True)
    ).all()

    alerts = []

    for product in products:
        lots = db.query(Lot).filter(
            Lot.product_id == product.id
        ).all()

        total_stock = sum(
            get_lot_stock(db, lot.id)
            for lot in lots
        )

        if total_stock <= product.minimum_stock:
            alerts.append({
                "product_id": product.id,
                "code": product.code,
                "name": product.name,
                "stock": total_stock,
                "unit": product.stock_unit,
                "minimum_stock": product.minimum_stock
            })

    return {
        "count": len(alerts),
        "items": alerts
    }


@router.get("/expiring")
def expiring_lots(
    days: int = 60,
    db: Session = Depends(get_db)
):
    today = date.today()
    limit_date = today + timedelta(days=days)

    lots = db.query(Lot).filter(
        Lot.expiration_date.isnot(None),
        Lot.expiration_date >= today,
        Lot.expiration_date <= limit_date
    ).order_by(
        Lot.expiration_date.asc()
    ).all()

    alerts = []

    for lot in lots:
        stock = get_lot_stock(db, lot.id)

        if stock <= 0:
            continue

        product = db.query(Product).filter(
            Product.id == lot.product_id
        ).first()

        alerts.append({
            "lot_id": lot.id,
            "lot_number": lot.lot_number,
            "product_id": lot.product_id,
            "product_name": product.name if product else None,
            "stock": stock,
            "unit": product.stock_unit if product else None,
            "expiration_date": lot.expiration_date,
            "days_remaining": (
                lot.expiration_date - today
            ).days
        })

    return {
        "days": days,
        "count": len(alerts),
        "items": alerts
    }


@router.get("/expired")
def expired_lots(
    db: Session = Depends(get_db)
):
    today = date.today()

    lots = db.query(Lot).filter(
        Lot.expiration_date.isnot(None),
        Lot.expiration_date < today
    ).order_by(
        Lot.expiration_date.asc()
    ).all()

    alerts = []

    for lot in lots:
        stock = get_lot_stock(db, lot.id)

        if stock <= 0:
            continue

        product = db.query(Product).filter(
            Product.id == lot.product_id
        ).first()

        alerts.append({
            "lot_id": lot.id,
            "lot_number": lot.lot_number,
            "product_id": lot.product_id,
            "product_name": product.name if product else None,
            "stock": stock,
            "unit": product.stock_unit if product else None,
            "expiration_date": lot.expiration_date
        })

    return {
        "count": len(alerts),
        "items": alerts
    }
