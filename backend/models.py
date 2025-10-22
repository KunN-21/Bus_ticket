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
