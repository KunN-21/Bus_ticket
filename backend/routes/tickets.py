from fastapi import APIRouter, HTTPException, status
from typing import List
from models import TicketCreate, TicketResponse, TicketUpdate
from database import mongodb_client, redis_client
from bson import ObjectId
import json

router = APIRouter()

def ticket_helper(ticket) -> dict:
    return {
        "_id": str(ticket["_id"]),
        "event_name": ticket["event_name"],
        "price": ticket["price"],
        "date": ticket["date"],
        "location": ticket["location"],
        "available_seats": ticket["available_seats"]
    }

@router.get("/", response_model=List[TicketResponse])
async def get_all_tickets():
    """Lấy danh sách tất cả vé"""
    # Try cache first
    cache_key = "tickets:all"
    redis = redis_client.get_client()
    cached = await redis.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    # Get from MongoDB
    db = mongodb_client.get_db()
    tickets = []
    async for ticket in db.tickets.find():
        tickets.append(ticket_helper(ticket))
    
    # Cache for 5 minutes
    await redis.setex(cache_key, 300, json.dumps(tickets))
    
    return tickets

@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(ticket_id: str):
    """Lấy thông tin chi tiết một vé"""
    # Try cache
    cache_key = f"ticket:{ticket_id}"
    redis = redis_client.get_client()
    cached = await redis.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    # Get from MongoDB
    db = mongodb_client.get_db()
    ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    result = ticket_helper(ticket)
    await redis.setex(cache_key, 300, json.dumps(result))
    
    return result

@router.post("/", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(ticket: TicketCreate):
    """Tạo vé mới"""
    db = mongodb_client.get_db()
    ticket_dict = ticket.model_dump()
    
    result = await db.tickets.insert_one(ticket_dict)
    new_ticket = await db.tickets.find_one({"_id": result.inserted_id})
    
    # Invalidate cache
    redis = redis_client.get_client()
    await redis.delete("tickets:all")
    
    return ticket_helper(new_ticket)

@router.put("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(ticket_id: str, ticket: TicketUpdate):
    """Cập nhật thông tin vé"""
    db = mongodb_client.get_db()
    
    update_data = {k: v for k, v in ticket.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.tickets.update_one(
        {"_id": ObjectId(ticket_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    updated_ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    
    # Invalidate cache
    redis = redis_client.get_client()
    await redis.delete(f"ticket:{ticket_id}")
    await redis.delete("tickets:all")
    
    return ticket_helper(updated_ticket)

@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ticket(ticket_id: str):
    """Xóa vé"""
    db = mongodb_client.get_db()
    
    result = await db.tickets.delete_one({"_id": ObjectId(ticket_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Invalidate cache
    redis = redis_client.get_client()
    await redis.delete(f"ticket:{ticket_id}")
    await redis.delete("tickets:all")
    
    return None
