from fastapi import APIRouter, HTTPException, status
from models import PaymentCreate, PaymentResponse
from database import mongodb_client, redis_client
from bson import ObjectId
from datetime import datetime
import qrcode
import io
import base64
import json

router = APIRouter()

def payment_helper(payment) -> dict:
    return {
        "id": str(payment["_id"]),
        "booking_id": payment["booking_id"],
        "amount": payment["amount"],
        "method": payment["method"],
        "status": payment["status"],
        "qr_code_url": payment.get("qr_code_url"),
        "created_at": payment["created_at"],
        "completed_at": payment.get("completed_at")
    }

def generate_qr_code(data: str) -> str:
    """Generate QR code and return base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"

@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(payment: PaymentCreate):
    """Tạo thanh toán QR cho booking"""
    db = mongodb_client.get_db()
    
    # Check booking exists
    booking = await db.bookings.find_one({"_id": ObjectId(payment.booking_id)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking không tồn tại")
    
    # Check if payment already exists
    existing_payment = await db.payments.find_one({"booking_id": payment.booking_id})
    if existing_payment:
        return payment_helper(existing_payment)
    
    # Generate QR code with payment info
    # Format: Bank|Account|Amount|Content
    qr_data = f"BANK:VCB|ACC:0123456789|AMOUNT:{payment.amount}|CONTENT:Thanh toan ve {payment.booking_id}"
    qr_code_url = generate_qr_code(qr_data)
    
    # Create payment
    payment_dict = {
        "booking_id": payment.booking_id,
        "amount": payment.amount,
        "method": payment.method,
        "status": "pending",
        "qr_code_url": qr_code_url,
        "created_at": datetime.now(),
        "completed_at": None
    }
    
    result = await db.payments.insert_one(payment_dict)
    
    # Update booking payment status
    await db.bookings.update_one(
        {"_id": ObjectId(payment.booking_id)},
        {"$set": {
            "payment_status": "pending",
            "qr_code_url": qr_code_url
        }}
    )
    
    # Invalidate cache
    redis = redis_client.get_client()
    await redis.delete(f"booking:{payment.booking_id}")
    
    new_payment = await db.payments.find_one({"_id": result.inserted_id})
    return payment_helper(new_payment)

@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(payment_id: str):
    """Lấy thông tin thanh toán"""
    db = mongodb_client.get_db()
    payment = await db.payments.find_one({"_id": ObjectId(payment_id)})
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment không tồn tại")
    
    return payment_helper(payment)

@router.post("/{payment_id}/confirm", response_model=PaymentResponse)
async def confirm_payment(payment_id: str):
    """Xác nhận thanh toán đã hoàn thành"""
    db = mongodb_client.get_db()
    
    payment = await db.payments.find_one({"_id": ObjectId(payment_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment không tồn tại")
    
    # Update payment status
    await db.payments.update_one(
        {"_id": ObjectId(payment_id)},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now()
        }}
    )
    
    # Update booking status
    await db.bookings.update_one(
        {"_id": ObjectId(payment["booking_id"])},
        {"$set": {
            "payment_status": "completed",
            "status": "confirmed"
        }}
    )
    
    # Invalidate cache
    redis = redis_client.get_client()
    await redis.delete(f"booking:{payment['booking_id']}")
    await redis.delete(f"payment:{payment_id}")
    
    updated_payment = await db.payments.find_one({"_id": ObjectId(payment_id)})
    return payment_helper(updated_payment)

@router.get("/booking/{booking_id}", response_model=PaymentResponse)
async def get_payment_by_booking(booking_id: str):
    """Lấy thông tin thanh toán theo booking"""
    db = mongodb_client.get_db()
    payment = await db.payments.find_one({"booking_id": booking_id})
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment chưa được tạo")
    
    return payment_helper(payment)
