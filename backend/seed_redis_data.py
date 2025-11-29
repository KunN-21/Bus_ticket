"""
Script to seed sample data into Redis
Run: python seed_redis_data.py
"""
import asyncio
import json
import redis.asyncio as aioredis
import bcrypt
from datetime import datetime, timedelta

# Redis connection
REDIS_URL = "redis://localhost:6379"

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed_data():
    """Insert sample data into Redis"""
    redis = await aioredis.from_url(REDIS_URL, decode_responses=True)
    
    print("🚀 Starting to seed data...")
    
    # ========== 1. CHỨC VỤ (Roles) ==========
    chuc_vu_list = [
        {"maCV": "CV001", "tenChucVu": "Admin", "moTa": "Quản trị viên hệ thống"},
        {"maCV": "CV002", "tenChucVu": "Nhân viên", "moTa": "Nhân viên bán vé"},
        {"maCV": "CV003", "tenChucVu": "Tài xế", "moTa": "Tài xế xe khách"}
    ]
    
    for cv in chuc_vu_list:
        key = f"chucVu:{cv['maCV']}"
        await redis.set(key, json.dumps(cv, ensure_ascii=False))
        await redis.sadd("idx:chucVu", cv['maCV'])
    print(f"✅ Inserted {len(chuc_vu_list)} chức vụ")
    
    # ========== 2. NHÂN VIÊN (Employees) ==========
    nhan_vien_list = [
        {
            "maNV": "NV001",
            "hoTen": "Nguyễn Văn Admin",
            "email": "admin@voobus.com",
            "password": hash_password("admin123"),
            "SDT": "0901234567",
            "CCCD": "001234567890",
            "diaChi": "123 Nguyễn Huệ, Q1, TP.HCM",
            "maCV": "CV001",
            "trangThai": "active",
            "thoiGianTao": datetime.utcnow().isoformat(),
            "lanCuoiDangNhap": None
        },
        {
            "maNV": "NV002",
            "hoTen": "Trần Thị Nhân Viên",
            "email": "nhanvien@voobus.com",
            "password": hash_password("nhanvien123"),
            "SDT": "0901234568",
            "CCCD": "001234567891",
            "diaChi": "456 Lê Lợi, Q1, TP.HCM",
            "maCV": "CV002",
            "trangThai": "active",
            "thoiGianTao": datetime.utcnow().isoformat(),
            "lanCuoiDangNhap": None
        },
        {
            "maNV": "NV003",
            "hoTen": "Lê Văn Tài Xế",
            "email": "taixe@voobus.com",
            "password": hash_password("taixe123"),
            "SDT": "0901234569",
            "CCCD": "001234567892",
            "diaChi": "789 Hai Bà Trưng, Q3, TP.HCM",
            "maCV": "CV003",
            "trangThai": "active",
            "thoiGianTao": datetime.utcnow().isoformat(),
            "lanCuoiDangNhap": None
        }
    ]
    
    for nv in nhan_vien_list:
        key = f"nhanVien:{nv['maNV']}"
        await redis.set(key, json.dumps(nv, ensure_ascii=False))
        await redis.sadd("idx:nhanVien", nv['maNV'])
    print(f"✅ Inserted {len(nhan_vien_list)} nhân viên")
    
    # ========== 3. KHÁCH HÀNG (Customers) ==========
    khach_hang_list = [
        {
            "maKH": "KH001",
            "hoTen": "Nguyễn Minh Tuấn",
            "email": "customer1@gmail.com",
            "password": hash_password("123456"),
            "SDT": "0912345678",
            "CCCD": "012345678901",
            "diaChi": "100 Điện Biên Phủ, Q.Bình Thạnh, TP.HCM",
            "thoiGianTao": datetime.utcnow().isoformat(),
            "lanCuoiDangNhap": None
        },
        {
            "maKH": "KH002",
            "hoTen": "Trần Thị Mai Hương",
            "email": "customer2@gmail.com",
            "password": hash_password("123456"),
            "SDT": "0912345679",
            "CCCD": "012345678902",
            "diaChi": "200 Võ Văn Tần, Q3, TP.HCM",
            "thoiGianTao": datetime.utcnow().isoformat(),
            "lanCuoiDangNhap": None
        },
        {
            "maKH": "KH003",
            "hoTen": "Lê Hoàng Nam",
            "email": "test@test.com",
            "password": hash_password("test123"),
            "SDT": "0912345680",
            "CCCD": "012345678903",
            "diaChi": "300 Cách Mạng Tháng 8, Q10, TP.HCM",
            "thoiGianTao": datetime.utcnow().isoformat(),
            "lanCuoiDangNhap": None
        },
        {
            "maKH": "KH004",
            "hoTen": "Phạm Văn Đức",
            "email": "phamvanduc@gmail.com",
            "password": hash_password("123456"),
            "SDT": "0912345681",
            "CCCD": "012345678904",
            "diaChi": "45 Nguyễn Trãi, Q5, TP.HCM",
            "thoiGianTao": datetime.utcnow().isoformat(),
            "lanCuoiDangNhap": None
        },
        {
            "maKH": "KH005",
            "hoTen": "Võ Thị Thanh Thảo",
            "email": "thanhthao@gmail.com",
            "password": hash_password("123456"),
            "SDT": "0912345682",
            "CCCD": "012345678905",
            "diaChi": "78 Lý Thường Kiệt, Q.Tân Bình, TP.HCM",
            "thoiGianTao": datetime.utcnow().isoformat(),
            "lanCuoiDangNhap": None
        }
    ]
    
    for kh in khach_hang_list:
        key = f"khachHang:{kh['maKH']}"
        await redis.set(key, json.dumps(kh, ensure_ascii=False))
        await redis.sadd("idx:khachHang", kh['maKH'])
    print(f"✅ Inserted {len(khach_hang_list)} khách hàng")
    
    # ========== 4. XE (Buses) ==========
    xe_list = [
        {
            "maXe": "XE001",
            "bienSoXe": "51B-12345",
            "loaiXe": "Giường nằm",
            "soGhe": 34,
            "trangThai": "active",
            "maNV": "NV003"  # Tài xế
        },
        {
            "maXe": "XE002",
            "bienSoXe": "51B-12346",
            "loaiXe": "Ghế ngồi",
            "soGhe": 34,
            "trangThai": "active",
            "maNV": "NV003"
        },
        {
            "maXe": "XE003",
            "bienSoXe": "51B-12347",
            "loaiXe": "Limousine",
            "soGhe": 34,
            "trangThai": "active",
            "maNV": "NV003"
        }
    ]
    
    for xe in xe_list:
        key = f"xe:{xe['maXe']}"
        await redis.set(key, json.dumps(xe, ensure_ascii=False))
        await redis.sadd("idx:xe", xe['maXe'])
    print(f"✅ Inserted {len(xe_list)} xe")
    
    # ========== 5. GHẾ NGỒI (Seats) ==========
    # Mỗi xe có 34 ghế, mã ghế từ A01-A34
    ghe_ngoi_list = []
    for xe in xe_list:
        for i in range(1, 35):  # 34 ghế: A01 -> A34
            ghe = {
                "maGhe": f"{xe['maXe']}_A{i:02d}",
                "maXe": xe['maXe'],
                "soGhe": f"A{i:02d}",
                "tang": 1 if i <= 17 else 2,  # Tầng 1: A01-A17, Tầng 2: A18-A34
                "viTri": "Trái" if i % 2 == 1 else "Phải",
                "trangThai": "available"
            }
            ghe_ngoi_list.append(ghe)
    
    for ghe in ghe_ngoi_list:
        key = f"gheNgoi:{ghe['maGhe']}"
        await redis.set(key, json.dumps(ghe, ensure_ascii=False))
        await redis.sadd("idx:gheNgoi", ghe['maGhe'])
    print(f"✅ Inserted {len(ghe_ngoi_list)} ghế ngồi")
    
    # ========== 6. CHUYẾN XE (Routes) ==========
    chuyen_xe_list = [
        {
            "maCX": "CX001",
            "tenChuyen": "TP.HCM - Đà Lạt",
            "diemDi": "TP.HCM",
            "diemDen": "Đà Lạt",
            "khoangCach": 310,
            "quangDuong": 310,
            "thoiGianDuKien": "7 giờ",
            "giaVe": 250000,
            "giaChuyenXe": 250000,
            "maXe": "XE001",
            "moTa": "Chuyến xe giường nằm cao cấp từ TP.HCM đi Đà Lạt"
        },
        {
            "maCX": "CX002",
            "tenChuyen": "TP.HCM - Nha Trang",
            "diemDi": "TP.HCM",
            "diemDen": "Nha Trang",
            "khoangCach": 430,
            "quangDuong": 430,
            "thoiGianDuKien": "9 giờ",
            "giaVe": 300000,
            "giaChuyenXe": 300000,
            "maXe": "XE001",
            "moTa": "Chuyến xe giường nằm cao cấp từ TP.HCM đi Nha Trang"
        },
        {
            "maCX": "CX003",
            "tenChuyen": "TP.HCM - Vũng Tàu",
            "diemDi": "TP.HCM",
            "diemDen": "Vũng Tàu",
            "khoangCach": 125,
            "quangDuong": 125,
            "thoiGianDuKien": "2 giờ 30 phút",
            "giaVe": 120000,
            "giaChuyenXe": 120000,
            "maXe": "XE002",
            "moTa": "Chuyến xe ghế ngồi từ TP.HCM đi Vũng Tàu"
        },
        {
            "maCX": "CX004",
            "tenChuyen": "TP.HCM - Cần Thơ",
            "diemDi": "TP.HCM",
            "diemDen": "Cần Thơ",
            "khoangCach": 170,
            "quangDuong": 170,
            "thoiGianDuKien": "3 giờ 30 phút",
            "giaVe": 150000,
            "giaChuyenXe": 150000,
            "maXe": "XE002",
            "moTa": "Chuyến xe ghế ngồi từ TP.HCM đi Cần Thơ"
        },
        {
            "maCX": "CX005",
            "tenChuyen": "TP.HCM - Phan Thiết",
            "diemDi": "TP.HCM",
            "diemDen": "Phan Thiết",
            "khoangCach": 200,
            "quangDuong": 200,
            "thoiGianDuKien": "4 giờ",
            "giaVe": 180000,
            "giaChuyenXe": 180000,
            "maXe": "XE003",
            "moTa": "Chuyến xe Limousine VIP từ TP.HCM đi Phan Thiết"
        },
        {
            "maCX": "CX006",
            "tenChuyen": "Hà Nội - Sapa",
            "diemDi": "Hà Nội",
            "diemDen": "Sapa",
            "khoangCach": 320,
            "quangDuong": 320,
            "thoiGianDuKien": "6 giờ",
            "giaVe": 280000,
            "giaChuyenXe": 280000,
            "maXe": "XE001",
            "moTa": "Chuyến xe giường nằm từ Hà Nội đi Sapa"
        },
        {
            "maCX": "CX007",
            "tenChuyen": "Hà Nội - Hạ Long",
            "diemDi": "Hà Nội",
            "diemDen": "Hạ Long",
            "khoangCach": 160,
            "quangDuong": 160,
            "thoiGianDuKien": "3 giờ 30 phút",
            "giaVe": 150000,
            "giaChuyenXe": 150000,
            "maXe": "XE002",
            "moTa": "Chuyến xe ghế ngồi từ Hà Nội đi Hạ Long"
        },
        {
            "maCX": "CX008",
            "tenChuyen": "Đà Nẵng - Huế",
            "diemDi": "Đà Nẵng",
            "diemDen": "Huế",
            "khoangCach": 100,
            "quangDuong": 100,
            "thoiGianDuKien": "2 giờ 30 phút",
            "giaVe": 100000,
            "giaChuyenXe": 100000,
            "maXe": "XE002",
            "moTa": "Chuyến xe ghế ngồi từ Đà Nẵng đi Huế"
        }
    ]
    
    for cx in chuyen_xe_list:
        key = f"chuyenXe:{cx['maCX']}"
        await redis.set(key, json.dumps(cx, ensure_ascii=False))
        await redis.sadd("idx:chuyenXe", cx['maCX'])
    print(f"✅ Inserted {len(chuyen_xe_list)} chuyến xe")
    
    # ========== 7. LỊCH CHẠY (Schedules) ==========
    lich_chay_list = []
    base_date = datetime.now()
    
    gio_chay = ["06:00", "08:00", "10:00", "14:00", "18:00", "22:00"]
    
    for cx in chuyen_xe_list:
        for day_offset in range(0, 14):  # 2 tuần tới
            ngay = (base_date + timedelta(days=day_offset)).strftime("%Y-%m-%d")
            for gio in gio_chay[:3]:  # Mỗi tuyến 3 giờ chạy/ngày
                ma_lich = f"LC_{cx['maCX']}_{ngay}_{gio.replace(':', '')}"
                lich = {
                    "maLC": ma_lich,  # Đồng bộ với redis_service
                    "maCX": cx['maCX'],
                    "maXe": cx['maXe'],  # Thêm maXe
                    "ngayKhoiHanh": ngay,
                    "gioKhoiHanh": gio,
                    "thoiGianXuatBen": gio,
                    "thoiGianDenDuKien": "",  # Sẽ tính sau
                    "thoiGianChay": cx['thoiGianDuKien'],
                    "trangThai": "scheduled",
                    "soGheTrong": 34,
                    "gheDaDat": []
                }
                lich_chay_list.append(lich)
    
    for lc in lich_chay_list:
        key = f"lichChay:{lc['maLC']}"
        await redis.set(key, json.dumps(lc, ensure_ascii=False))
        await redis.sadd("idx:lichChay", lc['maLich'])
    print(f"✅ Inserted {len(lich_chay_list)} lịch chạy")
    
    # ========== 8. VÉ XE (Tickets) - Sample ==========
    ve_xe_list = [
        {
            "maVe": "VE001",
            "maLC": "LC_CX001_2025-11-29_0600",  # Đồng bộ field name
            "maCX": "CX001",
            "maKH": "KH001",
            "maGhe": "A01",  # Single seat per ticket
            "soGhe": ["A01", "A02"],
            "ngayDat": datetime.utcnow().isoformat(),
            "tongTien": 500000,
            "trangThai": "paid",
            "ngayThanhToan": datetime.utcnow().isoformat()
        }
    ]
    
    for ve in ve_xe_list:
        key = f"veXe:{ve['maVe']}"
        await redis.set(key, json.dumps(ve, ensure_ascii=False))
        await redis.sadd("idx:veXe", ve['maVe'])
    print(f"✅ Inserted {len(ve_xe_list)} vé xe")
    
    # ========== 9. HÓA ĐƠN (Invoices) - Sample ==========
    hoa_don_list = [
        {
            "maHD": "HD001",
            "maVe": "VE001",
            "maKH": "KH001",
            "tongTien": 500000,
            "phuongThucThanhToan": "QR",
            "trangThai": "paid",
            "ngayTao": datetime.utcnow().isoformat(),
            "ngayThanhToan": datetime.utcnow().isoformat()
        }
    ]
    
    for hd in hoa_don_list:
        key = f"hoaDon:{hd['maHD']}"
        await redis.set(key, json.dumps(hd, ensure_ascii=False))
        await redis.sadd("idx:hoaDon", hd['maHD'])
    print(f"✅ Inserted {len(hoa_don_list)} hóa đơn")
    
    # ========== SUMMARY ==========
    print("\n" + "="*50)
    print("📊 SEED DATA SUMMARY")
    print("="*50)
    print(f"  • Chức vụ:    {len(chuc_vu_list)}")
    print(f"  • Nhân viên:  {len(nhan_vien_list)}")
    print(f"  • Khách hàng: {len(khach_hang_list)}")
    print(f"  • Xe:         {len(xe_list)}")
    print(f"  • Ghế ngồi:   {len(ghe_ngoi_list)}")
    print(f"  • Chuyến xe:  {len(chuyen_xe_list)}")
    print(f"  • Lịch chạy:  {len(lich_chay_list)}")
    print(f"  • Vé xe:      {len(ve_xe_list)}")
    print(f"  • Hóa đơn:    {len(hoa_don_list)}")
    print("="*50)
    
    print("\n🔐 LOGIN CREDENTIALS:")
    print("-"*50)
    print("👨‍💼 Admin:")
    print("   Email: admin@voobus.com")
    print("   Password: admin123")
    print("-"*50)
    print("👷 Nhân viên:")
    print("   Email: nhanvien@voobus.com")
    print("   Password: nhanvien123")
    print("-"*50)
    print("👤 Khách hàng:")
    print("   Email: customer1@gmail.com")
    print("   Password: 123456")
    print("-"*50)
    print("   Email: test@test.com")
    print("   Password: test123")
    print("="*50)
    
    await redis.close()
    print("\n✅ Seed completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
