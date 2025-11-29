"""
Booking Routes - Đặt vé và thanh toán

Workflow mới:
1. User chọn ghế → Tạo booking pending trong Redis (3 phút)
2. Hiển thị QR code thanh toán
3. User thanh toán → Confirm payment → Lưu vào MongoDB với status "paid"
4. Hoặc hết 3 phút/user hủy → Tự động xóa khỏi Redis
5. Không có trạng thái "pending" trong MongoDB
"""
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from typing import List
import uuid

from app.models.booking import (
    AvailableSeatsRequest,
    AvailableSeatsResponse,
    BookingCreateRequest,
    BookingResponse,
    PaymentConfirmRequest,
    PaymentCancelRequest
)
from app.core.database import mongodb_client
from app.core.middleware import get_current_customer
from app.services.seat_holding_service import seat_holding_service
from app.services.vietqr_service import vietqr_service

router = APIRouter(prefix="/api/v1/bookings", tags=["Bookings"])


def generate_booking_id() -> str:
    """Tạo mã đặt vé"""
    import random, time
    return f"DV{int(time.time()*1000)%100000:05d}{random.randint(1000,9999)}"


@router.post("/seats/check", response_model=AvailableSeatsResponse)
async def check_available_seats(request: AvailableSeatsRequest):
    """
    Kiểm tra ghế khả dụng cho một chuyến xe
    Kết hợp cả MongoDB (ghế đã thanh toán) và Redis (ghế đang pending)
    """
    db = mongodb_client.get_db()
    
    # Lấy thông tin chuyến xe để biết tổng số ghế (collection: chuyenXe)
    tuyen = await db.chuyenXe.find_one({"maTuyenXe": request.maTuyen})
    if not tuyen:
        raise HTTPException(status_code=404, detail="Không tìm thấy tuyến xe")
    
    # Tính tổng số ghế từ array gheNgoi
    total_seats = len(tuyen.get("gheNgoi", []))
    if total_seats == 0:
        total_seats = 40  # Fallback nếu không có dữ liệu
    
    # 1. Lấy ghế đã thanh toán từ MongoDB (chỉ có status "paid") - collection: veXe
    bookings = await db.veXe.find({
        "maTuyenXe": request.maTuyen,
        "ngayDi": request.ngayDi,
        "gioDi": request.gioDi,
        "trangThai": "paid"
    }).to_list(1000)
    
    booked_seats = []
    for booking in bookings:
        booked_seats.extend(booking.get("soGheNgoi", []))
    
    # 2. Lấy ghế đang pending từ Redis
    pending_seats = await seat_holding_service.get_pending_seats(
        request.maTuyen,
        request.ngayDi,
        request.gioDi
    )
    
    # 3. Lấy ghế mà user này đang giữ
    my_pending = []
    if request.sessionId:
        my_booking = await seat_holding_service.get_my_pending_booking(
            request.maTuyen,
            request.ngayDi,
            request.gioDi,
            request.sessionId
        )
        if my_booking:
            my_pending = my_booking.get("seats", [])
    
    # 4. Ghế đang được người khác giữ = pending_seats - my_pending
    held_by_others = [s for s in pending_seats if s not in my_pending]
    
    # 5. Lấy danh sách tất cả ghế từ database
    all_seats = [seat["maGhe"] for seat in tuyen.get("gheNgoi", [])]
    
    # 6. Ghế còn trống = tất cả - đã thanh toán - đang giữ bởi người khác
    occupied = set(booked_seats + held_by_others)
    available = [s for s in all_seats if s not in occupied]
    
    return AvailableSeatsResponse(
        totalSeats=total_seats,
        bookedSeats=booked_seats,
        heldSeats=held_by_others,
        myHeldSeats=my_pending,
        availableSeats=available
    )


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(request: BookingCreateRequest, current_user: dict = Depends(get_current_customer)):
    """
    Tạo booking pending (chỉ lưu trong Redis, chưa lưu MongoDB)
    
    Workflow:
    1. Kiểm tra ghế có sẵn không
    2. Tính tổng tiền
    3. Lưu vào Redis với TTL 3 phút
    4. Tạo QR code thanh toán
    5. Trả về thông tin để user thanh toán
    """
    db = mongodb_client.get_db()
    customer_id = current_user.get("maKH")
    
    # Lấy thông tin chuyến xe để tính tiền (collection: chuyenXe)
    tuyen = await db.chuyenXe.find_one({"maTuyenXe": request.maTuyen})
    if not tuyen:
        raise HTTPException(status_code=404, detail="Không tìm thấy tuyến xe")
    
    gia_ve = tuyen.get("giaVe", 0)
    tong_tien = gia_ve * len(request.soGheNgoi)
    
    # Tạo mã đặt vé
    ma_dat_ve = generate_booking_id()
    
    # Tạo booking pending trong Redis (chưa lưu MongoDB)
    result = await seat_holding_service.create_pending_booking(
        ma_tuyen=request.maTuyen,
        ngay_di=request.ngayDi,
        gio_di=request.gioDi,
        ma_dat_ve=ma_dat_ve,
        seats=request.soGheNgoi,
        customer_id=customer_id,
        session_id=request.sessionId,
        amount=tong_tien
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    
    # Tạo QR code thanh toán
    qr_code = await vietqr_service.create_payment_qr(
        ma_dat_ve=ma_dat_ve,
        amount=tong_tien
    )
    
    return BookingResponse(
        maDatVe=ma_dat_ve,
        maTuyen=request.maTuyen,
        maKH=customer_id,
        ngayDi=request.ngayDi,
        gioDi=request.gioDi,
        soGheNgoi=request.soGheNgoi,
        tongTien=tong_tien,
        trangThai="pending",  # Chỉ trong response, không lưu MongoDB
        ngayDat=datetime.utcnow(),
        qrCode=qr_code,
        paymentInfo={
            "amount": tong_tien,
            "content": f"VOOBUS {ma_dat_ve}",
            "bankName": "MB Bank",
            "accountName": "VOOBUS",
            "expireAt": result.get("expire_at")
        }
    )


@router.post("/payment/confirm", response_model=BookingResponse)
async def confirm_payment(request: PaymentConfirmRequest, current_user: dict = Depends(get_current_customer)):
    """
    Xác nhận thanh toán thành công
    
    Workflow:
    1. Lấy thông tin booking từ Redis (bằng maDatVe)
    2. Kiểm tra quyền sở hữu
    3. Lưu vào MongoDB với trạng thái "paid"
    4. Xóa khỏi Redis
    """
    db = mongodb_client.get_db()
    customer_id = current_user.get("maKH")
    
    # Kiểm tra đã thanh toán chưa (trong MongoDB) - collection: veXe
    existing = await db.veXe.find_one({"maDatVe": request.maDatVe})
    if existing:
        if existing.get("maKH") != customer_id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền với booking này")
        # Đã thanh toán rồi, trả về thông tin
        existing.pop("_id", None)
        return BookingResponse.from_mongo(existing)
    
    # Tìm booking trong Redis
    booking_info = await seat_holding_service.get_booking_by_id(request.maDatVe)
    
    if not booking_info:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy booking hoặc đã hết thời gian thanh toán (3 phút)"
        )
    
    # Kiểm tra quyền
    if booking_info.get("customer_id") != customer_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền với booking này")
    
    # Lưu vào MongoDB - collection: veXe
    booking_doc = {
        "maDatVe": booking_info["maDatVe"],
        "maTuyenXe": booking_info["maTuyen"],  # Lưu maTuyenXe để khớp với collection chuyenXe
        "maKH": booking_info["customer_id"],
        "ngayDi": booking_info["ngayDi"],
        "gioDi": booking_info["gioDi"],
        "soGheNgoi": booking_info["seats"],
        "tongTien": booking_info["amount"],
        "trangThai": "paid",
        "ngayDat": datetime.utcnow(),
        "ngayThanhToan": datetime.utcnow(),
        "transactionId": request.transactionId
    }
    
    result = await db.veXe.insert_one(booking_doc)
    if not result.inserted_id:
        raise HTTPException(status_code=500, detail="Không thể lưu booking")
    
    # NOTE: Không cập nhật chuyenXe.gheNgoi vì nó là template chung cho tất cả các ngày
    # Trạng thái ghế theo ngày được xác định bởi collection veXe
    # Khi client query ghế, sẽ kiểm tra veXe để biết ghế nào đã đặt
    
    # Xóa khỏi Redis
    await seat_holding_service.confirm_booking(
        booking_info["maTuyen"],
        booking_info["ngayDi"],
        booking_info["gioDi"],
        booking_info["sessionId"]
    )
    
    booking_doc.pop("_id", None)
    return BookingResponse.from_mongo(booking_doc)


@router.post("/payment/cancel")
async def cancel_payment(request: PaymentCancelRequest, current_user: dict = Depends(get_current_customer)):
    """
    Hủy booking pending và giải phóng ghế
    """
    db = mongodb_client.get_db()
    customer_id = current_user.get("maKH")
    
    # Kiểm tra đã thanh toán chưa - collection: veXe
    existing = await db.veXe.find_one({"maDatVe": request.maDatVe})
    if existing:
        raise HTTPException(status_code=400, detail="Không thể hủy booking đã thanh toán")
    
    # Tìm booking trong Redis
    booking_info = await seat_holding_service.get_booking_by_id(request.maDatVe)
    
    if not booking_info:
        return {"success": True, "message": "Booking không tồn tại hoặc đã hết hạn"}
    
    # Kiểm tra quyền
    if booking_info.get("customer_id") != customer_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền với booking này")
    
    # Lấy sessionId từ request hoặc từ booking_info
    session_id = request.sessionId or booking_info.get("sessionId")
    if not session_id:
        raise HTTPException(status_code=400, detail="Không tìm thấy session ID")
    
    # Giải phóng booking từ Redis
    await seat_holding_service.release_pending_booking(
        booking_info["maTuyen"],
        booking_info["ngayDi"],
        booking_info["gioDi"],
        session_id
    )
    
    return {
        "success": True,
        "message": "Đã hủy booking và giải phóng ghế"
    }


@router.get("/my-bookings", response_model=List[BookingResponse])
async def get_my_bookings(current_user: dict = Depends(get_current_customer)):
    """
    Lấy danh sách booking của user hiện tại
    """
    db = mongodb_client.get_db()
    customer_id = current_user.get("maKH")
    
    # Lấy danh sách vé từ collection veXe
    bookings = await db.veXe.find({"maKH": customer_id}).sort("ngayDat", -1).to_list(100)
    
    result = []
    for b in bookings:
        b.pop("_id", None)
        result.append(BookingResponse.from_mongo(b))
    
    return result


# ========== TICKET CANCELLATION MODELS & ENDPOINTS ==========
from pydantic import BaseModel
from typing import Optional

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


@router.post("/cancel-request", response_model=CancelRequestResponse)
async def create_cancel_request(request: CancelRequest, current_user: dict = Depends(get_current_customer)):
    """
    Tạo yêu cầu hủy vé - sẽ được admin duyệt
    
    Workflow:
    1. Kiểm tra vé tồn tại và thuộc về user
    2. Kiểm tra vé chưa bị hủy
    3. Tạo yêu cầu hủy trong collection yeuCauHuyVe
    4. Cập nhật trạng thái vé thành "cancel_pending"
    """
    db = mongodb_client.get_db()
    customer_id = current_user.get("maKH")
    
    # Kiểm tra vé tồn tại
    booking = await db.veXe.find_one({"maDatVe": request.maDatVe})
    if not booking:
        raise HTTPException(status_code=404, detail="Không tìm thấy vé")
    
    # Kiểm tra quyền sở hữu
    if booking.get("maKH") != customer_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền hủy vé này")
    
    # Kiểm tra trạng thái vé
    current_status = booking.get("trangThai")
    if current_status == "cancelled":
        raise HTTPException(status_code=400, detail="Vé đã được hủy trước đó")
    if current_status == "cancel_pending":
        raise HTTPException(status_code=400, detail="Yêu cầu hủy vé đang chờ xử lý")
    if current_status == "refunded":
        raise HTTPException(status_code=400, detail="Vé đã được hoàn tiền")
    
    # Tạo mã yêu cầu hủy
    import time, random
    ma_yeu_cau = f"HV{int(time.time()*1000)%100000:05d}{random.randint(100,999)}"
    
    # Lưu yêu cầu hủy vào collection yeuCauHuyVe
    cancel_doc = {
        "maYeuCauHuy": ma_yeu_cau,
        "maDatVe": request.maDatVe,
        "maKH": customer_id,
        "tenKH": current_user.get("hoTen", ""),
        "emailKH": current_user.get("email", ""),
        "maTuyenXe": booking.get("maTuyenXe"),
        "ngayDi": booking.get("ngayDi"),
        "gioDi": booking.get("gioDi"),
        "soGheNgoi": booking.get("soGheNgoi"),
        "tongTien": booking.get("tongTien"),
        "lyDoHuy": request.lyDoHuy,
        "lyDoHuyText": request.lyDoHuyText,
        "ghiChu": request.ghiChu,
        "tienHoanDuKien": request.tienHoanDuKien,
        "phanTramHoan": request.phanTramHoan,
        "trangThai": "pending",  # pending | approved | rejected
        "ngayTao": datetime.utcnow(),
        "ngayXuLy": None,
        "nguoiXuLy": None,
        "lyDoTuChoi": None
    }
    
    await db.yeuCauHuyVe.insert_one(cancel_doc)
    
    # Cập nhật trạng thái vé thành "cancel_pending"
    await db.veXe.update_one(
        {"maDatVe": request.maDatVe},
        {"$set": {"trangThai": "cancel_pending"}}
    )
    
    return CancelRequestResponse(
        maYeuCauHuy=ma_yeu_cau,
        maDatVe=request.maDatVe,
        trangThai="pending",
        message="Yêu cầu hủy vé đã được gửi thành công. Vui lòng chờ admin duyệt."
    )


@router.get("/cancel-requests")
async def get_my_cancel_requests(current_user: dict = Depends(get_current_customer)):
    """
    Lấy danh sách yêu cầu hủy vé của user hiện tại
    """
    db = mongodb_client.get_db()
    customer_id = current_user.get("maKH")
    
    requests = await db.yeuCauHuyVe.find({"maKH": customer_id}).sort("ngayTao", -1).to_list(100)
    
    result = []
    for r in requests:
        r.pop("_id", None)
        result.append(r)
    
    return result
