# Hướng dẫn thiết lập Database

## Collection: chucvu (Chức vụ)

Collection này lưu thông tin về các chức vụ của nhân viên.

### Cấu trúc:
```json
{
  "maChucVu": "admin",
  "tenChucVu": "Quản trị viên",
  "moTa": "Quản trị hệ thống, quản lý toàn bộ"
}
```

```json
{
  "maChucVu": "nhanvien",
  "tenChucVu": "Nhân viên bán vé",
  "moTa": "Nhân viên bán vé, hỗ trợ khách hàng"
}
```

### Script khởi tạo (MongoDB Shell hoặc Compass):

```javascript
// Tạo collection chucvu nếu chưa tồn tại
db.createCollection("chucvu");

// Thêm 2 chức vụ
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
```

## Collection: nhanvien (Nhân viên)

Khi tạo nhân viên, cần gán `maChucVu` là "admin" hoặc "nhanvien".

### Ví dụ:
```json
{
  "maNV": "NV00001",
  "maChucVu": "admin",
  "hoTen": "Nguyễn Văn A",
  "email": "admin@example.com",
  "password": "$2b$12$...",
  "SDT": "0123456789",
  "CCCD": "001234567890",
  "diaChi": "123 ABC Street",
  "hoaDon": [],
  "lanCuoiDangNhap": null
}
```

## Luồng đăng nhập mới

### 1. Khách hàng đăng nhập:
```
POST /auth/login
{
  "email": "customer@example.com",
  "password": "123456"
}

Response:
{
  "access_token": "...",
  "token_type": "bearer",
  "user_type": "customer",
  "role": null,
  "user": { ... }
}
```

### 2. Nhân viên (bán vé) đăng nhập:
```
POST /auth/login
{
  "email": "staff@example.com",
  "password": "123456"
}

Response:
{
  "access_token": "...",
  "token_type": "bearer",
  "user_type": "employee",
  "role": "nhanvien",
  "user": {
    ...
    "chucVuInfo": {
      "maChucVu": "nhanvien",
      "tenChucVu": "Nhân viên bán vé",
      "moTa": "..."
    }
  }
}
```

### 3. Admin đăng nhập:
```
POST /auth/login
{
  "email": "admin@example.com",
  "password": "123456"
}

Response:
{
  "access_token": "...",
  "token_type": "bearer",
  "user_type": "employee",
  "role": "admin",
  "user": {
    ...
    "chucVuInfo": {
      "maChucVu": "admin",
      "tenChucVu": "Quản trị viên",
      "moTa": "..."
    }
  }
}
```

## Phân quyền trên Frontend

Dựa vào response từ API login, frontend có thể điều hướng như sau:

- `user_type === "customer"` → Trang chủ khách hàng
- `user_type === "employee" && role === "admin"` → Dashboard admin (toàn quyền)
- `user_type === "employee" && role === "nhanvien"` → Dashboard nhân viên (chỉ bán vé)

## JWT Token

Token bây giờ sẽ chứa thêm trường `role` cho nhân viên:

```json
{
  "sub": "admin@example.com",
  "type": "employee",
  "maNV": "NV00001",
  "role": "admin",
  "exp": 1234567890
}
```

Middleware có thể sử dụng `role` này để phân quyền các endpoint.
