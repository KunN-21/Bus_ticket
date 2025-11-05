"""Redis Cache Service cho User Management - Tối ưu hiệu năng"""
import json
from typing import Optional, List
from app.core.database import redis_client

CACHE_TTL = 300  # 5 phút

# ========== CACHE KEYS ==========
def employee_key(maNV: str) -> str:
    return f"emp:{maNV}"

def customer_key(maKH: str) -> str:
    return f"cust:{maKH}"

def employees_list_key() -> str:
    return "employees:all"

def customers_list_key() -> str:
    return "customers:all"

# ========== EMPLOYEE CACHE ==========
async def cache_employee(emp: dict) -> bool:
    """Cache single employee"""
    try:
        redis = redis_client.get_client()
        if not redis or not emp.get("maNV"):
            return False
        
        emp_copy = emp.copy()
        # Convert datetime to ISO string
        for key in ["lanCuoiDangNhap", "thoiGianTao"]:
            if key in emp_copy and emp_copy[key]:
                emp_copy[key] = emp_copy[key].isoformat()
        
        await redis.setex(employee_key(emp["maNV"]), CACHE_TTL, json.dumps(emp_copy))
        return True
    except Exception as e:
        print(f"❌ Cache employee error: {e}")
        return False

async def get_cached_employee(maNV: str) -> Optional[dict]:
    """Get cached employee"""
    try:
        redis = redis_client.get_client()
        if not redis:
            return None
        
        cached = await redis.get(employee_key(maNV))
        return json.loads(cached) if cached else None
    except:
        return None

async def invalidate_employee(maNV: str) -> bool:
    """Xóa cache employee"""
    try:
        redis = redis_client.get_client()
        if not redis:
            return False
        
        await redis.delete(employee_key(maNV))
        await redis.delete(employees_list_key())
        return True
    except:
        return False

# ========== CUSTOMER CACHE ==========
async def cache_customer(cust: dict) -> bool:
    """Cache single customer"""
    try:
        redis = redis_client.get_client()
        if not redis or not cust.get("maKH"):
            return False
        
        cust_copy = cust.copy()
        for key in ["lanCuoiDangNhap", "thoiGianTao"]:
            if key in cust_copy and cust_copy[key]:
                cust_copy[key] = cust_copy[key].isoformat()
        
        await redis.setex(customer_key(cust["maKH"]), CACHE_TTL, json.dumps(cust_copy))
        return True
    except Exception as e:
        print(f"❌ Cache customer error: {e}")
        return False

async def get_cached_customer(maKH: str) -> Optional[dict]:
    """Get cached customer"""
    try:
        redis = redis_client.get_client()
        if not redis:
            return None
        
        cached = await redis.get(customer_key(maKH))
        return json.loads(cached) if cached else None
    except:
        return None

async def invalidate_customer(maKH: str) -> bool:
    """Xóa cache customer"""
    try:
        redis = redis_client.get_client()
        if not redis:
            return False
        
        await redis.delete(customer_key(maKH))
        await redis.delete(customers_list_key())
        return True
    except:
        return False

# ========== LIST CACHE ==========
async def cache_employees_list(employees: List[dict]) -> bool:
    """Cache danh sách nhân viên"""
    try:
        redis = redis_client.get_client()
        if not redis:
            return False
        
        emp_list = []
        for emp in employees:
            emp_copy = emp.copy()
            for key in ["lanCuoiDangNhap", "thoiGianTao"]:
                if key in emp_copy and emp_copy[key]:
                    emp_copy[key] = emp_copy[key].isoformat()
            emp_list.append(emp_copy)
        
        await redis.setex(employees_list_key(), CACHE_TTL, json.dumps(emp_list))
        return True
    except:
        return False

async def get_cached_employees_list() -> Optional[List[dict]]:
    """Get cached danh sách nhân viên"""
    try:
        redis = redis_client.get_client()
        if not redis:
            return None
        
        cached = await redis.get(employees_list_key())
        return json.loads(cached) if cached else None
    except:
        return None

async def cache_customers_list(customers: List[dict]) -> bool:
    """Cache danh sách khách hàng"""
    try:
        redis = redis_client.get_client()
        if not redis:
            return False
        
        cust_list = []
        for cust in customers:
            cust_copy = cust.copy()
            for key in ["lanCuoiDangNhap", "thoiGianTao"]:
                if key in cust_copy and cust_copy[key]:
                    cust_copy[key] = cust_copy[key].isoformat()
            cust_list.append(cust_copy)
        
        await redis.setex(customers_list_key(), CACHE_TTL, json.dumps(cust_list))
        return True
    except:
        return False

async def get_cached_customers_list() -> Optional[List[dict]]:
    """Get cached danh sách khách hàng"""
    try:
        redis = redis_client.get_client()
        if not redis:
            return None
        
        cached = await redis.get(customers_list_key())
        return json.loads(cached) if cached else None
    except:
        return None

# ========== BULK INVALIDATE ==========
async def invalidate_all_employees() -> bool:
    """Xóa tất cả cache nhân viên"""
    try:
        redis = redis_client.get_client()
        if not redis:
            return False
        
        await redis.delete(employees_list_key())
        
        # Xóa tất cả emp:* keys
        cursor = 0
        while True:
            cursor, keys = await redis.scan(cursor, match="emp:*", count=100)
            if keys:
                await redis.delete(*keys)
            if cursor == 0:
                break
        
        return True
    except:
        return False

async def invalidate_all_customers() -> bool:
    """Xóa tất cả cache khách hàng"""
    try:
        redis = redis_client.get_client()
        if not redis:
            return False
        
        await redis.delete(customers_list_key())
        
        cursor = 0
        while True:
            cursor, keys = await redis.scan(cursor, match="cust:*", count=100)
            if keys:
                await redis.delete(*keys)
            if cursor == 0:
                break
        
        return True
    except:
        return False
