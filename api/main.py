from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional
import os

# --- DATABASE SETUP ---
ABS_PATH = os.path.dirname(os.path.abspath(__file__))
DB_URL = f"sqlite:///{os.path.join(ABS_PATH, '../db/choco_box.db')}"
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ProductModel(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    price_text = Column(String)  # Example: "60 حبة بـ 5 دنانير"
    image_url = Column(String)
    description = Column(Text, nullable=True)

class OrderModel(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String)
    phone = Column(String)
    product_id = Column(Integer)
    quantity = Column(Integer, default=1)
    status = Column(String, default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# --- SCHEMAS ---
class Product(BaseModel):
    id: int
    name: str
    price_text: str
    image_url: str
    description: Optional[str] = None

    class Config:
        orm_mode = True

class OrderCreate(BaseModel):
    customer_name: str
    phone: str
    product_id: int
    quantity: int

# --- API ---
app = FastAPI(title="Choco Box API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/products", response_model=List[Product])
def get_products(db: Session = Depends(get_db)):
    return db.query(ProductModel).all()

@app.post("/api/orders")
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    new_order = OrderModel(**order.dict())
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return {"status": "success", "order_id": new_order.id}

# --- ADMIN ENDPOINTS ---
@app.get("/api/admin/orders")
def get_admin_orders(db: Session = Depends(get_db)):
    orders = db.query(OrderModel).all()
    # Basic join-like lookup for product names
    result = []
    for o in orders:
        p = db.query(ProductModel).filter(ProductModel.id == o.product_id).first()
        order_dict = {
            "id": o.id,
            "customer_name": o.customer_name,
            "phone": o.phone,
            "product_name": p.name if p else "طلب مخصص",
            "quantity": o.quantity,
            "status": o.status,
            "created_at": o.created_at
        }
        result.append(order_dict)
    return result

@app.patch("/api/admin/orders/{order_id}")
def update_order_status(order_id: int, status_update: dict, db: Session = Depends(get_db)):
    order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = status_update.get("status", order.status)
    db.commit()
    return {"status": "updated"}

@app.delete("/api/admin/orders/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
    return {"status": "deleted"}

# Mount static files
STATIC_PATH = os.path.join(ABS_PATH, "../static")
app.mount("/", StaticFiles(directory=STATIC_PATH, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
