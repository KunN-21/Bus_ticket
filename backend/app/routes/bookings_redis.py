"""
Booking Routes - Đặt vé và thanh toán với Redis

Workflow:
1. User chọn ghế → Tạo pending booking trong Redis (3 phút TTL)
2. Hiển thị QR code thanh toán
3. User thanh toán → Confirm payment → Lưu veXe và hoaDon vào Redis
4. Hoặc hết 3 phút/user hủy → Tự động xóa pending booking

Schema Redis:
- veXe:{maVe} - Vé xe
- hoaDon:{maHD} - Hóa đơn
- pending_booking:{maLC}:{ngayDi} - Pending bookings (TTL 3 phút)
"""
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
import json
import time
import random

from app.models.entities import (
    BookingRequest,
    BookingResponse,
    VeXeResponse,
    HoaDonResponse
)
from app.core.database import redis_client
from app.core.middleware import get_current_customer
from app.services.redis_service import redis_service

router = APIRouter(prefix="/api/v1/bookings", tags=["Bookings"])


# ========== REQUEST/RESPONSE MODELS ==========

class AvailableSeatsRequest(BaseModel):
    """Request kiểm tra ghế khả dụng"""
    maLC: str  # Mã lịch chạy
    ngayDi: str  # YYYY-MM-DD
    sessionId: Optional[str] = None


class AvailableSeatsResponse(BaseModel):
    """Response danh sách ghế khả dụng"""
    totalSeats: int
    bookedSeats: List[str]  # Ghế đã thanh toán
    heldSeats: List[str]  # Ghế đang được người khác giữ
    myHeldSeats: List[str]  # Ghế tôi đang giữ
    availableSeats: List[str]  # Ghế còn trống


class BookingCreateRequest(BaseModel):
    """Request tạo booking"""
    maLC: str
    ngayDi: str
    danhSachGhe: List[str] = Field(..., min_items=1, max_items=5)
    sessionId: str


class BookingCreateResponse(BaseModel):
    """Response sau khi tạo booking"""
    maHD: str
    danhSachVe: List[str]
    danhSachGhe: List[str] = []  # Danh sách ghế đã đặt
    tongTien: float
    trangThai: str
    ngayDat: str
    qrCode: Optional[str] = None
    paymentInfo: Optional[dict] = None


class PaymentConfirmRequest(BaseModel):
    """Request xác nhận thanh toán"""
    maHD: str
    transactionId: Optional[str] = None


class PaymentCancelRequest(BaseModel):
    """Request hủy booking"""
    maHD: str
    sessionId: Optional[str] = None


class CancelRequest(BaseModel):
    """Request yêu cầu hủy vé"""
    maDatVe: str
    lyDoHuy: str  # Mã lý do: change_schedule, health_issue, etc.
    lyDoHuyText: str  # Lý do chi tiết
    ghiChu: Optional[str] = None
    tienHoanDuKien: float
    phanTramHoan: int


class CancelRequestResponse(BaseModel):
    """Response sau khi gửi yêu cầu hủy"""
    maYeuCauHuy: str
    maDatVe: str
    trangThai: str  # "pending" | "approved" | "rejected"
    message: str

def generate_id(prefix: str) -> str:
    """Tạo mã ID unique"""
    timestamp = int(time.time() * 1000) % 100000
    rand = random.randint(1000, 9999)
    return f"{prefix}{timestamp:05d}{rand}"


def get_pending_key(maLC: str, ngayDi: str) -> str:
    """Tạo Redis key cho pending bookings"""
    return f"pending_booking:{maLC}:{ngayDi}"


# ========== SEAT HOLDING (Redis TTL) ==========

HOLD_DURATION = 600  # 10 minutes


async def get_pending_bookings(maLC: str, ngayDi: str) -> dict:
    """Lấy tất cả pending bookings cho một lịch chạy + ngày"""
    redis = redis_client.get_client()
    if not redis:
        return {}
    
    key = get_pending_key(maLC, ngayDi)
    data = await redis.get(key)
    return json.loads(data) if data else {}


async def create_pending_booking(
    maLC: str, 
    ngayDi: str, 
    maHD: str,
    danhSachVe: List[str],
    danhSachGhe: List[str],
    maKH: str,
    sessionId: str,
    tongTien: float
) -> dict:
    """Tạo pending booking trong Redis"""
    redis = redis_client.get_client()
    if not redis:
        raise RuntimeError("Redis connection not available")
    
    key = get_pending_key(maLC, ngayDi)
    
    # Lấy pending bookings hiện tại
    current_data = await redis.get(key)
    pending_bookings = json.loads(current_data) if current_data else {}
    
    # Kiểm tra ghế có bị giữ bởi người khác không
    conflicts = []
    for session, booking_info in pending_bookings.items():
        if session != sessionId:
            other_seats = booking_info.get("danhSachGhe", [])
            conflicts.extend([s for s in danhSachGhe if s in other_seats])
    
    if conflicts:
        return {
            "success": False,
            "message": f"Ghế {', '.join(conflicts)} đang được người khác giữ",
            "conflicts": conflicts
        }
    
    # Tạo pending booking
    expire_at = datetime.utcnow().timestamp() + HOLD_DURATION
    booking_info = {
        "maHD": maHD,
        "maLC": maLC,
        "ngayDi": ngayDi,
        "danhSachVe": danhSachVe,
        "danhSachGhe": danhSachGhe,
        "maKH": maKH,
        "tongTien": tongTien,
        "created_at": datetime.utcnow().isoformat(),
        "expire_at": datetime.utcnow().timestamp() + HOLD_DURATION
    }
    
    pending_bookings[sessionId] = booking_info
    
    # Lưu vào Redis với TTL
    await redis.setex(key, HOLD_DURATION, json.dumps(pending_bookings))
    
    # Lưu mapping maHD -> session info
    await redis.setex(
        f"booking_session:{maHD}",
        HOLD_DURATION,
        json.dumps({"maLC": maLC, "ngayDi": ngayDi, "sessionId": sessionId})
    )
    
    return {
        "success": True,
        "expire_at": expire_at
    }


async def get_booking_by_id(maHD: str) -> Optional[dict]:
    """Lấy pending booking theo mã hóa đơn"""
    redis = redis_client.get_client()
    if not redis:
        return None
    
    # Lấy session info
    session_data = await redis.get(f"booking_session:{maHD}")
    if not session_data:
        return None
    
    session_info = json.loads(session_data)
    
    # Lấy pending booking
    pending = await get_pending_bookings(session_info["maLC"], session_info["ngayDi"])
    
    for session, booking in pending.items():
        if booking.get("maHD") == maHD:
            booking["sessionId"] = session
            return booking
    
    return None


async def confirm_booking(maLC: str, ngayDi: str, sessionId: str):
    """Xóa pending booking sau khi confirm"""
    redis = redis_client.get_client()
    if not redis:
        return
    
    key = get_pending_key(maLC, ngayDi)
    current_data = await redis.get(key)
    if current_data:
        pending = json.loads(current_data)
        if sessionId in pending:
            maHD = pending[sessionId].get("maHD")
            del pending[sessionId]
            
            if pending:
                await redis.setex(key, HOLD_DURATION, json.dumps(pending))
            else:
                await redis.delete(key)
            
            # Xóa mapping
            if maHD:
                await redis.delete(f"booking_session:{maHD}")


async def release_pending_booking(maLC: str, ngayDi: str, sessionId: str):
    """Giải phóng pending booking (hủy)"""
    await confirm_booking(maLC, ngayDi, sessionId)


# ========== API ENDPOINTS ==========

@router.post("/seats/check", response_model=AvailableSeatsResponse)
async def check_available_seats(request: AvailableSeatsRequest):
    """
    Kiểm tra ghế khả dụng cho một lịch chạy
    Kết hợp ghế đã thanh toán (Redis veXe) và ghế đang pending
    """
    # Lấy thông tin lịch chạy để biết xe nào
    lich_chay = await redis_service.get_lich_chay(request.maLC)
    if not lich_chay:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch chạy")
    
    maXe = lich_chay.get("maXe", "")
    
    # Lấy danh sách ghế của xe
    ghe_list = await redis_service.get_ghe_by_xe(maXe)
    all_seats = [g.get("maGhe") for g in ghe_list]
    total_seats = len(all_seats)
    
    if total_seats == 0:
        xe = await redis_service.get_xe(maXe)
        total_seats = xe.get("soChoNgoi", 40) if xe else 40
    
    # Lấy ghế đã thanh toán (từ veXe)
    booked_seats = await redis_service.get_booked_seats_by_lich_chay(request.maLC)
    
    # Lấy ghế đang pending
    pending = await get_pending_bookings(request.maLC, request.ngayDi)
    pending_seats = []
    my_pending = []
    
    for session, booking in pending.items():
        seats = booking.get("danhSachGhe", [])
        if session == request.sessionId:
            my_pending.extend(seats)
        else:
            pending_seats.extend(seats)
    
    # Ghế còn trống
    occupied = set(booked_seats + pending_seats)
    available = [s for s in all_seats if s not in occupied]
    
    return AvailableSeatsResponse(
        totalSeats=total_seats,
        bookedSeats=booked_seats,
        heldSeats=pending_seats,
        myHeldSeats=my_pending,
        availableSeats=available
    )


@router.post("", response_model=BookingCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(request: BookingCreateRequest, current_user: dict = Depends(get_current_customer)):
    """
    Tạo booking pending (chưa lưu vĩnh viễn, chỉ trong Redis với TTL 3 phút)
    """
    maKH = current_user.get("maKH")
    
    # Lấy thông tin lịch chạy
    lich_chay = await redis_service.get_lich_chay(request.maLC)
    if not lich_chay:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch chạy")
    
    # Lấy thông tin chuyến xe để tính giá
    chuyen_xe = await redis_service.get_chuyen_xe(lich_chay.get("maCX", ""))
    if not chuyen_xe:
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyến xe")
    
    gia_ve = chuyen_xe.get("giaChuyenXe", 0)
    tong_tien = gia_ve * len(request.danhSachGhe)
    
    # Tạo mã hóa đơn và mã vé
    maHD = generate_id("HD")
    danhSachVe = [generate_id("VE") for _ in request.danhSachGhe]
    
    # Kiểm tra ghế còn trống không
    booked_seats = await redis_service.get_booked_seats_by_lich_chay(request.maLC)
    conflicts = [s for s in request.danhSachGhe if s in booked_seats]
    if conflicts:
        raise HTTPException(
            status_code=400, 
            detail=f"Ghế {', '.join(conflicts)} đã được đặt"
        )
    
    # Tạo pending booking
    result = await create_pending_booking(
        maLC=request.maLC,
        ngayDi=request.ngayDi,
        maHD=maHD,
        danhSachVe=danhSachVe,
        danhSachGhe=request.danhSachGhe,
        maKH=maKH,
        sessionId=request.sessionId,
        tongTien=tong_tien
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    
    # TODO: Tạo QR code thanh toán (nếu cần)
    qr_code = None
    
    return BookingCreateResponse(
        maHD=maHD,
        danhSachVe=danhSachVe,
        danhSachGhe=request.danhSachGhe,
        tongTien=tong_tien,
        trangThai="pending",
        ngayDat=datetime.utcnow().isoformat(),
        qrCode=qr_code,
        paymentInfo={
            "amount": tong_tien,
            "content": f"VOOBUS {maHD}",
            "bankName": "MB Bank",
            "accountName": "VOOBUS",
            "expireAt": result.get("expire_at")
        }
    )


@router.post("/payment/confirm", response_model=BookingCreateResponse)
async def confirm_payment(request: PaymentConfirmRequest, current_user: dict = Depends(get_current_customer)):
    """
    Xác nhận thanh toán thành công
    Lưu veXe và hoaDon vào Redis
    """
    maKH = current_user.get("maKH")
    
    # Kiểm tra đã thanh toán chưa
    existing = await redis_service.get_hoa_don(request.maHD)
    if existing:
        if existing.get("maKH") != maKH:
            raise HTTPException(status_code=403, detail="Bạn không có quyền với booking này")
        # Đã thanh toán rồi
        return BookingCreateResponse(
            maHD=existing.get("maHD"),
            danhSachVe=existing.get("danhSachVe", []),
            danhSachGhe=[],  # Không có thông tin ghế trong hóa đơn đã lưu
            tongTien=existing.get("tongTien", 0),
            trangThai="paid",
            ngayDat=existing.get("ngayLap", "")
        )
    
    # Tìm pending booking
    booking_info = await get_booking_by_id(request.maHD)
    if not booking_info:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy booking hoặc đã hết thời gian thanh toán (3 phút)"
        )
    
    # Kiểm tra quyền
    if booking_info.get("maKH") != maKH:
        raise HTTPException(status_code=403, detail="Bạn không có quyền với booking này")
    
    now = datetime.utcnow()
    
    # Tạo hóa đơn
    hoa_don = {
        "maHD": booking_info["maHD"],
        "maKH": maKH,
        "maNV": None,
        "ngayLap": now.isoformat(),
        "tongTien": booking_info["tongTien"],
        "phuongThucThanhToan": "Online",
        "danhSachVe": booking_info["danhSachVe"]
    }
    await redis_service.create_hoa_don(hoa_don)
    
    # Tạo các vé
    for i, maVe in enumerate(booking_info["danhSachVe"]):
        ve_xe = {
            "maVe": maVe,
            "maKH": maKH,
            "maLC": booking_info["maLC"],
            "maGhe": booking_info["danhSachGhe"][i],
            "maHD": booking_info["maHD"],
            "trangThai": "paid"
        }
        await redis_service.create_ve_xe(ve_xe)
    
    # Xóa pending booking
    await confirm_booking(
        booking_info["maLC"],
        booking_info["ngayDi"],
        booking_info["sessionId"]
    )
    
    return BookingCreateResponse(
        maHD=booking_info["maHD"],
        danhSachVe=booking_info["danhSachVe"],
        danhSachGhe=booking_info.get("danhSachGhe", []),
        tongTien=booking_info["tongTien"],
        trangThai="paid",
        ngayDat=now.isoformat()
    )


@router.post("/payment/cancel")
async def cancel_payment(request: PaymentCancelRequest, current_user: dict = Depends(get_current_customer)):
    """
    Hủy booking pending và giải phóng ghế
    """
    maKH = current_user.get("maKH")
    
    # Kiểm tra đã thanh toán chưa
    existing = await redis_service.get_hoa_don(request.maHD)
    if existing:
        raise HTTPException(status_code=400, detail="Không thể hủy booking đã thanh toán")
    
    # Tìm pending booking
    booking_info = await get_booking_by_id(request.maHD)
    if not booking_info:
        return {"success": True, "message": "Booking không tồn tại hoặc đã hết hạn"}
    
    # Kiểm tra quyền
    if booking_info.get("maKH") != maKH:
        raise HTTPException(status_code=403, detail="Bạn không có quyền với booking này")
    
    # Giải phóng
    session_id = request.sessionId or booking_info.get("sessionId")
    if session_id:
        await release_pending_booking(
            booking_info["maLC"],
            booking_info["ngayDi"],
            session_id
        )
    
    return {"success": True, "message": "Đã hủy booking và giải phóng ghế"}


@router.get("/my-bookings")
async def get_my_bookings(current_user: dict = Depends(get_current_customer)):
    """
    Lấy danh sách vé của user hiện tại
    """
    maKH = current_user.get("maKH")
    
    # Lấy danh sách vé
    ve_list = await redis_service.get_ve_by_khach_hang(maKH)
    
    result = []
    for ve in ve_list:
        # Lấy thông tin lịch chạy
        lich_chay = await redis_service.get_lich_chay(ve.get("maLC", ""))
        chuyen_xe = None
        if lich_chay:
            chuyen_xe = await redis_service.get_chuyen_xe(lich_chay.get("maCX", ""))
        
        result.append({
            **ve,
            "lichChay": lich_chay,
            "chuyenXe": chuyen_xe
        })
    
    return result


@router.get("/my-invoices")
async def get_my_invoices(current_user: dict = Depends(get_current_customer)):
    """
    Lấy danh sách hóa đơn của user hiện tại
    """
    maKH = current_user.get("maKH")
    
    # Lấy danh sách hóa đơn
    hoa_don_list = await redis_service.get_hoa_don_by_khach_hang(maKH)
    
    return hoa_don_list


@router.post("/cancel-request", response_model=CancelRequestResponse)
async def create_cancel_request(request: CancelRequest, current_user: dict = Depends(get_current_customer)):
    """
    Tạo yêu cầu hủy vé - sẽ được admin duyệt
    
    Workflow:
    1. Kiểm tra vé tồn tại và thuộc về user
    2. Kiểm tra vé chưa bị hủy
    3. Tạo yêu cầu hủy trong Redis với key yeuCauHuy:{maYeuCauHuy}
    4. Cập nhật trạng thái vé thành "cancel_pending"
    """
    maKH = current_user.get("maKH")
    
    # Kiểm tra vé tồn tại
    ve = await redis_service.get_ve_xe(request.maDatVe)
    if not ve:
        raise HTTPException(status_code=404, detail="Không tìm thấy vé")
    
    # Kiểm tra quyền sở hữu
    if ve.get("maKH") != maKH:
        raise HTTPException(status_code=403, detail="Bạn không có quyền hủy vé này")
    
    # Kiểm tra trạng thái vé
    current_status = ve.get("trangThai")
    if current_status == "cancelled":
        raise HTTPException(status_code=400, detail="Vé đã được hủy trước đó")
    if current_status == "cancel_pending":
        raise HTTPException(status_code=400, detail="Yêu cầu hủy vé đang chờ xử lý")
    if current_status == "refunded":
        raise HTTPException(status_code=400, detail="Vé đã được hoàn tiền")
    
    # Tạo mã yêu cầu hủy
    ma_yeu_cau = generate_id("HV")
    
    # Tạo document yêu cầu hủy
    cancel_doc = {
        "maYeuCauHuy": ma_yeu_cau,
        "maDatVe": request.maDatVe,
        "maKH": maKH,
        "tenKH": current_user.get("hoTen", ""),
        "emailKH": current_user.get("email", ""),
        "maTuyenXe": ve.get("maTuyenXe"),
        "ngayDi": ve.get("ngayDi"),
        "gioDi": ve.get("gioDi"),
        "soGheNgoi": ve.get("soGheNgoi"),
        "tongTien": ve.get("tongTien"),
        "lyDoHuy": request.lyDoHuy,
        "lyDoHuyText": request.lyDoHuyText,
        "ghiChu": request.ghiChu,
        "tienHoanDuKien": request.tienHoanDuKien,
        "phanTramHoan": request.phanTramHoan,
        "trangThai": "pending",
        "ngayTao": datetime.now().isoformat(),
        "ngayCapNhat": datetime.now().isoformat()
    }
    
    # Lưu vào Redis
    await redis_service.create("yeuCauHuy", "maYeuCauHuy", cancel_doc)
    
    # Cập nhật trạng thái vé
    update_data = {
        "trangThai": "cancel_pending",
        "ngayCapNhat": datetime.now().isoformat()
    }
    await redis_service.update_ve_xe(request.maDatVe, update_data)
    
    return CancelRequestResponse(
        maYeuCauHuy=ma_yeu_cau,
        maDatVe=request.maDatVe,
        trangThai="pending",
        message="Yêu cầu hủy vé đã được gửi thành công"
    )
