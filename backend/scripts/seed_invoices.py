"""
Script để thêm 30 hóa đơn và vé mẫu vào Redis
Chạy: conda activate BookingTicket && python scripts/seed_invoices.py
"""
import redis
import json
import random
from datetime import datetime, timedelta

# Redis Cloud connection (lấy từ redis_restore.py)
REDIS_HOST = "redis-10134.crce185.ap-seast-1-1.ec2.redns.redis-cloud.com"
REDIS_PORT = 10134
REDIS_PASSWORD = "dEfaFN1CYPJZckm6chYY4K2Fq1V5Ph2o"


def clear_and_seed():
    """Xóa vé/hóa đơn cũ và thêm 30 mẫu mới"""
    
    r = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD,
        decode_responses=True
    )
    
    try:
        r.ping()
        print("✅ Kết nối Redis thành công")
    except Exception as e:
        print(f"❌ Lỗi kết nối: {e}")
        return
    
    # ========== XÓA DỮ LIỆU CŨ ==========
    print("\n🗑️ Đang xóa vé và hóa đơn cũ...")
    
    # Xóa tất cả vé
    ve_keys = r.keys("veXe:*")
    if ve_keys:
        r.delete(*ve_keys)
    r.delete("idx:veXe")
    print(f"   Đã xóa {len(ve_keys)} vé")
    
    # Xóa tất cả hóa đơn
    hd_keys = r.keys("hoaDon:*")
    if hd_keys:
        r.delete(*hd_keys)
    r.delete("idx:hoaDon")
    print(f"   Đã xóa {len(hd_keys)} hóa đơn")
    
    # ========== THÊM DỮ LIỆU MỚI ==========
    print("\n📝 Đang thêm 30 hóa đơn mẫu...")
    
    # Dữ liệu mẫu
    khach_hang_ids = ["KH001", "KH002", "KH003", "KH004", "KH005"]
    chuyen_xe_data = {
        "CX001": {"gia": 250000, "diemDi": "TP.HCM", "diemDen": "Đà Lạt", "maXe": "XE001"},
        "CX002": {"gia": 300000, "diemDi": "TP.HCM", "diemDen": "Nha Trang", "maXe": "XE001"},
        "CX003": {"gia": 120000, "diemDi": "TP.HCM", "diemDen": "Vũng Tàu", "maXe": "XE002"},
        "CX004": {"gia": 150000, "diemDi": "TP.HCM", "diemDen": "Cần Thơ", "maXe": "XE002"},
        "CX005": {"gia": 180000, "diemDi": "TP.HCM", "diemDen": "Phan Thiết", "maXe": "XE003"},
        "CX006": {"gia": 280000, "diemDi": "Hà Nội", "diemDen": "Sapa", "maXe": "XE001"},
        "CX007": {"gia": 150000, "diemDi": "Hà Nội", "diemDen": "Hạ Long", "maXe": "XE002"},
        "CX008": {"gia": 100000, "diemDi": "Đà Nẵng", "diemDen": "Huế", "maXe": "XE002"},
    }
    phuong_thuc_list = ["QR", "Cash", "Online", "MoMo", "VNPay"]
    
    random.seed(42)
    base_date = datetime.now()
    
    ve_list = []
    hd_list = []
    
    for i in range(1, 31):  # 30 hóa đơn
        # Random ngày trong 30 ngày qua
        ngay_offset = random.randint(0, 30)
        ngay = base_date - timedelta(days=ngay_offset)
        ngay_str = ngay.strftime("%Y-%m-%d")
        gio = f"{random.randint(6, 22):02d}:{random.randint(0, 59):02d}:00"
        ngay_full = f"{ngay_str}T{gio}"
        
        # Random thông tin
        maKH = random.choice(khach_hang_ids)
        maCX = random.choice(list(chuyen_xe_data.keys()))
        cx_info = chuyen_xe_data[maCX]
        gia_ve = cx_info["gia"]
        so_ghe = random.randint(1, 3)  # 1-3 ghế
        tong_tien = gia_ve * so_ghe
        phuong_thuc = random.choice(phuong_thuc_list)
        trang_thai = random.choices(["paid", "confirmed"], weights=[80, 20])[0]
        
        # Tạo mã
        maHD = f"HD{i:05d}"
        
        # Tạo các vé
        danh_sach_ve = []
        for j in range(so_ghe):
            ve_idx = (i - 1) * 3 + j + 1  # Đảm bảo mã vé unique
            maVe = f"VE{ve_idx:05d}"
            danh_sach_ve.append(maVe)
            
            maLC = f"LC_{maCX}_{ngay_str}_0600"
            maGhe = f"{cx_info['maXe']}_A{random.randint(1, 34):02d}"
            
            ve = {
                "maVe": maVe,
                "maLC": maLC,
                "maCX": maCX,
                "maKH": maKH,
                "maHD": maHD,
                "maGhe": maGhe,
                "giaVe": gia_ve,
                "diemDi": cx_info["diemDi"],
                "diemDen": cx_info["diemDen"],
                "ngayDi": ngay_str,
                "ngayDat": ngay_full,
                "trangThai": trang_thai
            }
            ve_list.append(ve)
        
        # Tạo hóa đơn
        hoa_don = {
            "maHD": maHD,
            "maKH": maKH,
            "maNV": random.choice(["NV001", "NV002", None]),
            "danhSachVe": danh_sach_ve,
            "soLuongVe": so_ghe,
            "tongTien": tong_tien,
            "phuongThucThanhToan": phuong_thuc,
            "trangThai": trang_thai,
            "ngayLap": ngay_full,
            "ngayTao": ngay_str,  # Cho thống kê
            "ngayThanhToan": ngay_full,
            "ghiChu": f"Đặt vé tuyến {cx_info['diemDi']} - {cx_info['diemDen']}"
        }
        hd_list.append(hoa_don)
    
    # Lưu vé vào Redis
    for ve in ve_list:
        key = f"veXe:{ve['maVe']}"
        r.set(key, json.dumps(ve, ensure_ascii=False))
        r.sadd("idx:veXe", ve['maVe'])
    
    # Lưu hóa đơn vào Redis
    for hd in hd_list:
        key = f"hoaDon:{hd['maHD']}"
        r.set(key, json.dumps(hd, ensure_ascii=False))
        r.sadd("idx:hoaDon", hd['maHD'])
    
    # ========== THỐNG KÊ ==========
    total_revenue = sum(hd["tongTien"] for hd in hd_list)
    
    print("\n" + "=" * 50)
    print("📊 KẾT QUẢ:")
    print("=" * 50)
    print(f"   ✅ Đã thêm {len(hd_list)} hóa đơn")
    print(f"   ✅ Đã thêm {len(ve_list)} vé")
    print(f"   💰 Tổng doanh thu: {total_revenue:,.0f} VNĐ")
    print("=" * 50)
    
    # Hiển thị phân bố theo tháng
    print("\n📅 Phân bố theo ngày:")
    from collections import Counter
    dates = [hd["ngayTao"] for hd in hd_list]
    for date, count in sorted(Counter(dates).items())[-10:]:
        print(f"   {date}: {count} hóa đơn")


if __name__ == "__main__":
    clear_and_seed()
