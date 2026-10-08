from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.user import User
from app.services.auth import get_current_user, require_admin
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.product_supplier import ProductSupplier
from app.schemas.product_supplier import (
    ProductSupplierCreate,
    ProductSupplierRead
)
from database import get_db


router = APIRouter(
    prefix="/product-suppliers",
    tags=["Product Suppliers"],
    dependencies=[Depends(get_current_user)]
)


@router.post("/", response_model=ProductSupplierRead)
def create_product_supplier(
    relation: ProductSupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    product = db.query(Product).filter(
        Product.id == relation.product_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Producto no encontrado"
        )

    supplier = db.query(Supplier).filter(
        Supplier.id == relation.supplier_id
    ).first()

    if not supplier:
        raise HTTPException(
            status_code=404,
            detail="Proveedor no encontrado"
        )

    existing = db.query(ProductSupplier).filter(
        ProductSupplier.product_id == relation.product_id,
        ProductSupplier.supplier_id == relation.supplier_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="El proveedor ya está asociado a este producto"
        )

    new_relation = ProductSupplier(
        product_id=relation.product_id,
        supplier_id=relation.supplier_id
    )

    db.add(new_relation)
    db.commit()
    db.refresh(new_relation)

    return new_relation


@router.get("/", response_model=list[ProductSupplierRead])
def list_product_suppliers(
    db: Session = Depends(get_db)
):
    return db.query(ProductSupplier).all()


@router.delete("/{relation_id}")
def delete_product_supplier(
    relation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    relation = db.query(ProductSupplier).filter(
        ProductSupplier.id == relation_id
    ).first()

    if not relation:
        raise HTTPException(
            status_code=404,
            detail="Relación no encontrada"
        )

    db.delete(relation)
    db.commit()

    return {
        "message": "Proveedor desvinculado del producto"
    }
