"""
Database Connection - Redis Only

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
"""
import redis.asyncio as redis
from app.config import settings


# Redis Connection
class RedisClient:
    def __init__(self):
        self.client = None
    
    async def connect(self):
        """Kết nối đến Redis server"""
        self.client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            username=settings.REDIS_USERNAME,
            password=settings.REDIS_PASSWORD,
            decode_responses=True
        )
        # Test connection
        try:
            await self.client.ping()
            print("✅ Redis connected successfully")
        except Exception as e:
            print(f"❌ Redis connection failed: {e}")
            raise
    
    async def disconnect(self):
        """Ngắt kết nối Redis"""
        if self.client:
            await self.client.close()
            print("❌ Redis disconnected")
    
    def get_client(self):
        """Lấy Redis client instance"""
        return self.client


# Singleton Redis client
redis_client = RedisClient()


# Helper function to get Redis client
async def get_redis():
    """Get Redis client instance"""
    return redis_client.get_client()


# Alias for backward compatibility
async def get_database():
    """
    Backward compatibility - returns Redis client
    NOTE: This is NOT MongoDB anymore!
    Use redis_service for proper operations
    """
    return redis_client.get_client()
