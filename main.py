from app.routes.products import router as products_router
from fastapi import FastAPI
from database import probar_conexion
from app.routes.categories import router as categories_router
from app.routes.suppliers import router as suppliers_router
from app.routes.product_suppliers import router as product_suppliers_router
from app.routes.lots import router as lots_router
from app.routes.stock_movements import router as stock_movements_router
from app.routes.product_conversions import (
    router as product_conversions_router
)
from app.routes.alerts import router as alerts_router
from app.routes.users import router as users_router
from app.routes.cash_sessions import router as cash_sessions_router
from app.routes.cash_movements import router as cash_movements_router
from app.routes.sales import router as sales_router

app = FastAPI(
    title="VetStock",
    version="0.1.0"
)

app.include_router(categories_router)
app.include_router(products_router)
app.include_router(suppliers_router)
app.include_router(product_suppliers_router)
app.include_router(lots_router)
app.include_router(stock_movements_router)
app.include_router(product_conversions_router)
app.include_router(alerts_router)
app.include_router(users_router)
app.include_router(cash_sessions_router)
app.include_router(cash_movements_router)
app.include_router(sales_router)

@app.get("/")
def inicio():
    return {
        "sistema": "VetStock",
        "estado": "online"
    }

@app.get("/db-test")
def db_test():
    version = probar_conexion()

    return {
        "base_de_datos": "conectada",
        "postgresql": version
    }
