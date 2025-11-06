from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from typing import List, Optional
from ..models.routes import (
    RouteSearchRequest, 
    RouteSearchResponse, 
    BookingRequest, 
    BookingResponse,
    BusRoute,
    HoaDonRequest,
    HoaDonResponse
)
from ..core.database import get_database
from ..core.middleware import get_current_customer

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
            booked_docs = await db.DatVe.find({"maTuyenXe": route["maTuyenXe"], "ngayDi": search.ngayDi}).to_list(length=None)
            booked_set = set()
            for b in booked_docs:
                for s in b.get("gheNgoi", []):
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
                ngay_di = datetime.strptime(date, "%Y-%m-%d")
            except Exception:
                raise HTTPException(status_code=400, detail="Date invalid, use YYYY-MM-DD")

            # compute booked seats for this maTuyenXe + date
            booked_docs = await db.DatVe.find({"maTuyenXe": ma_tuyen_xe, "ngayDi": date}).to_list(length=None)
            booked_set = set()
            for b in booked_docs:
                for s in b.get("gheNgoi", []):
                    booked_set.add(s)

            # mark seats accordingly
            seats = []
            for s in route.get("gheNgoi", []):
                seats.append({
                    "maGhe": s.get("maGhe"),
                    "trangThai": True if s.get("maGhe") in booked_set else False
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


@router.post("/book", response_model=BookingResponse)
async def book_ticket(booking: BookingRequest, current_user: dict = Depends(get_current_customer)):
    """
    Đặt vé xe - requires authentication
    """
    try:
        db = await get_database()
        
        # 1. Kiểm tra tuyến xe tồn tại
        route = await db.tuyenXe.find_one({"maTuyenXe": booking.maTuyenXe})
        if not route:
            raise HTTPException(status_code=404, detail="Không tìm thấy tuyến xe")
        
        # 2. Kiểm tra ghế có còn trống cho ngày đặt (booking.ngayDi)
        if not booking.ngayDi:
            raise HTTPException(status_code=400, detail="Bạn phải cung cấp ngày đi (ngayDi)")

        # build set of already booked seats for that route + date
        booked_docs = await db.DatVe.find({"maTuyenXe": booking.maTuyenXe, "ngayDi": booking.ngayDi}).to_list(length=None)
        booked_set = set()
        for b in booked_docs:
            for s in b.get("gheNgoi", []):
                booked_set.add(s)

        # validate requested seats exist in template and are not in booked_set
        template_seats = {s["maGhe"] for s in route.get("gheNgoi", [])}
        for ma_ghe in booking.gheNgoi:
            if ma_ghe not in template_seats:
                raise HTTPException(status_code=400, detail=f"Ghế {ma_ghe} không tồn tại")
            if ma_ghe in booked_set:
                raise HTTPException(status_code=400, detail=f"Ghế {ma_ghe} đã được đặt cho ngày này")
        
        # 3. Tạo mã đặt vé
        last_booking = await db.DatVe.find_one(sort=[("maDatVe", -1)])
        if last_booking and last_booking.get("maDatVe"):
            last_num = int(last_booking["maDatVe"][2:])
            ma_dat_ve = f"DV{str(last_num + 1).zfill(5)}"
        else:
            ma_dat_ve = "DV00001"
        
        # 4. Tạo booking document
        booking_doc = {
            "maDatVe": ma_dat_ve,
            "maTuyenXe": booking.maTuyenXe,
            "maKH": current_user["maKH"],
            "gheNgoi": booking.gheNgoi,
            "tongTien": booking.tongTien,
            "trangThai": "pending",
            "ngayDat": datetime.now(),
            "ngayDi": booking.ngayDi
        }
        
        # 5. Insert booking
        await db.DatVe.insert_one(booking_doc)
        
        # Note: do NOT mutate the template `TuyenXe` seats. Seat bookings are tracked in `DatVe` per date.
        
        return BookingResponse(
            maDatVe=ma_dat_ve,
            maTuyenXe=booking.maTuyenXe,
            maKH=current_user["maKH"],
            gheNgoi=booking.gheNgoi,
            tongTien=booking.tongTien,
            trangThai="pending",
            ngayDat=booking_doc["ngayDat"],
            ngayDi=booking.ngayDi
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi đặt vé: {str(e)}")


@router.get("/bookings/my", response_model=List[BookingResponse])
async def get_my_bookings(current_user: dict = Depends(get_current_customer)):
    """
    Lấy danh sách vé đã đặt của user hiện tại
    """
    try:
        db = await get_database()
        
        bookings = await db.DatVe.find({
            "maKH": current_user["maKH"]
        }).sort("ngayDat", -1).to_list(length=None)
        
        result = []
        for booking in bookings:
            result.append(BookingResponse(
                maDatVe=booking["maDatVe"],
                maTuyenXe=booking["maTuyenXe"],
                maKH=booking["maKH"],
                gheNgoi=booking["gheNgoi"],
                tongTien=booking["tongTien"],
                trangThai=booking["trangThai"],
                ngayDat=booking["ngayDat"],
                ngayDi=booking.get("ngayDi")
            ))
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy lịch sử: {str(e)}")


@router.post("/invoice/create", response_model=HoaDonResponse)
async def create_invoice(hoadon: HoaDonRequest, current_user: dict = Depends(get_current_customer)):
    """
    Tạo hóa đơn sau khi thanh toán thành công
    """
    try:
        db = await get_database()
        
        # Verify customer
        if hoadon.maKH != current_user["maKH"]:
            raise HTTPException(status_code=403, detail="Không có quyền tạo hóa đơn cho khách hàng khác")
        
        # Tạo mã hóa đơn
        last_invoice = await db.hoaDon.find_one(sort=[("maHoaDon", -1)])
        if last_invoice and last_invoice.get("maHoaDon"):
            try:
                last_num = int(last_invoice["maHoaDon"][2:])
                ma_hoa_don = f"HD{str(last_num + 1).zfill(5)}"
            except:
                ma_hoa_don = "HD00001"
        else:
            ma_hoa_don = "HD00001"
        
        # Tạo hóa đơn document
        ngay_lap = datetime.now()
        invoice_doc = {
            "maHoaDon": ma_hoa_don,
            "ngayLap": ngay_lap,
            "khachhang": {
                "hoTen": hoadon.hoTen,
                "maKH": hoadon.maKH
            },
            "phuongThucThanhToan": hoadon.phuongThucThanhToan,
            "tongTien": hoadon.tongTien,
            "tuyenXe": {
                "maTuyenXe": hoadon.maTuyenXe,
                "diemDi": hoadon.diemDi,
                "diemDen": hoadon.diemDen
            },
            "donGia": hoadon.donGia,
            "soVeMua": hoadon.soVeMua,
            "gheNgoi": hoadon.gheNgoi,
            "ngayDi": hoadon.ngayDi
        }
        
        # Lưu vào database
        await db.hoaDon.insert_one(invoice_doc)
        
        return HoaDonResponse(
            maHoaDon=ma_hoa_don,
            ngayLap=ngay_lap,
            khachhang=invoice_doc["khachhang"],
            phuongThucThanhToan=hoadon.phuongThucThanhToan,
            tongTien=hoadon.tongTien,
            tuyenXe=invoice_doc["tuyenXe"],
            donGia=hoadon.donGia,
            soVeMua=hoadon.soVeMua,
            gheNgoi=hoadon.gheNgoi
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo hóa đơn: {str(e)}")

