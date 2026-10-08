from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.user import User
from app.services.auth import get_current_user, require_admin
from app.models.category import Category
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
from database import get_db


router = APIRouter(
    prefix="/products",
    tags=["Products"],
    dependencies=[Depends(get_current_user)]
)


@router.post("/", response_model=ProductRead)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    existing_code = db.query(Product).filter(
        Product.code == product.code
    ).first()

    if existing_code:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un producto con ese código"
        )

    if product.barcode:
        existing_barcode = db.query(Product).filter(
            Product.barcode == product.barcode
        ).first()

        if existing_barcode:
            raise HTTPException(
                status_code=400,
                detail="Ya existe un producto con ese código de barras"
            )

    if product.category_id is not None:
        category = db.query(Category).filter(
            Category.id == product.category_id
        ).first()

        if not category:
            raise HTTPException(
                status_code=400,
                detail="La categoría indicada no existe"
            )

    new_product = Product(
        code=product.code,
        barcode=product.barcode,
        name=product.name,
        description=product.description,
        category_id=product.category_id,
        purchase_price=product.purchase_price,
        sale_price=product.sale_price,
        price_unit_quantity=product.price_unit_quantity,
        minimum_stock=product.minimum_stock,
        stock_unit=product.stock_unit,
        active=product.active
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    return new_product


@router.get("/", response_model=list[ProductRead])
def list_products(
    db: Session = Depends(get_db)
):
    return db.query(Product).order_by(Product.name).all()


@router.get("/{product_id}", response_model=ProductRead)
def get_product(
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

    return product


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Producto no encontrado"
        )

    db.delete(product)
    db.commit()

    return {
        "message": "Producto eliminado correctamente"
    }

@router.patch("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Producto no encontrado"
        )

    update_data = data.model_dump(exclude_unset=True)

    if "category_id" in update_data:
        category = db.query(Category).filter(
            Category.id == update_data["category_id"]
        ).first()

        if not category:
            raise HTTPException(
                status_code=400,
                detail="La categoría indicada no existe"
            )

    if "stock_unit" in update_data:
        if update_data["stock_unit"] not in [
            "UNIT",
            "GRAM",
            "ML"
        ]:
            raise HTTPException(
                status_code=400,
                detail="stock_unit debe ser UNIT, GRAM o ML"
            )

    if "code" in update_data:
        existing = db.query(Product).filter(
            Product.code == update_data["code"],
            Product.id != product_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Ya existe otro producto con ese código"
            )

    if (
        "barcode" in update_data
        and update_data["barcode"]
    ):
        existing = db.query(Product).filter(
            Product.barcode == update_data["barcode"],
            Product.id != product_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Ya existe otro producto con ese código de barras"
            )

    for field, value in update_data.items():
        setattr(product, field, value)

    try:
        db.commit()
        db.refresh(product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="No se pudo actualizar el producto por un conflicto de datos"
        )

    return product
