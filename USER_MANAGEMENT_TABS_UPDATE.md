# 🎯 Hướng Dẫn Sử Dụng - Quản Lý Tài Khoản

## 📋 Tính năng đã hoàn thành

### ✅ Giao diện
- **Account Type Selector**: Tabs đẹp với animation để chuyển đổi giữa Khách hàng và Nhân viên
- **Live Counter**: Hiển thị số lượng trong mỗi tab
- **Animated Indicator**: Thanh slider animation khi chuyển tab
- **Responsive Design**: Tự động điều chỉnh trên mobile

### ✅ Phân quyền
- **Admin**: 
  - Xem cả 2 tabs (Khách hàng + Nhân viên)
  - Thêm/Sửa/Xóa nhân viên
  - Thêm/Sửa/Xóa khách hàng
  
- **Nhân viên**:
  - Chỉ xem tab Khách hàng (tab Nhân viên bị ẩn)
  - Thêm/Sửa/Xóa khách hàng
  - ❌ KHÔNG được quản lý nhân viên

### ✅ Tính năng
1. **Tabs với counter real-time**
2. **Search theo tên, email, SDT, CCCD**
3. **Stats cards** (cho khách hàng)
4. **CRUD operations** với API
5. **Redis caching** tự động
6. **Toast notifications**
7. **Responsive design**

## 🎨 Giao diện đã được cập nhật

```css
/* Modern Tab Selector */
.account-type-selector
  ├── .selector-wrapper
  │   ├── .account-type-btn (Khách hàng)
  │   │   ├── .btn-icon-wrapper
  │   │   └── .btn-content
  │   │       ├── .btn-title
  │   │       └── .btn-count (số lượng)
  │   ├── .account-type-btn (Nhân viên)
  │   └── .selector-indicator (animated slider)
```

## 🚀 Demo

1. **Login với Admin**:
   - Email: `admin@voobus.com`
   - Password: `admin123`
   - Click menu "Người dùng"
   - Thấy 2 tabs: Khách hàng + Nhân viên
   - Click tab để switch với animation

2. **Login với Employee**:
   - Email: `nhanvien@voobus.com`
   - Password: `nhanvien123`
   - Click menu "Người dùng"
   - Chỉ thấy tab Khách hàng

## 💡 Các thay đổi chính

### Frontend (dashboard.js)
```javascript
// Updated HTML template với Account Type Selector
content.innerHTML = `
  <div class="users-page-header">
    <div class="account-type-selector">
      <div class="selector-wrapper">
        <button class="account-type-btn active" data-tab="customers">
          <div class="btn-icon-wrapper">
            <i class="fas fa-user-friends"></i>
          </div>
          <div class="btn-content">
            <span class="btn-title">Khách hàng</span>
            <span class="btn-count">0</span>
          </div>
        </button>
        ...
        <div class="selector-indicator"></div>
      </div>
    </div>
  </div>
`;

// Updated tab switching với animation
indicator.style.transform = `translateX(${index * 100}%)`;

// Updated data loading với counter
const countEl = document.getElementById('customersCount');
countEl.textContent = data.length;
```

### CSS (dashboard.css)
```css
/* Modern Tab Selector Design */
.account-type-selector { ... }
.selector-wrapper { ... }
.account-type-btn { ... }
.account-type-btn.active { ... }
.selector-indicator { 
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
```

## 🎯 Test Checklist

- [x] Tabs hiển thị đúng cho Admin (2 tabs)
- [x] Tabs hiển thị đúng cho Employee (1 tab)
- [x] Counter cập nhật khi load data
- [x] Animation smooth khi switch tabs
- [x] Responsive trên mobile
- [x] Hover effect hoạt động
- [x] API integration hoạt động
- [x] Redis cache hoạt động

## 📸 UI Features

### Account Type Selector
- **Inactive state**: Background xám, text xám
- **Active state**: Background gradient cam, text trắng, icon nổi bật
- **Hover state**: Scale icon, đổi màu text
- **Animated indicator**: Slide mượt mà với cubic-bezier easing

### Counter Badge
- Hiển thị số lượng thời gian thực
- Cập nhật mỗi khi load/thêm/xóa
- Style khác nhau cho active/inactive

---

**Hoàn thành! 🎉 Giao diện đồng bộ với dashboard, tabs đẹp với animation!**
