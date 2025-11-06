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
        
        # Lấy tất cả tuyến xe
        routes = await db.tuyenXe.find({}).to_list(length=None)
        
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
        
        # Lấy tất cả tuyến xe (chú ý: tên collection là 'tuyenXe' với chữ t thường)
        routes = await db.tuyenXe.find({}).to_list(length=None)
        
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

    Lưu ý: `TuyenXe` là template (lichChay='daily'). Khi người dùng tìm theo ngày,
    backend sẽ sinh datetime khởi hành kết hợp giữa `ngayDi` và `thoiGianXuatBen` (chuỗi 'HH:MM').
    Đồng thời kiểm tra các booking đã có trong `DatVe` cho ngày đó để tính ghế còn trống.
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

        routes = await db.tuyenXe.find(query).to_list(length=None)

        result = []
        for route in routes:
            # Build set of already booked seats for this route + date
            # Chỉ lấy các booking đã thanh toán (trangThai = "paid")
            booked_docs = await db.datVe.find({
                "maTuyenXe": route["maTuyenXe"], 
                "ngayDi": search.ngayDi,
                "trangThai": "paid"
            }).to_list(length=None)
            
            booked_set = set()
            for b in booked_docs:
                for s in b.get("soGheNgoi", []):
                    booked_set.add(s)

            total_seats = len(route.get("gheNgoi", []))
            so_ghe_trong = total_seats - len(booked_set)

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
    ghế với trạng thái tính theo các booking đã có cho ngày đó.
    """
    try:
        db = await get_database()

        route = await db.tuyenXe.find_one({"maTuyenXe": ma_tuyen_xe})

        if not route:
            raise HTTPException(status_code=404, detail="Không tìm thấy tuyến xe")

        # If date provided, combine to produce thoiGianKhoiHanh datetime and compute booked seats
        if date:
            try:
                # Validate date format
                datetime.strptime(date, "%Y-%m-%d")
            except Exception:
                raise HTTPException(status_code=400, detail="Date invalid, use YYYY-MM-DD")

            # Compute booked seats for this maTuyenXe + date
            # Chỉ lấy các booking đã thanh toán (trangThai = "paid")
            booked_docs = await db.datVe.find({
                "maTuyenXe": ma_tuyen_xe, 
                "ngayDi": date,
                "trangThai": "paid"
            }).to_list(length=None)
            
            booked_set = set()
            for b in booked_docs:
                for s in b.get("soGheNgoi", []):
                    booked_set.add(s)

            # Mark seats accordingly
            # trangThai: True = còn trống, False = đã có người đặt
            seats = []
            for s in route.get("gheNgoi", []):
                seat_code = s.get("maGhe")
                seats.append({
                    "maGhe": seat_code,
                    "trangThai": False if seat_code in booked_set else True
                })

            out = route.copy()
            out.pop("_id", None)
            out["gheNgoi"] = seats
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
# Logic cũ (SAI): Tạo pending bookings trực tiếp trong MongoDB collection DatVe
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

