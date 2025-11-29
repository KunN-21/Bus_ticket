"""
Seat Holding Service - Quản lý giữ ghế và booking pending với Redis

Khi user chọn ghế và tạo booking:
- Ghế + thông tin booking được lưu trong Redis (TTL 3 phút)
- Chỉ khi thanh toán thành công mới lưu vào MongoDB
- Hết 3 phút tự động giải phóng
"""
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from app.core.database import redis_client
from app.utils import get_current_time_hcm, format_datetime_hcm


class SeatHoldingService:
    HOLD_DURATION = 180  # 3 minutes in seconds
    
    @staticmethod
    def _get_pending_booking_key(ma_tuyen: str, ngay_di: str, gio_di: str) -> str:
        """
        Key Redis cho các booking đang chờ thanh toán (pending)
        Format: pending_booking:{maTuyen}:{ngayDi}:{gioDi}
        
        Value là dict: {
            "session_id_1": {
                "maDatVe": "DV001",
                "seats": ["A1", "A2"],
                "customer_id": "KH001",
                "amount": 500000,
                "created_at": "...",
                "expire_at": "..."
            },
            ...
        }
        """
        return f"pending_booking:{ma_tuyen}:{ngay_di}:{gio_di}"
    
    @staticmethod
    async def create_pending_booking(
        ma_tuyen: str,
        ngay_di: str,
        gio_di: str,
        ma_dat_ve: str,
        seats: List[str],
        customer_id: str,
        session_id: str,
        amount: float
    ) -> Dict:
        """
        Tạo booking pending trong Redis (chưa lưu MongoDB)
        Booking này sẽ tự động hết hạn sau 3 phút
        """
        redis = redis_client.get_client()
        if not redis:
            raise RuntimeError("Redis connection not available")
        
        key = SeatHoldingService._get_pending_booking_key(ma_tuyen, ngay_di, gio_di)
        
        # Lấy dữ liệu hiện tại
        current_data = await redis.get(key)
        pending_bookings = json.loads(current_data) if current_data else {}
        
        # Kiểm tra xem có ghế nào đang được người khác giữ không
        conflicts = []
        for session, booking_info in pending_bookings.items():
            if session != session_id:
                other_seats = booking_info.get("seats", [])
                conflicts.extend([s for s in seats if s in other_seats])
        
        if conflicts:
            return {
                "success": False,
                "message": f"Ghế {', '.join(conflicts)} đang được người khác giữ",
                "conflicts": conflicts
            }
        
        # Tạo booking pending
        expire_at = (get_current_time_hcm() + timedelta(seconds=SeatHoldingService.HOLD_DURATION)).isoformat()
        booking_info = {
            "maDatVe": ma_dat_ve,
            "maTuyen": ma_tuyen,
            "ngayDi": ngay_di,
            "gioDi": gio_di,
            "seats": seats,
            "customer_id": customer_id,
            "amount": amount,
            "created_at": format_datetime_hcm(),
            "expire_at": expire_at
        }
        
        pending_bookings[session_id] = booking_info
        
        # Lưu vào Redis với TTL
        await redis.setex(
            key,
            SeatHoldingService.HOLD_DURATION,
            json.dumps(pending_bookings)
        )
        
        # Tạo mapping maDatVe -> route info để dễ tìm kiếm sau
        booking_mapping_key = f"booking_map:{ma_dat_ve}"
        await redis.setex(
            booking_mapping_key,
            SeatHoldingService.HOLD_DURATION,
            json.dumps({
                "maTuyen": ma_tuyen,
                "ngayDi": ngay_di,
                "gioDi": gio_di,
                "sessionId": session_id,
                "customerId": customer_id
            })
        )
        
        return {
            "success": True,
            "message": f"Đã giữ {len(seats)} ghế, vui lòng thanh toán trong 3 phút",
            "maDatVe": ma_dat_ve,
            "seats": seats,
            "expire_at": expire_at
        }
    
    @staticmethod
    async def release_pending_booking(
        ma_tuyen: str,
        ngay_di: str,
        gio_di: str,
        session_id: str
    ) -> Dict:
        """
        Giải phóng booking pending (khi user hủy)
        """
        redis = redis_client.get_client()
        if not redis:
            raise RuntimeError("Redis connection not available")
        
        key = SeatHoldingService._get_pending_booking_key(ma_tuyen, ngay_di, gio_di)
        
        # Lấy dữ liệu hiện tại
        current_data = await redis.get(key)
        if not current_data:
            return {"success": True, "message": "Không có booking nào đang chờ"}
        
        pending_bookings = json.loads(current_data)
        
        # Xóa booking của session này
        if session_id in pending_bookings:
            released_seats = pending_bookings[session_id].get("seats", [])
            del pending_bookings[session_id]
            
            # Cập nhật hoặc xóa key
            if pending_bookings:
                await redis.setex(
                    key,
                    SeatHoldingService.HOLD_DURATION,
                    json.dumps(pending_bookings)
                )
            else:
                await redis.delete(key)
            
            return {
                "success": True,
                "message": f"Đã giải phóng {len(released_seats)} ghế",
                "released": released_seats
            }
        
        return {"success": True, "message": "Không tìm thấy booking của session này"}
    
    @staticmethod
    async def get_pending_seats(
        ma_tuyen: str,
        ngay_di: str,
        gio_di: str
    ) -> List[str]:
        """
        Lấy tất cả ghế đang pending (tất cả users)
        """
        redis = redis_client.get_client()
        if not redis:
            return []
        
        key = SeatHoldingService._get_pending_booking_key(ma_tuyen, ngay_di, gio_di)
        current_data = await redis.get(key)
        
        if not current_data:
            return []
        
        pending_bookings = json.loads(current_data)
        all_seats = []
        for booking_info in pending_bookings.values():
            all_seats.extend(booking_info.get("seats", []))
        
        return all_seats
    
    @staticmethod
    async def get_my_pending_booking(
        ma_tuyen: str,
        ngay_di: str,
        gio_di: str,
        session_id: str
    ) -> Optional[Dict]:
        """
        Lấy thông tin booking pending của user này
        """
        redis = redis_client.get_client()
        if not redis:
            return None
        
        key = SeatHoldingService._get_pending_booking_key(ma_tuyen, ngay_di, gio_di)
        current_data = await redis.get(key)
        
        if not current_data:
            return None
        
        pending_bookings = json.loads(current_data)
        return pending_bookings.get(session_id)
    
    @staticmethod
    async def get_booking_by_id(ma_dat_ve: str) -> Optional[Dict]:
        """
        Lấy thông tin booking pending từ maDatVe
        """
        redis = redis_client.get_client()
        if not redis:
            return None
        
        # Lấy mapping
        mapping_key = f"booking_map:{ma_dat_ve}"
        mapping_data = await redis.get(mapping_key)
        
        if not mapping_data:
            return None
        
        mapping = json.loads(mapping_data)
        
        # Lấy booking info
        key = SeatHoldingService._get_pending_booking_key(
            mapping["maTuyen"],
            mapping["ngayDi"],
            mapping["gioDi"]
        )
        
        current_data = await redis.get(key)
        if not current_data:
            return None
        
        pending_bookings = json.loads(current_data)
        booking_info = pending_bookings.get(mapping["sessionId"])
        
        if booking_info:
            booking_info["sessionId"] = mapping["sessionId"]
        
        return booking_info
    
    @staticmethod
    async def confirm_booking(
        ma_tuyen: str,
        ngay_di: str,
        gio_di: str,
        session_id: str
    ) -> Optional[Dict]:
        """
        Xác nhận booking (sau khi thanh toán)
        Trả về thông tin booking để lưu vào MongoDB
        Và xóa khỏi Redis
        """
        redis = redis_client.get_client()
        if not redis:
            raise RuntimeError("Redis connection not available")
        
        key = SeatHoldingService._get_pending_booking_key(ma_tuyen, ngay_di, gio_di)
        current_data = await redis.get(key)
        
        if not current_data:
            return None
        
        pending_bookings = json.loads(current_data)
        booking_info = pending_bookings.get(session_id)
        
        if not booking_info:
            return None
        
        ma_dat_ve = booking_info.get("maDatVe")
        
        # Xóa booking khỏi pending
        del pending_bookings[session_id]
        
        # Cập nhật hoặc xóa key
        if pending_bookings:
            await redis.setex(
                key,
                SeatHoldingService.HOLD_DURATION,
                json.dumps(pending_bookings)
            )
        else:
            await redis.delete(key)
        
        # Xóa mapping
        if ma_dat_ve:
            await redis.delete(f"booking_map:{ma_dat_ve}")
        
        return booking_info


seat_holding_service = SeatHoldingService()
