# 🎫 Booking Ticket System

Full-stack web application đặt vé xe khách với FastAPI, Redis, MongoDB và React TypeScript. Giao diện lấy cảm hứng từ Futa Bus.

## ✨ Features

### 🔐 User Authentication
- Đăng ký tài khoản mới
- Đăng nhập với JWT token
- Quản lý session với localStorage

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

### ⚡ Performance
- Redis caching cho tickets (TTL 5 phút)
- MongoDB persistent storage
- Async/await operations

## 🏗️ Cấu trúc Project

```
Project/
├── backend/                 # FastAPI Backend
│   ├── routes/
│   │   ├── users.py        # Authentication APIs
│   │   ├── tickets.py      # Ticket CRUD + caching
│   │   ├── bookings.py     # Booking management
│   │   └── payments.py     # Payment + QR generation
│   ├── main.py             # FastAPI app
│   ├── database.py         # Redis & MongoDB connections  
│   ├── models.py           # Pydantic models
│   ├── auth.py             # JWT & password hashing
│   ├── config.py           # Settings
│   └── requirements.txt
│
├── frontend/               # React TypeScript Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx    # Landing page (Futa Bus style)
│   │   │   ├── Login.tsx   # Login page
│   │   │   ├── Register.tsx # Register page
│   │   │   └── TicketList.tsx # Ticket listing
│   │   ├── components/
│   │   │   └── TicketCard.tsx # Ticket card component
│   │   ├── services/
│   │   │   ├── api.ts      # API client
│   │   │   └── auth.ts     # Auth helpers
│   │   └── types/
│   │       └── index.ts    # TypeScript types
│   └── package.json
│
└── .env                    # Environment variables
```

## 🚀 Setup & Installation

### Backend Setup

1. **Tạo virtual environment**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
```

2. **Cài đặt dependencies**
```bash
pip install -r requirements.txt
```

3. **Chạy server**
```bash
uvicorn main:app --reload
```
- API: http://localhost:8000
- Docs: http://localhost:8000/docs

### Frontend Setup

1. **Cài đặt dependencies**
```bash
cd frontend
npm install
```

2. **Chạy dev server**
```bash
npm run dev
```
- App: http://localhost:5173

## 🔧 Environment Variables

File `.env` cần có:
```env
# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=10134
REDIS_USERNAME=default
REDIS_PASSWORD=your-password

# MongoDB Configuration
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
MONGO_DB=BookingTicket

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-key-change-this
```

## 📡 API Endpoints

### 🔐 Authentication
- `POST /api/v1/auth/register` - Đăng ký
- `POST /api/v1/auth/login` - Đăng nhập
- `GET /api/v1/auth/me` - Lấy thông tin user

### 🎫 Tickets
- `GET /api/v1/tickets` - Lấy tất cả vé
- `GET /api/v1/tickets/{id}` - Chi tiết vé
- `POST /api/v1/tickets` - Tạo vé mới
- `PUT /api/v1/tickets/{id}` - Cập nhật vé
- `DELETE /api/v1/tickets/{id}` - Xóa vé

### 📱 Bookings
- `GET /api/v1/bookings` - Lấy tất cả booking
- `GET /api/v1/bookings/{id}` - Chi tiết booking
- `POST /api/v1/bookings` - Tạo booking

### 💳 Payments
- `POST /api/v1/payments` - Tạo payment + QR code
- `GET /api/v1/payments/{id}` - Chi tiết payment
- `GET /api/v1/payments/booking/{booking_id}` - Payment theo booking
- `POST /api/v1/payments/{id}/confirm` - Xác nhận thanh toán

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Redis** - Caching layer  
- **MongoDB (Motor)** - Async database
- **Pydantic** - Data validation
- **Passlib** - Password hashing
- **PyJWT** - JWT tokens
- **QRCode** - QR code generation

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Routing
- **Axios** - HTTP client
- **Lucide React** - Icons

## 🎨 Design

Giao diện lấy cảm hứng từ [Futa Bus](https://futabus.vn/):
- ✅ Modern landing page với search form
- ✅ Gradient colors (#667eea → #764ba2)
- ✅ Clean ticket cards
- ✅ Responsive design
- ✅ Auth pages với split layout

## 📝 Database Schema

### Users Collection
```json
{
  "_id": "ObjectId",
  "email": "string",
  "full_name": "string",
  "phone": "string",
  "password": "hashed_string",
  "created_at": "datetime"
}
```

### Tickets Collection
```json
{
  "_id": "ObjectId",
  "event_name": "string",
  "route": "string",
  "price": "number",
  "date": "datetime",
  "departure_time": "string",
  "arrival_time": "string",
  "location": "string",
  "bus_type": "string",
  "available_seats": "number"
}
```

### Bookings Collection
```json
{
  "_id": "ObjectId",
  "ticket_id": "string",
  "user_id": "string",
  "customer_name": "string",
  "customer_email": "string",
  "customer_phone": "string",
  "quantity": "number",
  "seat_numbers": ["string"],
  "total_price": "number",
  "status": "pending|confirmed|cancelled",
  "payment_status": "pending|completed",
  "booking_date": "datetime"
}
```

### Payments Collection
```json
{
  "_id": "ObjectId",
  "booking_id": "string",
  "amount": "number",
  "method": "QR|Cash|Card",
  "status": "pending|completed|failed",
  "qr_code_url": "base64_string",
  "created_at": "datetime",
  "completed_at": "datetime"
}
```

## 🔒 Security

- ✅ Passwords hashed với bcrypt
- ✅ JWT tokens cho authentication
- ✅ CORS configured
- ✅ Environment variables cho secrets
- ✅ Input validation với Pydantic

## 📖 Usage Flow

1. User đăng ký/đăng nhập
2. Tìm kiếm vé xe theo tuyến đường
3. Chọn vé và số ghế
4. Nhập thông tin đặt vé
5. Hệ thống tạo mã QR thanh toán
6. User quét QR và chuyển khoản
7. Xác nhận thanh toán
8. Booking status → confirmed

## 👨‍💻 Development

```bash
# Backend
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend  
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

## 📄 License

MIT License - feel free to use for learning!
