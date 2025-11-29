"""
Authentication Routes - Đăng ký, đăng nhập

Sử dụng Redis để lưu trữ:
- khachHang:{maKH} - Thông tin khách hàng
- nhanVien:{maNV} - Thông tin nhân viên
- chucVu:{maCV} - Thông tin chức vụ
"""
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from app.models.entities import (
    LoginRequest, 
    RegisterInitiate, 
    VerifyOTPRequest, 
    SetPasswordRequest, 
    CompleteRegistrationRequest,
    Token,
    KhachHangResponse
)
from app.services.otp_service import (
    generate_otp, 
    send_otp_email, 
    store_otp, 
    verify_otp,
    store_registration_step,
    get_registration_step,
    delete_registration_step
)
from app.core import hash_password, verify_password, create_access_token
from app.core.middleware import get_current_customer
from app.services.redis_service import redis_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ========== REGISTRATION FLOW ==========

@router.post("/register/initiate")
async def initiate_registration(request: RegisterInitiate):
    """
    Step 1: Initiate registration with email
    - Check if email exists
    - Generate and send OTP
    """
    # Check if email already exists
    existing_user = await redis_service.get_khach_hang_by_email(request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email đã được đăng ký"
        )
    
    # Generate and send OTP
    otp = generate_otp()
    await store_otp(request.email, otp)
    
    success = await send_otp_email(request.email, otp)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể gửi OTP. Vui lòng thử lại sau."
        )
    
    # Store registration step
    await store_registration_step(request.email, "otp_sent")
    
    return {
        "message": "OTP đã được gửi đến email của bạn",
        "email": request.email
    }


@router.post("/register/verify-otp")
async def verify_registration_otp(request: VerifyOTPRequest):
    """
    Step 2: Verify OTP
    - Verify OTP code
    - Move to password creation step
    """
    # Check registration step
    reg_step = await get_registration_step(request.email)
    if not reg_step or reg_step["step"] != "otp_sent":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phiên đăng ký không hợp lệ. Vui lòng bắt đầu lại."
        )
    
    # Verify OTP
    is_valid = await verify_otp(request.email, request.otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP không chính xác hoặc đã hết hạn"
        )
    
    # Update registration step
    await store_registration_step(request.email, "otp_verified")
    
    return {
        "message": "Xác thực OTP thành công",
        "email": request.email
    }


@router.post("/register/set-password")
async def set_registration_password(request: SetPasswordRequest):
    """
    Step 3: Set password
    - Validate password
    - Store hashed password
    - Move to info completion step
    """
    # Check registration step
    reg_step = await get_registration_step(request.email)
    if not reg_step or reg_step["step"] != "otp_verified":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng xác thực OTP trước"
        )
    
    # Validate password
    if len(request.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu phải có ít nhất 6 ký tự"
        )
    
    # Hash password and store
    hashed_pwd = hash_password(request.password)
    await store_registration_step(
        request.email, 
        "password_set", 
        {"password": hashed_pwd}
    )
    
    return {
        "message": "Đặt mật khẩu thành công",
        "email": request.email
    }


@router.post("/register/complete")
async def complete_registration(request: CompleteRegistrationRequest):
    """
    Step 4: Complete registration with customer info
    - Validate all fields
    - Create customer account
    - Generate access token
    """
    # Check registration step
    reg_step = await get_registration_step(request.email)
    if not reg_step or reg_step["step"] != "password_set":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng hoàn thành các bước trước"
        )
    
    # Validate fields
    if not all([request.hoTen, request.SDT, request.CCCD, request.diaChi]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng điền đầy đủ thông tin"
        )
    
    # Check if CCCD already exists
    existing_cccd = await redis_service.find_one("khachHang", {"CCCD": request.CCCD})
    if existing_cccd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Số CCCD đã được đăng ký"
        )
    
    # Generate maKH
    count = await redis_service.count("khachHang")
    maKH = f"KH{count + 1:05d}"
    
    # Create customer data
    customer_data = {
        "maKH": maKH,
        "email": request.email,
        "password": reg_step["data"]["password"],
        "hoTen": request.hoTen,
        "SDT": request.SDT,
        "CCCD": request.CCCD,
        "diaChi": request.diaChi,
        "thoiGianTao": datetime.utcnow().isoformat(),
        "lanCuoiDangNhap": None
    }
    
    # Save to Redis
    await redis_service.create_khach_hang(customer_data)
    
    # Clean up registration data
    await delete_registration_step(request.email)
    
    # Generate token
    token_data = {
        "sub": request.email,
        "type": "customer",
        "maKH": maKH
    }
    access_token = create_access_token(token_data)
    
    # Remove password from response
    response_data = {k: v for k, v in customer_data.items() if k != "password"}
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": response_data,
        "message": "Đăng ký thành công!"
    }


# ========== LOGIN ==========

@router.post("/login", response_model=Token)
async def login(request: LoginRequest):
    """
    Universal login for both customers and employees
    - Checks khachHang collection first
    - If not found, checks nhanVien collection
    - For employees, retrieves chucVu (role) information
    """
    # Try to find in khachHang (customers) first
    user = await redis_service.get_khach_hang_by_email(request.email)
    user_type = "customer"
    id_field = "maKH"
    role = None
    chuc_vu_info = None
    
    # If not found in customers, check nhanVien (employees)
    if not user:
        user = await redis_service.get_nhan_vien_by_email(request.email)
        user_type = "employee"
        id_field = "maNV"
        
        # If employee found, get chuc vu (role) information
        if user and user.get("maCV"):
            chuc_vu_info = await redis_service.get_chuc_vu(user["maCV"])
            if chuc_vu_info:
                role = chuc_vu_info.get("maCV", "")
    
    # If still not found, invalid credentials
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác"
        )
    
    # Verify password
    if not verify_password(request.password, user.get("password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác"
        )
    
    # Update last login
    if user_type == "customer":
        await redis_service.update_khach_hang(
            user[id_field], 
            {"lanCuoiDangNhap": datetime.utcnow().isoformat()}
        )
    else:
        await redis_service.update(
            "nhanVien", "maNV", user[id_field],
            {"lanCuoiDangNhap": datetime.utcnow().isoformat()}
        )
    
    # Generate token with role information
    token_data = {
        "sub": request.email,
        "type": user_type,
        id_field: user[id_field]
    }
    if role:
        token_data["role"] = role
    
    access_token = create_access_token(token_data)
    
    # Remove password from response
    user_response = {k: v for k, v in user.items() if k != "password"}
    
    # Add chuc vu info to user response for employees
    if chuc_vu_info:
        user_response["chucVuInfo"] = chuc_vu_info
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_type": user_type,
        "role": role,
        "user": user_response
    }


# ========== RESEND OTP ==========

@router.post("/register/resend-otp")
async def resend_otp(request: RegisterInitiate):
    """
    Resend OTP to email
    """
    # Check registration step
    reg_step = await get_registration_step(request.email)
    if not reg_step:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không tìm thấy phiên đăng ký. Vui lòng bắt đầu lại."
        )
    
    # Generate and send new OTP
    otp = generate_otp()
    await store_otp(request.email, otp)
    
    success = await send_otp_email(request.email, otp)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể gửi OTP. Vui lòng thử lại sau."
        )
    
    return {
        "message": "OTP mới đã được gửi đến email của bạn",
        "email": request.email
    }


# ========== GET CURRENT USER INFO ==========

@router.get("/me")
async def get_current_user(current_user: dict = Depends(get_current_customer)):
    """
    Get current logged in user information
    Returns user profile with soDienThoai field mapped from SDT
    """
    # Get full user info from Redis
    user = await redis_service.get_khach_hang(current_user["maKH"])
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin người dùng"
        )
    
    # Map SDT to soDienThoai for frontend compatibility
    return {
        "maKH": user.get("maKH", ""),
        "hoTen": user.get("hoTen", ""),
        "email": user.get("email", ""),
        "soDienThoai": user.get("SDT", ""),  
        "CCCD": user.get("CCCD", ""),
        "diaChi": user.get("diaChi", "")
    }
