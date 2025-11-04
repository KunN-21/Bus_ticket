# Hệ thống đăng nhập và phân quyền - Hướng dẫn

## Tổng quan thay đổi

Hệ thống đã được cập nhật để phân biệt giữa **Khách hàng** và **Nhân viên** khi đăng nhập, đồng thời phân quyền nhân viên thành **Admin** và **Nhân viên bán vé**.

## Cấu trúc chức vụ

### 1. Khách hàng (Customer)
- Đăng ký và đăng nhập thông qua email
- Đặt vé, xem lịch sử đặt vé
- Không có quyền truy cập vào trang quản trị

### 2. Nhân viên (Employee)
Có 2 loại chức vụ:

#### a) Admin (`maChucVu: "admin"`)
- Toàn quyền quản lý hệ thống
- Quản lý nhân viên, khách hàng
- Quản lý chuyến đi, tuyến đường, xe
- Xem báo cáo, thống kê
- Bán vé

#### b) Nhân viên bán vé (`maChucVu: "nhanvien"`)
- Bán vé cho khách hàng
- Xem thông tin chuyến đi
- Không có quyền quản lý nhân viên hoặc hệ thống

## Khởi tạo database

### Cách 1: Chạy script Python

```bash
cd backend
python init_db.py
```

Script sẽ tự động:
- Tạo 2 chức vụ trong collection `chucvu`
- Tạo tài khoản admin mẫu: `admin@example.com / admin123`
- Tạo tài khoản nhân viên mẫu: `staff@example.com / staff123`

### Cách 2: Thủ công qua MongoDB Compass/Shell

```javascript
// 1. Tạo collection chucvu
db.chucvu.insertMany([
  {
    maChucVu: "admin",
    tenChucVu: "Quản trị viên",
    moTa: "Quản trị hệ thống, quản lý toàn bộ"
  },
  {
    maChucVu: "nhanvien",
    tenChucVu: "Nhân viên bán vé",
    moTa: "Nhân viên bán vé, hỗ trợ khách hàng"
  }
]);

// 2. Tạo tài khoản admin (password đã hash: "admin123")
db.nhanvien.insertOne({
  maNV: "NV00001",
  maChucVu: "admin",
  hoTen: "Admin",
  email: "admin@example.com",
  password: "$2b$12$...", // Dùng script init_db.py để tạo
  SDT: "0123456789",
  CCCD: "001234567890",
  diaChi: "Hà Nội",
  hoaDon: [],
  lanCuoiDangNhap: null
});
```

## API Đăng nhập

### Endpoint: `POST /auth/login`

#### Request:
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

#### Response cho Admin:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_type": "employee",
  "role": "admin",
  "user": {
    "maNV": "NV00001",
    "maChucVu": "admin",
    "hoTen": "Admin",
    "email": "admin@example.com",
    "SDT": "0123456789",
    "CCCD": "001234567890",
    "diaChi": "Hà Nội",
    "hoaDon": [],
    "lanCuoiDangNhap": "2025-11-04T10:00:00",
    "chucVuInfo": {
      "maChucVu": "admin",
      "tenChucVu": "Quản trị viên",
      "moTa": "Quản trị hệ thống, quản lý toàn bộ"
    }
  }
}
```

#### Response cho Nhân viên:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_type": "employee",
  "role": "nhanvien",
  "user": {
    "maNV": "NV00002",
    "maChucVu": "nhanvien",
    "hoTen": "Nguyễn Văn A",
    "email": "staff@example.com",
    "SDT": "0987654321",
    "CCCD": "009876543210",
    "diaChi": "Hồ Chí Minh",
    "hoaDon": [],
    "lanCuoiDangNhap": "2025-11-04T10:00:00",
    "chucVuInfo": {
      "maChucVu": "nhanvien",
      "tenChucVu": "Nhân viên bán vé",
      "moTa": "Nhân viên bán vé, hỗ trợ khách hàng"
    }
  }
}
```

#### Response cho Khách hàng:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_type": "customer",
  "role": null,
  "user": {
    "maKH": "KH00001",
    "hoTen": "Trần Thị B",
    "email": "customer@example.com",
    "SDT": "0912345678",
    "CCCD": "012345678901",
    "diaChi": "Đà Nẵng"
  }
}
```

## JWT Token

Token bây giờ chứa các thông tin sau:

```json
{
  "sub": "admin@example.com",
  "type": "employee",
  "maNV": "NV00001",
  "role": "admin",
  "exp": 1730718000
}
```

Đối với khách hàng:
```json
{
  "sub": "customer@example.com",
  "type": "customer",
  "maKH": "KH00001",
  "exp": 1730718000
}
```

## Phân quyền trên Backend

### Middleware có sẵn:

| Middleware | Mô tả | Sử dụng |
|------------|-------|---------|
| `get_current_user` | Lấy user hiện tại | `user = Depends(get_current_user)` |
| `get_current_customer` | Chỉ khách hàng | `customer = Depends(get_current_customer)` |
| `get_current_employee` | Tất cả nhân viên | `employee = Depends(get_current_employee)` |
| `get_current_admin` | Chỉ admin | `admin = Depends(get_current_admin)` |

### Ví dụ sử dụng:

```python
from fastapi import APIRouter, Depends
from app.core.middleware import get_current_admin, get_current_employee, get_current_customer

router = APIRouter()

# Chỉ admin
@router.post("/admin/employees")
async def create_employee(admin = Depends(get_current_admin)):
    # Chỉ admin mới tạo được nhân viên
    pass

# Tất cả nhân viên (admin + staff)
@router.post("/tickets/sell")
async def sell_ticket(employee = Depends(get_current_employee)):
    # Cả admin và nhân viên đều bán được vé
    pass

# Chỉ khách hàng
@router.get("/my-tickets")
async def get_my_tickets(customer = Depends(get_current_customer)):
    # Chỉ khách hàng xem được vé của mình
    pass
```

## Frontend Integration

### JavaScript/TypeScript

```javascript
// Đăng nhập
async function login(email, password) {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  // Lưu thông tin
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('user_type', data.user_type);
  localStorage.setItem('role', data.role);
  localStorage.setItem('user', JSON.stringify(data.user));
  
  // Điều hướng
  if (data.user_type === 'customer') {
    window.location.href = '/';
  } else if (data.user_type === 'employee') {
    if (data.role === 'admin') {
      window.location.href = '/admin/dashboard';
    } else {
      window.location.href = '/admin/tickets';
    }
  }
}

// Gọi API với token
async function callAPI(endpoint) {
  const token = localStorage.getItem('token');
  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}

// Kiểm tra quyền
function isAdmin() {
  return localStorage.getItem('user_type') === 'employee' 
    && localStorage.getItem('role') === 'admin';
}

function isEmployee() {
  return localStorage.getItem('user_type') === 'employee';
}

function isCustomer() {
  return localStorage.getItem('user_type') === 'customer';
}
```

## Testing

### Test với cURL

```bash
# 1. Đăng nhập admin
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# 2. Sử dụng token (thay TOKEN bằng access_token nhận được)
curl -X GET http://localhost:8000/admin/dashboard \
  -H "Authorization: Bearer TOKEN"
```

### Test với Python requests

```python
import requests

# Đăng nhập
response = requests.post('http://localhost:8000/auth/login', json={
    'email': 'admin@example.com',
    'password': 'admin123'
})
data = response.json()
token = data['access_token']

# Gọi API
headers = {'Authorization': f'Bearer {token}'}
response = requests.get('http://localhost:8000/admin/dashboard', headers=headers)
print(response.json())
```

## Tài liệu bổ sung

- `DATABASE_SETUP.md` - Hướng dẫn cấu trúc database
- `MIDDLEWARE_USAGE.md` - Hướng dẫn chi tiết về middleware

## Lưu ý

1. **Mật khẩu mặc định**: Đổi ngay sau khi khởi tạo
2. **JWT Secret**: Đặt `JWT_SECRET_KEY` trong file `.env`
3. **Token expire**: Mặc định 7 ngày, có thể thay đổi trong `jwt_settings.py`
4. **HTTPS**: Sử dụng HTTPS trong production để bảo mật token

## Troubleshooting

### Lỗi "Email hoặc mật khẩu không chính xác"
- Kiểm tra email và password
- Đảm bảo đã chạy `init_db.py` hoặc tạo tài khoản thủ công

### Lỗi "Access denied. Admin privileges required"
- Kiểm tra `maChucVu` của nhân viên phải là "admin"
- Kiểm tra collection `chucvu` đã có dữ liệu

### Token expired
- Đăng nhập lại để lấy token mới
- Hoặc tăng thời gian expire trong `jwt_settings.py`
