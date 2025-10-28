from fastapi import APIRouter, Depends, HTTPException, status
from app.core.middleware import get_current_customer
from app.core.database import mongodb_client
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
    db = mongodb_client.get_db()
    
    # Fields allowed to update
    allowed_fields = {"hoTen", "SDT", "diaChi"}
    update_fields = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không có trường nào được cập nhật"
        )
    
    # Update user
    result = await db.khachhang.update_one(
        {"email": current_user["email"]},
        {"$set": update_fields}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không có thay đổi nào"
        )
    
    # Get updated user
    updated_user = await db.khachhang.find_one({"email": current_user["email"]})
    updated_user.pop("password")
    updated_user.pop("_id")
    
    return {
        "success": True,
        "message": "Cập nhật thông tin thành công",
        "user": updated_user
    }
