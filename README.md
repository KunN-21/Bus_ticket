# 🎫 VooBus - Bus Ticket Booking System

Full-stack web application đặt vé xe khách với FastAPI, Redis, MongoDB và Vanilla JavaScript. Giao diện hiện đại với hệ thống xác thực OTP qua email.

## ✨ Features

### 🔐 User Authentication
- **Đăng ký 4 bước với OTP**:
  1. Nhập email → Gửi OTP
  2. Xác thực OTP (6 số)
  3. Đặt mật khẩu
  4. Hoàn thành thông tin (Họ tên, SĐT, CCCD, Địa chỉ)
- **Đăng nhập** với email/password
- **JWT token** authentication
- **Account dropdown** với logout confirmation
- **Session management** với localStorage

### 🎫 Ticket Management  
- Xem danh sách vé xe
- Tìm kiếm vé theo tuyến đường, ngày
- Thông tin chi tiết: giờ đi, giờ đến, loại xe
- Chọn ghế ngồi

### 📱 Booking System
- Đặt vé online
- Thông tin khách hàng
- Chọn số lượng ghế
- Theo dõi trạng thái booking

### 💳 Payment với QR Code
- Tạo mã QR thanh toán tự động
- Thông tin chuyển khoản rõ ràng
- Xác nhận thanh toán
- Cập nhật trạng thái booking sau thanh toán

### 🔔 Notification System
- **Toast Notifications**: 4 loại (success, error, warning, info)
- **Modal Dialogs**: Confirm/Alert với promise-based API
- Auto-dismiss với progress bar
- Stack multiple notifications
- Responsive design

### ⚡ Performance
- Redis caching cho OTP (TTL 5 phút) và registration state
- MongoDB persistent storage
- Async/await operations
- Email OTP với SMTP (Gmail)

## 🏗️ Cấu trúc Project

```
backend/
├── main.py                 # FastAPI entry point
├── requirements.txt
├── .env
└── app/
    ├── __init__.py
    ├── config.py           # Settings (JWT, DB, SMTP)
    ├── core/               # Core utilities
    │   ├── auth.py         # JWT & password hashing (bcrypt)
    │   ├── database.py     # MongoDB & Redis clients
    │   └── middleware.py   # Auth middleware
    ├── models/             # Pydantic models
    │   └── auth.py         # Auth request/response models
    ├── routes/             # API endpoints
    │   ├── auth.py         # Registration & login
    │   └── users.py        # User profile
    └── services/           # Business logic
        └── otp_service.py  # OTP generation & email

frontend/
├── index.html              # Homepage
├── login_register.html     # Auth page
└── assets/
    ├── styles/
    │   ├── core/           # main.css
    │   ├── components/     # header, footer, toast
    │   ├── pages/          # hero, sections
    │   └── features/       # auth, booking
    └── scripts/
        ├── core/           # toast.js, main.js
        └── features/       # auth.js, admin.js
```

## 🚀 Setup & Installation

### Backend Setup

1. **Tạo virtual environment**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
```

2. **Cài đặt dependencies**
```bash
pip install -r requirements.txt
```

3. **Tạo file `.env`**
```env
# Redis Configuration (Upstash)
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_USERNAME=default
REDIS_PASSWORD=your-redis-password

# MongoDB Configuration
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
MONGO_DB=BookingTicket

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-key-change-this-in-production

# SMTP Configuration (Gmail)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Project Settings
PROJECT_NAME=VooBus Booking API
```

4. **Chạy server**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

### Frontend Setup

1. **Mở bằng Live Server (VS Code)**
   - Cài extension "Live Server"
   - Right-click `index.html` → "Open with Live Server"
   - App: http://localhost:5500

2. **Hoặc dùng Python HTTP Server**
```bash
cd frontend
python -m http.server 5500
```

3. **Hoặc dùng Node.js http-server**
```bash
npm install -g http-server
cd frontend
http-server -p 5500
```
## 📡 API Endpoints

### 🔐 Authentication (`/auth`)
- `POST /auth/register/initiate` - Bước 1: Gửi OTP đến email
- `POST /auth/register/verify-otp` - Bước 2: Xác thực OTP
- `POST /auth/register/set-password` - Bước 3: Đặt mật khẩu
- `POST /auth/register/complete` - Bước 4: Hoàn thành đăng ký
- `POST /auth/register/resend-otp` - Gửi lại OTP
- `POST /auth/login` - Đăng nhập (email + password)

**Example Registration Flow:**
```json
// Step 1: Initiate
POST /auth/register/initiate
{
  "email": "user@example.com"
}

// Step 2: Verify OTP
POST /auth/register/verify-otp
{
  "email": "user@example.com",
  "otp": "123456"
}

// Step 3: Set Password
POST /auth/register/set-password
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

// Step 4: Complete
POST /auth/register/complete
{
  "email": "user@example.com",
  "hoTen": "Nguyễn Văn A",
  "SDT": "0901234567",
  "CCCD": "001234567890",
  "diaChi": "123 Nguyễn Huệ, Q1, TP.HCM"
}

// Response: JWT token + user info
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "maKH": "KH00001",
    "email": "user@example.com",
    "hoTen": "Nguyễn Văn A",
    ...
  }
}
```

### 👤 Users (`/users`)
- `GET /users/me` - Lấy thông tin user hiện tại (requires auth)
- `PUT /users/me` - Cập nhật profile (requires auth)

**Headers required:**
```
Authorization: Bearer <access_token>
```
### 🎫 Tickets (Coming Soon)
- `GET /tickets` - Lấy tất cả vé
- `GET /tickets/{id}` - Chi tiết vé
- `POST /tickets/search` - Tìm kiếm vé

### 📱 Bookings (Coming Soon)
- `GET /bookings` - Lấy tất cả booking
- `POST /bookings` - Tạo booking mới

### 💳 Payments (Coming Soon)
- `POST /payments` - Tạo payment + QR code
- `POST /payments/{id}/confirm` - Xác nhận thanh toán

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Redis (Upstash)** - OTP storage & caching (TTL 5 min)
- **MongoDB (Atlas)** - Main database (Motor async driver)
- **Pydantic** - Data validation
- **bcrypt** - Password hashing (v4.1.2)
- **PyJWT** - JWT token generation
- **SMTP** - Email OTP delivery (Gmail)
- **python-dotenv** - Environment variables

### Frontend
- **Vanilla JavaScript (ES6+)** - No frameworks
- **HTML5 & CSS3** - Semantic markup & modern styles
- **CSS Grid & Flexbox** - Responsive layouts
- **LocalStorage API** - Client-side storage
- **Fetch API** - HTTP requests
- **Custom Components**:
  - ToastManager (notifications)
  - ModalManager (dialogs)

## 🎨 Design & UI

### Design System
- **Colors**: Orange primary (#FF6600), Purple accent (#667eea)
- **Typography**: Poppins font family
- **Components**: Toast notifications, Modal dialogs, Dropdown menus
- **Icons**: SVG inline icons
- **Responsive**: Mobile-first approach

### Key Features
- ✅ Multi-step registration form with progress indicator
- ✅ OTP input with auto-formatting (3-3 digits)
- ✅ Toast notifications (success/error/warning/info)
- ✅ Modal confirmations with promise-based API
- ✅ User account dropdown
- ✅ Smooth animations & transitions
- ✅ Form validation with error messages
## 📝 Database Schema

### KhachHang (Customers) Collection
```json
{
  "_id": "ObjectId",
  "maKH": "KH00001",
  "email": "user@example.com",
  "password": "$2b$12$...",  // bcrypt hashed
  "hoTen": "Nguyễn Văn A",
  "SDT": "0901234567",
  "CCCD": "001234567890",
  "diaChi": "123 Nguyễn Huệ, Q1, TP.HCM",
  "thoiGianTao": "ISODate",
  "lanCuoiDangNhap": "ISODate"
}
```

### Redis Keys (Temporary Storage)

**OTP Storage:**
```
Key: otp:{email}
Value: "123456"
TTL: 300 seconds (5 minutes)
```

**Registration State:**
```
Key: registration:{email}
Value: {
  "step": "otp_verified|password_set",
  "data": {"password": "hashed"},
  "timestamp": "ISO string"
}
TTL: 3600 seconds (1 hour)
```

### Tickets Collection (Future)
```json
{
  "_id": "ObjectId",
  "maVe": "VE00001",
  "tuyenDuong": "TP.HCM - Đà Lạt",
  "giaVe": 250000,
  "ngayDi": "ISODate",
  "gioDi": "06:00",
  "gioDen": "12:00",
  "loaiXe": "Giường nằm",
  "soGheTrong": 30
}
```

### Bookings Collection (Future)
```json
{
  "_id": "ObjectId",
  "maDatVe": "DV00001",
  "maVe": "VE00001",
  "maKH": "KH00001",
  "soLuongGhe": 2,
  "soGheNgoi": ["A1", "A2"],
  "tongTien": 500000,
  "trangThai": "pending|confirmed|cancelled",
  "ngayDat": "ISODate"
}
```
## 🔒 Security

- ✅ Passwords hashed với **bcrypt** (cost factor 12)
- ✅ JWT tokens với expiry (7 days)
- ✅ OTP auto-expire sau 5 phút
- ✅ Email verification trước khi đăng ký
- ✅ CORS configured cho frontend origins
- ✅ Environment variables cho sensitive data
- ✅ Input validation với Pydantic models
- ✅ Protected routes với JWT middleware
- ✅ SQL injection prevention (MongoDB parameterized queries)

## 📖 Usage Flow

### Registration Flow
1. User nhập email → Click "Đăng ký"
2. Backend gửi OTP (6 số) qua email
3. User nhập OTP → Verify
4. User đặt mật khẩu (min 6 ký tự)
5. User điền thông tin cá nhân (Họ tên, SĐT, CCCD, Địa chỉ)
6. Backend tạo account → Return JWT token
7. Auto redirect về trang chủ với logged-in state

### Login Flow
1. User nhập email + password
2. Backend verify credentials
3. Return JWT token + user info
4. Save to localStorage
5. Show account dropdown instead of login button

### Booking Flow (Future)
1. User tìm kiếm vé xe
2. Chọn vé và số ghế
3. Nhập thông tin đặt vé
4. Tạo booking
5. Thanh toán (QR code)
6. Xác nhận → Booking confirmed

## 👨‍💻 Development

### Run Backend
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Run Frontend
```bash
cd frontend
# Use Live Server in VS Code (port 5500)
# Or: python -m http.server 5500
```

### Test API
```bash
# Health check
curl http://localhost:8000/health

# Register (Step 1)
curl -X POST http://localhost:8000/auth/register/initiate \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

## 🐛 Troubleshooting

### Backend Issues

**ModuleNotFoundError:**
```bash
# Make sure venv is activated
cd backend
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

**Redis Connection Error:**
```bash
# Check .env has correct Redis credentials
# Test connection: redis-cli -h <host> -p <port> -a <password>
```

**MongoDB Connection Error:**
```bash
# Check MONGO_URL in .env
# Ensure IP whitelist in MongoDB Atlas (0.0.0.0/0 for dev)
```

### Frontend Issues

**CORS Error:**
```python
# Check main.py has your frontend origin:
allow_origins=["http://localhost:5500", ...]
```

**404 Not Found:**
```bash
# Make sure backend is running on port 8000
# Check API_URL in frontend JavaScript files
```

## 🚧 Future Features

- [ ] Ticket search & filtering
- [ ] Seat selection UI
- [ ] Payment integration (VNPay/MoMo)
- [ ] Booking history
- [ ] Email notifications
- [ ] Admin dashboard
- [ ] Route management
- [ ] Analytics & reports
- [ ] Mobile app (React Native)

## 📚 Documentation

- **Backend API Docs**: http://localhost:8000/docs (Swagger UI)
- **Backend Structure**: `backend/STRUCTURE.md`
- **Frontend Structure**: `frontend/STRUCTURE.md`

## 👥 Contributors

- **VooBus Team** - Initial work

## 📄 License

MIT License - Free to use for learning and personal projects!
