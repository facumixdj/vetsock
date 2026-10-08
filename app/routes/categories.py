from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError


from app.models.user import User
from app.services.auth import get_current_user, require_admin
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryRead
from database import get_db

router = APIRouter(
    prefix="/categories",
    tags=["Categories"],
    dependencies=[Depends(get_current_user)]
)


@router.post("/", response_model=CategoryRead)
def create_category(
    category: CategoryCreate, db: Session = Depends(get_db), 
    current_user: User = Depends(require_admin)
):
    existing = db.query(Category).filter(
        Category.name == category.name
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="La categoría ya existe"
        )

    new_category = Category(
        name=category.name,
        description=category.description
    )

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return new_category


@router.get("/", response_model=list[CategoryRead])
def list_categories(
    db: Session = Depends(get_db)
):
    return db.query(Category).order_by(Category.name).all()
@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    category = db.query(Category).filter(
        Category.id == category_id
    ).first()

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Categoría no encontrada"
        )

    try:
        db.delete(category)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar la categoría porque está siendo utilizada por uno o más productos"
        )

    return {
        "message": "Categoría eliminada correctamente"
    }
