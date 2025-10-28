from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# ========== NHAN VIEN (Employee) ==========
class NhanVienBase(BaseModel):
    maNV: str
    hoTen: str
    SDT: str
    ChucVu: str  # "QuanLy", "NhanVien", etc.
    trangThai: str = "active"  # "active", "inactive"

class NhanVienCreate(NhanVienBase):
    password: str

class NhanVienLogin(BaseModel):
    maNV: str
    password: str

class NhanVienResponse(NhanVienBase):
    thoiGianTao: datetime
    lanCuoiDangNhap: Optional[datetime] = None
    
    class Config:
        populate_by_name = True

# ========== KHACH HANG (Customer) ==========
class KhachHangBase(BaseModel):
    maKH: str
    hoTen: str
    SDT: str
    email: str
    CCCD: str
    diaChi: str

class KhachHangCreate(KhachHangBase):
    password: str

class KhachHangLogin(BaseModel):
    email: str
    password: str

class KhachHangResponse(KhachHangBase):
    class Config:
        populate_by_name = True

# ========== AUTH MODELS ==========
class RegisterInitiate(BaseModel):
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class SetPasswordRequest(BaseModel):
    email: str
    password: str

class CompleteRegistrationRequest(BaseModel):
    email: str
    hoTen: str
    SDT: str
    CCCD: str
    diaChi: str

# ========== XE (Vehicle) ==========
class XeBase(BaseModel):
    maXe: str
    loaiXe: str  # "Xe buyt", "Xe giuong nam", etc.
    soLuongCho: int
    bienSo: str
    tinhTrang: str = "HoatDong"  # "HoatDong", "BaoTri", "NgungHoatDong"

class XeCreate(XeBase):
    pass

class XeResponse(XeBase):
    class Config:
        populate_by_name = True

# ========== CHO NGOI (Seat) ==========
class ChoNgoiBase(BaseModel):
    maChoNgoi: str
    maXe: str
    viTri: str  # "A1", "A2", etc.
    trangThai: str = "Trong"  # "Trong", "DaDat", "DaBan"

class ChoNgoiCreate(ChoNgoiBase):
    pass

class ChoNgoiResponse(ChoNgoiBase):
    class Config:
        populate_by_name = True

# ========== TUYEN DUONG (Route) ==========
class TuyenDuongBase(BaseModel):
    maTuyenDuong: str
    diemDi: str
    diemDen: str
    khoangCach: str  # "80km"

class TuyenDuongCreate(TuyenDuongBase):
    pass

class TuyenDuongResponse(TuyenDuongBase):
    class Config:
        populate_by_name = True

# ========== CHUYEN DI (Trip) ==========
class ChuyenDiBase(BaseModel):
    maChuyenDi: str
    maTuyenDuong: str
    maXe: str
    maNV: str  # Tai xe
    giaTien: float
    thoiGianKhoiHanh: datetime
    thoiGianDen: datetime
    trangThai: str = "ChuaKhoiHanh"  # "ChuaKhoiHanh", "DangKhoiHanh", "DaKetThuc", "HuyBo"

class ChuyenDiCreate(ChuyenDiBase):
    pass

class ChuyenDiResponse(ChuyenDiBase):
    class Config:
        populate_by_name = True

# ========== VE (Ticket) ==========
class VeBase(BaseModel):
    maVe: str
    maChuyenDi: str
    maKH: str
    ngayDat: datetime
    maChoNgoi: str
    maNV: Optional[str] = None  # Nhan vien ban ve
    trangThaiVe: str = "ChuaThanhToan"  # "ChuaThanhToan", "DaThanhToan", "DaHuy"

class VeCreate(BaseModel):
    maChuyenDi: str
    maKH: str
    maChoNgoi: str
    maNV: Optional[str] = None

class VeResponse(VeBase):
    class Config:
        populate_by_name = True

# ========== HOA DON (Invoice) ==========
class VeInHoaDon(BaseModel):
    maVe: str

class HoaDonBase(BaseModel):
    maHoaDon: str
    maKH: str
    ngayLap: datetime
    tongTien: float
    ve: List[VeInHoaDon]
    trangThai: str = "ChuaThanhToan"  # "ChuaThanhToan", "DaThanhToan", "DaHuy"

class HoaDonCreate(BaseModel):
    maKH: str
    ve: List[str]  # List of maVe

class HoaDonResponse(HoaDonBase):
    class Config:
        populate_by_name = True

# ========== AUTH TOKEN ==========
class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict  # Can be NhanVienResponse or KhachHangResponse


