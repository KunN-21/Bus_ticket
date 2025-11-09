from fastapi import APIRouter, HTTPException
from datetime import datetime
from typing import List, Optional
from ..models.routes import (
    RouteSearchRequest, 
    RouteSearchResponse, 
    BusRoute
)
from ..core.database import get_database

router = APIRouter(prefix="/routes", tags=["routes"])

@router.get("/cities")
async def get_cities():
    """
    Lấy danh sách các thành phố có tuyến xe (điểm đi và điểm đến)
    """
    try:
        db = await get_database()
        
        # Lấy tất cả chuyến xe
        routes = await db.chuyenXe.find({}).to_list(length=None)
        
        # Lấy tất cả điểm đi và điểm đến unique
        cities = set()
        for route in routes:
            if route.get('diemDi'):
                cities.add(route['diemDi'])
            if route.get('diemDen'):
                cities.add(route['diemDen'])
        
        # Sắp xếp và trả về
        return sorted(list(cities))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách thành phố: {str(e)}")

@router.get("/all", response_model=List[BusRoute])
async def get_all_routes():
    """
    Lấy toàn bộ tuyến xe (templates) để hiển thị lịch trình
    """
    try:
        db = await get_database()
        
        # Lấy tất cả chuyến xe (chú ý: tên collection là 'chuyenXe')
        routes = await db.chuyenXe.find({}).to_list(length=None)
        
        result = []
        for route in routes:
            route.pop("_id", None)
            result.append(route)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách tuyến xe: {str(e)}")

@router.post("/search", response_model=List[RouteSearchResponse])
async def search_routes(search: RouteSearchRequest):
    """
    Tìm kiếm tuyến xe theo điểm đi, điểm đến và ngày đi.

    Lưu ý: `ChuyenXe` (trước là TuyenXe) là template (lichChay='daily'). Khi người dùng tìm theo ngày,
    backend sẽ sinh datetime khởi hành kết hợp giữa `ngayDi` và `thoiGianXuatBen` (chuỗi 'HH:MM').
    Đồng thời kiểm tra các booking đã có trong `veXe` cho ngày đó để tính ghế còn trống.
    """
    try:
        db = await get_database()

        # Parse ngày đi (date only)
        ngay_di = datetime.strptime(search.ngayDi, "%Y-%m-%d")

        # Tìm các tuyến template phù hợp (ví dụ lichChay = 'daily')
        query = {
            "diemDi": search.diemDi,
            "diemDen": search.diemDen,
            "lichChay": {"$in": ["daily", None, ""]}
        }

        routes = await db.chuyenXe.find(query).to_list(length=None)

        result = []
        for route in routes:
            # Đếm số ghế trống từ chuyenXe.gheNgoi[].trangThai
            # trangThai: True = còn trống, False = đã đặt
            ghe_ngoi = route.get("gheNgoi", [])
            total_seats = len(ghe_ngoi)
            so_ghe_trong = sum(1 for seat in ghe_ngoi if seat.get("trangThai", True))

            gia_ve = route.get("giaVe", route.get("quangDuong", 0) * 1000)

            result.append(RouteSearchResponse(
                maTuyenXe=route["maTuyenXe"],
                diemDi=route["diemDi"],
                diemDen=route["diemDen"],
                quangDuong=route.get("quangDuong", 0),
                thoiGianXuatBen=route.get("thoiGianXuatBen"),
                thoiGianDenDuKien=route.get("thoiGianDenDuKien"),
                thoiGianQuangDuong=route.get("thoiGianQuangDuong"),
                loaiXe=route.get("xe", {}).get("loaiXe", ""),
                soGheTrong=so_ghe_trong,
                giaVe=gia_ve,
                lichChay=route.get("lichChay")
            ))

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tìm kiếm: {str(e)}")


@router.get("/{ma_tuyen_xe}", response_model=BusRoute)
async def get_route_detail(ma_tuyen_xe: str, date: Optional[str] = None):
    """
    Lấy chi tiết tuyến xe (template). Nếu truyền `date=YYYY-MM-DD` sẽ trả thông tin
    ghế với trạng thái lưu trực tiếp trong chuyenXe.gheNgoi[].trangThai
    """
    try:
        db = await get_database()

        route = await db.chuyenXe.find_one({"maTuyenXe": ma_tuyen_xe})

        if not route:
            raise HTTPException(status_code=404, detail="Không tìm thấy tuyến xe")

        # If date provided, return seat status directly from chuyenXe.gheNgoi
        # (trangThai is already stored in the collection)
        if date:
            try:
                # Validate date format
                datetime.strptime(date, "%Y-%m-%d")
            except Exception:
                raise HTTPException(status_code=400, detail="Date invalid, use YYYY-MM-DD")

            # Trạng thái ghế được lưu trực tiếp trong chuyenXe.gheNgoi[]
            # trangThai: True = còn trống, False = đã có người đặt
            # Chỉ cần trả về gheNgoi từ collection
            out = route.copy()
            out.pop("_id", None)
            return out

        # No date: return template as-is (don't mutate DB)
        route.pop("_id", None)
        return route
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thông tin: {str(e)}")


# ========================================
# OLD BOOKING ENDPOINTS REMOVED
# ========================================
# Logic cũ (SAI): Tạo pending bookings trực tiếp trong MongoDB collection veXe
# Logic mới (ĐÚNG): 
#   1. Pending bookings → Lưu Redis (TTL 3 phút) - Xem /api/v1/bookings
#   2. Confirmed bookings → Lưu MongoDB sau khi thanh toán
# 
# Các endpoint cũ đã XÓA:
#   - POST /routes/book
#   - GET /routes/bookings/my  
#   - POST /routes/invoice/create
#
# Sử dụng thay thế: /api/v1/bookings/* (file: app/routes/bookings.py)
# ========================================

