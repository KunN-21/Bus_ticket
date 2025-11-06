from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# ========== EMPLOYEE MODELS ==========
class EmployeeCreate(BaseModel):
    """Model tạo nhân viên mới - Admin only"""
    hoTen: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    SDT: str = Field(..., pattern=r'^\d{10}$')
    CCCD: str = Field(..., pattern=r'^\d{12}$')
    diaChi: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)
    maChucVu: str  # CV001 (admin) or CV002 (nhanvien) - required field

class EmployeeUpdate(BaseModel):
    """Model cập nhật nhân viên - Admin only"""
    hoTen: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    SDT: Optional[str] = Field(None, pattern=r'^\d{10}$')
    CCCD: Optional[str] = Field(None, pattern=r'^\d{12}$')
    diaChi: Optional[str] = Field(None, min_length=5)
    password: Optional[str] = Field(None, min_length=6)
    maChucVu: Optional[str] = None

class EmployeeResponse(BaseModel):
    """Model response nhân viên"""
    maNV: str
    hoTen: str
    email: str
    SDT: str
    CCCD: str
    diaChi: str
    maChucVu: str
    chucVuInfo: Optional[dict] = None
    lanCuoiDangNhap: Optional[datetime] = None
    thoiGianTao: Optional[datetime] = None

# ========== CUSTOMER MODELS ==========
class CustomerCreate(BaseModel):
    """Model tạo khách hàng - Admin + Employee"""
    hoTen: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    SDT: str = Field(..., pattern=r'^\d{10}$')
    CCCD: str = Field(..., pattern=r'^\d{12}$')
    diaChi: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)

class CustomerUpdate(BaseModel):
    """Model cập nhật khách hàng - Admin only"""
    hoTen: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    SDT: Optional[str] = Field(None, pattern=r'^\d{10}$')
    CCCD: Optional[str] = Field(None, pattern=r'^\d{12}$')
    diaChi: Optional[str] = Field(None, min_length=5)
    password: Optional[str] = Field(None, min_length=6)

class CustomerResponse(BaseModel):
    """Model response khách hàng"""
    maKH: str
    hoTen: str
    email: str
    SDT: str
    CCCD: str
    diaChi: str
    lanCuoiDangNhap: Optional[datetime] = None
    thoiGianTao: Optional[datetime] = None
