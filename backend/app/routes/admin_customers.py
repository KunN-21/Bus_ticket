"""
Rebuilt Admin Customer Routes

Provides CRUD for customers.
- View & Create: Admin and Employee can view and create customers
- Update & Delete: Only Admin can update/delete
Ensures consistent request/response shapes and clear validation messages.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime, timedelta
from app.models.users import CustomerCreate, CustomerUpdate, CustomerResponse
from app.core.database import mongodb_client
from app.core.middleware import get_current_employee, get_current_admin
from app.core.jwt_settings import hash_password
from app.services import cache_service

router = APIRouter(prefix="/api/v1/admin/customers", tags=["Admin - Customers"])


def generate_customer_id() -> str:
    import random, time
    return f"KH{int(time.time()*1000)%100000:05d}{random.randint(1000,9999)}"


@router.get("", response_model=List[CustomerResponse])
async def list_customers(current_employee: dict = Depends(get_current_employee)):
    db = mongodb_client.get_db()

    cached = await cache_service.get_cached_customers_list()
    if cached:
        return cached

    docs = await db.khachhang.find().to_list(1000)
    result = []
    for d in docs:
        d.pop("password", None)
        d.pop("_id", None)
        result.append(d)

    await cache_service.cache_customers_list(result)
    return result


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(customer: CustomerCreate, current_employee: dict = Depends(get_current_employee)):
    db = mongodb_client.get_db()

    # Email uniqueness across both collections
    if await db.khachhang.find_one({"email": customer.email}):
        raise HTTPException(status_code=400, detail="Email đã được sử dụng bởi khách hàng khác")
    if await db.nhanvien.find_one({"email": customer.email}):
        raise HTTPException(status_code=400, detail="Email đã được sử dụng bởi nhân viên")

    # CCCD uniqueness
    if await db.khachhang.find_one({"CCCD": customer.CCCD}):
        raise HTTPException(status_code=400, detail="Số CCCD đã được sử dụng")

    cust = {
        "maKH": generate_customer_id(),
        "hoTen": customer.hoTen,
        "email": customer.email,
        "SDT": customer.SDT,
        "CCCD": customer.CCCD,
        "diaChi": customer.diaChi,
        "password": hash_password(customer.password),
        "lanCuoiDangNhap": None,
        "thoiGianTao": datetime.utcnow()
    }

    res = await db.khachhang.insert_one(cust)
    if not res.inserted_id:
        raise HTTPException(status_code=500, detail="Không thể tạo khách hàng")

    cust.pop("password", None)
    await cache_service.invalidate_all_customers()
    await cache_service.cache_customer(cust)

    return cust


@router.put("/{maKH}", response_model=CustomerResponse)
async def update_customer(maKH: str, payload: CustomerUpdate, current_admin: dict = Depends(get_current_admin)):
    db = mongodb_client.get_db()

    existing = await db.khachhang.find_one({"maKH": maKH})
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy khách hàng")

    update = {}
    if payload.hoTen: update["hoTen"] = payload.hoTen
    if payload.SDT: update["SDT"] = payload.SDT
    if payload.diaChi: update["diaChi"] = payload.diaChi
    if payload.password: update["password"] = hash_password(payload.password)

    # Check email uniqueness across both collections
    if payload.email:
        if payload.email != existing.get("email"):
            if await db.khachhang.find_one({"email": payload.email}):
                raise HTTPException(status_code=400, detail="Email đã được sử dụng bởi khách hàng khác")
            if await db.nhanvien.find_one({"email": payload.email}):
                raise HTTPException(status_code=400, detail="Email đã được sử dụng bởi nhân viên")
        update["email"] = payload.email

    if payload.CCCD:
        if payload.CCCD != existing.get("CCCD") and await db.khachhang.find_one({"CCCD": payload.CCCD}):
            raise HTTPException(status_code=400, detail="Số CCCD đã được sử dụng")
        update["CCCD"] = payload.CCCD

    if not update:
        raise HTTPException(status_code=400, detail="Không có thông tin nào được cập nhật")

    res = await db.khachhang.update_one({"maKH": maKH}, {"$set": update})
    if res.modified_count == 0:
        raise HTTPException(status_code=400, detail="Không có thay đổi nào")

    await cache_service.invalidate_customer(maKH)

    updated = await db.khachhang.find_one({"maKH": maKH})
    updated.pop("password", None)
    updated.pop("_id", None)
    return updated


@router.delete("/{maKH}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(maKH: str, current_admin: dict = Depends(get_current_admin)):
    db = mongodb_client.get_db()

    if not await db.khachhang.find_one({"maKH": maKH}):
        raise HTTPException(status_code=404, detail="Không tìm thấy khách hàng")

    res = await db.khachhang.delete_one({"maKH": maKH})
    if res.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Không thể xóa khách hàng")

    await cache_service.invalidate_customer(maKH)
    return None


@router.get("/stats/overview")
async def get_customer_statistics(current_employee: dict = Depends(get_current_employee)):
    db = mongodb_client.get_db()
    total = await db.khachhang.count_documents({})
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_this_month = await db.khachhang.count_documents({"thoiGianTao": {"$gte": start_of_month}})
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    active = await db.khachhang.count_documents({"lanCuoiDangNhap": {"$gte": thirty_days_ago}})
    return {
        "total_customers": total,
        "new_this_month": new_this_month,
        "active_customers": active,
        "inactive_customers": total - active
    }
