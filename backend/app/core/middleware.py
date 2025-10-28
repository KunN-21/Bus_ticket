from fastapi import HTTPException, Header, status
from .jwt_settings import decode_access_token
from .database import mongodb_client

async def get_current_user(authorization: str = Header(None)):
    """
    Middleware to get current authenticated user
    Expects: Authorization: Bearer <token>
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token"
        )
    
    try:
        # Extract token from "Bearer <token>"
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme"
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format"
        )
    
    # Decode token
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    return payload

async def get_current_customer(authorization: str = Header(None)):
    """
    Get current customer from token
    """
    payload = await get_current_user(authorization)
    
    if payload.get("type") != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Customer account required."
        )
    
    db = mongodb_client.get_db()
    customer = await db.khachhang.find_one({"email": payload.get("sub")})
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    customer.pop("password")
    customer["_id"] = str(customer["_id"])
    
    return customer

async def get_current_employee(authorization: str = Header(None)):
    """
    Get current employee from token
    """
    payload = await get_current_user(authorization)
    
    if payload.get("type") != "employee":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Employee account required."
        )
    
    db = mongodb_client.get_db()
    employee = await db.nhanvien.find_one({"maNV": payload.get("maNV")})
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    employee.pop("password")
    employee["_id"] = str(employee["_id"])
    
    return employee
