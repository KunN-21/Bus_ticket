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
from app.utils import get_current_time_hcm
import json

router = APIRouter(prefix="/routes", tags=["Routes"])


@router.post("/build-indexes")
async def build_indexes():
    """
    Xây dựng các index để tăng tốc độ truy vấn
    """
    try:
        await redis_service.build_indexes()
        return {"message": "Indexes built successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xây dựng index: {str(e)}")


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


@router.get("/schedules/{maLC}")
async def get_schedule_by_id(maLC: str):
    """
    Lấy thông tin lịch chạy theo mã lịch chạy
    """
    try:
        schedule = await redis_service.get_lich_chay(maLC)
        
        if not schedule:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy lịch chạy: {maLC}")
        
        return schedule
    except HTTPException:
        raise
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
        
        # Validate ngày đi không được trong quá khứ
        today = get_current_time_hcm().date()
        if ngay_di.date() < today:
            raise HTTPException(status_code=400, detail="Ngày đi không được trong quá khứ")
        
        # Check cache first
        cache_key = f"search:{search.diemDi}:{search.diemDen}:{search.ngayDi}:{search.limit}"
        redis_client = await redis_service._get_client()
        try:
            cached_result = await redis_client.get(cache_key)
            if cached_result:
                # Redis returns bytes, decode and parse
                cached_dicts = json.loads(cached_result.decode('utf-8'))
                return [RouteSearchResponse(**item) for item in cached_dicts]
        except Exception:
            # If cache fails, continue without it
            pass
        
        # Tìm chuyến xe theo điểm đi/đến
        chuyen_xe_list = await redis_service.search_chuyen_xe(search.diemDi, search.diemDen)
        
        if not chuyen_xe_list:
            return []
        
        # Collect all maXe for batch fetch
        ma_xe_list = [chuyen_xe.get("maXe") for chuyen_xe in chuyen_xe_list if chuyen_xe.get("maXe")]
        xe_dict = {}
        if ma_xe_list:
            try:
                xe_list = await redis_service.get_multiple("xe", ma_xe_list)
                xe_dict = {ma_xe: xe for ma_xe, xe in zip(ma_xe_list, xe_list) if xe}
            except Exception:
                # If batch fetch fails, fetch individually
                xe_dict = {}
                for ma_xe in ma_xe_list:
                    try:
                        xe = await redis_service.get_xe(ma_xe)
                        if xe:
                            xe_dict[ma_xe] = xe
                    except Exception:
                        continue
        
        # Cache ghe_list per xe
        ghe_cache = {}
        
        result = []
        
        for chuyen_xe in chuyen_xe_list:
            maCX = chuyen_xe.get("maCX")
            maXe = chuyen_xe.get("maXe")
            
            # Lấy thông tin xe từ dict
            xe = xe_dict.get(maXe)
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
                ngayKhoiHanh = lich_chay.get("ngayKhoiHanh", "")
                
                # Filter theo ngày đi nếu có
                if ngayKhoiHanh and ngayKhoiHanh != search.ngayDi:
                    continue
                
                # Lấy tất cả ghế của xe (từ cache)
                if maXe not in ghe_cache:
                    ghe_cache[maXe] = await redis_service.get_ghe_by_xe(maXe)
                ghe_list = ghe_cache[maXe]
                total_seats = len(ghe_list) if ghe_list else xe.get("soGhe", 34)
                
                # Lấy ghế đã đặt cho lịch chạy + ngày này
                booked_seats = await redis_service.get_booked_seats_by_lich_chay(maLC)
                
                # Tính số ghế còn trống
                so_ghe_trong = total_seats - len(booked_seats)
                
                # Convert thoiGianChay sang string nếu là số
                thoi_gian_chay = lich_chay.get("thoiGianChay", chuyen_xe.get("thoiGianDuKien", ""))
                if isinstance(thoi_gian_chay, (int, float)):
                    # Chuyển từ phút sang định dạng "X giờ Y phút"
                    hours = int(thoi_gian_chay) // 60
                    mins = int(thoi_gian_chay) % 60
                    thoi_gian_chay = f"{hours} giờ" if mins == 0 else f"{hours} giờ {mins} phút"
                
                gia_ve = float(chuyen_xe.get("giaChuyenXe", chuyen_xe.get("giaVe", 0)))
                
                result.append(RouteSearchResponse(
                    maCX=maCX,
                    maLC=maLC,
                    maXe=maXe,
                    diemDi=chuyen_xe.get("diemDi", ""),
                    diemDen=chuyen_xe.get("diemDen", ""),
                    quangDuong=float(chuyen_xe.get("quangDuong", chuyen_xe.get("khoangCach", 0))),
                    giaChuyenXe=gia_ve,
                    thoiGianXuatBen=str(lich_chay.get("thoiGianXuatBen", lich_chay.get("gioKhoiHanh", ""))),
                    thoiGianDenDuKien=str(lich_chay.get("thoiGianDenDuKien", "")),
                    thoiGianChay=str(thoi_gian_chay),
                    loaiXe=xe.get("loaiXe", ""),
                    soGheTrong=so_ghe_trong,
                    soGheDaDat=len(booked_seats),
                    ngayKhoiHanh=ngayKhoiHanh,
                    gioKhoiHanh=lich_chay.get("gioKhoiHanh", ""),
                    # Alias fields cho frontend
                    maTuyenXe=maCX,
                    giaVe=gia_ve,
                    thoiGianQuangDuong=str(thoi_gian_chay)
                ))
                
                # Check limit
                if len(result) >= search.limit:
                    break
            
            if len(result) >= search.limit:
                break
        
        # Cache result for 5 minutes
        if result:
            try:
                result_dicts = [r.dict() for r in result]
                await redis_client.setex(cache_key, 300, json.dumps(result_dicts))
            except Exception:
                # If caching fails, just continue
                pass
        
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
async def get_route_detail(maCX: str, date: Optional[str] = None, sessionId: Optional[str] = None):
    """
    Lấy chi tiết chuyến xe và danh sách ghế
    
    Args:
        maCX: Mã chuyến xe
        date: Ngày đi (YYYY-MM-DD) để kiểm tra ghế đã đặt
        sessionId: Session ID của user để xác định ghế user đang giữ
    """
    try:
        chuyen_xe = await redis_service.get_chuyen_xe(maCX)
        
        if not chuyen_xe:
            raise HTTPException(status_code=404, detail="Không tìm thấy chuyến xe")
        
        maXe = chuyen_xe.get("maXe", "")
        
        # Lấy thông tin xe
        xe = await redis_service.get_xe(maXe)
        
        # Lấy danh sách lịch chạy
        lich_chay_list = await redis_service.get_lich_chay_by_chuyen(maCX)
        
        # Filter theo ngày nếu có
        if date:
            lich_chay_list = [lc for lc in lich_chay_list if lc.get("ngayKhoiHanh") == date]
        
        # Lấy danh sách ghế của xe
        ghe_list = await redis_service.get_ghe_by_xe(maXe)
        
        # Lấy ghế đã đặt và ghế đang pending nếu có date và lịch chạy
        booked_seats = []
        held_seats = []  # Ghế đang được người khác giữ
        my_held_seats = []  # Ghế tôi đang giữ
        
        if date and lich_chay_list:
            for lc in lich_chay_list:
                maLC = lc.get("maLC") or lc.get("maLich", "")
                if maLC:
                    # Lấy ghế đã thanh toán
                    seats = await redis_service.get_booked_seats_by_lich_chay(maLC)
                    booked_seats.extend(seats)
                    
                    # Lấy ghế đang pending (giữ chỗ)
                    pending_info = await redis_service.get_pending_seats_by_lich_chay(maLC, date)
                    if pending_info:
                        for session, seats_list in pending_info.items():
                            if sessionId and session == sessionId:
                                my_held_seats.extend(seats_list)
                            else:
                                held_seats.extend(seats_list)
        
        # Thêm trạng thái cho từng ghế
        ghe_with_status = []
        for ghe in ghe_list:
            maGhe = ghe.get("maGhe", "")
            
            # Xác định trạng thái ghế
            if maGhe in booked_seats:
                trang_thai = False  # Đã đặt
            elif maGhe in held_seats:
                trang_thai = False  # Đang được người khác giữ (không khả dụng)
            elif maGhe in my_held_seats:
                trang_thai = True  # Tôi đang giữ (vẫn có thể chọn)
            else:
                trang_thai = True  # Còn trống
            
            ghe_with_status.append({
                **ghe,
                "dadat": maGhe in booked_seats,
                "trangThai": trang_thai
            })
        
        # Tính giá vé
        gia_ve = float(chuyen_xe.get("giaChuyenXe", chuyen_xe.get("giaVe", 0)))
        
        # Convert thoiGianChay nếu là số
        thoi_gian_chay = chuyen_xe.get("thoiGianDuKien", "")
        if lich_chay_list:
            thoi_gian_chay = lich_chay_list[0].get("thoiGianChay", thoi_gian_chay)
            if isinstance(thoi_gian_chay, (int, float)):
                hours = int(thoi_gian_chay) // 60
                mins = int(thoi_gian_chay) % 60
                thoi_gian_chay = f"{hours} giờ" if mins == 0 else f"{hours} giờ {mins} phút"
        
        # Lấy maLC để trả về cho frontend
        maLC = lich_chay_list[0].get("maLC") or lich_chay_list[0].get("maLich", "") if lich_chay_list else ""
        
        return {
            **chuyen_xe,
            "maTuyenXe": maCX,  # Alias
            "maLC": maLC,  # Mã lịch chạy cho booking
            "giaVe": gia_ve,    # Alias
            "thoiGianQuangDuong": str(thoi_gian_chay),  # Alias
            "thoiGianXuatBen": lich_chay_list[0].get("gioKhoiHanh", "") if lich_chay_list else "",
            "thoiGianDenDuKien": lich_chay_list[0].get("thoiGianDenDuKien", "") if lich_chay_list else "",
            "xe": xe,
            "lichChay": lich_chay_list,
            "gheNgoi": ghe_with_status,
            "heldSeats": held_seats,  # Ghế đang được người khác giữ
            "myHeldSeats": my_held_seats,  # Ghế tôi đang giữ
            "soGheTrong": len([g for g in ghe_with_status if g["trangThai"]]),
            "soGheDaDat": len(booked_seats)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thông tin: {str(e)}")
