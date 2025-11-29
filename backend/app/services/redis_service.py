"""
Redis Service - CRUD operations cho tất cả các collection trong Redis

Schema Redis:
1. chucVu:{maCV} - Chức vụ
2. nhanVien:{maNV} - Nhân viên
3. khachHang:{maKH} - Khách hàng
4. xe:{maXe} - Xe
5. gheNgoi:{maGhe} - Ghế ngồi
6. chuyenXe:{maCX} - Chuyến xe
7. lichChay:{maLC} - Lịch chạy
8. veXe:{maVe} - Vé xe
9. hoaDon:{maHD} - Hóa đơn

Mỗi collection có thêm index key để liệt kê tất cả keys:
- idx:{collection_name} -> Set chứa tất cả keys của collection đó
"""
import json
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.database import redis_client


class RedisService:
    """
    Service xử lý CRUD operations cho Redis
    """
    
    # ==================== HELPER METHODS ====================
    
    @staticmethod
    async def _get_client():
        """Lấy Redis client"""
        client = redis_client.get_client()
        if not client:
            raise RuntimeError("Redis connection not available")
        return client
    
    @staticmethod
    def _serialize(data: dict) -> str:
        """Serialize dict to JSON string, handle datetime"""
        def convert(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            return obj
        return json.dumps(data, default=convert, ensure_ascii=False)
    
    @staticmethod
    def _deserialize(data: str) -> dict:
        """Deserialize JSON string to dict"""
        if not data:
            return None
        return json.loads(data)
    
    # ==================== GENERIC CRUD ====================
    
    @staticmethod
    async def create(collection: str, key_field: str, data: dict) -> dict:
        """
        Tạo document mới trong Redis
        
        Args:
            collection: Tên collection (vd: "khachHang", "veXe")
            key_field: Tên field làm key (vd: "maKH", "maVe")
            data: Data dict
        
        Returns:
            Document đã tạo
        """
        redis = await RedisService._get_client()
        key_value = data.get(key_field)
        if not key_value:
            raise ValueError(f"Missing required field: {key_field}")
        
        redis_key = f"{collection}:{key_value}"
        
        # Lưu document
        await redis.set(redis_key, RedisService._serialize(data))
        
        # Thêm vào index
        await redis.sadd(f"idx:{collection}", key_value)
        
        return data
    
    @staticmethod
    async def get_by_key(collection: str, key_value: str) -> Optional[dict]:
        """
        Lấy document theo key
        
        Args:
            collection: Tên collection
            key_value: Giá trị key
        
        Returns:
            Document hoặc None
        """
        redis = await RedisService._get_client()
        redis_key = f"{collection}:{key_value}"
        data = await redis.get(redis_key)
        return RedisService._deserialize(data)
    
    @staticmethod
    async def get_all(collection: str) -> List[dict]:
        """
        Lấy tất cả documents trong collection
        
        Args:
            collection: Tên collection
        
        Returns:
            List of documents
        """
        redis = await RedisService._get_client()
        
        # Lấy tất cả keys từ index
        keys = await redis.smembers(f"idx:{collection}")
        if not keys:
            return []
        
        result = []
        for key_value in keys:
            redis_key = f"{collection}:{key_value}"
            data = await redis.get(redis_key)
            if data:
                result.append(RedisService._deserialize(data))
        
        return result
    
    @staticmethod
    async def find(collection: str, query: dict) -> List[dict]:
        """
        Tìm kiếm documents theo điều kiện
        
        Args:
            collection: Tên collection
            query: Dict các điều kiện tìm kiếm
        
        Returns:
            List of matching documents
        """
        all_docs = await RedisService.get_all(collection)
        
        result = []
        for doc in all_docs:
            match = True
            for field, value in query.items():
                if doc.get(field) != value:
                    match = False
                    break
            if match:
                result.append(doc)
        
        return result
    
    @staticmethod
    async def find_one(collection: str, query: dict) -> Optional[dict]:
        """
        Tìm một document theo điều kiện
        
        Args:
            collection: Tên collection
            query: Dict các điều kiện tìm kiếm
        
        Returns:
            Document hoặc None
        """
        results = await RedisService.find(collection, query)
        return results[0] if results else None
    
    @staticmethod
    async def update(collection: str, key_field: str, key_value: str, update_data: dict) -> Optional[dict]:
        """
        Cập nhật document
        
        Args:
            collection: Tên collection
            key_field: Tên field làm key
            key_value: Giá trị key
            update_data: Data cần update
        
        Returns:
            Document đã cập nhật hoặc None
        """
        redis = await RedisService._get_client()
        redis_key = f"{collection}:{key_value}"
        
        # Lấy document hiện tại
        current = await redis.get(redis_key)
        if not current:
            return None
        
        current_data = RedisService._deserialize(current)
        
        # Merge data
        current_data.update(update_data)
        
        # Lưu lại
        await redis.set(redis_key, RedisService._serialize(current_data))
        
        return current_data
    
    @staticmethod
    async def delete(collection: str, key_value: str) -> bool:
        """
        Xóa document
        
        Args:
            collection: Tên collection
            key_value: Giá trị key
        
        Returns:
            True nếu xóa thành công
        """
        redis = await RedisService._get_client()
        redis_key = f"{collection}:{key_value}"
        
        # Xóa document
        await redis.delete(redis_key)
        
        # Xóa khỏi index
        await redis.srem(f"idx:{collection}", key_value)
        
        return True
    
    @staticmethod
    async def count(collection: str) -> int:
        """
        Đếm số documents trong collection
        
        Args:
            collection: Tên collection
        
        Returns:
            Số lượng documents
        """
        redis = await RedisService._get_client()
        return await redis.scard(f"idx:{collection}")
    
    @staticmethod
    async def exists(collection: str, key_value: str) -> bool:
        """
        Kiểm tra document tồn tại
        
        Args:
            collection: Tên collection
            key_value: Giá trị key
        
        Returns:
            True nếu tồn tại
        """
        redis = await RedisService._get_client()
        redis_key = f"{collection}:{key_value}"
        return await redis.exists(redis_key) > 0
    
    # ==================== SPECIFIC COLLECTION METHODS ====================
    
    # ---------- KHÁCH HÀNG ----------
    @staticmethod
    async def get_khach_hang(maKH: str) -> Optional[dict]:
        return await RedisService.get_by_key("khachHang", maKH)
    
    @staticmethod
    async def get_khach_hang_by_email(email: str) -> Optional[dict]:
        return await RedisService.find_one("khachHang", {"email": email})
    
    @staticmethod
    async def create_khach_hang(data: dict) -> dict:
        return await RedisService.create("khachHang", "maKH", data)
    
    @staticmethod
    async def update_khach_hang(maKH: str, update_data: dict) -> Optional[dict]:
        return await RedisService.update("khachHang", "maKH", maKH, update_data)
    
    # ---------- NHÂN VIÊN ----------
    @staticmethod
    async def get_nhan_vien(maNV: str) -> Optional[dict]:
        return await RedisService.get_by_key("nhanVien", maNV)
    
    @staticmethod
    async def get_nhan_vien_by_email(email: str) -> Optional[dict]:
        return await RedisService.find_one("nhanVien", {"email": email})
    
    @staticmethod
    async def create_nhan_vien(data: dict) -> dict:
        return await RedisService.create("nhanVien", "maNV", data)
    
    # ---------- CHỨC VỤ ----------
    @staticmethod
    async def get_chuc_vu(maCV: str) -> Optional[dict]:
        return await RedisService.get_by_key("chucVu", maCV)
    
    @staticmethod
    async def get_all_chuc_vu() -> List[dict]:
        return await RedisService.get_all("chucVu")
    
    # ---------- XE ----------
    @staticmethod
    async def get_xe(maXe: str) -> Optional[dict]:
        return await RedisService.get_by_key("xe", maXe)
    
    @staticmethod
    async def get_all_xe() -> List[dict]:
        return await RedisService.get_all("xe")
    
    # ---------- GHẾ NGỒI ----------
    @staticmethod
    async def get_ghe_ngoi(maGhe: str) -> Optional[dict]:
        return await RedisService.get_by_key("gheNgoi", maGhe)
    
    @staticmethod
    async def get_ghe_by_xe(maXe: str) -> List[dict]:
        """Lấy tất cả ghế của một xe"""
        return await RedisService.find("gheNgoi", {"maXe": maXe})
    
    # ---------- CHUYẾN XE ----------
    @staticmethod
    async def get_chuyen_xe(maCX: str) -> Optional[dict]:
        return await RedisService.get_by_key("chuyenXe", maCX)
    
    @staticmethod
    async def get_all_chuyen_xe() -> List[dict]:
        return await RedisService.get_all("chuyenXe")
    
    @staticmethod
    async def search_chuyen_xe(diemDi: str, diemDen: str) -> List[dict]:
        """Tìm chuyến xe theo điểm đi và điểm đến"""
        return await RedisService.find("chuyenXe", {"diemDi": diemDi, "diemDen": diemDen})
    
    # ---------- LỊCH CHẠY ----------
    @staticmethod
    async def get_lich_chay(maLC: str) -> Optional[dict]:
        return await RedisService.get_by_key("lichChay", maLC)
    
    @staticmethod
    async def get_lich_chay_by_chuyen(maCX: str) -> List[dict]:
        """Lấy tất cả lịch chạy của một chuyến xe"""
        return await RedisService.find("lichChay", {"maCX": maCX})
    
    @staticmethod
    async def get_all_lich_chay() -> List[dict]:
        return await RedisService.get_all("lichChay")
    
    # ---------- VÉ XE ----------
    @staticmethod
    async def get_ve_xe(maVe: str) -> Optional[dict]:
        return await RedisService.get_by_key("veXe", maVe)
    
    @staticmethod
    async def create_ve_xe(data: dict) -> dict:
        return await RedisService.create("veXe", "maVe", data)
    
    @staticmethod
    async def update_ve_xe(maVe: str, update_data: dict) -> Optional[dict]:
        return await RedisService.update("veXe", "maVe", maVe, update_data)
    
    @staticmethod
    async def get_ve_by_khach_hang(maKH: str) -> List[dict]:
        """Lấy tất cả vé của một khách hàng"""
        return await RedisService.find("veXe", {"maKH": maKH})
    
    @staticmethod
    async def get_ve_by_lich_chay(maLC: str) -> List[dict]:
        """Lấy tất cả vé của một lịch chạy"""
        return await RedisService.find("veXe", {"maLC": maLC})
    
    @staticmethod
    async def get_ve_by_lich_chay_and_status(maLC: str, trangThai: str) -> List[dict]:
        """Lấy vé theo lịch chạy và trạng thái"""
        all_ve = await RedisService.get_ve_by_lich_chay(maLC)
        return [v for v in all_ve if v.get("trangThai") == trangThai]
    
    # ---------- HÓA ĐƠN ----------
    @staticmethod
    async def get_hoa_don(maHD: str) -> Optional[dict]:
        return await RedisService.get_by_key("hoaDon", maHD)
    
    @staticmethod
    async def create_hoa_don(data: dict) -> dict:
        return await RedisService.create("hoaDon", "maHD", data)
    
    @staticmethod
    async def get_hoa_don_by_khach_hang(maKH: str) -> List[dict]:
        """Lấy tất cả hóa đơn của một khách hàng"""
        return await RedisService.find("hoaDon", {"maKH": maKH})
    
    @staticmethod
    async def get_all_hoa_don() -> List[dict]:
        return await RedisService.get_all("hoaDon")
    
    # ==================== UTILITY METHODS ====================
    
    @staticmethod
    async def generate_id(collection: str, prefix: str, digits: int = 5) -> str:
        """
        Tạo ID mới cho collection
        
        Args:
            collection: Tên collection
            prefix: Prefix cho ID (vd: "KH", "VE", "HD")
            digits: Số chữ số (default 5)
        
        Returns:
            ID mới (vd: "KH00001")
        """
        count = await RedisService.count(collection)
        return f"{prefix}{str(count + 1).zfill(digits)}"
    
    @staticmethod
    async def get_booked_seats_by_lich_chay(maLC: str) -> List[str]:
        """
        Lấy danh sách ghế đã đặt cho một lịch chạy
        Chỉ lấy vé có trạng thái "paid" hoặc "confirmed"
        
        Args:
            maLC: Mã lịch chạy
        
        Returns:
            List mã ghế đã đặt
        """
        ve_list = await RedisService.find("veXe", {"maLC": maLC})
        booked_seats = []
        for ve in ve_list:
            if ve.get("trangThai") in ["paid", "confirmed"]:
                # Có thể là maGhe (single) hoặc soGhe (list)
                if ve.get("maGhe"):
                    booked_seats.append(ve.get("maGhe"))
                elif ve.get("soGhe"):
                    booked_seats.extend(ve.get("soGhe", []))
        return booked_seats


# Singleton instance
redis_service = RedisService()
