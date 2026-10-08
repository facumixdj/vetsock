from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.services.auth import get_current_user, require_admin
from app.models.cash_movement import CashMovement
from app.models.cash_session import CashSession
from app.models.user import User
from app.schemas.cash_movement import (
    CashMovementCreate,
    CashMovementRead,
)
from app.services.auth import get_current_user
from database import get_db


router = APIRouter(
    prefix="/cash-movements",
    tags=["Cash Movements"]
)


def get_open_cash_session(
    db: Session
) -> CashSession | None:
    return db.query(CashSession).filter(
        CashSession.status == "OPEN"
    ).first()


@router.post("/", response_model=CashMovementRead)
def create_cash_movement(
    movement: CashMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    cash_session = get_open_cash_session(db)

    if not cash_session:
        raise HTTPException(
            status_code=400,
            detail="No hay una caja abierta"
        )

    new_movement = CashMovement(
        cash_session_id=cash_session.id,
        user_id=current_user.id,
        movement_type=movement.movement_type,
        amount=movement.amount,
        payment_method=movement.payment_method,
        description=movement.description,
        reference=movement.reference,
    )

    db.add(new_movement)
    db.commit()
    db.refresh(new_movement)

    return new_movement


@router.get(
    "/current",
    response_model=list[CashMovementRead]
)
def list_current_cash_movements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cash_session = get_open_cash_session(db)

    if not cash_session:
        raise HTTPException(
            status_code=404,
            detail="No hay una caja abierta"
        )

    return db.query(
        CashMovement
    ).filter(
        CashMovement.cash_session_id == cash_session.id
    ).order_by(
        CashMovement.created_at.desc()
    ).all()


@router.get("/current/summary")
def current_cash_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cash_session = get_open_cash_session(db)

    if not cash_session:
        raise HTTPException(
            status_code=404,
            detail="No hay una caja abierta"
        )

    movements = db.query(
        CashMovement
    ).filter(
        CashMovement.cash_session_id == cash_session.id
    ).all()

    cash_in = Decimal("0")
    cash_out = Decimal("0")

    by_payment_method = {
        "CASH": Decimal("0"),
        "TRANSFER": Decimal("0"),
        "DEBIT": Decimal("0"),
        "CREDIT": Decimal("0"),
        "OTHER": Decimal("0"),
    }

    for movement in movements:
        amount = Decimal(movement.amount)

        if movement.movement_type in [
            "SALE",
            "INCOME",
            "ADJUSTMENT_IN",
        ]:
            by_payment_method[
                movement.payment_method
            ] += amount

            if movement.payment_method == "CASH":
                cash_in += amount

        elif movement.movement_type in [
            "EXPENSE",
            "WITHDRAWAL",
            "ADJUSTMENT_OUT",
        ]:
            if movement.payment_method == "CASH":
                cash_out += amount

    theoretical_cash = (
        Decimal(cash_session.opening_amount)
        + cash_in
        - cash_out
    )

    return {
        "cash_session_id": cash_session.id,
        "opening_amount": cash_session.opening_amount,
        "cash_in": cash_in,
        "cash_out": cash_out,
        "theoretical_cash": theoretical_cash,
        "by_payment_method": by_payment_method,
    }
