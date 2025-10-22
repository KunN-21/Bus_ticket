from fastapi import APIRouter, HTTPException, status
from typing import List
from models import BookingCreate, BookingResponse
from database import mongodb_client, redis_client
from bson import ObjectId
from datetime import datetime

router = APIRouter()

def booking_helper(booking) -> dict:
    return {
        "id": str(booking["_id"]),
        "ticket_id": booking["ticket_id"],
        "customer_name": booking["customer_name"],
        "customer_email": booking["customer_email"],
        "customer_phone": booking.get("customer_phone", ""),
        "quantity": booking["quantity"],
        "seat_numbers": booking.get("seat_numbers", []),
        "total_price": booking["total_price"],
        "booking_date": booking["booking_date"],
        "status": booking["status"],
        "payment_status": booking.get("payment_status", "pending"),
        "qr_code_url": booking.get("qr_code_url"),
        "user_id": booking.get("user_id")
    }

@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(booking: BookingCreate):
    """Đặt vé mới"""
    db = mongodb_client.get_db()
    
    # Kiểm tra vé tồn tại
    ticket = await db.tickets.find_one({"_id": ObjectId(booking.ticket_id)})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Kiểm tra số lượng ghế còn lại
    if ticket["available_seats"] < booking.quantity:
        raise HTTPException(status_code=400, detail="Not enough seats available")
    
    # Tính tổng tiền
    total_price = ticket["price"] * booking.quantity
    
    # Tạo booking
    booking_dict = {
        "ticket_id": booking.ticket_id,
        "customer_name": booking.customer_name,
        "customer_email": booking.customer_email,
        "customer_phone": booking.customer_phone,
        "quantity": booking.quantity,
        "seat_numbers": booking.seat_numbers,
        "total_price": total_price,
        "booking_date": datetime.now(),
        "status": "pending",
        "payment_status": "pending",
        "user_id": booking.user_id
    }
    
    result = await db.bookings.insert_one(booking_dict)
    
    # Cập nhật số ghế còn lại
    await db.tickets.update_one(
        {"_id": ObjectId(booking.ticket_id)},
        {"$inc": {"available_seats": -booking.quantity}}
    )
    
    # Invalidate cache
    redis = redis_client.get_client()
    await redis.delete(f"ticket:{booking.ticket_id}")
    await redis.delete("tickets:all")
    
    new_booking = await db.bookings.find_one({"_id": result.inserted_id})
    return booking_helper(new_booking)

@router.get("/", response_model=List[BookingResponse])
async def get_all_bookings():
    """Lấy tất cả booking"""
    db = mongodb_client.get_db()
    bookings = []
    async for booking in db.bookings.find():
        bookings.append(booking_helper(booking))
    return bookings

@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: str):
    """Lấy thông tin chi tiết booking"""
    db = mongodb_client.get_db()
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return booking_helper(booking)
