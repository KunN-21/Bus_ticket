"""
Statistics Routes - Thống kê doanh thu và tuyến xe phổ biến
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import mongodb_client
from app.core.middleware import get_current_employee
from app.utils import get_current_time_hcm

router = APIRouter(prefix="/api/v1/statistics", tags=["Statistics"])


# ========== MODELS ==========
class RevenueStats(BaseModel):
    """Thống kê doanh thu"""
    total_revenue: float
    total_bookings: int
    total_tickets: int
    average_ticket_price: float


class DailyRevenue(BaseModel):
    """Doanh thu theo ngày"""
    date: str
    revenue: float
    bookings: int
    tickets: int


class RouteStats(BaseModel):
    """Thống kê tuyến xe"""
    maTuyenXe: str
    diemDi: str
    diemDen: str
    total_bookings: int
    total_tickets: int
    total_revenue: float


class OverviewStats(BaseModel):
    """Thống kê tổng quan"""
    today: RevenueStats
    this_week: RevenueStats
    this_month: RevenueStats
    this_year: RevenueStats


# ========== HELPER FUNCTIONS ==========
def get_date_range(period: str):
    """Lấy khoảng thời gian theo period"""
    now = get_current_time_hcm()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if period == "today":
        start_date = today_start
        end_date = now
    elif period == "yesterday":
        start_date = today_start - timedelta(days=1)
        end_date = today_start
    elif period == "week":
        # Tuần này (từ thứ 2)
        days_since_monday = now.weekday()
        start_date = today_start - timedelta(days=days_since_monday)
        end_date = now
    elif period == "last_week":
        days_since_monday = now.weekday()
        start_date = today_start - timedelta(days=days_since_monday + 7)
        end_date = today_start - timedelta(days=days_since_monday)
    elif period == "month":
        start_date = today_start.replace(day=1)
        end_date = now
    elif period == "last_month":
        first_day_this_month = today_start.replace(day=1)
        last_day_prev_month = first_day_this_month - timedelta(days=1)
        start_date = last_day_prev_month.replace(day=1)
        end_date = first_day_this_month
    elif period == "year":
        start_date = today_start.replace(month=1, day=1)
        end_date = now
    elif period == "last_7_days":
        start_date = today_start - timedelta(days=7)
        end_date = now
    elif period == "last_30_days":
        start_date = today_start - timedelta(days=30)
        end_date = now
    elif period == "last_90_days":
        start_date = today_start - timedelta(days=90)
        end_date = now
    else:
        start_date = today_start
        end_date = now
    
    return start_date, end_date


async def calculate_revenue_stats(db, start_date: datetime, end_date: datetime) -> RevenueStats:
    """Tính toán thống kê doanh thu trong khoảng thời gian"""
    pipeline = [
        {
            "$match": {
                "trangThai": "paid",
                "ngayThanhToan": {"$gte": start_date, "$lt": end_date}
            }
        },
        {
            "$group": {
                "_id": None,
                "total_revenue": {"$sum": "$tongTien"},
                "total_bookings": {"$sum": 1},
                "total_tickets": {"$sum": {"$size": {"$ifNull": ["$soGheNgoi", []]}}}
            }
        }
    ]
    
    result = await db.veXe.aggregate(pipeline).to_list(1)
    
    if result:
        data = result[0]
        avg_price = data["total_revenue"] / data["total_tickets"] if data["total_tickets"] > 0 else 0
        return RevenueStats(
            total_revenue=data["total_revenue"],
            total_bookings=data["total_bookings"],
            total_tickets=data["total_tickets"],
            average_ticket_price=avg_price
        )
    
    return RevenueStats(
        total_revenue=0,
        total_bookings=0,
        total_tickets=0,
        average_ticket_price=0
    )


# ========== ENDPOINTS ==========

@router.get("/overview")
async def get_overview_stats(current_user: dict = Depends(get_current_employee)):
    """
    Lấy thống kê tổng quan: hôm nay, tuần này, tháng này, năm nay
    """
    db = mongodb_client.get_db()
    
    # Tính thống kê cho các khoảng thời gian
    today_start, today_end = get_date_range("today")
    week_start, week_end = get_date_range("week")
    month_start, month_end = get_date_range("month")
    year_start, year_end = get_date_range("year")
    
    today_stats = await calculate_revenue_stats(db, today_start, today_end)
    week_stats = await calculate_revenue_stats(db, week_start, week_end)
    month_stats = await calculate_revenue_stats(db, month_start, month_end)
    year_stats = await calculate_revenue_stats(db, year_start, year_end)
    
    return {
        "today": today_stats,
        "this_week": week_stats,
        "this_month": month_stats,
        "this_year": year_stats
    }


@router.get("/revenue")
async def get_revenue_stats(
    period: str = Query("month", description="today, week, month, year, last_7_days, last_30_days"),
    start_date: Optional[str] = Query(None, description="Custom start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Custom end date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy thống kê doanh thu theo khoảng thời gian
    """
    db = mongodb_client.get_db()
    
    # Xác định khoảng thời gian
    if start_date and end_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        start_dt, end_dt = get_date_range(period)
    
    stats = await calculate_revenue_stats(db, start_dt, end_dt)
    
    return {
        "period": period if not (start_date and end_date) else "custom",
        "start_date": start_dt.strftime("%Y-%m-%d"),
        "end_date": end_dt.strftime("%Y-%m-%d"),
        "stats": stats
    }


@router.get("/revenue/daily")
async def get_daily_revenue(
    days: int = Query(30, ge=1, le=365, description="Số ngày gần đây"),
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy doanh thu theo từng ngày (để vẽ biểu đồ)
    """
    db = mongodb_client.get_db()
    now = get_current_time_hcm()
    start_date = now - timedelta(days=days)
    
    pipeline = [
        {
            "$match": {
                "trangThai": "paid",
                "ngayThanhToan": {"$gte": start_date}
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$ngayThanhToan"}
                },
                "revenue": {"$sum": "$tongTien"},
                "bookings": {"$sum": 1},
                "tickets": {"$sum": {"$size": {"$ifNull": ["$soGheNgoi", []]}}}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.veXe.aggregate(pipeline).to_list(365)
    
    # Tạo dict từ kết quả
    revenue_by_date = {r["_id"]: r for r in results}
    
    # Tạo danh sách đầy đủ các ngày
    daily_data = []
    for i in range(days):
        date = (now - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        if date in revenue_by_date:
            data = revenue_by_date[date]
            daily_data.append(DailyRevenue(
                date=date,
                revenue=data["revenue"],
                bookings=data["bookings"],
                tickets=data["tickets"]
            ))
        else:
            daily_data.append(DailyRevenue(
                date=date,
                revenue=0,
                bookings=0,
                tickets=0
            ))
    
    # Tính tổng
    total_revenue = sum(d.revenue for d in daily_data)
    total_bookings = sum(d.bookings for d in daily_data)
    total_tickets = sum(d.tickets for d in daily_data)
    
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


@router.get("/revenue/monthly")
async def get_monthly_revenue(
    months: int = Query(12, ge=1, le=24, description="Số tháng gần đây"),
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy doanh thu theo từng tháng (để vẽ biểu đồ)
    """
    db = mongodb_client.get_db()
    now = get_current_time_hcm()
    
    # Tính ngày bắt đầu (đầu tháng cách đây N tháng)
    start_month = now.month - months
    start_year = now.year
    while start_month <= 0:
        start_month += 12
        start_year -= 1
    start_date = datetime(start_year, start_month, 1)
    
    pipeline = [
        {
            "$match": {
                "trangThai": "paid",
                "ngayThanhToan": {"$gte": start_date}
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m", "date": "$ngayThanhToan"}
                },
                "revenue": {"$sum": "$tongTien"},
                "bookings": {"$sum": 1},
                "tickets": {"$sum": {"$size": {"$ifNull": ["$soGheNgoi", []]}}}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.veXe.aggregate(pipeline).to_list(24)
    
    return {
        "months": months,
        "monthly_data": [
            {
                "month": r["_id"],
                "revenue": r["revenue"],
                "bookings": r["bookings"],
                "tickets": r["tickets"]
            }
            for r in results
        ]
    }


@router.get("/routes/popular")
async def get_popular_routes(
    period: str = Query("month", description="today, week, month, year, all"),
    limit: int = Query(10, ge=1, le=50, description="Số tuyến hiển thị"),
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy danh sách tuyến xe phổ biến nhất
    """
    db = mongodb_client.get_db()
    
    # Xác định khoảng thời gian
    if period == "all":
        match_stage = {"$match": {"trangThai": "paid"}}
    else:
        start_dt, end_dt = get_date_range(period)
        match_stage = {
            "$match": {
                "trangThai": "paid",
                "ngayThanhToan": {"$gte": start_dt, "$lt": end_dt}
            }
        }
    
    pipeline = [
        match_stage,
        {
            "$group": {
                "_id": "$maTuyenXe",
                "total_bookings": {"$sum": 1},
                "total_tickets": {"$sum": {"$size": {"$ifNull": ["$soGheNgoi", []]}}},
                "total_revenue": {"$sum": "$tongTien"}
            }
        },
        {"$sort": {"total_bookings": -1}},
        {"$limit": limit}
    ]
    
    results = await db.veXe.aggregate(pipeline).to_list(limit)
    
    # Lấy thông tin tuyến xe
    routes_data = []
    for r in results:
        route = await db.chuyenXe.find_one({"maTuyenXe": r["_id"]})
        if route:
            routes_data.append(RouteStats(
                maTuyenXe=r["_id"],
                diemDi=route.get("diemDi", "N/A"),
                diemDen=route.get("diemDen", "N/A"),
                total_bookings=r["total_bookings"],
                total_tickets=r["total_tickets"],
                total_revenue=r["total_revenue"]
            ))
        else:
            routes_data.append(RouteStats(
                maTuyenXe=r["_id"],
                diemDi="N/A",
                diemDen="N/A",
                total_bookings=r["total_bookings"],
                total_tickets=r["total_tickets"],
                total_revenue=r["total_revenue"]
            ))
    
    return {
        "period": period,
        "routes": routes_data
    }


@router.get("/routes/{ma_tuyen}")
async def get_route_stats(
    ma_tuyen: str,
    period: str = Query("month", description="today, week, month, year, all"),
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy thống kê chi tiết cho một tuyến xe cụ thể
    """
    db = mongodb_client.get_db()
    
    # Kiểm tra tuyến xe tồn tại
    route = await db.chuyenXe.find_one({"maTuyenXe": ma_tuyen})
    if not route:
        raise HTTPException(status_code=404, detail="Không tìm thấy tuyến xe")
    
    # Xác định khoảng thời gian
    if period == "all":
        match_query = {"maTuyenXe": ma_tuyen, "trangThai": "paid"}
    else:
        start_dt, end_dt = get_date_range(period)
        match_query = {
            "maTuyenXe": ma_tuyen,
            "trangThai": "paid",
            "ngayThanhToan": {"$gte": start_dt, "$lt": end_dt}
        }
    
    # Thống kê tổng
    pipeline = [
        {"$match": match_query},
        {
            "$group": {
                "_id": None,
                "total_bookings": {"$sum": 1},
                "total_tickets": {"$sum": {"$size": {"$ifNull": ["$soGheNgoi", []]}}},
                "total_revenue": {"$sum": "$tongTien"}
            }
        }
    ]
    
    stats_result = await db.veXe.aggregate(pipeline).to_list(1)
    
    # Thống kê theo ngày
    daily_pipeline = [
        {"$match": match_query},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$ngayThanhToan"}},
                "bookings": {"$sum": 1},
                "revenue": {"$sum": "$tongTien"}
            }
        },
        {"$sort": {"_id": -1}},
        {"$limit": 30}
    ]
    
    daily_result = await db.veXe.aggregate(daily_pipeline).to_list(30)
    
    stats = stats_result[0] if stats_result else {"total_bookings": 0, "total_tickets": 0, "total_revenue": 0}
    
    return {
        "route_info": {
            "maTuyenXe": route.get("maTuyenXe"),
            "diemDi": route.get("diemDi"),
            "diemDen": route.get("diemDen"),
            "giaVe": route.get("giaVe")
        },
        "period": period,
        "stats": {
            "total_bookings": stats.get("total_bookings", 0),
            "total_tickets": stats.get("total_tickets", 0),
            "total_revenue": stats.get("total_revenue", 0)
        },
        "daily_breakdown": [
            {"date": d["_id"], "bookings": d["bookings"], "revenue": d["revenue"]}
            for d in daily_result
        ]
    }


@router.get("/customers/top")
async def get_top_customers(
    period: str = Query("month", description="today, week, month, year, all"),
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_employee)
):
    """
    Lấy danh sách khách hàng đặt vé nhiều nhất
    """
    db = mongodb_client.get_db()
    
    # Xác định khoảng thời gian
    if period == "all":
        match_stage = {"$match": {"trangThai": "paid"}}
    else:
        start_dt, end_dt = get_date_range(period)
        match_stage = {
            "$match": {
                "trangThai": "paid",
                "ngayThanhToan": {"$gte": start_dt, "$lt": end_dt}
            }
        }
    
    pipeline = [
        match_stage,
        {
            "$group": {
                "_id": "$maKH",
                "total_bookings": {"$sum": 1},
                "total_tickets": {"$sum": {"$size": {"$ifNull": ["$soGheNgoi", []]}}},
                "total_spent": {"$sum": "$tongTien"}
            }
        },
        {"$sort": {"total_spent": -1}},
        {"$limit": limit}
    ]
    
    results = await db.veXe.aggregate(pipeline).to_list(limit)
    
    # Lấy thông tin khách hàng
    customers_data = []
    for r in results:
        customer = await db.khachhang.find_one({"maKH": r["_id"]})
        if customer:
            customers_data.append({
                "maKH": r["_id"],
                "hoTen": customer.get("hoTen", "N/A"),
                "email": customer.get("email", "N/A"),
                "SDT": customer.get("SDT", "N/A"),
                "total_bookings": r["total_bookings"],
                "total_tickets": r["total_tickets"],
                "total_spent": r["total_spent"]
            })
    
    return {
        "period": period,
        "customers": customers_data
    }


@router.get("/summary")
async def get_summary_dashboard(current_user: dict = Depends(get_current_employee)):
    """
    Lấy tất cả dữ liệu thống kê cho dashboard
    """
    db = mongodb_client.get_db()
    
    # Thống kê tổng quan
    now = get_current_time_hcm()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())
    month_start = today_start.replace(day=1)
    
    # Doanh thu hôm nay
    today_stats = await calculate_revenue_stats(db, today_start, now)
    
    # Doanh thu tuần này
    week_stats = await calculate_revenue_stats(db, week_start, now)
    
    # Doanh thu tháng này
    month_stats = await calculate_revenue_stats(db, month_start, now)
    
    # Top 5 tuyến phổ biến tháng này
    popular_routes_pipeline = [
        {
            "$match": {
                "trangThai": "paid",
                "ngayThanhToan": {"$gte": month_start}
            }
        },
        {
            "$group": {
                "_id": "$maTuyenXe",
                "count": {"$sum": 1},
                "revenue": {"$sum": "$tongTien"}
            }
        },
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    
    popular_routes = await db.veXe.aggregate(popular_routes_pipeline).to_list(5)
    
    # Lấy thông tin tuyến
    routes_with_info = []
    for r in popular_routes:
        route = await db.chuyenXe.find_one({"maTuyenXe": r["_id"]})
        if route:
            routes_with_info.append({
                "maTuyenXe": r["_id"],
                "tenTuyen": f"{route.get('diemDi', '')} → {route.get('diemDen', '')}",
                "bookings": r["count"],
                "revenue": r["revenue"]
            })
    
    # Doanh thu 7 ngày gần đây
    last_7_days = []
    for i in range(7):
        date = today_start - timedelta(days=6-i)
        next_date = date + timedelta(days=1)
        stats = await calculate_revenue_stats(db, date, next_date)
        last_7_days.append({
            "date": date.strftime("%Y-%m-%d"),
            "day_name": ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][date.weekday()],
            "revenue": stats.total_revenue,
            "bookings": stats.total_bookings
        })
    
    # Đếm tổng
    total_customers = await db.khachhang.count_documents({})
    total_routes = await db.chuyenXe.count_documents({})
    pending_cancels = await db.yeuCauHuyVe.count_documents({"trangThai": "pending"})
    
    return {
        "overview": {
            "today": today_stats,
            "this_week": week_stats,
            "this_month": month_stats
        },
        "counts": {
            "total_customers": total_customers,
            "total_routes": total_routes,
            "pending_cancel_requests": pending_cancels
        },
        "popular_routes": routes_with_info,
        "revenue_chart": last_7_days
    }
