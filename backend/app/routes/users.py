from fastapi import APIRouter, Depends, HTTPException, status
from app.core.middleware import get_current_customer
from app.services.redis_service import redis_service
from typing import Dict

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me")
async def get_my_profile(current_user: Dict = Depends(get_current_customer)):
    """
    Get current logged in user profile
    Requires: Authorization Bearer token
    Example: Authorization: Bearer <your_token>
    """
    return {
        "success": True,
        "user": current_user
    }

@router.put("/me")
async def update_my_profile(
    update_data: Dict,
    current_user: Dict = Depends(get_current_customer)
):
    """
    Update current user profile
    Requires: Authorization Bearer token
    """
    # Fields allowed to update
    allowed_fields = {"hoTen", "SDT", "diaChi"}
    update_fields = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không có trường nào được cập nhật"
        )
    
    # Update user in Redis
    updated_user = await redis_service.update_khach_hang(
        current_user["maKH"],
        update_fields
    )
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không có thay đổi nào"
        )
    
    # Remove password from response
    updated_user_response = {k: v for k, v in updated_user.items() if k != "password"}
    
    return {
        "success": True,
        "message": "Cập nhật thông tin thành công",
        "user": updated_user_response
    }
