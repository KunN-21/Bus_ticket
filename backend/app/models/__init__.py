"""
Pydantic models for request/response validation - Redis version
"""

from .entities import (
    # Auth models
    LoginRequest,
    RegisterInitiate,
    VerifyOTPRequest,
    SetPasswordRequest,
    CompleteRegistrationRequest,
    Token,
    
    # Entity models
    ChucVuBase, ChucVuCreate, ChucVuResponse,
    NhanVienBase, NhanVienCreate, NhanVienResponse,
    KhachHangBase, KhachHangCreate, KhachHangResponse,
    XeBase, XeCreate, XeResponse,
    GheNgoiBase, GheNgoiCreate, GheNgoiResponse, GheNgoiWithStatus,
    ChuyenXeBase, ChuyenXeCreate, ChuyenXeResponse, ChuyenXeWithDetails,
    LichChayBase, LichChayCreate, LichChayResponse, LichChayWithDetails,
    VeXeBase, VeXeCreate, VeXeResponse, VeXeWithDetails,
    HoaDonBase, HoaDonCreate, HoaDonResponse, HoaDonWithDetails,
    
    # Search & Booking models
    RouteSearchRequest, RouteSearchResponse,
    BookingRequest, BookingResponse
)

__all__ = [
    'LoginRequest',
    'RegisterInitiate',
    'VerifyOTPRequest',
    'SetPasswordRequest',
    'CompleteRegistrationRequest',
    'Token',
    'ChucVuBase', 'ChucVuCreate', 'ChucVuResponse',
    'NhanVienBase', 'NhanVienCreate', 'NhanVienResponse',
    'KhachHangBase', 'KhachHangCreate', 'KhachHangResponse',
    'XeBase', 'XeCreate', 'XeResponse',
    'GheNgoiBase', 'GheNgoiCreate', 'GheNgoiResponse', 'GheNgoiWithStatus',
    'ChuyenXeBase', 'ChuyenXeCreate', 'ChuyenXeResponse', 'ChuyenXeWithDetails',
    'LichChayBase', 'LichChayCreate', 'LichChayResponse', 'LichChayWithDetails',
    'VeXeBase', 'VeXeCreate', 'VeXeResponse', 'VeXeWithDetails',
    'HoaDonBase', 'HoaDonCreate', 'HoaDonResponse', 'HoaDonWithDetails',
    'RouteSearchRequest', 'RouteSearchResponse',
    'BookingRequest', 'BookingResponse'
]
