from fastapi import APIRouter
from typing import List
from app.core.database import mongodb_client

router = APIRouter(prefix="/api/v1", tags=["Reference - Roles"])


@router.get("/chucvu", response_model=List[dict])
async def list_roles():
    """
    Return list of available roles (chucvu collection).
    Public endpoint - no authentication required so frontend can populate role dropdowns.
    """
    db = mongodb_client.get_db()
    docs = await db.chucvu.find().to_list(1000)
    result = []
    for d in docs:
        item = {k: v for k, v in d.items() if k != "_id"}
        result.append(item)
    return result
