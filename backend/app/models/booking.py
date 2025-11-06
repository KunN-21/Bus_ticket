"""
Pydantic models for booking and payment
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ========== SEAT HOLDING MODELS ==========
class SeatHoldRequest(BaseModel):
    """Request để giữ ghế tạm thời"""
    maTuyen: str
    ngayDi: str  # YYYY-MM-DD
    gioDi: str   # HH:MM
    seats: List[str] = Field(..., min_items=1, max_items=5)
    sessionId: str


class SeatHoldResponse(BaseModel):
    """Response sau khi giữ ghế"""
    success: bool
    message: str
    seats: Optional[List[str]] = None
    expire_at: Optional[str] = None
    conflicts: Optional[List[str]] = None


class SeatReleaseRequest(BaseModel):
    """Request để giải phóng ghế"""
    maTuyen: str
    ngayDi: str
    gioDi: str
    seats: List[str]
    sessionId: str


# ========== BOOKING MODELS ==========
class BookingCreateRequest(BaseModel):
    """Request tạo booking (đặt vé)"""
    maTuyen: str
    ngayDi: str
    gioDi: str
    soGheNgoi: List[str] = Field(..., min_items=1, max_items=5)
    sessionId: str
    # Thông tin khách hàng sẽ lấy từ JWT token


class BookingResponse(BaseModel):
    """Response sau khi tạo booking"""
    maDatVe: str
    maTuyen: str  # API field name
    maKH: str
    ngayDi: str
    gioDi: str
    soGheNgoi: List[str]
    tongTien: float
    trangThai: str  # "pending" | "paid" | "cancelled"
    ngayDat: datetime
    qrCode: Optional[str] = None  # Base64 encoded QR code
    paymentInfo: Optional[dict] = None
    
    class Config:
        # Allow maTuyenXe from MongoDB to map to maTuyen in API
        populate_by_name = True
        
    @classmethod
    def from_mongo(cls, doc: dict):
        """Convert MongoDB document to response model"""
        if "maTuyenXe" in doc and "maTuyen" not in doc:
            doc["maTuyen"] = doc.pop("maTuyenXe")
        return cls(**doc)


# ========== PAYMENT MODELS ==========
class PaymentConfirmRequest(BaseModel):
    """Request xác nhận thanh toán"""
    maDatVe: str
    transactionId: Optional[str] = None  # ID giao dịch từ ngân hàng (nếu có)


class PaymentCancelRequest(BaseModel):
    """Request hủy thanh toán"""
    maDatVe: str
    sessionId: Optional[str] = None  # Optional vì có thể lấy từ Redis


class AvailableSeatsRequest(BaseModel):
    """Request lấy danh sách ghế khả dụng"""
    maTuyen: str
    ngayDi: str
    gioDi: str
    sessionId: Optional[str] = None  # Để biết ghế nào user này đang giữ


class AvailableSeatsResponse(BaseModel):
    """Response danh sách ghế"""
    totalSeats: int
    bookedSeats: List[str]  # Ghế đã đặt (confirmed)
    heldSeats: List[str]     # Ghế đang được giữ bởi người khác
    myHeldSeats: List[str]   # Ghế mà user này đang giữ
    availableSeats: List[str]  # Ghế còn trống
