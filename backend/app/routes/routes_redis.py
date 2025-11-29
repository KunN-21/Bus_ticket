"""
Routes API - Tìm kiếm và xem chi tiết chuyến xe

Sử dụng Redis để lưu trữ:
- chuyenXe:{maCX} - Thông tin chuyến xe
- lichChay:{maLC} - Lịch chạy
- xe:{maXe} - Thông tin xe
- gheNgoi:{maGhe} - Ghế ngồi
- veXe:{maVe} - Vé xe (để kiểm tra ghế đã đặt)
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime
from typing import List, Optional
from app.models.entities import (
    RouteSearchRequest, 
    RouteSearchResponse, 
    ChuyenXeResponse,
    ChuyenXeWithDetails,
    LichChayResponse,
    LichChayWithDetails,
    GheNgoiWithStatus
)
from app.services.redis_service import redis_service

router = APIRouter(prefix="/routes", tags=["Routes"])


@router.get("/debug/collections")
async def debug_collections():
    """
    Debug: Liệt kê các collections trong Redis
    """
    try:
        collections = ["chucVu", "nhanVien", "khachHang", "xe", "gheNgoi", "chuyenXe", "lichChay", "veXe", "hoaDon"]
        result = {
            "collections": collections,
            "counts": {}
        }
        
        for col_name in collections:
            count = await redis_service.count(col_name)
            result["counts"][col_name] = count
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi debug: {str(e)}")


@router.get("/cities")
async def get_cities():
    """
    Lấy danh sách các thành phố có tuyến xe (điểm đi và điểm đến)
    """
    try:
        # Lấy tất cả chuyến xe
        routes = await redis_service.get_all_chuyen_xe()
        
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


@router.get("/all")
async def get_all_routes():
    """
    Lấy toàn bộ chuyến xe để hiển thị lịch trình
    """
    try:
        routes = await redis_service.get_all_chuyen_xe()
        
        result = []
        for route in routes:
            # Lấy thông tin xe
            xe = await redis_service.get_xe(route.get("maXe", ""))
            
            result.append({
                **route,
                "xe": xe
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách chuyến xe: {str(e)}")


@router.get("/schedules")
async def get_all_schedules():
    """
    Lấy toàn bộ lịch chạy
    """
    try:
        schedules = await redis_service.get_all_lich_chay()
        
        result = []
        for schedule in schedules:
            # Lấy thông tin chuyến xe
            chuyen_xe = await redis_service.get_chuyen_xe(schedule.get("maCX", ""))
            
            # Lấy thông tin xe
            xe = await redis_service.get_xe(schedule.get("maXe", ""))
            
            result.append({
                **schedule,
                "chuyenXe": chuyen_xe,
                "xe": xe
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy lịch chạy: {str(e)}")


@router.post("/search", response_model=List[RouteSearchResponse])
async def search_routes(search: RouteSearchRequest):
    """
    Tìm kiếm tuyến xe theo điểm đi, điểm đến và ngày đi.
    
    Workflow:
    1. Tìm chuyến xe theo điểm đi/đến
    2. Lấy lịch chạy của các chuyến xe đó
    3. Kiểm tra ghế còn trống cho ngày được chọn
    """
    try:
        # Parse ngày đi
        try:
            ngay_di = datetime.strptime(search.ngayDi, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Ngày đi không hợp lệ. Định dạng: YYYY-MM-DD")
        
        # Tìm chuyến xe theo điểm đi/đến
        chuyen_xe_list = await redis_service.search_chuyen_xe(search.diemDi, search.diemDen)
        
        if not chuyen_xe_list:
            return []
        
        result = []
        
        for chuyen_xe in chuyen_xe_list:
            maCX = chuyen_xe.get("maCX")
            maXe = chuyen_xe.get("maXe")
            
            # Lấy thông tin xe
            xe = await redis_service.get_xe(maXe)
            if not xe:
                continue
            
            # Lấy danh sách lịch chạy của chuyến xe này
            lich_chay_list = await redis_service.get_lich_chay_by_chuyen(maCX)
            
            # Nếu không có lịch chạy, tạo một lịch chạy mặc định từ chuyến xe
            if not lich_chay_list:
                # Tạo lịch chạy ảo cho ngày được search
                lich_chay_list = [{
                    "maLC": f"LC_{maCX}_{search.ngayDi}_0600",
                    "maCX": maCX,
                    "maXe": maXe,
                    "ngayKhoiHanh": search.ngayDi,
                    "gioKhoiHanh": "06:00",
                    "thoiGianXuatBen": "06:00",
                    "thoiGianDenDuKien": "",
                    "thoiGianChay": chuyen_xe.get("thoiGianDuKien", ""),
                }]
            
            for lich_chay in lich_chay_list:
                maLC = lich_chay.get("maLC") or lich_chay.get("maLich", "")
                
                # Lấy tất cả ghế của xe
                ghe_list = await redis_service.get_ghe_by_xe(maXe)
                total_seats = len(ghe_list) if ghe_list else xe.get("soChoNgoi", xe.get("soGhe", 34))
                
                # Lấy ghế đã đặt cho lịch chạy + ngày này
                # Chỉ tính vé có trạng thái "paid" hoặc "confirmed"
                booked_seats = await redis_service.get_booked_seats_by_lich_chay(maLC)
                
                # Tính số ghế còn trống
                so_ghe_trong = total_seats - len(booked_seats)
                
                result.append(RouteSearchResponse(
                    maCX=maCX,
                    maLC=maLC,
                    maXe=maXe,
                    diemDi=chuyen_xe.get("diemDi", ""),
                    diemDen=chuyen_xe.get("diemDen", ""),
                    quangDuong=chuyen_xe.get("quangDuong", chuyen_xe.get("khoangCach", 0)),
                    giaChuyenXe=chuyen_xe.get("giaChuyenXe", chuyen_xe.get("giaVe", 0)),
                    thoiGianXuatBen=lich_chay.get("thoiGianXuatBen", lich_chay.get("gioKhoiHanh", "")),
                    thoiGianDenDuKien=lich_chay.get("thoiGianDenDuKien", ""),
                    thoiGianChay=lich_chay.get("thoiGianChay", chuyen_xe.get("thoiGianDuKien", "")),
                    loaiXe=xe.get("loaiXe", ""),
                    soGheTrong=so_ghe_trong,
                    soGheDaDat=len(booked_seats)
                ))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tìm kiếm: {str(e)}")


@router.get("/schedule/{maLC}")
async def get_schedule_detail(maLC: str, date: Optional[str] = None):
    """
    Lấy chi tiết lịch chạy và danh sách ghế
    
    Args:
        maLC: Mã lịch chạy
        date: Ngày đi (YYYY-MM-DD) để kiểm tra ghế đã đặt
    """
    try:
        # Lấy thông tin lịch chạy
        lich_chay = await redis_service.get_lich_chay(maLC)
        if not lich_chay:
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch chạy")
        
        # Lấy thông tin chuyến xe
        chuyen_xe = await redis_service.get_chuyen_xe(lich_chay.get("maCX", ""))
        
        # Lấy thông tin xe
        maXe = lich_chay.get("maXe", "")
        xe = await redis_service.get_xe(maXe)
        
        # Lấy danh sách ghế
        ghe_list = await redis_service.get_ghe_by_xe(maXe)
        
        # Nếu có ngày, kiểm tra ghế đã đặt
        booked_seats = []
        if date:
            try:
                datetime.strptime(date, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(status_code=400, detail="Ngày không hợp lệ. Định dạng: YYYY-MM-DD")
            
            booked_seats = await redis_service.get_booked_seats_by_lich_chay(maLC)
        
        # Tạo danh sách ghế với trạng thái
        seats_with_status = []
        for ghe in ghe_list:
            maGhe = ghe.get("maGhe", "")
            seats_with_status.append(GheNgoiWithStatus(
                maGhe=maGhe,
                tenGhe=ghe.get("tenGhe", maGhe),
                trangThai=maGhe not in booked_seats  # True = còn trống
            ))
        
        return {
            **lich_chay,
            "chuyenXe": chuyen_xe,
            "xe": xe,
            "danhSachGhe": seats_with_status,
            "soGheTrong": len([s for s in seats_with_status if s.trangThai]),
            "soGheDaDat": len([s for s in seats_with_status if not s.trangThai])
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thông tin: {str(e)}")


@router.get("/{maCX}")
async def get_route_detail(maCX: str):
    """
    Lấy chi tiết chuyến xe
    """
    try:
        chuyen_xe = await redis_service.get_chuyen_xe(maCX)
        
        if not chuyen_xe:
            raise HTTPException(status_code=404, detail="Không tìm thấy chuyến xe")
        
        # Lấy thông tin xe
        xe = await redis_service.get_xe(chuyen_xe.get("maXe", ""))
        
        # Lấy danh sách lịch chạy
        lich_chay_list = await redis_service.get_lich_chay_by_chuyen(maCX)
        
        # Lấy danh sách ghế của xe
        ghe_list = await redis_service.get_ghe_by_xe(chuyen_xe.get("maXe", ""))
        
        return {
            **chuyen_xe,
            "xe": xe,
            "lichChay": lich_chay_list,
            "gheNgoi": ghe_list
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thông tin: {str(e)}")
