"""
Rebuilt Admin Employee Routes

This file provides clean, consistent create/read/update/delete endpoints for
employees using the Pydantic models defined in `app.models.users` and the
`chucvu` collection for role codes (e.g. "CV001", "CV002"). Endpoints accept
`maChucVu` codes and validate against the `chucvu` collection.

Notes:
- Only admins can access these endpoints (depends on `get_current_admin`).
- Passwords are hashed and never returned in responses.
- Responses include `chucVuInfo` populated from `chucvu` collection.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime
from app.models.users import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from app.core.database import mongodb_client
from app.core.middleware import get_current_admin, get_current_employee
from app.core.jwt_settings import hash_password
from app.services import cache_service

router = APIRouter(prefix="/api/v1/admin/employees", tags=["Admin - Employees"])


def generate_employee_id() -> str:
    import random, time
    return f"NV{int(time.time()*1000)%100000:05d}{random.randint(100,999)}"


@router.get("", response_model=List[EmployeeResponse])
async def list_employees(current_employee: dict = Depends(get_current_employee)):
    db = mongodb_client.get_db()

    # Allow both admin (CV001) and staff (CV002) to view the employee list.
    # Creation / update / delete endpoints still require admin privileges.
    cached = await cache_service.get_cached_employees_list()
    if cached:
        return cached

    docs = await db.nhanvien.find().to_list(1000)
    result = []
    for d in docs:
        d.pop("password", None)
        d.pop("_id", None)
        if d.get("maChucVu"):
            ch = await db.chucvu.find_one({"maChucVu": d["maChucVu"]})
            if ch:
                ch.pop("_id", None)
                d["chucVuInfo"] = ch
        result.append(d)

    await cache_service.cache_employees_list(result)
    return result


@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(employee: EmployeeCreate, current_admin: dict = Depends(get_current_admin)):
    db = mongodb_client.get_db()

    # Unique checks
    if await db.nhanvien.find_one({"email": employee.email}):
        raise HTTPException(status_code=400, detail="Email đã được sử dụng bởi nhân viên khác")
    if await db.khachhang.find_one({"email": employee.email}):
        raise HTTPException(status_code=400, detail="Email đã được sử dụng bởi khách hàng")
    if await db.nhanvien.find_one({"CCCD": employee.CCCD}):
        raise HTTPException(status_code=400, detail="Số CCCD đã được sử dụng")

    # Validate role code via chucvu collection
    chuc_vu = None
    if employee.maChucVu:
        chuc_vu = await db.chucvu.find_one({"maChucVu": employee.maChucVu})
        if not chuc_vu:
            raise HTTPException(status_code=400, detail=f"Chức vụ '{employee.maChucVu}' không tồn tại")

    # Insert employee
    emp = {
        "maNV": generate_employee_id(),
        "maChucVu": employee.maChucVu,
        "hoTen": employee.hoTen,
        "email": employee.email,
        "SDT": employee.SDT,
        "CCCD": employee.CCCD,
        "diaChi": employee.diaChi,
        "password": hash_password(employee.password),
        "hoaDon": [],
        "lanCuoiDangNhap": None,
        "thoiGianTao": datetime.utcnow()
    }

    res = await db.nhanvien.insert_one(emp)
    if not res.inserted_id:
        raise HTTPException(status_code=500, detail="Không thể tạo nhân viên")

    emp.pop("password", None)
    if chuc_vu:
        chuc_vu.pop("_id", None)
        emp["chucVuInfo"] = chuc_vu

    await cache_service.invalidate_all_employees()
    await cache_service.cache_employee(emp)

    return emp


@router.put("/{maNV}", response_model=EmployeeResponse)
async def update_employee(maNV: str, payload: EmployeeUpdate, current_admin: dict = Depends(get_current_admin)):
    db = mongodb_client.get_db()

    existing = await db.nhanvien.find_one({"maNV": maNV})
    if not existing:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")

    # Prevent changing own role to avoid lockout
    if current_admin.get("maNV") == maNV and payload.maChucVu and payload.maChucVu != existing.get("maChucVu"):
        raise HTTPException(status_code=400, detail="Không thể thay đổi chức vụ của chính mình")

    update = {}
    if payload.hoTen: update["hoTen"] = payload.hoTen
    if payload.SDT: update["SDT"] = payload.SDT
    if payload.diaChi: update["diaChi"] = payload.diaChi
    if payload.password: update["password"] = hash_password(payload.password)

    if payload.CCCD:
        if payload.CCCD != existing.get("CCCD") and await db.nhanvien.find_one({"CCCD": payload.CCCD}):
            raise HTTPException(status_code=400, detail="Số CCCD đã được sử dụng")
        update["CCCD"] = payload.CCCD

    if payload.maChucVu:
        ch = await db.chucvu.find_one({"maChucVu": payload.maChucVu})
        if not ch:
            raise HTTPException(status_code=400, detail="Chức vụ không tồn tại")
        update["maChucVu"] = payload.maChucVu

    if not update:
        raise HTTPException(status_code=400, detail="Không có thông tin nào được cập nhật")

    res = await db.nhanvien.update_one({"maNV": maNV}, {"$set": update})
    if res.modified_count == 0:
        raise HTTPException(status_code=400, detail="Không có thay đổi nào")

    await cache_service.invalidate_employee(maNV)

    updated = await db.nhanvien.find_one({"maNV": maNV})
    updated.pop("password", None)
    updated.pop("_id", None)
    if updated.get("maChucVu"):
        ch = await db.chucvu.find_one({"maChucVu": updated["maChucVu"]})
        if ch:
            ch.pop("_id", None)
            updated["chucVuInfo"] = ch

    return updated


@router.delete("/{maNV}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(maNV: str, current_admin: dict = Depends(get_current_admin)):
    db = mongodb_client.get_db()

    if current_admin.get("maNV") == maNV:
        raise HTTPException(status_code=400, detail="Không thể xóa tài khoản của chính mình")

    if not await db.nhanvien.find_one({"maNV": maNV}):
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")

    res = await db.nhanvien.delete_one({"maNV": maNV})
    if res.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Không thể xóa nhân viên")

    await cache_service.invalidate_employee(maNV)

    return None
