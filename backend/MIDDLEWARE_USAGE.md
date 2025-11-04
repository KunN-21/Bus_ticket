# Hướng dẫn sử dụng Middleware phân quyền

## Tổng quan

Sau khi cập nhật hệ thống đăng nhập, bạn có thể sử dụng các middleware sau để phân quyền:

### 1. `get_current_user` - Xác thực người dùng
Lấy thông tin người dùng hiện tại (khách hàng hoặc nhân viên).

```python
from fastapi import Depends
from app.core.middleware import get_current_user

@router.get("/profile")
async def get_profile(current_user = Depends(get_current_user)):
    # current_user chứa payload từ JWT token
    # {"sub": "email", "type": "customer/employee", "role": "admin/nhanvien", ...}
    return {"user": current_user}
```

### 2. `get_current_customer` - Chỉ khách hàng
Chỉ cho phép khách hàng truy cập endpoint.

```python
from fastapi import Depends
from app.core.middleware import get_current_customer

@router.get("/my-tickets")
async def get_my_tickets(customer = Depends(get_current_customer)):
    # customer là object từ collection khachhang
    # Chỉ khách hàng mới có thể truy cập
    return {"tickets": [...]}
```

### 3. `get_current_employee` - Chỉ nhân viên
Cho phép bất kỳ nhân viên nào (admin hoặc nhân viên bán vé) truy cập.

```python
from fastapi import Depends
from app.core.middleware import get_current_employee

@router.post("/tickets/sell")
async def sell_ticket(employee = Depends(get_current_employee)):
    # employee là object từ collection nhanvien
    # Cả admin và nhân viên bán vé đều có thể truy cập
    return {"message": "Ticket sold"}
```

### 4. `get_current_admin` - Chỉ Admin
Chỉ cho phép nhân viên có chức vụ "admin" truy cập.

```python
from fastapi import Depends
from app.core.middleware import get_current_admin

@router.post("/employees/create")
async def create_employee(admin = Depends(get_current_admin)):
    # admin là object từ collection nhanvien với role "admin"
    # Chỉ admin mới có thể tạo nhân viên mới
    return {"message": "Employee created"}
```

### 5. `require_role` - Phân quyền linh hoạt
Cho phép chỉ định nhiều role có thể truy cập.

```python
from fastapi import Depends, Header
from app.core.middleware import require_role

@router.get("/reports")
async def get_reports(authorization: str = Header(None)):
    # Chỉ admin và nhân viên mới xem được báo cáo
    await require_role(["admin", "nhanvien"], authorization)
    return {"reports": [...]}

@router.delete("/tickets/{ticket_id}")
async def delete_ticket(ticket_id: str, authorization: str = Header(None)):
    # Chỉ admin mới có thể xóa vé
    await require_role(["admin"], authorization)
    return {"message": "Ticket deleted"}
```

## Ví dụ thực tế

### Route quản lý nhân viên (chỉ admin)

```python
from fastapi import APIRouter, Depends
from app.core.middleware import get_current_admin
from app.models.auth import NhanVienCreate, NhanVienResponse

router = APIRouter(prefix="/admin/employees", tags=["Admin - Employees"])

@router.post("/", response_model=NhanVienResponse)
async def create_employee(
    employee_data: NhanVienCreate,
    admin = Depends(get_current_admin)
):
    """Chỉ admin mới có thể tạo nhân viên"""
    # Logic tạo nhân viên
    pass

@router.put("/{maNV}")
async def update_employee(
    maNV: str,
    employee_data: NhanVienCreate,
    admin = Depends(get_current_admin)
):
    """Chỉ admin mới có thể cập nhật nhân viên"""
    pass

@router.delete("/{maNV}")
async def delete_employee(
    maNV: str,
    admin = Depends(get_current_admin)
):
    """Chỉ admin mới có thể xóa nhân viên"""
    pass
```

### Route bán vé (admin + nhân viên)

```python
from fastapi import APIRouter, Depends
from app.core.middleware import get_current_employee
from app.models.auth import VeCreate, VeResponse

router = APIRouter(prefix="/tickets", tags=["Tickets"])

@router.post("/sell", response_model=VeResponse)
async def sell_ticket(
    ticket_data: VeCreate,
    employee = Depends(get_current_employee)
):
    """Cả admin và nhân viên bán vé đều có thể bán vé"""
    ticket_data.maNV = employee["maNV"]
    # Logic bán vé
    pass

@router.get("/")
async def list_tickets(employee = Depends(get_current_employee)):
    """Xem danh sách vé (tất cả nhân viên)"""
    pass
```

### Route đặt vé (chỉ khách hàng)

```python
from fastapi import APIRouter, Depends
from app.core.middleware import get_current_customer
from app.models.auth import VeCreate, VeResponse

router = APIRouter(prefix="/booking", tags=["Booking"])

@router.post("/", response_model=VeResponse)
async def book_ticket(
    ticket_data: VeCreate,
    customer = Depends(get_current_customer)
):
    """Chỉ khách hàng mới có thể đặt vé"""
    ticket_data.maKH = customer["maKH"]
    # Logic đặt vé
    pass

@router.get("/my-bookings")
async def my_bookings(customer = Depends(get_current_customer)):
    """Xem vé đã đặt của mình"""
    pass
```

## Testing với cURL

### 1. Đăng nhập để lấy token

```bash
# Đăng nhập admin
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"123456"}'

# Response sẽ có:
# {
#   "access_token": "eyJ...",
#   "user_type": "employee",
#   "role": "admin",
#   ...
# }
```

### 2. Sử dụng token để gọi API

```bash
# Sử dụng token trong header Authorization
curl -X GET http://localhost:8000/admin/employees \
  -H "Authorization: Bearer eyJ..."
```

## Frontend Integration

### JavaScript/TypeScript

```typescript
// Lưu thông tin đăng nhập
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const data = await loginResponse.json();

// Lưu vào localStorage
localStorage.setItem('token', data.access_token);
localStorage.setItem('user_type', data.user_type);
localStorage.setItem('role', data.role);

// Điều hướng dựa trên role
if (data.user_type === 'customer') {
  window.location.href = '/';
} else if (data.user_type === 'employee') {
  if (data.role === 'admin') {
    window.location.href = '/admin/dashboard';
  } else {
    window.location.href = '/admin/tickets';
  }
}

// Sử dụng token trong các request tiếp theo
const token = localStorage.getItem('token');
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Kiểm tra quyền trên frontend

```typescript
function canAccessAdminFeatures() {
  const userType = localStorage.getItem('user_type');
  const role = localStorage.getItem('role');
  return userType === 'employee' && role === 'admin';
}

function canSellTickets() {
  const userType = localStorage.getItem('user_type');
  return userType === 'employee'; // Both admin and staff
}

function isCustomer() {
  const userType = localStorage.getItem('user_type');
  return userType === 'customer';
}

// Ẩn/hiện menu dựa trên quyền
if (canAccessAdminFeatures()) {
  document.getElementById('admin-menu').style.display = 'block';
}
```

## Tóm tắt

| Middleware | Cho phép | Sử dụng khi |
|------------|----------|-------------|
| `get_current_user` | Tất cả người dùng đã đăng nhập | Cần xác thực cơ bản |
| `get_current_customer` | Chỉ khách hàng | Tính năng dành cho khách hàng |
| `get_current_employee` | Tất cả nhân viên (admin + staff) | Tính năng dành cho nhân viên |
| `get_current_admin` | Chỉ admin | Tính năng quản trị |
| `require_role([...])` | Các role cụ thể | Phân quyền linh hoạt |
