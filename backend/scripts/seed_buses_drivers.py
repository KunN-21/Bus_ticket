"""
Script để tạo dữ liệu mẫu: 3 xe + 5 tài xế
Sử dụng entities.py từ ducy làm chuẩn

Schema:
- Xe: maXe, bienSoXe, soChoNgoi, loaiXe
- NhanVien: maNV, hoTen, email, SDT, CCCD, diaChi, password, maCV
- GheNgoi: maGhe, maXe, tenGhe
- ChucVu: maCV, tenChucVu, moTa, danhSachNhanVien
"""
import asyncio
import json
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import redis_client
from app.core import hash_password


async def seed_data():
    """Tạo dữ liệu mẫu cho xe và tài xế"""
    
    # Connect to Redis
    await redis_client.connect()
    client = redis_client.get_client()
    
    if not client:
        print("❌ Không thể kết nối Redis!")
        return
    
    print("✅ Đã kết nối Redis")
    
    # ========== TẠO CHỨC VỤ TÀI XẾ (nếu chưa có) ==========
    print("\n📋 Kiểm tra chức vụ tài xế...")
    
    driver_role_key = "chucVu:CV003"
    existing_role = await client.get(driver_role_key)
    
    if not existing_role:
        driver_role = {
            "maCV": "CV003",
            "tenChucVu": "Tài xế",
            "moTa": "Nhân viên lái xe",
            "danhSachNhanVien": []
        }
        await client.set(driver_role_key, json.dumps(driver_role, ensure_ascii=False))
        await client.sadd("idx:chucVu", "CV003")
        print("   ✅ Đã tạo chức vụ tài xế (CV003)")
    else:
        print("   ℹ️ Chức vụ tài xế đã tồn tại")
    
    # ========== TẠO 3 XE MỚI ==========
    print("\n🚌 Tạo 3 xe mới...")
    
    buses = [
        {
            "maXe": "XE004",
            "bienSoXe": "51B-123.45",
            "soChoNgoi": 34,
            "loaiXe": "Xe giường nằm",
            "trangThai": "active"
        },
        {
            "maXe": "XE005",
            "bienSoXe": "51B-678.90",
            "soChoNgoi": 40,
            "loaiXe": "Xe ghế ngồi",
            "trangThai": "active"
        },
        {
            "maXe": "XE006",
            "bienSoXe": "51B-246.80",
            "soChoNgoi": 34,
            "loaiXe": "Xe giường nằm VIP",
            "trangThai": "active"
        }
    ]
    
    for bus in buses:
        bus_key = f"xe:{bus['maXe']}"
        
        # Kiểm tra đã tồn tại chưa
        existing = await client.get(bus_key)
        if existing:
            print(f"   ⏭️ Xe {bus['maXe']} đã tồn tại, bỏ qua")
            continue
        
        # Lưu xe
        await client.set(bus_key, json.dumps(bus, ensure_ascii=False))
        await client.sadd("idx:xe", bus['maXe'])
        print(f"   ✅ Đã tạo xe {bus['maXe']} ({bus['bienSoXe']}) - {bus['loaiXe']}")
        
        # Tạo ghế cho xe
        seat_count = 0
        seat_prefixes = ["A", "B", "C", "D"]
        seats_per_row = (bus['soChoNgoi'] + len(seat_prefixes) - 1) // len(seat_prefixes)
        
        for prefix in seat_prefixes:
            for num in range(1, seats_per_row + 1):
                if seat_count >= bus['soChoNgoi']:
                    break
                
                seat_name = f"{prefix}{str(num).zfill(2)}"
                ma_ghe = f"{bus['maXe']}_{seat_name}"
                
                seat_data = {
                    "maGhe": ma_ghe,
                    "maXe": bus['maXe'],
                    "tenGhe": seat_name
                }
                
                seat_key = f"gheNgoi:{ma_ghe}"
                await client.set(seat_key, json.dumps(seat_data, ensure_ascii=False))
                await client.sadd("idx:gheNgoi", ma_ghe)
                seat_count += 1
        
        print(f"      ➕ Đã tạo {seat_count} ghế cho xe {bus['maXe']}")
    
    # ========== TẠO 5 TÀI XẾ MỚI ==========
    print("\n👨‍✈️ Tạo 5 tài xế mới...")
    
    # Password mặc định cho tài xế (đã hash)
    default_password = hash_password("taixe123")
    
    drivers = [
        {
            "maNV": "NV004",
            "hoTen": "Nguyễn Văn Tâm",
            "email": "taixe.tam@busgo.vn",
            "SDT": "0901234567",
            "CCCD": "001234567890",
            "diaChi": "123 Đường Lê Lợi, Q.1, TP.HCM",
            "password": default_password,
            "maCV": "CV003",
            "ngayTao": datetime.now().isoformat(),
            "trangThai": "active"
        },
        {
            "maNV": "NV005",
            "hoTen": "Trần Minh Phúc",
            "email": "taixe.phuc@busgo.vn",
            "SDT": "0912345678",
            "CCCD": "001234567891",
            "diaChi": "456 Đường Nguyễn Huệ, Q.1, TP.HCM",
            "password": default_password,
            "maCV": "CV003",
            "ngayTao": datetime.now().isoformat(),
            "trangThai": "active"
        },
        {
            "maNV": "NV006",
            "hoTen": "Lê Hoàng Long",
            "email": "taixe.long@busgo.vn",
            "SDT": "0923456789",
            "CCCD": "001234567892",
            "diaChi": "789 Đường Võ Văn Kiệt, Q.5, TP.HCM",
            "password": default_password,
            "maCV": "CV003",
            "ngayTao": datetime.now().isoformat(),
            "trangThai": "active"
        },
        {
            "maNV": "NV007",
            "hoTen": "Phạm Đức Hùng",
            "email": "taixe.hung@busgo.vn",
            "SDT": "0934567890",
            "CCCD": "001234567893",
            "diaChi": "321 Đường Cách Mạng Tháng 8, Q.3, TP.HCM",
            "password": default_password,
            "maCV": "CV003",
            "ngayTao": datetime.now().isoformat(),
            "trangThai": "active"
        },
        {
            "maNV": "NV008",
            "hoTen": "Hoàng Văn Đạt",
            "email": "taixe.dat@busgo.vn",
            "SDT": "0945678901",
            "CCCD": "001234567894",
            "diaChi": "654 Đường Trường Chinh, Q. Tân Bình, TP.HCM",
            "password": default_password,
            "maCV": "CV003",
            "ngayTao": datetime.now().isoformat(),
            "trangThai": "active"
        }
    ]
    
    created_drivers = []
    for driver in drivers:
        driver_key = f"nhanVien:{driver['maNV']}"
        
        # Kiểm tra đã tồn tại chưa
        existing = await client.get(driver_key)
        if existing:
            print(f"   ⏭️ Tài xế {driver['maNV']} đã tồn tại, bỏ qua")
            continue
        
        # Lưu nhân viên
        await client.set(driver_key, json.dumps(driver, ensure_ascii=False))
        await client.sadd("idx:nhanVien", driver['maNV'])
        created_drivers.append(driver['maNV'])
        print(f"   ✅ Đã tạo tài xế {driver['maNV']}: {driver['hoTen']} ({driver['email']})")
    
    # Cập nhật danh sách nhân viên trong chức vụ tài xế
    if created_drivers:
        role_data = await client.get(driver_role_key)
        if role_data:
            role = json.loads(role_data)
            existing_nv = role.get("danhSachNhanVien", [])
            role["danhSachNhanVien"] = list(set(existing_nv + created_drivers))
            await client.set(driver_role_key, json.dumps(role, ensure_ascii=False))
            print(f"\n   📋 Đã cập nhật danh sách nhân viên cho chức vụ tài xế")
    
    # ========== THỐNG KÊ ==========
    print("\n" + "="*50)
    print("📊 THỐNG KÊ DỮ LIỆU")
    print("="*50)
    
    # Đếm số lượng
    xe_count = await client.scard("idx:xe")
    nv_count = await client.scard("idx:nhanVien")
    ghe_count = await client.scard("idx:gheNgoi")
    cv_count = await client.scard("idx:chucVu")
    
    print(f"   🚌 Tổng số xe: {xe_count}")
    print(f"   💺 Tổng số ghế: {ghe_count}")
    print(f"   👥 Tổng số nhân viên: {nv_count}")
    print(f"   📋 Tổng số chức vụ: {cv_count}")
    
    print("\n✅ Hoàn tất tạo dữ liệu mẫu!")
    print("\n📝 Thông tin đăng nhập tài xế:")
    print("   - Email: taixe.xxx@busgo.vn (xxx = tam/phuc/long/hung/dat)")
    print("   - Mật khẩu: taixe123")
    
    # Disconnect
    await redis_client.disconnect()


if __name__ == "__main__":
    asyncio.run(seed_data())
