"""
Pydantic models cho tất cả entities trong hệ thống đặt vé xe

Schema Redis:
1. chucVu:{maCV}
2. nhanVien:{maNV}
3. khachHang:{maKH}
4. xe:{maXe}
5. gheNgoi:{maGhe}
6. chuyenXe:{maCX}
7. lichChay:{maLC}
8. veXe:{maVe}
9. hoaDon:{maHD}
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ========== CHỨC VỤ (Role) ==========
class ChucVuBase(BaseModel):
    """Model cho chức vụ nhân viên"""
    maCV: str
    tenChucVu: str
    moTa: Optional[str] = None
    danhSachNhanVien: List[str] = []  # List of maNV


class ChucVuCreate(ChucVuBase):
    pass


class ChucVuResponse(ChucVuBase):
    class Config:
        populate_by_name = True


# ========== NHÂN VIÊN (Employee) ==========
class NhanVienBase(BaseModel):
    """Model cho nhân viên"""
    maNV: str
    hoTen: str
    email: str
    SDT: str
    CCCD: str
    diaChi: str


class NhanVienCreate(NhanVienBase):
    password: str


class NhanVienResponse(NhanVienBase):
    class Config:
        populate_by_name = True


class NhanVienInDB(NhanVienBase):
    password: str


# ========== KHÁCH HÀNG (Customer) ==========
class KhachHangBase(BaseModel):
    """Model cho khách hàng"""
    maKH: str
    hoTen: str
    email: str
    SDT: str
    CCCD: str
    diaChi: str


class KhachHangCreate(KhachHangBase):
    password: str


class KhachHangResponse(KhachHangBase):
    class Config:
        populate_by_name = True


class KhachHangInDB(KhachHangBase):
    password: str


# ========== XE (Vehicle) ==========
class XeBase(BaseModel):
    """Model cho xe"""
    maXe: str
    bienSoXe: str
    soChoNgoi: int
    loaiXe: str  # "Xe giường nằm", "Xe ghế ngồi", etc.


class XeCreate(XeBase):
    pass


class XeResponse(XeBase):
    class Config:
        populate_by_name = True


# ========== GHẾ NGỒI (Seat) ==========
class GheNgoiBase(BaseModel):
    """Model cho ghế ngồi"""
    maGhe: str
    maXe: str
    tenGhe: str  # "A01", "A02", "B01", etc.


class GheNgoiCreate(GheNgoiBase):
    pass


class GheNgoiResponse(GheNgoiBase):
    class Config:
        populate_by_name = True


class GheNgoiWithStatus(BaseModel):
    """Ghế ngồi với trạng thái (dùng khi hiển thị cho user)"""
    maGhe: str
    tenGhe: str
    trangThai: bool = True  # True = còn trống, False = đã đặt


# ========== CHUYẾN XE (Route) ==========
class ChuyenXeBase(BaseModel):
    """Model cho chuyến xe (tuyến đường)"""
    maCX: str
    maXe: str
    diemDi: str
    diemDen: str
    quangDuong: float  # km
    giaChuyenXe: float  # VND
    lichChay: List[str] = []  # List of maLC


class ChuyenXeCreate(ChuyenXeBase):
    pass


class ChuyenXeResponse(ChuyenXeBase):
    class Config:
        populate_by_name = True


class ChuyenXeWithDetails(ChuyenXeBase):
    """Chuyến xe với thông tin chi tiết xe"""
    xe: Optional[XeResponse] = None
    danhSachGhe: List[GheNgoiWithStatus] = []


# ========== LỊCH CHẠY (Schedule) ==========
class LichChayBase(BaseModel):
    """Model cho lịch chạy"""
    maLC: str
    maCX: str
    maXe: str
    thoiGianXuatBen: str  # "HH:MM" hoặc datetime string
    thoiGianChay: str  # Thời gian di chuyển dự kiến (vd: "5 giờ")
    thoiGianDenDuKien: str  # "HH:MM" hoặc datetime string


class LichChayCreate(LichChayBase):
    pass


class LichChayResponse(LichChayBase):
    class Config:
        populate_by_name = True


class LichChayWithDetails(LichChayBase):
    """Lịch chạy với thông tin chi tiết chuyến xe"""
    chuyenXe: Optional[ChuyenXeResponse] = None
    xe: Optional[XeResponse] = None
    soGheTrong: int = 0
    soGheDaDat: int = 0


# ========== VÉ XE (Ticket) ==========
class VeXeBase(BaseModel):
    """Model cho vé xe"""
    maVe: str
    maKH: str
    maLC: str
    maGhe: str
    maHD: Optional[str] = None
    trangThai: str = "pending"  # "pending", "paid", "confirmed", "cancelled"


class VeXeCreate(BaseModel):
    """Request tạo vé xe"""
    maKH: str
    maLC: str
    maGhe: str
    maHD: Optional[str] = None


class VeXeResponse(VeXeBase):
    class Config:
        populate_by_name = True


class VeXeWithDetails(VeXeBase):
    """Vé xe với thông tin chi tiết"""
    khachHang: Optional[KhachHangResponse] = None
    lichChay: Optional[LichChayResponse] = None
    gheNgoi: Optional[GheNgoiResponse] = None


# ========== HÓA ĐƠN (Invoice) ==========
class HoaDonBase(BaseModel):
    """Model cho hóa đơn"""
    maHD: str
    maKH: str
    maNV: Optional[str] = None
    ngayLap: datetime
    tongTien: float
    phuongThucThanhToan: str  # "Online", "Cash"
    danhSachVe: List[str] = []  # List of maVe


class HoaDonCreate(BaseModel):
    """Request tạo hóa đơn"""
    maKH: str
    maNV: Optional[str] = None
    tongTien: float
    phuongThucThanhToan: str
    danhSachVe: List[str]


class HoaDonResponse(HoaDonBase):
    class Config:
        populate_by_name = True


class HoaDonWithDetails(HoaDonBase):
    """Hóa đơn với thông tin chi tiết"""
    khachHang: Optional[KhachHangResponse] = None
    nhanVien: Optional[NhanVienResponse] = None
    veXeDetails: List[VeXeWithDetails] = []


# ========== SEARCH & BOOKING REQUEST/RESPONSE ==========
class RouteSearchRequest(BaseModel):
    """Request tìm kiếm tuyến xe"""
    diemDi: str
    diemDen: str
    ngayDi: str  # format: "YYYY-MM-DD"


class RouteSearchResponse(BaseModel):
    """Response tìm kiếm tuyến xe"""
    maCX: str
    maLC: str
    maXe: str
    diemDi: str
    diemDen: str
    quangDuong: float
    giaChuyenXe: float
    thoiGianXuatBen: str
    thoiGianDenDuKien: str
    thoiGianChay: str
    loaiXe: str
    soGheTrong: int
    soGheDaDat: int


class BookingRequest(BaseModel):
    """Request đặt vé"""
    maLC: str  # Mã lịch chạy
    danhSachGhe: List[str]  # List mã ghế
    ngayDi: str  # YYYY-MM-DD


class BookingResponse(BaseModel):
    """Response sau khi đặt vé"""
    maHD: str
    danhSachVe: List[str]
    tongTien: float
    trangThai: str
    ngayDat: datetime
    qrCode: Optional[str] = None


# ========== AUTH MODELS ==========
class LoginRequest(BaseModel):
    email: str
    password: str


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


class Token(BaseModel):
    access_token: str
    token_type: str
    user_type: Optional[str] = None
    role: Optional[str] = None
    user: Optional[dict] = None
