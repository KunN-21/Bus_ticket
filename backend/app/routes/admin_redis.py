"""
Admin Routes - Quản lý khách hàng, nhân viên, xe sử dụng Redis
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel, EmailStr

from app.services.redis_service import redis_service
from app.core.middleware import get_current_employee, get_current_admin

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


# ========== MODELS ==========

class CustomerCreate(BaseModel):
    hoTen: str
    email: EmailStr
    SDT: str
    CCCD: str
    diaChi: str
    password: str


class CustomerUpdate(BaseModel):
    hoTen: Optional[str] = None
    email: Optional[EmailStr] = None
    SDT: Optional[str] = None
    CCCD: Optional[str] = None
    diaChi: Optional[str] = None


class EmployeeCreate(BaseModel):
    hoTen: str
    email: EmailStr
    SDT: str
    CCCD: str
    diaChi: str
    password: str
    maCV: str


class EmployeeUpdate(BaseModel):
    hoTen: Optional[str] = None
    email: Optional[EmailStr] = None
    SDT: Optional[str] = None
    CCCD: Optional[str] = None
    diaChi: Optional[str] = None
    maCV: Optional[str] = None


# ========== CUSTOMERS ENDPOINTS ==========

@router.get("/customers")
async def get_all_customers(current_user: dict = Depends(get_current_employee)):
    """
    Lấy danh sách tất cả khách hàng
    """
    try:
        customers = await redis_service.get_all("khachHang")
        
        # Remove passwords from response
        result = []
        for c in customers:
            customer_data = {k: v for k, v in c.items() if k != "password"}
            result.append(customer_data)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách khách hàng: {str(e)}")


@router.get("/customers/stats/overview")
async def get_customers_stats(current_user: dict = Depends(get_current_employee)):
    """
    Lấy thống kê khách hàng
    """
    try:
        customers = await redis_service.get_all("khachHang")
        
        # Count new customers this month
        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        new_this_month = 0
        for c in customers:
            created_at = c.get("ngayTao", c.get("createdAt", ""))
            if created_at:
                try:
                    created_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    if created_date >= month_start:
                        new_this_month += 1
                except:
                    pass
        
        return {
            "total_customers": len(customers),
            "new_this_month": new_this_month,
            "active_customers": len(customers)  # Giả định tất cả đều active
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thống kê: {str(e)}")


@router.get("/customers/{maKH}")
async def get_customer_by_id(maKH: str, current_user: dict = Depends(get_current_employee)):
    """
    Lấy thông tin chi tiết khách hàng
    """
    try:
        customer = await redis_service.get_khach_hang(maKH)
        
        if not customer:
            raise HTTPException(status_code=404, detail="Không tìm thấy khách hàng")
        
        # Remove password
        customer_data = {k: v for k, v in customer.items() if k != "password"}
        return customer_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.post("/customers")
async def create_customer(data: CustomerCreate, current_user: dict = Depends(get_current_admin)):
    """
    Tạo khách hàng mới (chỉ admin)
    """
    try:
        # Check email exists
        existing = await redis_service.get_khach_hang_by_email(data.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email đã được sử dụng")
        
        # Generate new ID
        maKH = await redis_service.generate_id("khachHang", "KH")
        
        # Hash password
        import bcrypt
        hashed_password = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create customer
        customer_data = {
            "maKH": maKH,
            "hoTen": data.hoTen,
            "email": data.email,
            "SDT": data.SDT,
            "CCCD": data.CCCD,
            "diaChi": data.diaChi,
            "password": hashed_password,
            "ngayTao": datetime.now().isoformat()
        }
        
        await redis_service.create("khachHang", "maKH", customer_data)
        
        # Remove password from response
        return {k: v for k, v in customer_data.items() if k != "password"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo khách hàng: {str(e)}")


@router.put("/customers/{maKH}")
async def update_customer(maKH: str, data: CustomerUpdate, current_user: dict = Depends(get_current_employee)):
    """
    Cập nhật thông tin khách hàng
    """
    try:
        customer = await redis_service.get_khach_hang(maKH)
        if not customer:
            raise HTTPException(status_code=404, detail="Không tìm thấy khách hàng")
        
        # Update fields
        update_data = data.dict(exclude_unset=True)
        
        # Check email if changed
        if "email" in update_data and update_data["email"] != customer.get("email"):
            existing = await redis_service.get_khach_hang_by_email(update_data["email"])
            if existing:
                raise HTTPException(status_code=400, detail="Email đã được sử dụng")
        
        updated = await redis_service.update("khachHang", "maKH", maKH, update_data)
        
        # Remove password from response
        return {k: v for k, v in updated.items() if k != "password"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật: {str(e)}")


@router.delete("/customers/{maKH}")
async def delete_customer(maKH: str, current_user: dict = Depends(get_current_admin)):
    """
    Xóa khách hàng (chỉ admin)
    """
    try:
        customer = await redis_service.get_khach_hang(maKH)
        if not customer:
            raise HTTPException(status_code=404, detail="Không tìm thấy khách hàng")
        
        await redis_service.delete("khachHang", maKH)
        
        return {"message": "Đã xóa khách hàng thành công"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xóa: {str(e)}")


# ========== EMPLOYEES ENDPOINTS ==========

@router.get("/employees")
async def get_all_employees(current_user: dict = Depends(get_current_employee)):
    """
    Lấy danh sách tất cả nhân viên
    """
    try:
        employees = await redis_service.get_all("nhanVien")
        
        # Add role info and remove passwords
        result = []
        for e in employees:
            emp_data = {k: v for k, v in e.items() if k != "password"}
            
            # Get role info
            if e.get("maCV"):
                chuc_vu = await redis_service.get_chuc_vu(e.get("maCV"))
                emp_data["chucVuInfo"] = chuc_vu
            
            result.append(emp_data)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách nhân viên: {str(e)}")


@router.get("/employees/{maNV}")
async def get_employee_by_id(maNV: str, current_user: dict = Depends(get_current_employee)):
    """
    Lấy thông tin chi tiết nhân viên
    """
    try:
        employee = await redis_service.get_nhan_vien(maNV)
        
        if not employee:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")
        
        # Remove password and add role info
        emp_data = {k: v for k, v in employee.items() if k != "password"}
        
        if employee.get("maCV"):
            chuc_vu = await redis_service.get_chuc_vu(employee.get("maCV"))
            emp_data["chucVuInfo"] = chuc_vu
        
        return emp_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.post("/employees")
async def create_employee(data: EmployeeCreate, current_user: dict = Depends(get_current_admin)):
    """
    Tạo nhân viên mới (chỉ admin)
    """
    try:
        # Check email exists
        existing = await redis_service.get_nhan_vien_by_email(data.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email đã được sử dụng")
        
        # Generate new ID
        maNV = await redis_service.generate_id("nhanVien", "NV")
        
        # Hash password
        import bcrypt
        hashed_password = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create employee
        employee_data = {
            "maNV": maNV,
            "hoTen": data.hoTen,
            "email": data.email,
            "SDT": data.SDT,
            "CCCD": data.CCCD,
            "diaChi": data.diaChi,
            "password": hashed_password,
            "maCV": data.maCV,
            "ngayTao": datetime.now().isoformat()
        }
        
        await redis_service.create("nhanVien", "maNV", employee_data)
        
        # Remove password from response
        return {k: v for k, v in employee_data.items() if k != "password"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo nhân viên: {str(e)}")


@router.put("/employees/{maNV}")
async def update_employee(maNV: str, data: EmployeeUpdate, current_user: dict = Depends(get_current_admin)):
    """
    Cập nhật thông tin nhân viên (chỉ admin)
    """
    try:
        employee = await redis_service.get_nhan_vien(maNV)
        if not employee:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")
        
        # Update fields
        update_data = data.dict(exclude_unset=True)
        
        # Check email if changed
        if "email" in update_data and update_data["email"] != employee.get("email"):
            existing = await redis_service.get_nhan_vien_by_email(update_data["email"])
            if existing:
                raise HTTPException(status_code=400, detail="Email đã được sử dụng")
        
        updated = await redis_service.update("nhanVien", "maNV", maNV, update_data)
        
        # Remove password from response
        return {k: v for k, v in updated.items() if k != "password"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật: {str(e)}")


@router.delete("/employees/{maNV}")
async def delete_employee(maNV: str, current_user: dict = Depends(get_current_admin)):
    """
    Xóa nhân viên (chỉ admin)
    """
    try:
        employee = await redis_service.get_nhan_vien(maNV)
        if not employee:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")
        
        await redis_service.delete("nhanVien", maNV)
        
        return {"message": "Đã xóa nhân viên thành công"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xóa: {str(e)}")


# ========== ROLES ENDPOINTS ==========

@router.get("/chucvu")
async def get_all_roles(current_user: dict = Depends(get_current_employee)):
    """
    Lấy danh sách tất cả chức vụ
    """
    try:
        roles = await redis_service.get_all_chuc_vu()
        return roles
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


# ========== BUSES (XE) ENDPOINTS ==========

class BusCreate(BaseModel):
    bienSoXe: str
    soChoNgoi: int = 34
    loaiXe: str = "Xe giường nằm"
    trangThai: Optional[str] = "active"


class BusUpdate(BaseModel):
    bienSoXe: Optional[str] = None
    soChoNgoi: Optional[int] = None
    loaiXe: Optional[str] = None
    trangThai: Optional[str] = None


@router.get("/buses")
async def get_all_buses(current_user: dict = Depends(get_current_employee)):
    """
    Lấy danh sách tất cả xe
    """
    try:
        buses = await redis_service.get_all_xe()
        return buses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách xe: {str(e)}")


@router.get("/buses/stats/overview")
async def get_buses_stats(current_user: dict = Depends(get_current_employee)):
    """
    Lấy thống kê xe
    """
    try:
        buses = await redis_service.get_all_xe()
        active_buses = [b for b in buses if b.get("trangThai") == "active"]
        
        return {
            "total_buses": len(buses),
            "active_buses": len(active_buses),
            "inactive_buses": len(buses) - len(active_buses)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thống kê: {str(e)}")


@router.get("/buses/{maXe}")
async def get_bus_by_id(maXe: str, current_user: dict = Depends(get_current_employee)):
    """
    Lấy thông tin chi tiết xe
    """
    try:
        bus = await redis_service.get_xe(maXe)
        
        if not bus:
            raise HTTPException(status_code=404, detail="Không tìm thấy xe")
        
        # Get seats count
        seats = await redis_service.get_ghe_by_xe(maXe)
        bus["danhSachGhe"] = seats
        bus["soGheDaDang"] = len(seats)
        
        return bus
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.post("/buses")
async def create_bus(data: BusCreate, current_user: dict = Depends(get_current_admin)):
    """
    Tạo xe mới (chỉ admin)
    """
    try:
        # Check biển số exists
        existing_buses = await redis_service.get_all_xe()
        for bus in existing_buses:
            if bus.get("bienSoXe") == data.bienSoXe:
                raise HTTPException(status_code=400, detail="Biển số xe đã tồn tại")
        
        # Generate new ID
        maXe = await redis_service.generate_id("xe", "XE")
        
        # Create bus
        bus_data = {
            "maXe": maXe,
            "bienSoXe": data.bienSoXe,
            "soChoNgoi": data.soChoNgoi,
            "loaiXe": data.loaiXe,
            "trangThai": data.trangThai or "active",
            "ngayTao": datetime.now().isoformat()
        }
        
        await redis_service.create("xe", "maXe", bus_data)
        
        # Create seats for this bus
        seat_prefixes = ["A", "B", "C", "D"]
        seats_per_row = (data.soChoNgoi + len(seat_prefixes) - 1) // len(seat_prefixes)
        
        seat_count = 0
        for prefix in seat_prefixes:
            for num in range(1, seats_per_row + 1):
                if seat_count >= data.soChoNgoi:
                    break
                seat_name = f"{prefix}{str(num).zfill(2)}"
                maGhe = f"{maXe}_{seat_name}"
                
                seat_data = {
                    "maGhe": maGhe,
                    "maXe": maXe,
                    "tenGhe": seat_name
                }
                await redis_service.create("gheNgoi", "maGhe", seat_data)
                seat_count += 1
        
        bus_data["soGheDaTao"] = seat_count
        return bus_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo xe: {str(e)}")


@router.put("/buses/{maXe}")
async def update_bus(maXe: str, data: BusUpdate, current_user: dict = Depends(get_current_admin)):
    """
    Cập nhật thông tin xe (chỉ admin)
    """
    try:
        bus = await redis_service.get_xe(maXe)
        if not bus:
            raise HTTPException(status_code=404, detail="Không tìm thấy xe")
        
        # Update fields
        update_data = data.dict(exclude_unset=True)
        
        # Check biển số if changed
        if "bienSoXe" in update_data and update_data["bienSoXe"] != bus.get("bienSoXe"):
            existing_buses = await redis_service.get_all_xe()
            for b in existing_buses:
                if b.get("bienSoXe") == update_data["bienSoXe"]:
                    raise HTTPException(status_code=400, detail="Biển số xe đã tồn tại")
        
        updated = await redis_service.update("xe", "maXe", maXe, update_data)
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật: {str(e)}")


@router.delete("/buses/{maXe}")
async def delete_bus(maXe: str, current_user: dict = Depends(get_current_admin)):
    """
    Xóa xe (chỉ admin) - Cũng xóa tất cả ghế của xe đó
    """
    try:
        bus = await redis_service.get_xe(maXe)
        if not bus:
            raise HTTPException(status_code=404, detail="Không tìm thấy xe")
        
        # Delete all seats of this bus
        seats = await redis_service.get_ghe_by_xe(maXe)
        for seat in seats:
            await redis_service.delete("gheNgoi", seat.get("maGhe"))
        
        # Delete bus
        await redis_service.delete("xe", maXe)
        
        return {"message": f"Đã xóa xe và {len(seats)} ghế thành công"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xóa: {str(e)}")


# ========== BOOKINGS ENDPOINTS ==========

@router.get("/bookings/all")
async def get_all_bookings(
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy danh sách tất cả vé
    """
    try:
        all_tickets = await redis_service.get_all("veXe")
        
        # Filter by status if provided
        if status:
            all_tickets = [t for t in all_tickets if t.get("trangThai") == status]
        
        # Sort by date (newest first)
        all_tickets = sorted(all_tickets, key=lambda x: x.get("ngayDat", ""), reverse=True)[:limit]
        
        # Add customer and route info
        bookings = []
        for ticket in all_tickets:
            # Get customer info
            customer = None
            if ticket.get("maKH"):
                customer = await redis_service.get_khach_hang(ticket.get("maKH"))
            
            # Get route info and price from chuyenXe
            route_info = None
            gia_ve = ticket.get("giaVe", 0)
            
            if ticket.get("maLC"):
                lich_chay = await redis_service.get_lich_chay(ticket.get("maLC"))
                if lich_chay and lich_chay.get("maCX"):
                    chuyen_xe = await redis_service.get_chuyen_xe(lich_chay.get("maCX"))
                    if chuyen_xe:
                        route_info = {
                            "diemDi": chuyen_xe.get("diemDi"),
                            "diemDen": chuyen_xe.get("diemDen")
                        }
                        # Fallback: lấy giá từ chuyenXe nếu vé không có giaVe
                        if not gia_ve:
                            gia_ve = chuyen_xe.get("giaChuyenXe", 0)
            
            # Lấy tổng tiền từ hóa đơn nếu có
            tong_tien = gia_ve
            if ticket.get("maHD"):
                hoa_don = await redis_service.get_hoa_don(ticket.get("maHD"))
                if hoa_don:
                    # Tổng tiền hóa đơn chia cho số vé trong hóa đơn
                    so_ve = len(hoa_don.get("danhSachVe", [1]))
                    if so_ve > 0:
                        tong_tien = hoa_don.get("tongTien", 0) / so_ve
            
            bookings.append({
                **ticket,
                "customerInfo": {"hoTen": customer.get("hoTen")} if customer else None,
                "routeInfo": route_info,
                "maDatVe": ticket.get("maVe"),
                "giaVe": gia_ve,
                "tongTien": tong_tien,
                "ngayDi": ticket.get("ngayDat", ""),
                "soGheNgoi": [ticket.get("maGhe")] if ticket.get("maGhe") else []
            })
        
        return {"bookings": bookings, "total": len(bookings)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/bookings/stats")
async def get_bookings_stats(current_user: dict = Depends(get_current_employee)):
    """
    Lấy thống kê vé
    """
    try:
        all_tickets = await redis_service.get_all("veXe")
        all_invoices = await redis_service.get_all_hoa_don()
        
        total_revenue = sum(float(hd.get("tongTien", 0) or 0) for hd in all_invoices)
        
        # Đếm yêu cầu hủy pending
        all_cancel_requests = await redis_service.get_all("yeuCauHuy")
        cancel_pending_count = len([r for r in all_cancel_requests if r.get("trangThai") == "pending"])
        
        stats = {
            "total_bookings": len(all_tickets),
            "paid_bookings": len([t for t in all_tickets if t.get("trangThai") == "paid"]),
            "cancel_pending": cancel_pending_count,
            "total_revenue": total_revenue
        }
        
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


# ========== CANCEL REQUESTS ENDPOINTS (Yêu cầu hủy vé) ==========

class CancelRequestAction(BaseModel):
    action: str  # "approve" | "reject"
    lyDoTuChoi: Optional[str] = None


@router.get("/bookings/cancel-requests")
async def get_all_cancel_requests(
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy danh sách tất cả yêu cầu hủy vé
    """
    try:
        all_requests = await redis_service.get_all("yeuCauHuy")
        
        # Filter by status if provided
        if status:
            all_requests = [r for r in all_requests if r.get("trangThai") == status]
        
        # Sort by date (newest first)
        all_requests = sorted(
            all_requests, 
            key=lambda x: x.get("ngayTao", ""), 
            reverse=True
        )[:limit]
        
        # Enrich with route info
        result = []
        for req in all_requests:
            # Get route info from ticket
            route_info = None
            if req.get("maDatVe"):
                ve = await redis_service.get_ve_xe(req.get("maDatVe"))
                if ve and ve.get("maLC"):
                    lich_chay = await redis_service.get_lich_chay(ve.get("maLC"))
                    if lich_chay and lich_chay.get("maCX"):
                        chuyen_xe = await redis_service.get_chuyen_xe(lich_chay.get("maCX"))
                        if chuyen_xe:
                            route_info = {
                                "diemDi": chuyen_xe.get("diemDi"),
                                "diemDen": chuyen_xe.get("diemDen")
                            }
                        # Get date/time from lichChay
                        if not req.get("ngayDi"):
                            req["ngayDi"] = lich_chay.get("ngayKhoiHanh", lich_chay.get("ngayChay", ""))
                        if not req.get("gioDi"):
                            req["gioDi"] = lich_chay.get("gioKhoiHanh", lich_chay.get("thoiGianXuatBen", ""))
                    # Get seat info
                    if not req.get("soGheNgoi"):
                        req["soGheNgoi"] = [ve.get("maGhe")] if ve.get("maGhe") else []
                    # Get price from ticket
                    if not req.get("tongTien"):
                        req["tongTien"] = ve.get("giaVe", 0)
            
            req["routeInfo"] = route_info
            result.append(req)
        
        # Count pending requests
        all_reqs = await redis_service.get_all("yeuCauHuy")
        pending_count = len([r for r in all_reqs if r.get("trangThai") == "pending"])
        
        return {
            "requests": result,
            "total": len(result),
            "pending_count": pending_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/bookings/cancel-requests/pending/count")
async def get_cancel_requests_pending_count(current_user: dict = Depends(get_current_employee)):
    """
    Đếm số yêu cầu hủy đang chờ xử lý
    """
    try:
        all_requests = await redis_service.get_all("yeuCauHuy")
        pending_count = len([r for r in all_requests if r.get("trangThai") == "pending"])
        
        return {"count": pending_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/bookings/cancel-requests/{maYeuCauHuy}")
async def get_cancel_request_detail(
    maYeuCauHuy: str,
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy chi tiết một yêu cầu hủy vé
    """
    try:
        # Find the request
        all_requests = await redis_service.get_all("yeuCauHuy")
        request_data = next(
            (r for r in all_requests if r.get("maYeuCauHuy") == maYeuCauHuy), 
            None
        )
        
        if not request_data:
            raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu hủy")
        
        # Get route info and ticket details
        route_info = None
        if request_data.get("maDatVe"):
            ve = await redis_service.get_ve_xe(request_data.get("maDatVe"))
            if ve:
                # Get seat info
                if not request_data.get("soGheNgoi"):
                    request_data["soGheNgoi"] = [ve.get("maGhe")] if ve.get("maGhe") else []
                
                # Get price
                if not request_data.get("tongTien"):
                    request_data["tongTien"] = ve.get("giaVe", 0)
                
                if ve.get("maLC"):
                    lich_chay = await redis_service.get_lich_chay(ve.get("maLC"))
                    if lich_chay:
                        # Get date/time
                        if not request_data.get("ngayDi"):
                            request_data["ngayDi"] = lich_chay.get("ngayKhoiHanh", lich_chay.get("ngayChay", ""))
                        if not request_data.get("gioDi"):
                            request_data["gioDi"] = lich_chay.get("gioKhoiHanh", lich_chay.get("thoiGianXuatBen", ""))
                        
                        if lich_chay.get("maCX"):
                            chuyen_xe = await redis_service.get_chuyen_xe(lich_chay.get("maCX"))
                            if chuyen_xe:
                                route_info = {
                                    "diemDi": chuyen_xe.get("diemDi"),
                                    "diemDen": chuyen_xe.get("diemDen")
                                }
                                # Get price from chuyenXe if not in ticket
                                if not request_data.get("tongTien"):
                                    request_data["tongTien"] = chuyen_xe.get("giaChuyenXe", 0)
        
        request_data["routeInfo"] = route_info
        
        return request_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.put("/bookings/cancel-requests/{maYeuCauHuy}")
async def process_cancel_request(
    maYeuCauHuy: str,
    action_data: CancelRequestAction,
    current_user: dict = Depends(get_current_employee)
):
    """
    Duyệt hoặc từ chối yêu cầu hủy vé
    
    action: "approve" | "reject"
    """
    try:
        # Find the request
        all_requests = await redis_service.get_all("yeuCauHuy")
        request_data = next(
            (r for r in all_requests if r.get("maYeuCauHuy") == maYeuCauHuy), 
            None
        )
        
        if not request_data:
            raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu hủy")
        
        if request_data.get("trangThai") != "pending":
            raise HTTPException(
                status_code=400, 
                detail=f"Yêu cầu hủy đã được xử lý với trạng thái: {request_data.get('trangThai')}"
            )
        
        now = datetime.now().isoformat()
        nguoi_xu_ly = current_user.get("hoTen", current_user.get("maNV", "Admin"))
        
        if action_data.action == "approve":
            # Update cancel request
            update_data = {
                "trangThai": "approved",
                "ngayXuLy": now,
                "nguoiXuLy": nguoi_xu_ly,
                "ngayCapNhat": now
            }
            await redis_service.update("yeuCauHuy", "maYeuCauHuy", maYeuCauHuy, update_data)
            
            # Update ticket status
            ma_dat_ve = request_data.get("maDatVe")
            if ma_dat_ve:
                await redis_service.update_ve_xe(ma_dat_ve, {
                    "trangThai": "refunded",
                    "ngayHuy": now,
                    "nguoiDuyet": nguoi_xu_ly,
                    "tienHoan": request_data.get("tienHoanDuKien", 0)
                })
                
                # Release seat in lichChay
                ve = await redis_service.get_ve_xe(ma_dat_ve)
                if ve and ve.get("maLC") and ve.get("maGhe"):
                    lich_chay = await redis_service.get_lich_chay(ve.get("maLC"))
                    if lich_chay:
                        ghe_da_dat = lich_chay.get("gheDaDat", [])
                        if ve.get("maGhe") in ghe_da_dat:
                            ghe_da_dat.remove(ve.get("maGhe"))
                        so_ghe_trong = lich_chay.get("soGheTrong", 0) + 1
                        await redis_service.update("lichChay", "maLC", ve.get("maLC"), {
                            "gheDaDat": ghe_da_dat,
                            "soGheTrong": so_ghe_trong
                        })
            
            return {
                "success": True,
                "message": f"Đã duyệt hủy vé và hoàn {request_data.get('tienHoanDuKien', 0):,.0f}đ cho khách hàng"
            }
            
        elif action_data.action == "reject":
            if not action_data.lyDoTuChoi:
                raise HTTPException(status_code=400, detail="Vui lòng nhập lý do từ chối")
            
            # Update cancel request
            update_data = {
                "trangThai": "rejected",
                "ngayXuLy": now,
                "nguoiXuLy": nguoi_xu_ly,
                "lyDoTuChoi": action_data.lyDoTuChoi,
                "ngayCapNhat": now
            }
            await redis_service.update("yeuCauHuy", "maYeuCauHuy", maYeuCauHuy, update_data)
            
            # Revert ticket status back to paid
            ma_dat_ve = request_data.get("maDatVe")
            if ma_dat_ve:
                await redis_service.update_ve_xe(ma_dat_ve, {
                    "trangThai": "paid",
                    "ngayCapNhat": now
                })
            
            return {
                "success": True,
                "message": "Đã từ chối yêu cầu hủy vé"
            }
        else:
            raise HTTPException(status_code=400, detail="Action không hợp lệ. Chỉ chấp nhận 'approve' hoặc 'reject'")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


# ========== TRIPS (LỊCH CHẠY) ENDPOINTS ==========
# Dựa trên cấu trúc:
# - chuyenXe: Định nghĩa tuyến đường (route template)
# - lichChay: Lịch chạy cụ thể cho mỗi ngày
# - xe: Có maNV (tài xế được gán)

class ScheduleCreate(BaseModel):
    """Tạo lịch chạy mới cho một chuyến"""
    maCX: str  # Mã chuyến xe (tuyến đường)
    maXe: str  # Mã xe
    maNV: str  # Mã tài xế
    ngayKhoiHanh: str  # "2025-12-01"
    gioKhoiHanh: str  # "06:00"
    thoiGianChay: str = "5 giờ"


class ScheduleUpdate(BaseModel):
    ngayKhoiHanh: Optional[str] = None
    gioKhoiHanh: Optional[str] = None
    thoiGianChay: Optional[str] = None
    trangThai: Optional[str] = None


@router.get("/trips")
async def get_all_schedules(current_user: dict = Depends(get_current_employee)):
    """
    Lấy danh sách tất cả lịch chạy (chuyến xe cụ thể)
    Tự động đánh dấu hoàn thành nếu quá giờ khởi hành
    """
    try:
        all_schedules = await redis_service.get_all_lich_chay()
        now = datetime.now()
        
        result = []
        for schedule in all_schedules:
            # Parse ngày và giờ khởi hành
            ngay_kh = schedule.get("ngayKhoiHanh", schedule.get("ngayChay", ""))
            gio_kh = schedule.get("gioKhoiHanh", schedule.get("thoiGianXuatBen", "06:00"))
            
            departure_time = None
            if ngay_kh:
                try:
                    # Combine date and time
                    date_str = ngay_kh.split("T")[0] if "T" in ngay_kh else ngay_kh
                    time_str = gio_kh.replace(":", "")[:4]
                    hour = int(time_str[:2]) if len(time_str) >= 2 else 6
                    minute = int(time_str[2:4]) if len(time_str) >= 4 else 0
                    departure_time = datetime.strptime(date_str, "%Y-%m-%d").replace(hour=hour, minute=minute)
                    
                    # Tự động đánh dấu completed nếu quá giờ
                    if departure_time < now and schedule.get("trangThai") not in ["completed", "cancelled"]:
                        schedule["trangThai"] = "completed"
                        await redis_service.update("lichChay", "maLC", schedule.get("maLC"), {"trangThai": "completed"})
                except Exception as e:
                    print(f"Error parsing date: {e}")
            
            # Lấy thông tin chuyến xe (tuyến đường)
            chuyen_xe = await redis_service.get_chuyen_xe(schedule.get("maCX"))
            if chuyen_xe:
                schedule["chuyenXeInfo"] = chuyen_xe
                schedule["diemDi"] = chuyen_xe.get("diemDi", "")
                schedule["diemDen"] = chuyen_xe.get("diemDen", "")
                schedule["giaChuyenXe"] = chuyen_xe.get("giaChuyenXe", chuyen_xe.get("giaVe", 0))
                schedule["quangDuong"] = chuyen_xe.get("quangDuong", chuyen_xe.get("khoangCach", 0))
            
            # Lấy thông tin xe
            xe = await redis_service.get_xe(schedule.get("maXe"))
            if xe:
                schedule["xeInfo"] = xe
                # Tài xế có thể được gán trong xe hoặc trong schedule
                ma_nv = schedule.get("maNV") or xe.get("maNV")
                if ma_nv:
                    nv = await redis_service.get_nhan_vien(ma_nv)
                    if nv:
                        schedule["taiXeInfo"] = {"maNV": nv.get("maNV"), "hoTen": nv.get("hoTen"), "SDT": nv.get("SDT")}
            
            # Đếm số vé đã bán
            ve_list = await redis_service.get_ve_by_lich_chay(schedule.get("maLC"))
            paid_tickets = [v for v in ve_list if v.get("trangThai") in ["paid", "confirmed"]]
            schedule["soVeDaBan"] = len(paid_tickets)
            schedule["soGheTrong"] = schedule.get("soGheTrong", 34) - len(paid_tickets)
            
            result.append(schedule)
        
        # Sort by ngayKhoiHanh (newest first)
        result = sorted(result, key=lambda x: (x.get("ngayKhoiHanh", x.get("ngayChay", "")), x.get("gioKhoiHanh", "")), reverse=True)
        
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách lịch chạy: {str(e)}")


@router.get("/trips/routes")
async def get_all_routes(current_user: dict = Depends(get_current_employee)):
    """
    Lấy danh sách tất cả tuyến đường (chuyenXe) để chọn khi tạo lịch chạy
    """
    try:
        all_routes = await redis_service.get_all_chuyen_xe()
        return all_routes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/trips/available-buses")
async def get_available_buses(
    ngayKhoiHanh: str = Query(..., description="Ngày khởi hành (YYYY-MM-DD hoặc ISO)"),
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy danh sách xe có thể sử dụng cho lịch chạy mới
    Xe đang hoạt động và không bận trong ngày đó
    """
    try:
        all_buses = await redis_service.get_all_xe()
        all_schedules = await redis_service.get_all_lich_chay()
        
        # Parse target date
        try:
            target_date_str = ngayKhoiHanh.split("T")[0] if "T" in ngayKhoiHanh else ngayKhoiHanh
            target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
        except:
            raise HTTPException(status_code=400, detail="Định dạng ngày không hợp lệ (cần YYYY-MM-DD)")
        
        # Tìm xe đang bận trong ngày đó
        busy_buses = set()
        for schedule in all_schedules:
            if schedule.get("trangThai") not in ["completed", "cancelled"]:
                schedule_date_str = schedule.get("ngayKhoiHanh", schedule.get("ngayChay", ""))
                if schedule_date_str:
                    try:
                        schedule_date_str = schedule_date_str.split("T")[0] if "T" in schedule_date_str else schedule_date_str
                        schedule_date = datetime.strptime(schedule_date_str, "%Y-%m-%d").date()
                        if schedule_date == target_date:
                            busy_buses.add(schedule.get("maXe"))
                    except:
                        pass
        
        # Lọc xe available (active và không bận)
        available = []
        for bus in all_buses:
            trang_thai = bus.get("trangThai", "active")
            if trang_thai == "active" and bus.get("maXe") not in busy_buses:
                available.append(bus)
        
        return available
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/trips/available-drivers")
async def get_available_drivers(
    ngayKhoiHanh: str = Query(..., description="Ngày khởi hành (YYYY-MM-DD hoặc ISO)"),
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy danh sách tài xế có thể lái (chức vụ CV03 = Tài xế) và không bận trong ngày
    """
    try:
        all_employees = await redis_service.get_all("nhanVien")
        all_schedules = await redis_service.get_all_lich_chay()
        all_buses = await redis_service.get_all_xe()
        
        # Parse target date
        try:
            target_date_str = ngayKhoiHanh.split("T")[0] if "T" in ngayKhoiHanh else ngayKhoiHanh
            target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
        except:
            raise HTTPException(status_code=400, detail="Định dạng ngày không hợp lệ")
        
        # Tìm tài xế đang bận trong ngày đó (từ schedules và buses)
        busy_drivers = set()
        for schedule in all_schedules:
            if schedule.get("trangThai") not in ["completed", "cancelled"]:
                schedule_date_str = schedule.get("ngayKhoiHanh", schedule.get("ngayChay", ""))
                if schedule_date_str:
                    try:
                        schedule_date_str = schedule_date_str.split("T")[0] if "T" in schedule_date_str else schedule_date_str
                        schedule_date = datetime.strptime(schedule_date_str, "%Y-%m-%d").date()
                        if schedule_date == target_date:
                            # Tài xế có thể trong schedule hoặc trong xe
                            if schedule.get("maNV"):
                                busy_drivers.add(schedule.get("maNV"))
                            # Check xe của schedule
                            ma_xe = schedule.get("maXe")
                            for bus in all_buses:
                                if bus.get("maXe") == ma_xe and bus.get("maNV"):
                                    busy_drivers.add(bus.get("maNV"))
                    except:
                        pass
        
        # Lọc tài xế available (chức vụ tài xế CV03 và không bận)
        available = []
        for emp in all_employees:
            maCV = emp.get("maCV", emp.get("maChucVu", ""))
            
            # Kiểm tra chức vụ tài xế
            is_driver = False
            if maCV:
                # CV03 là tài xế theo backup data
                if maCV.upper() == "CV03":
                    is_driver = True
                else:
                    # Fallback: check tên chức vụ
                    chuc_vu = await redis_service.get_chuc_vu(maCV)
                    if chuc_vu:
                        ten_cv = chuc_vu.get("tenChucVu", "").lower()
                        if "tài xế" in ten_cv or "driver" in ten_cv or "lái xe" in ten_cv:
                            is_driver = True
            
            if is_driver and emp.get("maNV") not in busy_drivers:
                emp_info = {
                    "maNV": emp.get("maNV"),
                    "hoTen": emp.get("hoTen"),
                    "SDT": emp.get("SDT"),
                    "trangThai": "available"
                }
                available.append(emp_info)
        
        return available
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/trips/{maLC}")
async def get_schedule_detail(maLC: str, current_user: dict = Depends(get_current_employee)):
    """
    Lấy chi tiết một lịch chạy
    """
    try:
        schedule = await redis_service.get_lich_chay(maLC)
        if not schedule:
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch chạy")
        
        # Lấy thông tin chuyến xe
        chuyen_xe = await redis_service.get_chuyen_xe(schedule.get("maCX"))
        if chuyen_xe:
            schedule["chuyenXeInfo"] = chuyen_xe
            schedule["diemDi"] = chuyen_xe.get("diemDi", "")
            schedule["diemDen"] = chuyen_xe.get("diemDen", "")
            schedule["giaChuyenXe"] = chuyen_xe.get("giaChuyenXe", chuyen_xe.get("giaVe", 0))
        
        # Lấy thông tin xe
        xe = await redis_service.get_xe(schedule.get("maXe"))
        if xe:
            schedule["xeInfo"] = xe
            ma_nv = schedule.get("maNV") or xe.get("maNV")
            if ma_nv:
                nv = await redis_service.get_nhan_vien(ma_nv)
                if nv:
                    schedule["taiXeInfo"] = {"maNV": nv.get("maNV"), "hoTen": nv.get("hoTen"), "SDT": nv.get("SDT")}
        
        # Lấy danh sách vé
        ve_list = await redis_service.get_ve_by_lich_chay(maLC)
        paid_tickets = [v for v in ve_list if v.get("trangThai") in ["paid", "confirmed"]]
        schedule["soVeDaBan"] = len(paid_tickets)
        schedule["danhSachVe"] = paid_tickets
        
        return schedule
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.post("/trips")
async def create_schedule(data: ScheduleCreate, current_user: dict = Depends(get_current_employee)):
    """
    Tạo lịch chạy mới cho một chuyến xe
    """
    try:
        # Validate chuyến xe exists
        chuyen_xe = await redis_service.get_chuyen_xe(data.maCX)
        if not chuyen_xe:
            raise HTTPException(status_code=404, detail="Không tìm thấy tuyến đường")
        
        # Validate xe exists and is active
        xe = await redis_service.get_xe(data.maXe)
        if not xe:
            raise HTTPException(status_code=404, detail="Không tìm thấy xe")
        if xe.get("trangThai") not in ["active", None, ""]:
            if xe.get("trangThai") != "active":
                raise HTTPException(status_code=400, detail="Xe không trong trạng thái hoạt động")
        
        # Validate tài xế exists và là tài xế
        nv = await redis_service.get_nhan_vien(data.maNV)
        if not nv:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài xế")
        
        # Parse ngày
        try:
            target_date_str = data.ngayKhoiHanh.split("T")[0] if "T" in data.ngayKhoiHanh else data.ngayKhoiHanh
            target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
        except:
            raise HTTPException(status_code=400, detail="Định dạng ngày không hợp lệ (cần YYYY-MM-DD)")
        
        # Kiểm tra xe và tài xế không bận
        all_schedules = await redis_service.get_all_lich_chay()
        for schedule in all_schedules:
            if schedule.get("trangThai") not in ["completed", "cancelled"]:
                schedule_date_str = schedule.get("ngayKhoiHanh", schedule.get("ngayChay", ""))
                if schedule_date_str:
                    try:
                        schedule_date_str = schedule_date_str.split("T")[0] if "T" in schedule_date_str else schedule_date_str
                        schedule_date = datetime.strptime(schedule_date_str, "%Y-%m-%d").date()
                        if schedule_date == target_date:
                            if schedule.get("maXe") == data.maXe:
                                raise HTTPException(status_code=400, detail="Xe đã có lịch chạy trong ngày này")
                            if schedule.get("maNV") == data.maNV:
                                raise HTTPException(status_code=400, detail="Tài xế đã có lịch chạy trong ngày này")
                    except ValueError:
                        pass
        
        # Generate mã lịch chạy
        maLC = f"LC_{data.maCX}_{target_date_str}_{data.gioKhoiHanh.replace(':', '')}"
        
        # Kiểm tra maLC đã tồn tại chưa
        existing = await redis_service.get_lich_chay(maLC)
        if existing:
            # Generate unique maLC
            maLC = await redis_service.generate_id("lichChay", "LC")
        
        # Tính thời gian đến dự kiến
        try:
            hours = int(data.thoiGianChay.split()[0])
        except:
            hours = int(chuyen_xe.get("thoiGianDuKien", "5").split()[0]) if chuyen_xe.get("thoiGianDuKien") else 5
        
        gio_parts = data.gioKhoiHanh.split(":")
        hour_start = int(gio_parts[0])
        minute_start = int(gio_parts[1]) if len(gio_parts) > 1 else 0
        
        arrival_hour = (hour_start + hours) % 24
        arrival_time = f"{arrival_hour:02d}:{minute_start:02d}"
        
        # Lấy số ghế từ xe
        so_ghe = int(xe.get("soChoNgoi", xe.get("soGhe", 34)))
        
        # Tạo lịch chạy
        schedule_data = {
            "maLC": maLC,
            "maCX": data.maCX,
            "maXe": data.maXe,
            "maNV": data.maNV,
            "ngayKhoiHanh": target_date_str,
            "gioKhoiHanh": data.gioKhoiHanh,
            "thoiGianXuatBen": data.gioKhoiHanh,
            "thoiGianChay": data.thoiGianChay,
            "thoiGianDenDuKien": arrival_time,
            "trangThai": "scheduled",
            "soGheTrong": so_ghe,
            "gheDaDat": [],
            "ngayTao": datetime.now().isoformat()
        }
        
        await redis_service.create("lichChay", "maLC", schedule_data)
        
        # Thêm thông tin xe và tài xế vào response
        schedule_data["xeInfo"] = xe
        schedule_data["taiXeInfo"] = {"maNV": nv.get("maNV"), "hoTen": nv.get("hoTen")}
        schedule_data["chuyenXeInfo"] = chuyen_xe
        schedule_data["diemDi"] = chuyen_xe.get("diemDi", "")
        schedule_data["diemDen"] = chuyen_xe.get("diemDen", "")
        
        return schedule_data
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi tạo lịch chạy: {str(e)}")


@router.put("/trips/{maLC}")
async def update_schedule(maLC: str, data: ScheduleUpdate, current_user: dict = Depends(get_current_employee)):
    """
    Cập nhật thông tin lịch chạy
    """
    try:
        schedule = await redis_service.get_lich_chay(maLC)
        if not schedule:
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch chạy")
        
        update_data = data.dict(exclude_unset=True)
        updated = await redis_service.update("lichChay", "maLC", maLC, update_data)
        
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật: {str(e)}")


@router.delete("/trips/{maLC}")
async def cancel_schedule(maLC: str, current_user: dict = Depends(get_current_employee)):
    """
    Hủy lịch chạy
    Không thể hủy nếu đã có khách đặt vé
    """
    try:
        schedule = await redis_service.get_lich_chay(maLC)
        if not schedule:
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch chạy")
        
        # Kiểm tra có vé đã bán không
        ve_list = await redis_service.get_ve_by_lich_chay(maLC)
        paid_tickets = [v for v in ve_list if v.get("trangThai") in ["paid", "confirmed"]]
        if paid_tickets:
            raise HTTPException(
                status_code=400, 
                detail=f"Không thể hủy lịch chạy này vì đã có {len(paid_tickets)} vé đã bán"
            )
        
        # Xóa lịch chạy
        await redis_service.delete("lichChay", maLC)
        
        return {"message": "Đã hủy lịch chạy thành công"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hủy: {str(e)}")


@router.get("/trips/stats/overview")
async def get_schedules_stats(current_user: dict = Depends(get_current_employee)):
    """
    Thống kê lịch chạy
    """
    try:
        all_schedules = await redis_service.get_all_lich_chay()
        now = datetime.now()
        
        scheduled = 0
        running = 0
        completed = 0
        
        for schedule in all_schedules:
            status = schedule.get("trangThai", "scheduled")
            if status == "completed":
                completed += 1
            elif status == "running" or status == "active":
                running += 1
            else:
                scheduled += 1
        
        return {
            "total_trips": len(all_schedules),
            "pending_trips": scheduled,
            "active_trips": running,
            "completed_trips": completed
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")
