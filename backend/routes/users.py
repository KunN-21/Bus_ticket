from fastapi import APIRouter, HTTPException, status
from models import UserRegister, UserLogin, UserResponse, Token, OTPRequest, OTPVerify, OTPResponse
from database import mongodb_client, redis_client
from auth import hash_password, verify_password, create_access_token
from otp import generate_otp, send_otp_sms, store_otp, verify_otp, OTP_EXPIRY
from datetime import datetime
from bson import ObjectId
import json

router = APIRouter()

def user_helper(user) -> dict:
    return {
        "_id": str(user["_id"]),
        "phone": user["phone"],
        "full_name": user["full_name"],
        "email": user.get("email"),
        "created_at": user["created_at"],
        "is_verified": user.get("is_verified", False)
    }

@router.post("/request-otp", response_model=OTPResponse)
async def request_otp(data: OTPRequest):
    """Gửi OTP đến số điện thoại để đăng ký"""
    db = mongodb_client.get_db()
    
    # Check if phone already registered
    existing_user = await db.users.find_one({"phone": data.phone})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Số điện thoại đã được đăng ký"
        )
    
    # Generate and send OTP
    otp = generate_otp()
    await store_otp(data.phone, otp)
    await send_otp_sms(data.phone, otp)
    
    return {
        "message": f"OTP đã được gửi đến {data.phone}",
        "expires_in": OTP_EXPIRY
    }

@router.post("/verify-otp")
async def verify_otp_endpoint(data: OTPVerify):
    """Xác thực OTP"""
    is_valid = await verify_otp(data.phone, data.otp)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP không hợp lệ hoặc đã hết hạn"
        )
    
    return {
        "message": "OTP xác thực thành công",
        "phone": data.phone
    }

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user: UserRegister):
    """Đăng ký tài khoản mới sau khi xác thực OTP"""
    db = mongodb_client.get_db()
    
    # Check if user exists
    existing_user = await db.users.find_one({"phone": user.phone})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Số điện thoại đã được đăng ký"
        )
    
    # Create user
    user_dict = {
        "phone": user.phone,
        "full_name": user.full_name,
        "email": None,
        "password": hash_password(user.password),
        "created_at": datetime.now(),
        "is_verified": True
    }
    
    result = await db.users.insert_one(user_dict)
    new_user = await db.users.find_one({"_id": result.inserted_id})
    
    # Create access token
    access_token = create_access_token({"sub": str(new_user["_id"]), "phone": new_user["phone"]})
    
    user_response = user_helper(new_user)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Đăng nhập bằng số điện thoại và mật khẩu"""
    db = mongodb_client.get_db()
    
    # Find user by phone
    user = await db.users.find_one({"phone": credentials.phone})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Số điện thoại hoặc mật khẩu không đúng"
        )
    
    # Verify password
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Số điện thoại hoặc mật khẩu không đúng"
        )
    
    # Create access token
    access_token = create_access_token({"sub": str(user["_id"]), "phone": user["phone"]})
    
    # Cache user info in Redis
    redis = redis_client.get_client()
    user_cache = user_helper(user)
    await redis.setex(f"user:{user['_id']}", 3600, json.dumps(user_cache, default=str))
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_cache
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user(token: str):
    """Lấy thông tin user hiện tại"""
    from auth import decode_access_token
    
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn"
        )
    
    user_id = payload.get("sub")
    
    # Try cache first
    redis = redis_client.get_client()
    cached = await redis.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)
    
    # Get from DB
    db = mongodb_client.get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User không tồn tại"
        )
    
    return user_helper(user)
