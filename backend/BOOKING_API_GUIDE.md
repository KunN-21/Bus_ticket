# 🎫 Booking API - Hướng dẫn tích hợp

## 📋 Tổng quan

Hệ thống đặt vé với tính năng:
- ✅ Giữ ghế tạm thời (3 phút) trong Redis
- ✅ Thanh toán QR code (VietQR API)
- ✅ Tự động giải phóng ghế khi hết thời gian
- ✅ Không lưu trạng thái "pending" vào MongoDB

## 🔄 Flow đặt vé

```
1. User chọn tuyến xe, ngày, giờ
   ↓
2. Gọi API kiểm tra ghế khả dụng
   ↓
3. User chọn ghế → Tạo booking (lưu Redis)
   ↓
4. Hiển thị QR code + đếm ngược 3 phút
   ↓
5a. User thanh toán → Confirm → Lưu MongoDB
5b. User hủy/hết 3 phút → Xóa Redis
```

## 📡 API Endpoints

### 1. Kiểm tra ghế khả dụng

**Endpoint:** `POST /api/v1/bookings/seats/check`

**Auth:** Không cần (public)

**Request:**
```json
{
  "maTuyen": "TX001",
  "ngayDi": "2025-11-10",
  "gioDi": "08:00",
  "sessionId": "uuid-của-user"  // Optional
}
```

**Response:**
```json
{
  "totalSeats": 40,
  "bookedSeats": ["A1", "A2", "B5"],           // Đã thanh toán (MongoDB)
  "heldSeats": ["A3", "A4"],                   // Đang được người khác giữ (Redis)
  "myHeldSeats": ["C1", "C2"],                 // Đang được user này giữ
  "availableSeats": ["A5", "A6", "B1", ...]    // Còn trống
}
```

**Sử dụng:**
- Gọi khi user vào trang chọn ghế
- Ghế hiển thị:
  - `bookedSeats` + `heldSeats` → Màu xám (disabled)
  - `myHeldSeats` → Màu vàng (đang giữ của mình)
  - `availableSeats` → Màu xanh (có thể chọn)

---

### 2. Tạo booking (giữ ghế + tạo QR)

**Endpoint:** `POST /api/v1/bookings`

**Auth:** ✅ Required (Bearer token)

**Request:**
```json
{
  "maTuyen": "TX001",
  "ngayDi": "2025-11-10",
  "gioDi": "08:00",
  "soGheNgoi": ["C1", "C2"],
  "sessionId": "uuid-của-user"
}
```

**Response:**
```json
{
  "maDatVe": "DV00123456789",
  "maTuyen": "TX001",
  "maKH": "KH001",
  "ngayDi": "2025-11-10",
  "gioDi": "08:00",
  "soGheNgoi": ["C1", "C2"],
  "tongTien": 500000,
  "trangThai": "pending",
  "ngayDat": "2025-11-06T10:30:00Z",
  "qrCode": "https://img.vietqr.io/image/...",
  "paymentInfo": {
    "amount": 500000,
    "content": "VOOBUS DV00123456789",
    "bankName": "TP Bank",
    "accountName": "VU KHANH NAM",
    "expireAt": "2025-11-06T10:33:00Z"  // Hết hạn sau 3 phút
  }
}
```

**Lỗi có thể gặp:**
```json
{
  "detail": "Ghế A1, A2 đang được người khác giữ"
}
```

**Sử dụng:**
- Hiển thị QR code: `<img src="{{ qrCode }}" />`
- Hiển thị thông tin:
  - Số tiền: `{{ tongTien | currency }}`
  - Nội dung CK: `{{ paymentInfo.content }}`
  - Ngân hàng: `{{ paymentInfo.bankName }}`
  - Tên TK: `{{ paymentInfo.accountName }}`
- Đếm ngược 3 phút từ `expireAt`
- Khi hết thời gian → Redirect về trang chọn ghế

---

### 3. Xác nhận thanh toán

**Endpoint:** `POST /api/v1/bookings/payment/confirm`

**Auth:** ✅ Required

**Request:**
```json
{
  "maDatVe": "DV00123456789",
  "transactionId": "optional-bank-transaction-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thanh toán thành công",
  "maDatVe": "DV00123456789"
}
```

**Lỗi:**
```json
{
  "detail": "Không tìm thấy booking hoặc đã hết thời gian thanh toán (3 phút)"
}
```

**Sử dụng:**
- Hiển thị nút "Đã thanh toán" sau khi user quét QR
- Khi click → Gọi API này
- Nếu thành công → Redirect về trang "Vé của tôi"

---

### 4. Hủy booking

**Endpoint:** `POST /api/v1/bookings/payment/cancel`

**Auth:** ✅ Required

**Request:**
```json
{
  "maDatVe": "DV00123456789",
  "sessionId": "uuid-của-user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã hủy booking và giải phóng ghế"
}
```

**Sử dụng:**
- Hiển thị nút "Hủy" trên trang thanh toán
- Khi click → Confirm dialog → Gọi API
- Nếu thành công → Redirect về trang tìm kiếm

---

### 5. Lấy danh sách vé đã đặt

**Endpoint:** `GET /api/v1/bookings/my-bookings`

**Auth:** ✅ Required

**Response:**
```json
[
  {
    "maDatVe": "DV00123456789",
    "maTuyen": "TX001",
    "maKH": "KH001",
    "ngayDi": "2025-11-10",
    "gioDi": "08:00",
    "soGheNgoi": ["C1", "C2"],
    "tongTien": 500000,
    "trangThai": "paid",
    "ngayDat": "2025-11-06T10:30:00Z",
    "qrCode": null,
    "paymentInfo": null
  }
]
```

**Sử dụng:**
- Trang "Vé của tôi"
- Chỉ hiển thị vé đã thanh toán (status = "paid")

---

## 🎨 Frontend Implementation

### Session ID
```javascript
// Tạo sessionId unique khi user vào trang
const sessionId = localStorage.getItem('booking_session') || 
                  crypto.randomUUID();
localStorage.setItem('booking_session', sessionId);
```

### Kiểm tra ghế
```javascript
async function checkSeats(maTuyen, ngayDi, gioDi) {
  const response = await fetch('http://localhost:8000/api/v1/bookings/seats/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maTuyen, ngayDi, gioDi, sessionId })
  });
  
  const data = await response.json();
  
  // Render ghế
  renderSeats(data);
}

function renderSeats(data) {
  data.availableSeats.forEach(seat => {
    // Màu xanh, có thể click
  });
  
  [...data.bookedSeats, ...data.heldSeats].forEach(seat => {
    // Màu xám, disabled
  });
  
  data.myHeldSeats.forEach(seat => {
    // Màu vàng, đang giữ
  });
}
```

### Tạo booking
```javascript
async function createBooking(maTuyen, ngayDi, gioDi, selectedSeats) {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch('http://localhost:8000/api/v1/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      maTuyen,
      ngayDi,
      gioDi,
      soGheNgoi: selectedSeats,
      sessionId
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    alert(error.detail);
    return;
  }
  
  const booking = await response.json();
  
  // Redirect đến trang thanh toán
  showPaymentPage(booking);
}
```

### Trang thanh toán
```javascript
function showPaymentPage(booking) {
  // Hiển thị QR
  document.getElementById('qr-code').src = booking.qrCode;
  
  // Hiển thị thông tin
  document.getElementById('amount').textContent = 
    booking.tongTien.toLocaleString('vi-VN') + 'đ';
  document.getElementById('content').textContent = 
    booking.paymentInfo.content;
  
  // Đếm ngược 3 phút
  const expireAt = new Date(booking.paymentInfo.expireAt);
  const countdown = setInterval(() => {
    const now = new Date();
    const diff = Math.floor((expireAt - now) / 1000);
    
    if (diff <= 0) {
      clearInterval(countdown);
      alert('Hết thời gian thanh toán!');
      window.location.href = '/search';
      return;
    }
    
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    document.getElementById('countdown').textContent = 
      `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, 1000);
  
  // Lưu maDatVe để confirm
  localStorage.setItem('pending_booking', booking.maDatVe);
}
```

### Xác nhận thanh toán
```javascript
async function confirmPayment() {
  const maDatVe = localStorage.getItem('pending_booking');
  const token = localStorage.getItem('access_token');
  
  const response = await fetch('http://localhost:8000/api/v1/bookings/payment/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ maDatVe })
  });
  
  if (!response.ok) {
    const error = await response.json();
    alert(error.detail);
    return;
  }
  
  const result = await response.json();
  alert(result.message);
  
  // Xóa pending booking
  localStorage.removeItem('pending_booking');
  
  // Redirect đến trang vé của tôi
  window.location.href = '/my-bookings';
}
```

### Hủy booking
```javascript
async function cancelBooking() {
  if (!confirm('Bạn có chắc muốn hủy booking?')) return;
  
  const maDatVe = localStorage.getItem('pending_booking');
  const token = localStorage.getItem('access_token');
  
  const response = await fetch('http://localhost:8000/api/v1/bookings/payment/cancel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ maDatVe, sessionId })
  });
  
  const result = await response.json();
  alert(result.message);
  
  localStorage.removeItem('pending_booking');
  window.location.href = '/search';
}
```

---

## ⚠️ Lưu ý quan trọng

### 1. Session ID
- Tạo khi user vào trang chọn ghế
- Lưu trong localStorage
- Dùng để phân biệt ghế của user này với người khác

### 2. Thời gian giữ ghế
- **3 phút** tính từ khi tạo booking
- Hiển thị đếm ngược rõ ràng
- Khi hết thời gian → Tự động xóa khỏi Redis

### 3. Xử lý lỗi
- Ghế đang được giữ → Cho user chọn lại
- Hết thời gian → Redirect về trang chọn ghế
- Đã thanh toán → Không cho hủy

### 4. UX tốt
- Polling check ghế mỗi 5 giây khi ở trang chọn ghế
- Hiển thị số lượng người đang xem cùng chuyến
- Notification khi có người chọn ghế mình định chọn

### 5. Bảo mật
- Luôn gửi Bearer token cho API cần auth
- Kiểm tra token hết hạn
- Redirect login nếu 401

---

## 🧪 Test API

### Với Postman/Thunder Client:

```bash
# 1. Login trước
POST http://localhost:8000/auth/login
Body: { "email": "test@example.com", "password": "123456" }
→ Lưu access_token

# 2. Check ghế
POST http://localhost:8000/api/v1/bookings/seats/check
Body: {
  "maTuyen": "TX001",
  "ngayDi": "2025-11-10",
  "gioDi": "08:00",
  "sessionId": "test-session-1"
}

# 3. Tạo booking
POST http://localhost:8000/api/v1/bookings
Headers: Authorization: Bearer <token>
Body: {
  "maTuyen": "TX001",
  "ngayDi": "2025-11-10",
  "gioDi": "08:00",
  "soGheNgoi": ["A1", "A2"],
  "sessionId": "test-session-1"
}

# 4. Confirm payment
POST http://localhost:8000/api/v1/bookings/payment/confirm
Headers: Authorization: Bearer <token>
Body: { "maDatVe": "DV..." }

# 5. My bookings
GET http://localhost:8000/api/v1/bookings/my-bookings
Headers: Authorization: Bearer <token>
```

---

## 🚀 Ready to integrate!

Tất cả API đã sẵn sàng. Bắt đầu code frontend thôi! 🎉
