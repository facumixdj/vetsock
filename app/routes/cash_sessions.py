from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.services.auth import get_current_user, require_admin
from app.models.cash_session import CashSession
from app.models.user import User
from app.schemas.cash_session import (
    CashSessionOpen,
    CashSessionClose,
    CashSessionRead,
)
from app.models.cash_movement import CashMovement
from app.services.auth import get_current_user
from database import get_db


router = APIRouter(
    prefix="/cash-sessions",
    tags=["Cash Sessions"]
)


@router.post("/open", response_model=CashSessionRead)
def open_cash_session(
    data: CashSessionOpen,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    open_session = db.query(CashSession).filter(
        CashSession.status == "OPEN"
    ).first()

    if open_session:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe una caja abierta con ID {open_session.id}"
        )

    new_session = CashSession(
        opened_by_user_id=current_user.id,
        opening_amount=data.opening_amount,
        status="OPEN",
        notes=data.notes
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return new_session


@router.get("/current", response_model=CashSessionRead)
def get_current_cash_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cash_session = db.query(CashSession).filter(
        CashSession.status == "OPEN"
    ).first()

    if not cash_session:
        raise HTTPException(
            status_code=404,
            detail="No hay una caja abierta"
        )

    return cash_session

@router.post("/{session_id}/close")
def close_cash_session(
    session_id: int,
    data: CashSessionClose,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    cash_session = db.query(CashSession).filter(
        CashSession.id == session_id
    ).with_for_update().first()

    if not cash_session:
        raise HTTPException(
            status_code=404,
            detail="Caja no encontrada"
        )

    if cash_session.status != "OPEN":
        raise HTTPException(
            status_code=400,
            detail="La caja ya está cerrada"
        )

    movements = db.query(CashMovement).filter(
        CashMovement.cash_session_id == cash_session.id
    ).all()

    cash_in = Decimal("0")
    cash_out = Decimal("0")

    payment_totals = {
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
            payment_totals[movement.payment_method] += amount

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

    counted_cash = Decimal(data.closing_amount)

    cash_difference = (
        counted_cash - theoretical_cash
    )

    cash_session.status = "CLOSED"
    cash_session.closed_by_user_id = current_user.id
    cash_session.closed_at = datetime.now(timezone.utc)

    cash_session.closing_amount = counted_cash
    cash_session.theoretical_cash = theoretical_cash
    cash_session.cash_difference = cash_difference

    if data.notes:
        cash_session.notes = data.notes

    db.commit()
    db.refresh(cash_session)

    return {
        "id": cash_session.id,
        "status": cash_session.status,

        "opened_by_user_id": cash_session.opened_by_user_id,
        "closed_by_user_id": cash_session.closed_by_user_id,

        "opened_at": cash_session.opened_at,
        "closed_at": cash_session.closed_at,

        "opening_amount": cash_session.opening_amount,

        "cash_in": cash_in,
        "cash_out": cash_out,

        "theoretical_cash": theoretical_cash,
        "counted_cash": counted_cash,
        "cash_difference": cash_difference,

        "payment_totals": payment_totals,

        "notes": cash_session.notes,
    }
