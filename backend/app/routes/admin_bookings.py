"""
Admin Booking Routes - Quản lý vé và yêu cầu hủy vé (Admin only)
"""
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import mongodb_client
from app.core.middleware import get_current_employee

router = APIRouter(prefix="/api/v1/admin/bookings", tags=["Admin - Bookings"])


# ========== MODELS ==========
class CancelRequestUpdate(BaseModel):
    """Request để duyệt/từ chối yêu cầu hủy vé"""
    action: str  # "approve" | "reject"
    lyDoTuChoi: Optional[str] = None  # Bắt buộc nếu reject


class BookingStats(BaseModel):
    """Thống kê vé"""
    total_bookings: int
    paid_bookings: int
    cancelled_bookings: int
    cancel_pending: int
    total_revenue: float


# ========== ENDPOINTS ==========

@router.get("/all")
async def get_all_bookings(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy tất cả booking (Admin only)
    """
    db = mongodb_client.get_db()
    
    # Build query
    query = {}
    if status:
        query["trangThai"] = status
    
    # Pagination
    skip = (page - 1) * limit
    
    # Get bookings with customer info
    bookings = await db.veXe.find(query).sort("ngayDat", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.veXe.count_documents(query)
    
    result = []
    for b in bookings:
        b.pop("_id", None)
        
        # Get customer info
        customer = await db.khachhang.find_one({"maKH": b.get("maKH")})
        if customer:
            b["customerInfo"] = {
                "hoTen": customer.get("hoTen"),
                "email": customer.get("email"),
                "SDT": customer.get("SDT")
            }
        
        # Get route info
        route = await db.chuyenXe.find_one({"maTuyenXe": b.get("maTuyenXe")})
        if route:
            b["routeInfo"] = {
                "diemDi": route.get("diemDi"),
                "diemDen": route.get("diemDen")
            }
        
        result.append(b)
    
    return {
        "bookings": result,
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": (total + limit - 1) // limit
    }


@router.get("/stats")
async def get_booking_stats(current_user: dict = Depends(get_current_employee)):
    """
    Lấy thống kê vé (Admin only)
    """
    db = mongodb_client.get_db()
    
    total = await db.veXe.count_documents({})
    paid = await db.veXe.count_documents({"trangThai": "paid"})
    cancelled = await db.veXe.count_documents({"trangThai": {"$in": ["cancelled", "refunded"]}})
    cancel_pending = await db.veXe.count_documents({"trangThai": "cancel_pending"})
    
    # Calculate total revenue from paid bookings
    pipeline = [
        {"$match": {"trangThai": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$tongTien"}}}
    ]
    revenue_result = await db.veXe.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return BookingStats(
        total_bookings=total,
        paid_bookings=paid,
        cancelled_bookings=cancelled,
        cancel_pending=cancel_pending,
        total_revenue=total_revenue
    )


@router.get("/cancel-requests")
async def get_cancel_requests(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy danh sách yêu cầu hủy vé (Admin only)
    """
    db = mongodb_client.get_db()
    
    # Build query
    query = {}
    if status:
        query["trangThai"] = status
    
    # Pagination
    skip = (page - 1) * limit
    
    # Get cancel requests
    requests = await db.yeuCauHuyVe.find(query).sort("ngayTao", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.yeuCauHuyVe.count_documents(query)
    
    # Get pending count for badge
    pending_count = await db.yeuCauHuyVe.count_documents({"trangThai": "pending"})
    
    result = []
    for r in requests:
        r.pop("_id", None)
        
        # Get route info
        route = await db.chuyenXe.find_one({"maTuyenXe": r.get("maTuyenXe")})
        if route:
            r["routeInfo"] = {
                "diemDi": route.get("diemDi"),
                "diemDen": route.get("diemDen")
            }
        
        result.append(r)
    
    return {
        "requests": result,
        "total": total,
        "pending_count": pending_count,
        "page": page,
        "limit": limit,
        "totalPages": (total + limit - 1) // limit
    }


@router.get("/cancel-requests/{ma_yeu_cau}")
async def get_cancel_request_detail(
    ma_yeu_cau: str,
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy chi tiết yêu cầu hủy vé (Admin only)
    """
    db = mongodb_client.get_db()
    
    request = await db.yeuCauHuyVe.find_one({"maYeuCauHuy": ma_yeu_cau})
    if not request:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu hủy")
    
    request.pop("_id", None)
    
    # Get route info
    route = await db.chuyenXe.find_one({"maTuyenXe": request.get("maTuyenXe")})
    if route:
        request["routeInfo"] = {
            "diemDi": route.get("diemDi"),
            "diemDen": route.get("diemDen"),
            "loaiXe": route.get("xe", {}).get("loaiXe", "")
        }
    
    # Get booking info
    booking = await db.veXe.find_one({"maDatVe": request.get("maDatVe")})
    if booking:
        booking.pop("_id", None)
        request["bookingInfo"] = booking
    
    return request


@router.put("/cancel-requests/{ma_yeu_cau}")
async def process_cancel_request(
    ma_yeu_cau: str,
    update: CancelRequestUpdate,
    current_user: dict = Depends(get_current_employee)
):
    """
    Duyệt hoặc từ chối yêu cầu hủy vé (Admin only)
    
    Workflow:
    1. Kiểm tra yêu cầu hủy tồn tại và đang pending
    2. Nếu approve: cập nhật trạng thái vé thành "cancelled", giải phóng ghế
    3. Nếu reject: cập nhật trạng thái vé về "paid"
    4. Cập nhật yêu cầu hủy với người xử lý và thời gian
    """
    db = mongodb_client.get_db()
    employee_id = current_user.get("maNV")
    employee_name = current_user.get("hoTen", "Admin")
    
    # Kiểm tra yêu cầu hủy
    cancel_request = await db.yeuCauHuyVe.find_one({"maYeuCauHuy": ma_yeu_cau})
    if not cancel_request:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu hủy")
    
    if cancel_request.get("trangThai") != "pending":
        raise HTTPException(status_code=400, detail="Yêu cầu đã được xử lý trước đó")
    
    ma_dat_ve = cancel_request.get("maDatVe")
    
    if update.action == "approve":
        # Duyệt yêu cầu hủy
        
        # Cập nhật trạng thái vé thành "cancelled"
        await db.veXe.update_one(
            {"maDatVe": ma_dat_ve},
            {"$set": {
                "trangThai": "cancelled",
                "ngayHuy": datetime.utcnow(),
                "nguoiDuyetHuy": employee_name,
                "tienHoan": cancel_request.get("tienHoanDuKien", 0)
            }}
        )
        
        # Cập nhật yêu cầu hủy
        await db.yeuCauHuyVe.update_one(
            {"maYeuCauHuy": ma_yeu_cau},
            {"$set": {
                "trangThai": "approved",
                "ngayXuLy": datetime.utcnow(),
                "nguoiXuLy": employee_name,
                "maNVXuLy": employee_id
            }}
        )
        
        return {
            "success": True,
            "message": f"Đã duyệt yêu cầu hủy vé {ma_dat_ve}. Tiền hoàn: {cancel_request.get('tienHoanDuKien', 0):,.0f}đ"
        }
    
    elif update.action == "reject":
        if not update.lyDoTuChoi:
            raise HTTPException(status_code=400, detail="Vui lòng nhập lý do từ chối")
        
        # Từ chối yêu cầu hủy - đưa vé về trạng thái "paid"
        await db.veXe.update_one(
            {"maDatVe": ma_dat_ve},
            {"$set": {"trangThai": "paid"}}
        )
        
        # Cập nhật yêu cầu hủy
        await db.yeuCauHuyVe.update_one(
            {"maYeuCauHuy": ma_yeu_cau},
            {"$set": {
                "trangThai": "rejected",
                "ngayXuLy": datetime.utcnow(),
                "nguoiXuLy": employee_name,
                "maNVXuLy": employee_id,
                "lyDoTuChoi": update.lyDoTuChoi
            }}
        )
        
        return {
            "success": True,
            "message": f"Đã từ chối yêu cầu hủy vé {ma_dat_ve}. Lý do: {update.lyDoTuChoi}"
        }
    
    else:
        raise HTTPException(status_code=400, detail="Action không hợp lệ. Sử dụng 'approve' hoặc 'reject'")


@router.get("/cancel-requests/pending/count")
async def get_pending_cancel_count(current_user: dict = Depends(get_current_employee)):
    """
    Lấy số lượng yêu cầu hủy đang chờ xử lý (cho badge notification)
    """
    db = mongodb_client.get_db()
    count = await db.yeuCauHuyVe.count_documents({"trangThai": "pending"})
    return {"count": count}
