from pydantic import BaseModel, Field
from typing import List, Optional, Union
from datetime import datetime

class Seat(BaseModel):
    maGhe: str
    trangThai: bool  # False = available, True = booked

class Vehicle(BaseModel):
    """Model cho xe"""
    loaiXe: Optional[str] = None
    maXe: Optional[str] = None

class BusRoute(BaseModel):
    maTuyenXe: str
    diemDi: str
    diemDen: str
    quangDuong: int 
    xe: Optional[Vehicle] = None
    thoiGianXuatBen: Optional[str] = None
    thoiGianDenDuKien: Optional[str] = None
    thoiGianQuangDuong: Optional[str] = None
    giaVe: Optional[float] = None
    gheNgoi: List[Seat]
    lichChay: Optional[str] = "daily"

class RouteSearchRequest(BaseModel):
    """Request tìm kiếm tuyến xe"""
    diemDi: str
    diemDen: str
    ngayDi: str  # format: "YYYY-MM-DD"

class RouteSearchResponse(BaseModel):
    """Response tìm kiếm tuyến xe"""
    maTuyenXe: str
    diemDi: str
    diemDen: str
    quangDuong: int
    thoiGianXuatBen: Optional[str]
    thoiGianDenDuKien: Optional[str]
    thoiGianQuangDuong: Optional[str]
    loaiXe: str
    soGheTrong: int  # số ghế còn trống
    giaVe: float
    lichChay: Optional[str]

class BookingRequest(BaseModel):
    maTuyenXe: str
    gheNgoi: List[str]  
    tongTien: float
    ngayDi: str  # YYYY-MM-DD

class BookingResponse(BaseModel):
    maDatVe: str
    maTuyenXe: str
    maKH: str
    gheNgoi: List[str]
    tongTien: float
    trangThai: str  # "pending", "confirmed", "cancelled"
    ngayDat: datetime
    ngayDi: Optional[str]

class HoaDonRequest(BaseModel):
    """Request tạo hóa đơn"""
    maKH: str
    hoTen: str
    email: Optional[str]
    SDT: str
    maTuyenXe: str
    diemDi: str
    diemDen: str
    gheNgoi: List[str]
    donGia: float
    soVeMua: int
    tongTien: float
    phuongThucThanhToan: str  # "Online" or "Cash"
    ngayDi: str

class HoaDonResponse(BaseModel):
    """Response hóa đơn"""
    maHoaDon: str
    ngayLap: datetime
    khachhang: dict  # {"hoTen": str, "maKH": str}
    phuongThucThanhToan: str
    tongTien: float
    tuyenXe: dict  # {"maTuyenXe": str, "diemDi": str, "diemDen": str}
    donGia: float
    soVeMua: int
    gheNgoi: List[str]
