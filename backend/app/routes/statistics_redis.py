"""
Statistics Routes - Thống kê doanh thu và tuyến xe sử dụng Redis
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel
import csv
import io

from app.services.redis_service import redis_service
from app.core.middleware import get_current_employee

router = APIRouter(prefix="/api/v1/statistics", tags=["Statistics"])


# ========== HELPER FUNCTIONS ==========

def parse_date(date_str: str) -> datetime:
    """Parse date string to datetime"""
    if not date_str:
        return None
    
    # Normalize: lấy phần date nếu có T
    date_part = date_str.split('T')[0] if 'T' in date_str else date_str
    
    # Try multiple formats
    formats = ["%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"]
    for fmt in formats:
        try:
            return datetime.strptime(date_part, fmt)
        except:
            continue
    return None


def get_invoice_date(hoa_don: dict) -> datetime:
    """Lấy ngày của hóa đơn từ ngayTao hoặc ngayLap"""
    # Ưu tiên ngayTao
    ngay = hoa_don.get("ngayTao") or hoa_don.get("ngayLap")
    return parse_date(ngay) if ngay else None


def get_date_range(period: str):
    """Lấy khoảng thời gian theo period"""
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if period == "today":
        return today_start, now
    elif period == "week":
        days_since_monday = now.weekday()
        return today_start - timedelta(days=days_since_monday), now
    elif period == "month":
        return today_start.replace(day=1), now
    elif period == "year":
        return today_start.replace(month=1, day=1), now
    elif period == "last_7_days":
        return today_start - timedelta(days=7), now
    elif period == "last_30_days":
        return today_start - timedelta(days=30), now
    else:
        return today_start, now


# ========== ENDPOINTS ==========

@router.get("/overview")
async def get_overview_stats(current_user: dict = Depends(get_current_employee)):
    """
    Lấy thống kê tổng quan cho dashboard
    """
    try:
        # Đếm số lượng
        total_customers = await redis_service.count("khachHang")
        total_employees = await redis_service.count("nhanVien")
        total_buses = await redis_service.count("xe")
        total_routes = await redis_service.count("chuyenXe")
        total_tickets = await redis_service.count("veXe")
        total_invoices = await redis_service.count("hoaDon")
        
        # Lấy tất cả hóa đơn để tính doanh thu
        all_invoices = await redis_service.get_all_hoa_don()
        
        # Tính doanh thu tổng
        total_revenue = sum(float(hd.get("tongTien", 0) or 0) for hd in all_invoices)
        
        # Tính doanh thu tháng này
        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        month_revenue = 0
        month_bookings = 0
        for hd in all_invoices:
            ngay_tao = get_invoice_date(hd)
            if ngay_tao and ngay_tao >= month_start:
                month_revenue += float(hd.get("tongTien", 0) or 0)
                month_bookings += 1
        
        # Lấy vé để tính số vé đã bán
        all_tickets = await redis_service.get_all("veXe")
        paid_tickets = [t for t in all_tickets if t.get("trangThai") in ["paid", "confirmed"]]
        
        return {
            "counts": {
                "total_customers": total_customers,
                "total_employees": total_employees,
                "total_buses": total_buses,
                "total_routes": total_routes,
                "total_tickets": len(paid_tickets),
                "total_invoices": total_invoices
            },
            "revenue": {
                "total": total_revenue,
                "this_month": month_revenue,
                "this_month_bookings": month_bookings
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thống kê: {str(e)}")


@router.get("/revenue")
async def get_revenue_stats(
    period: str = Query("month", description="today, week, month, year, last_7_days, last_30_days"),
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy thống kê doanh thu theo khoảng thời gian
    """
    try:
        start_dt, end_dt = get_date_range(period)
        
        # Lấy tất cả hóa đơn
        all_invoices = await redis_service.get_all_hoa_don()
        
        # Filter theo thời gian
        filtered_invoices = []
        for hd in all_invoices:
            ngay_tao = get_invoice_date(hd)
            if ngay_tao and start_dt <= ngay_tao <= end_dt:
                filtered_invoices.append(hd)
        
        # Tính toán
        total_revenue = sum(float(hd.get("tongTien", 0) or 0) for hd in filtered_invoices)
        total_bookings = len(filtered_invoices)
        
        # Đếm số vé
        total_tickets = 0
        for hd in filtered_invoices:
            danh_sach_ve = hd.get("danhSachVe", [])
            if isinstance(danh_sach_ve, list):
                total_tickets += len(danh_sach_ve)
        
        avg_price = total_revenue / total_tickets if total_tickets > 0 else 0
        
        return {
            "period": period,
            "start_date": start_dt.strftime("%Y-%m-%d"),
            "end_date": end_dt.strftime("%Y-%m-%d"),
            "stats": {
                "total_revenue": total_revenue,
                "total_bookings": total_bookings,
                "total_tickets": total_tickets,
                "average_ticket_price": avg_price
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thống kê doanh thu: {str(e)}")


@router.get("/revenue/daily")
async def get_daily_revenue(
    days: int = Query(30, ge=1, le=365, description="Số ngày gần đây"),
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy doanh thu theo từng ngày (để vẽ biểu đồ)
    """
    try:
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Lấy tất cả hóa đơn
        all_invoices = await redis_service.get_all_hoa_don()
        
        # Group theo ngày
        revenue_by_date = {}
        for hd in all_invoices:
            ngay_tao = get_invoice_date(hd)
            if ngay_tao:
                date_key = ngay_tao.strftime("%Y-%m-%d")
                if date_key not in revenue_by_date:
                    revenue_by_date[date_key] = {"revenue": 0, "bookings": 0, "tickets": 0}
                
                revenue_by_date[date_key]["revenue"] += float(hd.get("tongTien", 0) or 0)
                revenue_by_date[date_key]["bookings"] += 1
                
                danh_sach_ve = hd.get("danhSachVe", [])
                if isinstance(danh_sach_ve, list):
                    revenue_by_date[date_key]["tickets"] += len(danh_sach_ve)
        
        # Tạo danh sách đầy đủ các ngày
        daily_data = []
        for i in range(days):
            date = (today_start - timedelta(days=days - 1 - i))
            date_key = date.strftime("%Y-%m-%d")
            
            if date_key in revenue_by_date:
                data = revenue_by_date[date_key]
                daily_data.append({
                    "date": date_key,
                    "revenue": data["revenue"],
                    "bookings": data["bookings"],
                    "tickets": data["tickets"]
                })
            else:
                daily_data.append({
                    "date": date_key,
                    "revenue": 0,
                    "bookings": 0,
                    "tickets": 0
                })
        
        # Tính tổng
        total_revenue = sum(d["revenue"] for d in daily_data)
        total_bookings = sum(d["bookings"] for d in daily_data)
        total_tickets = sum(d["tickets"] for d in daily_data)
        
        return {
            "days": days,
            "daily_data": daily_data,
            "summary": {
                "total_revenue": total_revenue,
                "total_bookings": total_bookings,
                "total_tickets": total_tickets,
                "average_daily_revenue": total_revenue / days if days > 0 else 0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thống kê hàng ngày: {str(e)}")


@router.get("/routes/popular")
async def get_popular_routes(
    period: str = Query("month", description="today, week, month, year, all"),
    limit: int = Query(10, ge=1, le=50, description="Số tuyến hiển thị"),
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy danh sách tuyến xe phổ biến nhất
    """
    try:
        start_dt, end_dt = get_date_range(period) if period != "all" else (None, None)
        
        # Lấy tất cả hóa đơn
        all_invoices = await redis_service.get_all_hoa_don()
        
        # Filter theo thời gian nếu cần
        filtered_invoices = all_invoices
        if start_dt and end_dt:
            filtered_invoices = []
            for hd in all_invoices:
                ngay_tao = get_invoice_date(hd)
                if ngay_tao and start_dt <= ngay_tao <= end_dt:
                    filtered_invoices.append(hd)
        
        # Lấy thông tin vé từ hóa đơn
        route_stats = {}
        for hd in filtered_invoices:
            danh_sach_ve = hd.get("danhSachVe", [])
            if not isinstance(danh_sach_ve, list):
                continue
            
            for maVe in danh_sach_ve:
                ve = await redis_service.get_ve_xe(maVe)
                if not ve:
                    continue
                
                maLC = ve.get("maLC", "")
                if not maLC:
                    continue
                
                # Lấy lịch chạy để biết chuyến xe
                lich_chay = await redis_service.get_lich_chay(maLC)
                if not lich_chay:
                    continue
                
                maCX = lich_chay.get("maCX", "")
                if not maCX:
                    continue
                
                if maCX not in route_stats:
                    # Lấy thông tin chuyến xe
                    chuyen_xe = await redis_service.get_chuyen_xe(maCX)
                    route_stats[maCX] = {
                        "maCX": maCX,
                        "diemDi": chuyen_xe.get("diemDi", "N/A") if chuyen_xe else "N/A",
                        "diemDen": chuyen_xe.get("diemDen", "N/A") if chuyen_xe else "N/A",
                        "total_bookings": 0,
                        "total_tickets": 0,
                        "total_revenue": 0
                    }
                
                route_stats[maCX]["total_tickets"] += 1
                route_stats[maCX]["total_revenue"] += float(ve.get("giaVe", 0) or 0)
        
        # Đếm bookings (1 hóa đơn = 1 booking)
        for hd in filtered_invoices:
            danh_sach_ve = hd.get("danhSachVe", [])
            if not isinstance(danh_sach_ve, list) or len(danh_sach_ve) == 0:
                continue
            
            # Lấy vé đầu tiên để xác định tuyến
            ve = await redis_service.get_ve_xe(danh_sach_ve[0])
            if not ve:
                continue
            
            lich_chay = await redis_service.get_lich_chay(ve.get("maLC", ""))
            if not lich_chay:
                continue
            
            maCX = lich_chay.get("maCX", "")
            if maCX in route_stats:
                route_stats[maCX]["total_bookings"] += 1
        
        # Sort và limit
        routes_list = sorted(route_stats.values(), key=lambda x: x["total_bookings"], reverse=True)[:limit]
        
        return {
            "period": period,
            "routes": routes_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thống kê tuyến xe: {str(e)}")


@router.get("/customers/top")
async def get_top_customers(
    period: str = Query("month", description="today, week, month, year, all"),
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy danh sách khách hàng đặt vé nhiều nhất
    """
    try:
        start_dt, end_dt = get_date_range(period) if period != "all" else (None, None)
        
        # Lấy tất cả hóa đơn
        all_invoices = await redis_service.get_all_hoa_don()
        
        # Filter theo thời gian nếu cần
        filtered_invoices = all_invoices
        if start_dt and end_dt:
            filtered_invoices = []
            for hd in all_invoices:
                ngay_tao = get_invoice_date(hd)
                if ngay_tao and start_dt <= ngay_tao <= end_dt:
                    filtered_invoices.append(hd)
        
        # Group theo khách hàng
        customer_stats = {}
        for hd in filtered_invoices:
            maKH = hd.get("maKH", "")
            if not maKH:
                continue
            
            if maKH not in customer_stats:
                # Lấy thông tin khách hàng
                kh = await redis_service.get_khach_hang(maKH)
                customer_stats[maKH] = {
                    "maKH": maKH,
                    "hoTen": kh.get("hoTen", "N/A") if kh else "N/A",
                    "email": kh.get("email", "N/A") if kh else "N/A",
                    "SDT": kh.get("SDT", "N/A") if kh else "N/A",
                    "total_bookings": 0,
                    "total_tickets": 0,
                    "total_spent": 0
                }
            
            customer_stats[maKH]["total_bookings"] += 1
            customer_stats[maKH]["total_spent"] += float(hd.get("tongTien", 0) or 0)
            
            danh_sach_ve = hd.get("danhSachVe", [])
            if isinstance(danh_sach_ve, list):
                customer_stats[maKH]["total_tickets"] += len(danh_sach_ve)
        
        # Sort và limit
        customers_list = sorted(customer_stats.values(), key=lambda x: x["total_spent"], reverse=True)[:limit]
        
        return {
            "period": period,
            "customers": customers_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thống kê khách hàng: {str(e)}")


@router.get("/dashboard")
async def get_dashboard_data(current_user: dict = Depends(get_current_employee)):
    """
    Lấy tất cả dữ liệu cho dashboard admin
    """
    try:
        # === COUNTS ===
        total_customers = await redis_service.count("khachHang")
        total_buses = await redis_service.count("xe")
        total_routes = await redis_service.count("chuyenXe")
        
        # Vé đã bán (trạng thái paid hoặc confirmed)
        all_tickets = await redis_service.get_all("veXe")
        paid_tickets = [t for t in all_tickets if t.get("trangThai") in ["paid", "confirmed"]]
        
        # === DOANH THU ===
        all_invoices = await redis_service.get_all_hoa_don()
        total_revenue = sum(float(hd.get("tongTien", 0) or 0) for hd in all_invoices)
        
        # Doanh thu tháng này
        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_revenue = 0
        for hd in all_invoices:
            ngay_tao = get_invoice_date(hd)
            if ngay_tao and ngay_tao >= month_start:
                month_revenue += float(hd.get("tongTien", 0) or 0)
        
        # === VÉ GẦN ĐÂY ===
        recent_tickets = sorted(all_tickets, key=lambda x: x.get("ngayDat", ""), reverse=True)[:10]
        
        recent_bookings = []
        for ticket in recent_tickets:
            maKH = ticket.get("maKH", "")
            kh = await redis_service.get_khach_hang(maKH) if maKH else None
            
            maLC = ticket.get("maLC", "")
            lich_chay = await redis_service.get_lich_chay(maLC) if maLC else None
            
            route_name = "N/A"
            gia_ve = ticket.get("giaVe", 0)
            
            if lich_chay:
                maCX = lich_chay.get("maCX", "")
                chuyen_xe = await redis_service.get_chuyen_xe(maCX) if maCX else None
                if chuyen_xe:
                    route_name = f"{chuyen_xe.get('diemDi', '')} → {chuyen_xe.get('diemDen', '')}"
                    # Fallback: lấy giá từ chuyenXe nếu vé không có giaVe
                    if not gia_ve:
                        gia_ve = chuyen_xe.get("giaChuyenXe", 0)
            
            recent_bookings.append({
                "maVe": ticket.get("maVe", ""),
                "customer": kh.get("hoTen", "N/A") if kh else "N/A",
                "route": route_name,
                "seats": ticket.get("maGhe", "N/A"),
                "price": gia_ve,
                "status": ticket.get("trangThai", "unknown"),
                "time": ticket.get("ngayDat", "N/A")
            })
        
        # === XE ĐANG HOẠT ĐỘNG ===
        all_buses = await redis_service.get_all_xe()
        active_buses = []
        for bus in all_buses[:5]:
            active_buses.append({
                "maXe": bus.get("maXe", ""),
                "bienSo": bus.get("bienSoXe", "N/A"),
                "loaiXe": bus.get("loaiXe", "N/A"),
                "status": bus.get("trangThai", "active"),
                "soChoNgoi": bus.get("soChoNgoi", 34)
            })
        
        # === DOANH THU 6 THÁNG ===
        monthly_revenue = []
        for i in range(5, -1, -1):
            month = now.month - i
            year = now.year
            while month <= 0:
                month += 12
                year -= 1
            
            month_name = f"Tháng {month}"
            month_total = 0
            
            for hd in all_invoices:
                ngay_tao = get_invoice_date(hd)
                if ngay_tao and ngay_tao.month == month and ngay_tao.year == year:
                    month_total += float(hd.get("tongTien", 0) or 0)
            
            monthly_revenue.append({
                "month": month_name,
                "revenue": month_total / 1000000  # Convert to millions
            })
        
        # === TOP TUYẾN ===
        route_stats = {}
        for hd in all_invoices:
            danh_sach_ve = hd.get("danhSachVe", [])
            if not isinstance(danh_sach_ve, list):
                continue
            
            for maVe in danh_sach_ve[:1]:  # Lấy 1 vé đầu để xác định tuyến
                ve = await redis_service.get_ve_xe(maVe)
                if not ve:
                    continue
                
                lich_chay = await redis_service.get_lich_chay(ve.get("maLC", ""))
                if not lich_chay:
                    continue
                
                maCX = lich_chay.get("maCX", "")
                if not maCX:
                    continue
                
                if maCX not in route_stats:
                    chuyen_xe = await redis_service.get_chuyen_xe(maCX)
                    route_name = f"{chuyen_xe.get('diemDi', '')} - {chuyen_xe.get('diemDen', '')}" if chuyen_xe else "N/A"
                    route_stats[maCX] = {"name": route_name, "count": 0}
                
                route_stats[maCX]["count"] += 1
        
        top_routes = sorted(route_stats.values(), key=lambda x: x["count"], reverse=True)[:5]
        total_route_bookings = sum(r["count"] for r in top_routes)
        
        top_routes_data = []
        for route in top_routes:
            percentage = (route["count"] / total_route_bookings * 100) if total_route_bookings > 0 else 0
            top_routes_data.append({
                "name": route["name"],
                "percentage": round(percentage)
            })
        
        return {
            "stats": {
                "totalUsers": total_customers,
                "totalBookings": len(paid_tickets),
                "totalBuses": len([b for b in all_buses if b.get("trangThai") == "active"]),
                "totalRevenue": month_revenue
            },
            "recentBookings": recent_bookings,
            "activeBuses": active_buses,
            "revenueChart": monthly_revenue,
            "topRoutes": top_routes_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy dữ liệu dashboard: {str(e)}")


@router.get("/dashboard/debug")
async def get_dashboard_data_debug():
    """
    DEBUG: Lấy dữ liệu dashboard KHÔNG cần auth (chỉ dùng để test)
    """
    try:
        # === COUNTS ===
        total_customers = await redis_service.count("khachHang")
        total_buses = await redis_service.count("xe")
        total_routes = await redis_service.count("chuyenXe")
        
        # Vé đã bán (trạng thái paid hoặc confirmed)
        all_tickets = await redis_service.get_all("veXe")
        paid_tickets = [t for t in all_tickets if t.get("trangThai") in ["paid", "confirmed"]]
        
        # === DOANH THU ===
        all_invoices = await redis_service.get_all_hoa_don()
        total_revenue = sum(float(hd.get("tongTien", 0) or 0) for hd in all_invoices)
        
        # Doanh thu tháng này
        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_revenue = 0
        for hd in all_invoices:
            ngay_tao = get_invoice_date(hd)
            if ngay_tao and ngay_tao >= month_start:
                month_revenue += float(hd.get("tongTien", 0) or 0)
        
        # === VÉ GẦN ĐÂY ===
        recent_tickets = sorted(all_tickets, key=lambda x: x.get("ngayDat", ""), reverse=True)[:10]
        
        recent_bookings = []
        for ticket in recent_tickets:
            maKH = ticket.get("maKH", "")
            kh = await redis_service.get_khach_hang(maKH) if maKH else None
            
            maLC = ticket.get("maLC", "")
            lich_chay = await redis_service.get_lich_chay(maLC) if maLC else None
            
            route_name = "N/A"
            gia_ve = ticket.get("giaVe", 0)
            
            if lich_chay:
                maCX = lich_chay.get("maCX", "")
                chuyen_xe = await redis_service.get_chuyen_xe(maCX) if maCX else None
                if chuyen_xe:
                    route_name = f"{chuyen_xe.get('diemDi', '')} → {chuyen_xe.get('diemDen', '')}"
                    # Fallback: lấy giá từ chuyenXe nếu vé không có giaVe
                    if not gia_ve:
                        gia_ve = chuyen_xe.get("giaChuyenXe", 0)
            
            recent_bookings.append({
                "maVe": ticket.get("maVe", ""),
                "customer": kh.get("hoTen", "N/A") if kh else "N/A",
                "route": route_name,
                "seats": ticket.get("maGhe", "N/A"),
                "price": gia_ve,
                "status": ticket.get("trangThai", "unknown"),
                "time": ticket.get("ngayDat", "N/A")
            })
        
        # === XE ĐANG HOẠT ĐỘNG ===
        all_buses = await redis_service.get_all_xe()
        active_buses = []
        for bus in all_buses[:5]:
            active_buses.append({
                "maXe": bus.get("maXe", ""),
                "bienSo": bus.get("bienSoXe", "N/A"),
                "loaiXe": bus.get("loaiXe", "N/A"),
                "status": bus.get("trangThai", "active"),
                "soChoNgoi": bus.get("soChoNgoi", 34)
            })
        
        # === DOANH THU 6 THÁNG ===
        monthly_revenue = []
        for i in range(5, -1, -1):
            month = now.month - i
            year = now.year
            while month <= 0:
                month += 12
                year -= 1
            
            month_name = f"Tháng {month}"
            month_total = 0
            
            for hd in all_invoices:
                ngay_tao = get_invoice_date(hd)
                if ngay_tao and ngay_tao.month == month and ngay_tao.year == year:
                    month_total += float(hd.get("tongTien", 0) or 0)
            
            monthly_revenue.append({
                "month": month_name,
                "revenue": month_total / 1000000  # Convert to millions
            })
        
        # === TOP TUYẾN ===
        # Đơn giản hóa - lấy từ chuyenXe trực tiếp
        all_routes = await redis_service.get_all_chuyen_xe()
        top_routes_data = []
        for route in all_routes[:5]:
            top_routes_data.append({
                "name": f"{route.get('diemDi', '')} - {route.get('diemDen', '')}",
                "percentage": 20  # Placeholder
            })
        
        return {
            "stats": {
                "totalUsers": total_customers,
                "totalBookings": len(paid_tickets),
                "totalBuses": len([b for b in all_buses if b.get("trangThai") == "active"]),
                "totalRevenue": month_revenue
            },
            "recentBookings": recent_bookings,
            "activeBuses": active_buses,
            "revenueChart": monthly_revenue,
            "topRoutes": top_routes_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy dữ liệu dashboard: {str(e)}")


# ========== EXPORT CSV ENDPOINTS ==========

# UTF-8 BOM để Excel đọc đúng tiếng Việt
UTF8_BOM = '\ufeff'

def create_csv_response(content: str, filename: str):
    """Tạo response CSV với UTF-8 BOM"""
    # Thêm BOM vào đầu content
    content_with_bom = UTF8_BOM + content
    
    return StreamingResponse(
        iter([content_with_bom]),
        media_type="text/csv; charset=utf-8-sig",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{filename}",
            "Content-Type": "text/csv; charset=utf-8-sig"
        }
    )


@router.get("/export/invoices")
async def export_invoices_csv(
    period: str = Query("month", description="today, week, month, year, all"),
    current_user: dict = Depends(get_current_employee)
):
    """
    Xuất danh sách hóa đơn ra file CSV
    """
    try:
        start_dt, end_dt = get_date_range(period) if period != "all" else (None, None)
        
        all_invoices = await redis_service.get_all_hoa_don()
        
        # Filter theo thời gian
        if start_dt and end_dt:
            filtered = []
            for hd in all_invoices:
                ngay_tao = get_invoice_date(hd)
                if ngay_tao and start_dt <= ngay_tao <= end_dt:
                    filtered.append(hd)
            all_invoices = filtered
        
        # Tạo CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            "Mã HĐ", "Mã KH", "Tên KH", "Số vé", "Tổng tiền (VNĐ)", 
            "Phương thức TT", "Trạng thái", "Ngày lập", "Ghi chú"
        ])
        
        # Data
        for hd in all_invoices:
            # Lấy tên khách hàng
            maKH = hd.get("maKH", "")
            kh = await redis_service.get_khach_hang(maKH) if maKH else None
            ten_kh = kh.get("hoTen", "N/A") if kh else "N/A"
            
            writer.writerow([
                hd.get("maHD", ""),
                maKH,
                ten_kh,
                hd.get("soLuongVe", len(hd.get("danhSachVe", []))),
                hd.get("tongTien", 0),
                hd.get("phuongThucThanhToan", "N/A"),
                hd.get("trangThai", "N/A"),
                hd.get("ngayLap", hd.get("ngayTao", "N/A")),
                hd.get("ghiChu", "")
            ])
        
        output.seek(0)
        filename = f"hoa_don_{period}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return create_csv_response(output.getvalue(), filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất CSV: {str(e)}")


@router.get("/export/tickets")
async def export_tickets_csv(
    period: str = Query("month", description="today, week, month, year, all"),
    status: Optional[str] = Query(None, description="paid, confirmed, cancelled"),
    current_user: dict = Depends(get_current_employee)
):
    """
    Xuất danh sách vé ra file CSV
    """
    try:
        all_tickets = await redis_service.get_all("veXe")
        
        # Filter by status
        if status:
            all_tickets = [t for t in all_tickets if t.get("trangThai") == status]
        
        # Filter by date
        start_dt, end_dt = get_date_range(period) if period != "all" else (None, None)
        if start_dt and end_dt:
            filtered = []
            for ve in all_tickets:
                ngay_dat = parse_date(ve.get("ngayDat", ""))
                if ngay_dat and start_dt <= ngay_dat <= end_dt:
                    filtered.append(ve)
            all_tickets = filtered
        
        # Tạo CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            "Mã vé", "Mã HĐ", "Mã KH", "Tên KH", "Điểm đi", "Điểm đến",
            "Mã ghế", "Giá vé (VNĐ)", "Ngày đi", "Ngày đặt", "Trạng thái"
        ])
        
        # Data
        for ve in all_tickets:
            maKH = ve.get("maKH", "")
            kh = await redis_service.get_khach_hang(maKH) if maKH else None
            ten_kh = kh.get("hoTen", "N/A") if kh else "N/A"
            
            writer.writerow([
                ve.get("maVe", ""),
                ve.get("maHD", ""),
                maKH,
                ten_kh,
                ve.get("diemDi", "N/A"),
                ve.get("diemDen", "N/A"),
                ve.get("maGhe", "N/A"),
                ve.get("giaVe", 0),
                ve.get("ngayDi", "N/A"),
                ve.get("ngayDat", "N/A"),
                ve.get("trangThai", "N/A")
            ])
        
        output.seek(0)
        
        filename = f"ve_xe_{period}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return create_csv_response(output.getvalue(), filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất CSV: {str(e)}")


@router.get("/export/revenue")
async def export_revenue_csv(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_employee)
):
    """
    Xuất thống kê doanh thu theo ngày ra file CSV
    """
    try:
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        all_invoices = await redis_service.get_all_hoa_don()
        
        # Group theo ngày
        revenue_by_date = {}
        for hd in all_invoices:
            if hd.get("trangThai") == "cancelled":
                continue
            ngay_tao = get_invoice_date(hd)
            if ngay_tao:
                date_key = ngay_tao.strftime("%Y-%m-%d")
                if date_key not in revenue_by_date:
                    revenue_by_date[date_key] = {"revenue": 0, "bookings": 0, "tickets": 0}
                
                revenue_by_date[date_key]["revenue"] += float(hd.get("tongTien", 0) or 0)
                revenue_by_date[date_key]["bookings"] += 1
                revenue_by_date[date_key]["tickets"] += hd.get("soLuongVe", len(hd.get("danhSachVe", [])))
        
        # Tạo CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(["Ngày", "Số hóa đơn", "Số vé", "Doanh thu (VNĐ)"])
        
        # Data - tạo đầy đủ các ngày
        total_revenue = 0
        total_bookings = 0
        total_tickets = 0
        
        for i in range(days):
            date = (today_start - timedelta(days=days - 1 - i))
            date_key = date.strftime("%Y-%m-%d")
            
            data = revenue_by_date.get(date_key, {"revenue": 0, "bookings": 0, "tickets": 0})
            writer.writerow([
                date_key,
                data["bookings"],
                data["tickets"],
                data["revenue"]
            ])
            
            total_revenue += data["revenue"]
            total_bookings += data["bookings"]
            total_tickets += data["tickets"]
        
        # Tổng cộng
        writer.writerow([])
        writer.writerow(["TỔNG CỘNG", total_bookings, total_tickets, total_revenue])
        
        output.seek(0)
        
        filename = f"doanh_thu_{days}ngay_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return create_csv_response(output.getvalue(), filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất CSV: {str(e)}")


@router.get("/export/customers")
async def export_customers_csv(
    period: str = Query("all", description="today, week, month, year, all"),
    current_user: dict = Depends(get_current_employee)
):
    """
    Xuất thống kê khách hàng ra file CSV
    """
    try:
        start_dt, end_dt = get_date_range(period) if period != "all" else (None, None)
        
        all_invoices = await redis_service.get_all_hoa_don()
        
        # Filter
        if start_dt and end_dt:
            filtered = []
            for hd in all_invoices:
                ngay_tao = get_invoice_date(hd)
                if ngay_tao and start_dt <= ngay_tao <= end_dt:
                    filtered.append(hd)
            all_invoices = filtered
        
        # Group theo khách hàng
        customer_stats = {}
        for hd in all_invoices:
            if hd.get("trangThai") == "cancelled":
                continue
            maKH = hd.get("maKH", "")
            if not maKH:
                continue
            
            if maKH not in customer_stats:
                kh = await redis_service.get_khach_hang(maKH)
                customer_stats[maKH] = {
                    "maKH": maKH,
                    "hoTen": kh.get("hoTen", "N/A") if kh else "N/A",
                    "email": kh.get("email", "N/A") if kh else "N/A",
                    "SDT": kh.get("SDT", "N/A") if kh else "N/A",
                    "total_bookings": 0,
                    "total_tickets": 0,
                    "total_spent": 0
                }
            
            customer_stats[maKH]["total_bookings"] += 1
            customer_stats[maKH]["total_spent"] += float(hd.get("tongTien", 0) or 0)
            customer_stats[maKH]["total_tickets"] += hd.get("soLuongVe", len(hd.get("danhSachVe", [])))
        
        # Sort by total_spent
        customers_list = sorted(customer_stats.values(), key=lambda x: x["total_spent"], reverse=True)
        
        # Tạo CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            "Hạng", "Mã KH", "Họ tên", "Email", "SĐT", 
            "Số lần đặt", "Số vé", "Tổng chi tiêu (VNĐ)"
        ])
        
        # Data
        for i, c in enumerate(customers_list, 1):
            writer.writerow([
                i,
                c["maKH"],
                c["hoTen"],
                c["email"],
                c["SDT"],
                c["total_bookings"],
                c["total_tickets"],
                c["total_spent"]
            ])
        
        output.seek(0)
        
        filename = f"khach_hang_{period}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return create_csv_response(output.getvalue(), filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất CSV: {str(e)}")


@router.get("/export/routes")
async def export_routes_csv(
    period: str = Query("all", description="today, week, month, year, all"),
    current_user: dict = Depends(get_current_employee)
):
    """
    Xuất thống kê tuyến xe ra file CSV
    """
    try:
        start_dt, end_dt = get_date_range(period) if period != "all" else (None, None)
        
        all_tickets = await redis_service.get_all("veXe")
        
        # Filter
        if start_dt and end_dt:
            filtered = []
            for ve in all_tickets:
                ngay_dat = parse_date(ve.get("ngayDat", ""))
                if ngay_dat and start_dt <= ngay_dat <= end_dt:
                    filtered.append(ve)
            all_tickets = filtered
        
        # Group theo tuyến
        route_stats = {}
        for ve in all_tickets:
            if ve.get("trangThai") == "cancelled":
                continue
            
            maCX = ve.get("maCX", "")
            if not maCX:
                continue
            
            if maCX not in route_stats:
                cx = await redis_service.get_chuyen_xe(maCX)
                route_stats[maCX] = {
                    "maCX": maCX,
                    "diemDi": cx.get("diemDi", "N/A") if cx else ve.get("diemDi", "N/A"),
                    "diemDen": cx.get("diemDen", "N/A") if cx else ve.get("diemDen", "N/A"),
                    "giaVe": cx.get("giaChuyenXe", 0) if cx else 0,
                    "total_tickets": 0,
                    "total_revenue": 0
                }
            
            route_stats[maCX]["total_tickets"] += 1
            route_stats[maCX]["total_revenue"] += float(ve.get("giaVe", 0) or 0)
        
        # Sort by revenue
        routes_list = sorted(route_stats.values(), key=lambda x: x["total_revenue"], reverse=True)
        
        # Tạo CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            "Hạng", "Mã CX", "Điểm đi", "Điểm đến", "Giá vé (VNĐ)",
            "Số vé bán", "Doanh thu (VNĐ)"
        ])
        
        # Data
        total_tickets = 0
        total_revenue = 0
        for i, r in enumerate(routes_list, 1):
            writer.writerow([
                i,
                r["maCX"],
                r["diemDi"],
                r["diemDen"],
                r["giaVe"],
                r["total_tickets"],
                r["total_revenue"]
            ])
            total_tickets += r["total_tickets"]
            total_revenue += r["total_revenue"]
        
        # Tổng
        writer.writerow([])
        writer.writerow(["", "", "", "TỔNG CỘNG", "", total_tickets, total_revenue])
        
        output.seek(0)
        
        filename = f"tuyen_xe_{period}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return create_csv_response(output.getvalue(), filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất CSV: {str(e)}")
