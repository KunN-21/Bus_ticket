from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

# ========== USER MODELS ==========
class UserBase(BaseModel):
    phone: str
    full_name: str
    email: Optional[EmailStr] = None

class UserRegister(BaseModel):
    phone: str
    full_name: str
    password: str

class UserLogin(BaseModel):
    phone: str
    password: str

class UserResponse(UserBase):
    id: str = Field(alias="_id")
    created_at: datetime
    is_verified: bool = False
    
    class Config:
        populate_by_name = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# ========== OTP MODELS ==========
class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    otp: str

class OTPResponse(BaseModel):
    message: str
    expires_in: int  # seconds

# ========== TICKET MODELS ==========
class TicketBase(BaseModel):
    event_name: str
    price: float
    date: datetime
    location: str
    available_seats: int
    departure_time: str
    arrival_time: str
    bus_type: str = "Giường nằm"
    route: str  # e.g., "Hà Nội - Hồ Chí Minh"

class TicketCreate(TicketBase):
    pass

class TicketUpdate(BaseModel):
    event_name: Optional[str] = None
    price: Optional[float] = None
    date: Optional[datetime] = None
    location: Optional[str] = None
    available_seats: Optional[int] = None
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    bus_type: Optional[str] = None
    route: Optional[str] = None

class TicketResponse(TicketBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True

# ========== BOOKING MODELS ==========
class BookingCreate(BaseModel):
    ticket_id: str
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    quantity: int
    seat_numbers: list[str]
    user_id: Optional[str] = None

class BookingResponse(BaseModel):
    id: str
    ticket_id: str
    customer_name: str
    customer_email: str
    customer_phone: str
    quantity: int
    seat_numbers: list[str]
    total_price: float
    booking_date: datetime
    status: str
    payment_status: str = "pending"
    qr_code_url: Optional[str] = None
    user_id: Optional[str] = None

# ========== PAYMENT MODELS ==========
class PaymentCreate(BaseModel):
    booking_id: str
    amount: float
    method: str = "QR"  # QR, Cash, Card

class PaymentResponse(BaseModel):
    id: str
    booking_id: str
    amount: float
    method: str
    status: str  # pending, completed, failed
    qr_code_url: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
