import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.core.database import mongodb_client
from app.core.auth import hash_password
from datetime import datetime

async def create_admin():
    """Create default admin employee account"""
    db = mongodb_client.get_db()
    
    # Check if admin already exists
    existing_admin = await db.nhanvien.find_one({"email": "admin@voobus.com"})
    if existing_admin:
        print("❌ Admin đã tồn tại!")
        return
    
    # Create admin account
    admin_data = {
        "maNV": "NV001",
        "hoTen": "Admin VooBus",
        "email": "admin@voobus.com",
        "SDT": "0123456789",
        "CCCD": "001234567890",
        "diaChi": "Việt Nam",
        "password": hash_password("Admin@123"),  # Default password
        "hoaDon": [],
        "lanCuoiDangNhap": None,
        "createdAt": datetime.now()
    }
    
    # Insert to database
    result = await db.nhanvien.insert_one(admin_data)
    
    if result.inserted_id:
        print("✅ Tạo tài khoản admin thành công!")
        print("\n📧 Email: admin@voobus.com")
        print("🔑 Password: Admin@123")
        print("\n⚠️  Hãy đổi mật khẩu sau khi đăng nhập lần đầu!")
    else:
        print("❌ Lỗi khi tạo admin!")