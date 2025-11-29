// ===================================
// API Configuration
// ===================================
const API_BASE_URL = "http://localhost:8000/api/v1";

// ===================================
// Check Authentication
// ===================================
function checkAuth() {
  const token = localStorage.getItem("token") || localStorage.getItem("access_token");
  const userType = localStorage.getItem("user_type");
  const rawRole = localStorage.getItem("role");
  // Normalize role: backend stores maChucVu like CV001/CV002; map to 'admin'/'nhanvien'
  const roleKey = (rawRole || '').toString().toLowerCase();
  let role = '';
  if (roleKey === 'cv001' || roleKey === 'admin') role = 'admin';
  else if (roleKey === 'cv002' || roleKey === 'nhanvien') role = 'nhanvien';

  console.log("Auth Check:", { token: !!token, userType, rawRole, role }); // Debug log

  // If not logged in, redirect to login
  if (!token || !userType) {
    Toast.warning("Vui lòng đăng nhập để tiếp tục");
    setTimeout(() => {
      window.location.href = "../login_register.html";
    }, 1500);
    return false;
  }

  // If not an employee, redirect to home
  if (userType !== "employee") {
    Toast.error("Bạn không có quyền truy cập trang này");
    setTimeout(() => {
      window.location.href = "../index.html";
    }, 1500);
    return false;
  }

  // Update user info in header
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userNameEl = document.querySelector(".user-name");
  const userRoleEl = document.querySelector(".user-role");

  if (userNameEl && user.hoTen) {
    userNameEl.textContent = user.hoTen;
  }

  if (userRoleEl) {
    if (role === "admin") {
      userRoleEl.textContent = "Quản trị viên";
    } else if (role === "nhanvien") {
      userRoleEl.textContent = "Nhân viên bán vé";
    } else {
      userRoleEl.textContent = "Nhân viên";
    }
  }

  return true;
}

// ===================================
// Initialize Dashboard
// ===================================
document.addEventListener("DOMContentLoaded", function () {
  // Check authentication first
  if (!checkAuth()) {
    return;
  }

  initializeCharts();
  loadDashboardData();
  setupEventListeners();
});

// ===================================
// Event Listeners
// ===================================
function setupEventListeners() {
  // Menu navigation
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      menuItems.forEach((mi) => mi.classList.remove("active"));
      this.classList.add("active");

      const page = this.getAttribute("data-page");
      if (page) {
        loadPage(page);
      }
    });
  });

  // Logout
  const logoutBtn = document.querySelector(".menu-item.logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      handleLogout();
    });
  }

  // Revenue filter
  const revenueFilter = document.getElementById("revenueFilter");
  if (revenueFilter) {
    revenueFilter.addEventListener("change", function () {
      updateRevenueChart(this.value);
    });
  }
}

// ===================================
// Load Dashboard Data
// ===================================
async function loadDashboardData() {
  try {
    // Load real data from API
    await loadDashboardFromAPI();
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    Toast.error("Không thể tải dữ liệu dashboard. Vui lòng thử lại sau.");
    // Fallback to mock data if API fails
    loadStatsFallback();
    loadRecentBookingsFallback();
    loadActiveBusesFallback();
  }
}

// ===================================
// Load Dashboard From API
// ===================================
async function loadDashboardFromAPI() {
  const token = localStorage.getItem("token") || localStorage.getItem("access_token");
  
  try {
    const response = await fetch(`${API_BASE_URL}/statistics/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      // Try debug endpoint (no auth required)
      const debugResponse = await fetch(`${API_BASE_URL}/statistics/dashboard/debug`);
      if (debugResponse.ok) {
        const data = await debugResponse.json();
        renderDashboardData(data);
        return;
      }
      throw new Error('Failed to load dashboard');
    }
    
    const data = await response.json();
    console.log('Dashboard data from API:', data);
    renderDashboardData(data);
    
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ===================================
// Render Dashboard Data
// ===================================
function renderDashboardData(data) {
  // Stats
  if (data.stats) {
    animateNumber("totalUsers", data.stats.totalUsers || 0, 1000);
    animateNumber("totalBookings", data.stats.totalBookings || 0, 1000);
    animateNumber("totalBuses", data.stats.totalBuses || 0, 1000);
    
    // Format revenue
    setTimeout(() => {
      const revEl = document.getElementById("totalRevenue");
      if (revEl) {
        const revenue = data.stats.totalRevenue || 0;
        if (revenue >= 1000000) {
          revEl.textContent = Math.round(revenue / 1000000) + "M";
        } else if (revenue >= 1000) {
          revEl.textContent = Math.round(revenue / 1000) + "K";
        } else {
          revEl.textContent = revenue.toLocaleString();
        }
      }
    }, 1000);
  }
  
  // Recent bookings
  if (data.recentBookings && data.recentBookings.length > 0) {
    renderRecentBookings(data.recentBookings);
  } else {
    loadRecentBookingsFallback();
  }
  
  // Active buses
  if (data.activeBuses && data.activeBuses.length > 0) {
    renderActiveBuses(data.activeBuses);
  } else {
    loadActiveBusesFallback();
  }
  
  // Update charts if data available
  if (data.revenueChart && revenueChart) {
    updateRevenueChartFromAPI(data.revenueChart);
  }
  
  if (data.topRoutes && routesChart) {
    updateRoutesChartFromAPI(data.topRoutes);
  }
}

// ===================================
// Render Recent Bookings
// ===================================
function renderRecentBookings(bookings) {
  const tableBody = document.getElementById("recentBookingsTable");
  if (!tableBody) return;
  
  if (bookings.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: #999;">
          Chưa có đặt vé nào
        </td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = bookings.map(booking => {
    const statusClass = booking.status === 'paid' || booking.status === 'confirmed' ? 'completed' : 
                       booking.status === 'cancelled' ? 'cancelled' : 'pending';
    const statusText = booking.status === 'paid' || booking.status === 'confirmed' ? 'Đã thanh toán' :
                      booking.status === 'cancelled' ? 'Đã hủy' : 'Chờ thanh toán';
    
    return `
      <tr>
        <td><strong>${booking.maVe || 'N/A'}</strong></td>
        <td>${booking.customer || 'N/A'}</td>
        <td>${booking.route || 'N/A'}</td>
        <td>${booking.seats || 'N/A'}</td>
        <td><strong>${formatCurrency(booking.price || 0)}</strong></td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>${formatTimeAgo(booking.time) || 'N/A'}</td>
      </tr>
    `;
  }).join('');
}

// ===================================
// Render Active Buses
// ===================================
function renderActiveBuses(buses) {
  const busList = document.getElementById("activeBusesList");
  if (!busList) return;
  
  if (buses.length === 0) {
    busList.innerHTML = `
      <div class="bus-item">
        <p style="text-align: center; color: #999;">Chưa có xe nào</p>
      </div>
    `;
    return;
  }
  
  busList.innerHTML = buses.map(bus => `
    <div class="bus-item">
      <div class="bus-info">
        <h4>${bus.bienSo || bus.maXe || 'N/A'}</h4>
        <p>${bus.loaiXe || 'Xe khách'} - ${bus.soChoNgoi || 34} chỗ</p>
      </div>
      <div class="bus-status ${bus.status || 'active'}">
        <span class="status-dot ${bus.status || 'active'}"></span>
        ${bus.status === 'maintenance' ? 'Bảo trì' : 
          bus.status === 'inactive' ? 'Chờ khởi hành' : 'Hoạt động'}
      </div>
    </div>
  `).join('');
}

// ===================================
// Update Revenue Chart from API
// ===================================
function updateRevenueChartFromAPI(chartData) {
  if (!revenueChart || !chartData || chartData.length === 0) return;
  
  const labels = chartData.map(item => item.month);
  const data = chartData.map(item => item.revenue);
  
  revenueChart.data.labels = labels;
  revenueChart.data.datasets[0].data = data;
  revenueChart.update();
}

// ===================================
// Update Routes Chart from API
// ===================================
function updateRoutesChartFromAPI(routesData) {
  if (!routesChart || !routesData || routesData.length === 0) return;
  
  const labels = routesData.map(item => item.name);
  const data = routesData.map(item => item.percentage);
  
  routesChart.data.labels = labels;
  routesChart.data.datasets[0].data = data;
  routesChart.update();
}

// ===================================
// Format Time Ago
// ===================================
function formatTimeAgo(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  } catch (e) {
    return dateString;
  }
}

// ===================================
// Fallback Functions (Mock Data)
// ===================================
function loadStatsFallback() {
  animateNumber("totalUsers", 0, 500);
  animateNumber("totalBookings", 0, 500);
  animateNumber("totalBuses", 0, 500);
  setTimeout(() => {
    const revEl = document.getElementById("totalRevenue");
    if (revEl) revEl.textContent = "0";
  }, 500);
}

function loadRecentBookingsFallback() {
  const tableBody = document.getElementById("recentBookingsTable");
  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr>
      <td colspan="7" style="text-align: center; color: #999;">
        <i class="fas fa-info-circle"></i> Chưa có dữ liệu đặt vé
      </td>
    </tr>
  `;
}

function loadActiveBusesFallback() {
  const busList = document.getElementById("activeBusesList");
  if (!busList) return;
  busList.innerHTML = `
    <div class="bus-item" style="justify-content: center;">
      <p style="text-align: center; color: #999;">
        <i class="fas fa-info-circle"></i> Chưa có dữ liệu xe
      </p>
    </div>
  `;
}

// ===================================
// Load Statistics (DEPRECATED - kept for compatibility)
// ===================================
function loadStats() {
  // Now handled by loadDashboardFromAPI
  loadStatsFallback();
}

// ===================================
// Load Recent Bookings (DEPRECATED - kept for compatibility)
// ===================================
function loadRecentBookings() {
  loadRecentBookingsFallback();
}

// ===================================
// Load Active Buses (DEPRECATED - kept for compatibility)
// ===================================
function loadActiveBuses() {
  loadActiveBusesFallback();
}

// ===================================
// Initialize Charts
// ===================================
let revenueChart, routesChart;

function initializeCharts() {
  // Revenue Chart (Line)
  const revenueEl = document.getElementById("revenueChart");
  if (revenueEl && revenueEl.getContext) {
    try {
      const revenueCtx = revenueEl.getContext("2d");
      revenueChart = new Chart(revenueCtx, {
    type: "line",
    data: {
      labels: [
        "Tháng 6",
        "Tháng 7",
        "Tháng 8",
        "Tháng 9",
        "Tháng 10",
        "Tháng 11",
      ],
      datasets: [
        {
          label: "Doanh thu (triệu đồng)",
          data: [85, 92, 98, 105, 112, 123],
          borderColor: "#FF6600",
          backgroundColor: "rgba(255, 102, 0, 0.1)",
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          pointBackgroundColor: "#FF6600",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointHoverRadius: 7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          padding: 12,
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: "#FF6600",
          borderWidth: 1,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
          ticks: {
            callback: function (value) {
              return value + "M";
            },
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    },
  });

    } catch (e) {
      console.warn('Could not initialize revenue chart:', e);
    }
  }

  // Top Routes Chart (Doughnut)
  const routesEl = document.getElementById("routesChart");
  if (routesEl && routesEl.getContext) {
    try {
      const routesCtx = routesEl.getContext("2d");
      routesChart = new Chart(routesCtx, {
    type: "doughnut",
    data: {
      labels: [
        "TP.HCM - Hà Nội",
        "TP.HCM - Đà Nẵng",
        "Hà Nội - Hải Phòng",
        "TP.HCM - Nha Trang",
        "Khác",
      ],
      datasets: [
        {
          data: [35, 25, 15, 15, 10],
          backgroundColor: [
            "#667eea",
            "#764ba2",
            "#11998e",
            "#f093fb",
            "#4facfe",
          ],
          borderWidth: 0,
          hoverOffset: 10,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 15,
            usePointStyle: true,
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          padding: 12,
          callbacks: {
            label: function (context) {
              return context.label + ": " + context.parsed + "%";
            },
          },
        },
      },
    },
      });
    } catch (e) {
      console.warn('Could not initialize routes chart:', e);
    }
  }
}

// Update Revenue Chart
function updateRevenueChart(months) {
  let labels, data;

  if (months === "12") {
    labels = [
      "T1",
      "T2",
      "T3",
      "T4",
      "T5",
      "T6",
      "T7",
      "T8",
      "T9",
      "T10",
      "T11",
      "T12",
    ];
    data = [75, 80, 85, 88, 90, 85, 92, 98, 105, 112, 123, 130];
  } else {
    labels = [
      "Tháng 6",
      "Tháng 7",
      "Tháng 8",
      "Tháng 9",
      "Tháng 10",
      "Tháng 11",
    ];
    data = [85, 92, 98, 105, 112, 123];
  }

  revenueChart.data.labels = labels;
  revenueChart.data.datasets[0].data = data;
  revenueChart.update();
}

// ===================================
// Page Navigation
// ===================================
function loadPage(page) {
  console.log("Loading page:", page);
  // TODO: Implement page loading logic
  // You can create separate HTML files for each page
  // or dynamically load content here

  switch (page) {
    case "dashboard":
      // Already on dashboard
      break;
    case "buses":
      Toast.info("Chức năng Quản lý Xe đang được phát triển");
      break;
    case "routes":
      loadTripsManagementPage();
      break;
    case "bookings":
      loadBookingManagementPage();
      break;
    case "users":
      loadUserManagementPage();
      break;
    case "seats":
      Toast.info("Chức năng Quản lý Ghế đang được phát triển");
      break;
    case "statistics":
    case "revenue":
      loadStatisticsPage();
      break;
    case "settings":
      Toast.info("Chức năng Cài đặt đang được phát triển");
      break;
  }
}

// ===================================
// Logout
// ===================================
async function handleLogout() {
  const confirmed = await Modal.confirm(
    "Bạn có chắc chắn muốn đăng xuất?",
    "Xác nhận đăng xuất",
    "question"
  );

  if (confirmed) {
    // Clear all localStorage keys (ensure complete logout)
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("user_type");
    localStorage.removeItem("role");
    
    console.log("🔒 Admin logged out, localStorage cleared");

    Toast.success("Đăng xuất thành công!");

    // Redirect to login page after a short delay
    setTimeout(() => {
      window.location.href = "../login_register.html";
    }, 1000);
  }
}

// ===================================
// Utility Functions
// ===================================
function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// API Helper with Toast notifications
async function apiCall(url, options = {}) {
  try {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      Toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      setTimeout(() => {
        localStorage.clear();
        window.location.href = "../login_register.html";
      }, 2000);
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Có lỗi xảy ra");
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// ===================================
// Auto Refresh Data (every 30 seconds)
// ===================================
setInterval(() => {
  loadDashboardData();
}, 30000);

// ===================================
// USER MANAGEMENT MODULE
// ===================================

// User Management State
let currentUserTab = 'customers';
let usersData = { customers: [], employees: [] };
let currentEditUser = null;

// ===================================
// Load User Management Page
// ===================================
function loadUserManagementPage() {
  const content = document.querySelector('.content');
  const rawRole = localStorage.getItem('role') || '';
  const roleKey = rawRole.toString().toLowerCase();
  const isAdmin = (roleKey === 'cv001' || roleKey === 'admin');
  
  content.innerHTML = `
    <div class="users-management-page">
      <!-- Page Header -->
      <div class="users-page-header">
        <div class="page-title-section">
          <h2><i class="fas fa-users-cog"></i> Quản lý Tài khoản</h2>
          <p class="page-subtitle">Quản lý thông tin nhân viên và khách hàng</p>
        </div>
        
        <!-- Account Type Tabs - Modern Design -->
        <div class="account-type-selector">
          <div class="selector-wrapper">
            <button class="account-type-btn active" data-tab="customers">
              <div class="btn-icon-wrapper">
                <i class="fas fa-user-friends"></i>
              </div>
              <div class="btn-content">
                <span class="btn-title">Khách hàng</span>
                <span class="btn-count" id="customersCount">0</span>
              </div>
            </button>
            <button class="account-type-btn ${!isAdmin ? 'hidden' : ''}" data-tab="employees">
              <div class="btn-icon-wrapper">
                <i class="fas fa-user-tie"></i>
              </div>
              <div class="btn-content">
                <span class="btn-title">Nhân viên</span>
                <span class="btn-count" id="employeesCount">0</span>
              </div>
            </button>
            <div class="selector-indicator"></div>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="users-stats" id="userStats"></div>

      <!-- Controls -->
        <div class="user-controls">
        <div class="user-search">
          <i class="fas fa-search"></i>
          <input type="text" id="userSearchInput" placeholder="Tìm kiếm theo tên, email, số điện thoại, CCCD...">
        </div>
        <button class="btn-add-user" id="btnAddUser" style="${isAdmin ? '' : 'display:none;'}">
          <i class="fas fa-plus-circle"></i>
          <span>Thêm mới</span>
        </button>
      </div>

      <!-- Table -->
      <div class="users-table-wrapper">
        <div class="users-table-header">
          <i class="fas fa-table"></i>
          <span id="tableTitle">Danh sách khách hàng</span>
        </div>
        <table class="users-table">
          <thead id="tableHead"></thead>
          <tbody id="tableBody">
            <tr class="loading-row">
              <td colspan="10">
                <i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div class="user-modal" id="userModal">
      <div class="user-modal-content">
        <div class="user-modal-header">
          <h3 id="modalTitle">
            <i class="fas fa-user-plus"></i>
            <span>Thêm người dùng</span>
          </h3>
          <button class="modal-close-btn" onclick="closeUserModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="user-modal-body">
          <form id="userForm">
            <div class="form-row">
              <div class="form-group">
                <label for="userHoTen">Họ và tên <span style="color: red">*</span></label>
                <input type="text" id="userHoTen" name="hoTen" required>
              </div>
              <div class="form-group">
                <label for="userEmail">Email <span style="color: red">*</span></label>
                <input type="email" id="userEmail" name="email" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="userSDT">Số điện thoại <span style="color: red">*</span></label>
                <input type="tel" id="userSDT" name="SDT" pattern="[0-9]{10}" 
                       title="Số điện thoại phải có đúng 10 chữ số (ví dụ: 0123456789)" 
                       placeholder="0123456789" required>
              </div>
              <div class="form-group">
                <label for="userCCCD">CCCD/CMND <span style="color: red">*</span></label>
                <input type="text" id="userCCCD" name="CCCD" pattern="[0-9]{12}" 
                       title="CCCD phải có đúng 12 chữ số" 
                       placeholder="001234567890" required>
              </div>
            </div>

            <div class="form-group">
              <label for="userDiaChi">Địa chỉ <span style="color: red">*</span></label>
              <input type="text" id="userDiaChi" name="diaChi" required>
            </div>

            <div class="form-group" id="passwordGroup">
              <label for="userPassword">Mật khẩu <span style="color: red">*</span></label>
              <input type="password" id="userPassword" name="password" minlength="6" required>
            </div>

            <div class="form-group" id="roleGroup" style="display: none;">
              <label for="userRole">Chức vụ <span style="color: red">*</span></label>
              <select id="userRole" name="maChucVu">
                <option value="">-- Chọn chức vụ --</option>
              </select>
            </div>
          </form>
        </div>
        <div class="user-modal-footer">
          <button class="btn-modal secondary" onclick="closeUserModal()">Hủy</button>
          <button class="btn-modal primary" onclick="saveUser()">
            <i class="fas fa-save"></i> Lưu
          </button>
        </div>
      </div>
    </div>
  `;

  // Setup event listeners
  setupUserManagementEvents();
  
  // Load initial data
  loadCustomersData();
}

// ===================================
// Setup Event Listeners
// ===================================
function setupUserManagementEvents() {
  // Tab switching with animation
  document.querySelectorAll('.account-type-btn').forEach((btn, index) => {
    btn.addEventListener('click', (e) => {
      // Remove active class
      document.querySelectorAll('.account-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Move indicator
      const indicator = document.querySelector('.selector-indicator');
      if (indicator) {
        indicator.style.transform = `translateX(${index * 100}%)`;
      }
      
      // Switch tab
      currentUserTab = btn.getAttribute('data-tab');
      
      if (currentUserTab === 'customers') {
        loadCustomersData();
      } else {
        loadEmployeesData();
      }
    });
  });

  // Add user button
  const btnAddUser = document.getElementById('btnAddUser');
  if (btnAddUser) {
    btnAddUser.addEventListener('click', () => openAddUserModal());
  }

  // Search
  const userSearchInput = document.getElementById('userSearchInput');
  if (userSearchInput) {
    userSearchInput.addEventListener('input', (e) => filterUsers(e.target.value));
  }
}

// ===================================
// Load Customers Data
// ===================================
async function loadCustomersData() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/admin/customers`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load customers');
    
    const data = await response.json();
    
    console.log('Customers data:', data); // Debug log
    
    usersData.customers = data;
    
    // Update count in tab
    const countEl = document.getElementById('customersCount');
    if (countEl) {
      countEl.textContent = data.length;
    }
    
    // Load stats (don't let it crash main load)
    loadCustomerStats().catch(err => console.error('Stats error:', err));
    
    // Render table
    renderCustomersTable(data);
  } catch (error) {
    console.error('Error loading customers:', error);
    Toast.error('Không thể tải danh sách khách hàng');
    renderEmptyTable('Không thể tải dữ liệu');
  }
}

// ===================================
// Load Employees Data
// ===================================
async function loadEmployeesData() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/admin/employees`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load employees');
    
    const data = await response.json();
    
    console.log('Employees data:', data); // Debug log
    
    usersData.employees = data;
    
    // Update count in tab
    const countEl = document.getElementById('employeesCount');
    if (countEl) {
      countEl.textContent = data.length;
    }
    
    // Render table
    renderEmployeesTable(data);
  } catch (error) {
    console.error('Error loading employees:', error);
    Toast.error('Không thể tải danh sách nhân viên');
    renderEmptyTable('Không thể tải dữ liệu');
  }
}

// ===================================
// Load Customer Stats
// ===================================
async function loadCustomerStats() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/admin/customers/stats/overview`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load stats');
    
    const stats = await response.json();
    renderStats(stats);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// ===================================
// Render Stats
// ===================================
function renderStats(stats) {
  const statsContainer = document.getElementById('userStats');
  if (!statsContainer) return;
  if (currentUserTab === 'customers') {
    statsContainer.innerHTML = `
      <div class="user-stat-card">
        <div class="user-stat-icon total">
          <i class="fas fa-users"></i>
        </div>
        <div class="user-stat-info">
          <h4>${stats.total_customers || 0}</h4>
          <p>Tổng khách hàng</p>
        </div>
      </div>
      <div class="user-stat-card">
        <div class="user-stat-icon new">
          <i class="fas fa-user-plus"></i>
        </div>
        <div class="user-stat-info">
          <h4>${stats.new_this_month || 0}</h4>
          <p>Mới tháng này</p>
        </div>
      </div>
      <div class="user-stat-card">
        <div class="user-stat-icon active">
          <i class="fas fa-user-check"></i>
        </div>
        <div class="user-stat-info">
          <h4>${stats.active_customers || 0}</h4>
          <p>Đang hoạt động</p>
        </div>
      </div>
    `;
  } else {
    statsContainer.innerHTML = `
      <div class="user-stat-card">
        <div class="user-stat-icon total">
          <i class="fas fa-user-tie"></i>
        </div>
        <div class="user-stat-info">
          <h4>${usersData.employees.length}</h4>
          <p>Tổng nhân viên</p>
        </div>
      </div>
    `;
  }
}

// ===================================
// Render Customers Table
// ===================================
function renderCustomersTable(customers) {
  const tableHead = document.getElementById('tableHead');
  const tableBody = document.getElementById('tableBody');
  const tableTitle = document.getElementById('tableTitle');
  if (!tableHead || !tableBody || !tableTitle) {
    console.warn('Table elements for customers not found');
    return;
  }
  
  tableTitle.textContent = 'Danh sách khách hàng';
  
  tableHead.innerHTML = `
    <tr>
      <th>Họ tên</th>
      <th>Email</th>
      <th>Số điện thoại</th>
      <th>CCCD</th>
      <th>Địa chỉ</th>
      <th>Thao tác</th>
    </tr>
  `;

  if (customers.length === 0) {
    renderEmptyTable('Chưa có khách hàng nào');
    return;
  }

  tableBody.innerHTML = customers.map(customer => `
    <tr>
      <td><strong>${customer.hoTen}</strong></td>
      <td>${customer.email}</td>
      <td>${customer.SDT}</td>
      <td>${customer.CCCD}</td>
      <td>${customer.diaChi}</td>
      <td>
        <div class="users-table-actions">
          <button class="btn-action edit" onclick="editCustomer('${customer.maKH}')">
            <i class="fas fa-edit"></i> Sửa
          </button>
          <button class="btn-action delete" onclick="deleteCustomer('${customer.maKH}')">
            <i class="fas fa-trash"></i> Xóa
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ===================================
// Render Employees Table
// ===================================
function renderEmployeesTable(employees) {
  const tableHead = document.getElementById('tableHead');
  const tableBody = document.getElementById('tableBody');
  const tableTitle = document.getElementById('tableTitle');
  if (!tableHead || !tableBody || !tableTitle) {
    console.warn('Table elements for employees not found');
    return;
  }
  
  tableTitle.textContent = 'Danh sách nhân viên';
  
  // Clear stats for employees
  renderStats({});
  
  tableHead.innerHTML = `
    <tr>
      <th>Họ tên</th>
      <th>Email</th>
      <th>Số điện thoại</th>
      <th>CCCD</th>
      <th>Địa chỉ</th>
      <th>Chức vụ</th>
      <th>Thao tác</th>
    </tr>
  `;

  if (employees.length === 0) {
    renderEmptyTable('Chưa có nhân viên nào');
    return;
  }

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUser.maNV || null;
  const rawRole = localStorage.getItem('role') || '';
  const roleKey = rawRole.toString().toLowerCase();
  const isAdminUser = (roleKey === 'cv001' || roleKey === 'admin');

  tableBody.innerHTML = employees.map(employee => {
    const isCurrentUser = employee.maNV === currentUserId;
  const roleName = employee.chucVuInfo?.tenChucVu || employee.maChucVu || 'N/A';
  // roleClass based on maChucVu code (e.g., CV001 = admin)
  const roleClass = employee.maChucVu === 'CV001' || String(employee.maChucVu).toLowerCase() === 'admin' ? 'admin' : 'nhanvien';
    
    return `
      <tr>
        <td><strong>${employee.hoTen}</strong></td>
        <td>${employee.email}</td>
        <td>${employee.SDT}</td>
        <td>${employee.CCCD}</td>
        <td>${employee.diaChi}</td>
        <td><span class="role-badge ${roleClass}">${roleName}</span></td>
        <td>
          <div class="users-table-actions">
            ${isAdminUser ? `
              <button class="btn-action edit" onclick="editEmployee('${employee.maNV}')">
                <i class="fas fa-edit"></i> Sửa
              </button>
            ` : ''}
            ${isAdminUser && !isCurrentUser ? `
              <button class="btn-action delete" onclick="deleteEmployee('${employee.maNV}')">
                <i class="fas fa-trash"></i> Xóa
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ===================================
// Render Empty Table
// ===================================
function renderEmptyTable(message) {
  const tableBody = document.getElementById('tableBody');
  if (!tableBody) return;
  const colSpan = currentUserTab === 'customers' ? 6 : 7;
  
  tableBody.innerHTML = `
    <tr class="empty-row">
      <td colspan="${colSpan}">
        <i class="fas fa-inbox"></i> ${message}
      </td>
    </tr>
  `;
}

// ===================================
// Filter Users
// ===================================
function filterUsers(searchTerm) {
  const lowerSearch = searchTerm.toLowerCase();
  
  if (currentUserTab === 'customers') {
    const filtered = usersData.customers.filter(c => 
      (c.hoTen || '').toLowerCase().includes(lowerSearch) ||
      (c.email || '').toLowerCase().includes(lowerSearch) ||
      (String(c.SDT || '')).includes(lowerSearch) ||
      (String(c.CCCD || '')).includes(lowerSearch)
    );
    renderCustomersTable(filtered);
  } else {
    const filtered = usersData.employees.filter(e => 
      (e.hoTen || '').toLowerCase().includes(lowerSearch) ||
      (e.email || '').toLowerCase().includes(lowerSearch) ||
      (String(e.SDT || '')).includes(lowerSearch) ||
      (String(e.CCCD || '')).includes(lowerSearch)
    );
    renderEmployeesTable(filtered);
  }
}

// ===================================
// Open Add User Modal
// ===================================
async function openAddUserModal() {
  currentEditUser = null;
  const modal = document.getElementById('userModal');
  const form = document.getElementById('userForm');
  const modalTitle = document.getElementById('modalTitle');
  const passwordGroup = document.getElementById('passwordGroup');
  const roleGroup = document.getElementById('roleGroup');
  const userPasswordEl = document.getElementById('userPassword');

  if (!modal || !form || !modalTitle || !passwordGroup || !roleGroup) {
    console.warn('User modal elements missing, cannot open modal');
    return;
  }

  form.reset();
  passwordGroup.style.display = 'block';
  if (userPasswordEl) userPasswordEl.required = true;
  
  if (currentUserTab === 'customers') {
    modalTitle.innerHTML = '<i class="fas fa-user-plus"></i><span>Thêm khách hàng mới</span>';
    roleGroup.style.display = 'none';
  } else {
    modalTitle.innerHTML = '<i class="fas fa-user-tie"></i><span>Thêm nhân viên mới</span>';
    roleGroup.style.display = 'block';
    await loadRoles();
  }
  
  modal.classList.add('active');
}

// ===================================
// Load Roles for Employee Form
// ===================================
async function loadRoles() {
  try {
    // Try to load roles from backend; fallback to a small hardcoded set
    let roles = [];
    try {
      roles = await apiCall('/api/v1/chucvu');
    } catch (err) {
      console.warn('Could not load roles from server, using fallback', err);
      roles = [
        { maChucVu: 'CV001', tenChucVu: 'Admin' },
        { maChucVu: 'CV002', tenChucVu: 'Nhân viên' }
      ];
    }

    const roleSelect = document.getElementById('userRole');
    if (!roleSelect) return;
    roleSelect.innerHTML = '<option value="">-- Chọn chức vụ --</option>' +
      roles.map(role => `<option value="${role.maChucVu}">${role.tenChucVu}</option>`).join('');
      
  } catch (error) {
    console.error('Error loading roles:', error);
  }
}

// ===================================
// Edit Customer
// ===================================
async function editCustomer(id) {
  const customer = usersData.customers.find(c => c.maKH === id);
  if (!customer) return;
  
  currentEditUser = { ...customer, type: 'customer' };
  
  const modal = document.getElementById('userModal');
  const form = document.getElementById('userForm');
  const modalTitle = document.getElementById('modalTitle');
  const passwordGroup = document.getElementById('passwordGroup');
  const roleGroup = document.getElementById('roleGroup');
  
  modalTitle.innerHTML = '<i class="fas fa-user-edit"></i><span>Chỉnh sửa khách hàng</span>';
  if (passwordGroup) passwordGroup.style.display = 'none';
  if (roleGroup) roleGroup.style.display = 'none';
  const userPasswordEl = document.getElementById('userPassword');
  if (userPasswordEl) userPasswordEl.required = false;

  const userHoTenEl = document.getElementById('userHoTen');
  if (userHoTenEl) userHoTenEl.value = customer.hoTen || '';
  const userEmailEl = document.getElementById('userEmail');
  if (userEmailEl) userEmailEl.value = customer.email || '';
  const userSDTEl = document.getElementById('userSDT');
  if (userSDTEl) userSDTEl.value = customer.SDT || '';
  const userCCCDEl = document.getElementById('userCCCD');
  if (userCCCDEl) userCCCDEl.value = customer.CCCD || '';
  const userDiaChiEl = document.getElementById('userDiaChi');
  if (userDiaChiEl) userDiaChiEl.value = customer.diaChi || '';
  
  modal.classList.add('active');
}

// ===================================
// Edit Employee
// ===================================
async function editEmployee(id) {
  const employee = usersData.employees.find(e => e.maNV === id);
  if (!employee) return;
  
  currentEditUser = { ...employee, type: 'employee' };
  
  const modal = document.getElementById('userModal');
  const form = document.getElementById('userForm');
  const modalTitle = document.getElementById('modalTitle');
  const passwordGroup = document.getElementById('passwordGroup');
  const roleGroup = document.getElementById('roleGroup');
  
  modalTitle.innerHTML = '<i class="fas fa-user-edit"></i><span>Chỉnh sửa nhân viên</span>';
  if (passwordGroup) passwordGroup.style.display = 'none';
  if (roleGroup) roleGroup.style.display = 'block';
  const userPasswordEl2 = document.getElementById('userPassword');
  if (userPasswordEl2) userPasswordEl2.required = false;

  await loadRoles();

  const userHoTenEl2 = document.getElementById('userHoTen');
  if (userHoTenEl2) userHoTenEl2.value = employee.hoTen || '';
  const userEmailEl2 = document.getElementById('userEmail');
  if (userEmailEl2) userEmailEl2.value = employee.email || '';
  const userSDTEl2 = document.getElementById('userSDT');
  if (userSDTEl2) userSDTEl2.value = employee.SDT || '';
  const userCCCDEl2 = document.getElementById('userCCCD');
  if (userCCCDEl2) userCCCDEl2.value = employee.CCCD || '';
  const userDiaChiEl2 = document.getElementById('userDiaChi');
  if (userDiaChiEl2) userDiaChiEl2.value = employee.diaChi || '';
  const userRoleEl = document.getElementById('userRole');
  if (userRoleEl) userRoleEl.value = employee.maChucVu || '';
  
  modal.classList.add('active');
}

// ===================================
// Save User
// ===================================
async function saveUser() {
  const form = document.getElementById('userForm');
  
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const formData = {
    hoTen: document.getElementById('userHoTen').value.trim(),
    email: document.getElementById('userEmail').value.trim(),
    SDT: document.getElementById('userSDT').value.trim(),
    CCCD: document.getElementById('userCCCD').value.trim(),
    diaChi: document.getElementById('userDiaChi').value.trim(),
  };
  
  // Validate phone number
  // Normalize and validate fields
  // Email: trim and lowercase
  if (formData.email) formData.email = formData.email.toLowerCase();
  // SDT and CCCD: keep only digits
  formData.SDT = (formData.SDT || '').replace(/\D/g, '').slice(0, 10);
  formData.CCCD = (formData.CCCD || '').replace(/\D/g, '').slice(0, 12);

  if (!/^\d{10}$/.test(formData.SDT)) {
    Toast.error('Số điện thoại phải có đúng 10 chữ số!');
    return;
  }
  
  // Validate CCCD
  if (!/^\d{12}$/.test(formData.CCCD)) {
    Toast.error('Số CCCD phải có đúng 12 chữ số!');
    return;
  }
  
  // Add password for new users
  if (!currentEditUser) {
    const pwdEl = document.getElementById('userPassword');
    formData.password = pwdEl ? String(pwdEl.value || '') : '';
    if (!formData.password || formData.password.length < 6) {
      Toast.error('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }
  }
  
  // Add role for employees
  if (currentUserTab === 'employees') {
    formData.maChucVu = document.getElementById('userRole').value;
  }
  
  // Basic email format check before sending
  const simpleEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!simpleEmailRegex.test(formData.email)) {
    Toast.error('Email không hợp lệ. Vui lòng kiểm tra lại.');
    return;
  }
  
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    let url, method;
    
    if (currentEditUser) {
      // Update
      if (currentUserTab === 'customers') {
        url = `${API_BASE_URL}/admin/customers/${currentEditUser.maKH}`;
      } else {
        url = `${API_BASE_URL}/admin/employees/${currentEditUser.maNV}`;
      }
      method = 'PUT';
    } else {
      // Create
      if (currentUserTab === 'customers') {
        url = `${API_BASE_URL}/admin/customers`;
      } else {
        url = `${API_BASE_URL}/admin/employees`;
      }
      method = 'POST';
    }
    
  console.log('Saving user payload:', formData);
  const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    // Debug: log raw response when not ok
    
    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.json();
      } catch (e) {
        // not JSON
        const text = await response.text();
        console.error('API Error (non-json):', text);
        throw new Error(text || 'Có lỗi xảy ra');
      }

      console.error('API Error JSON:', errorBody); // Debug log

      // Handle several server error shapes:
      // 1) Pydantic returns a top-level array of errors
      // 2) { detail: [ ... ] }
      // 3) { detail: { ... } } or other object
      if (Array.isArray(errorBody)) {
        const msgs = errorBody.map(e => {
          const loc = Array.isArray(e.loc) ? e.loc.join('.') : String(e.loc);
          return `${loc}: ${e.msg}`;
        }).join('\n');
        throw new Error(msgs || JSON.stringify(errorBody));
      }

      if (errorBody && Array.isArray(errorBody.detail)) {
        const msgs = errorBody.detail.map(e => {
          const loc = Array.isArray(e.loc) ? e.loc.join('.') : String(e.loc);
          return `${loc}: ${e.msg}`;
        }).join('\n');
        throw new Error(msgs || JSON.stringify(errorBody.detail));
      }

      if (errorBody && typeof errorBody.detail === 'string') {
        throw new Error(errorBody.detail);
      }

      // Generic object -> stringify
      if (errorBody && typeof errorBody === 'object') {
        throw new Error(JSON.stringify(errorBody));
      }

      // fallback
      throw new Error('Có lỗi xảy ra');
    }
    
    Toast.success(currentEditUser ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
    closeUserModal();
    
    // Reload data
    if (currentUserTab === 'customers') {
      await loadCustomersData();
    } else {
      await loadEmployeesData();
    }
    
  } catch (error) {
    console.error('Error saving user:', error);
    Toast.error(error.message || 'Không thể lưu thông tin');
  }
}

// ===================================
// Delete Customer
// ===================================
async function deleteCustomer(id) {
  const customer = usersData.customers.find(c => c.maKH === id);
  if (!customer) return;
  
  const confirmed = await Modal.confirm(
    `Bạn có chắc chắn muốn xóa khách hàng "${customer.hoTen}"?`,
    'Xác nhận xóa khách hàng',
    'warning'
  );
  if (!confirmed) return;
  
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/admin/customers/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Có lỗi xảy ra');
    }
    
    Toast.success('Xóa khách hàng thành công!');
    await loadCustomersData();
    
  } catch (error) {
    console.error('Error deleting customer:', error);
    Toast.error(error.message || 'Không thể xóa khách hàng');
  }
}

// ===================================
// Delete Employee
// ===================================
async function deleteEmployee(id) {
  const employee = usersData.employees.find(e => e.maNV === id);
  if (!employee) return;
  
  const confirmed = await Modal.confirm(
    `Bạn có chắc chắn muốn xóa nhân viên "${employee.hoTen}"?`,
    'Xác nhận xóa nhân viên',
    'warning'
  );
  if (!confirmed) return;
  
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/admin/employees/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Có lỗi xảy ra');
    }
    
    Toast.success('Xóa nhân viên thành công!');
    await loadEmployeesData();
    
  } catch (error) {
    console.error('Error deleting employee:', error);
    Toast.error(error.message || 'Không thể xóa nhân viên');
  }
}

// ===================================
// Close Modal
// ===================================
function closeUserModal() {
  const modal = document.getElementById('userModal');
  modal.classList.remove('active');
  currentEditUser = null;
}

// Make functions globally accessible
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
window.editEmployee = editEmployee;
window.deleteEmployee = deleteEmployee;
window.closeUserModal = closeUserModal;
window.saveUser = saveUser;

// ===================================
// BOOKING MANAGEMENT MODULE
// ===================================

// Booking Management State
let currentBookingTab = 'all';
let bookingsData = { all: [], cancelRequests: [] };
let currentCancelRequest = null;

// ===================================
// Load Booking Management Page
// ===================================
function loadBookingManagementPage() {
  const content = document.querySelector('.content');
  
  content.innerHTML = `
    <div class="bookings-management-page">
      <!-- Page Header -->
      <div class="bookings-page-header">
        <div class="page-title-section">
          <h2><i class="fas fa-ticket-alt"></i> Quản lý Vé xe</h2>
          <p class="page-subtitle">Quản lý đặt vé và xử lý yêu cầu hủy vé</p>
        </div>
        
        <!-- Tab Selector -->
        <div class="booking-tabs-selector">
          <button class="booking-tab-btn active" data-tab="all">
            <i class="fas fa-list"></i>
            <span>Tất cả vé</span>
          </button>
          <button class="booking-tab-btn" data-tab="cancel-requests">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Yêu cầu hủy</span>
            <span class="cancel-badge" id="cancelBadge">0</span>
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="booking-stats" id="bookingStats"></div>

      <!-- Filters -->
      <div class="booking-controls">
        <div class="booking-search">
          <i class="fas fa-search"></i>
          <input type="text" id="bookingSearchInput" placeholder="Tìm kiếm theo mã vé, tên khách hàng...">
        </div>
        <select id="bookingStatusFilter" class="status-filter">
          <option value="">Tất cả trạng thái</option>
          <option value="paid">Đã thanh toán</option>
          <option value="cancel_pending">Chờ duyệt hủy</option>
          <option value="cancelled">Đã hủy</option>
          <option value="refunded">Đã hoàn tiền</option>
        </select>
      </div>

      <!-- Table -->
      <div class="bookings-table-wrapper">
        <div class="bookings-table-header">
          <i class="fas fa-table"></i>
          <span id="bookingTableTitle">Danh sách vé</span>
        </div>
        <table class="bookings-table">
          <thead id="bookingTableHead"></thead>
          <tbody id="bookingTableBody">
            <tr class="loading-row">
              <td colspan="8">
                <i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Cancel Request Detail Modal -->
    <div class="cancel-detail-modal" id="cancelDetailModal">
      <div class="cancel-detail-content">
        <div class="cancel-detail-header">
          <h3><i class="fas fa-file-alt"></i> Chi tiết yêu cầu hủy vé</h3>
          <button class="modal-close-btn" onclick="closeCancelDetailModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="cancel-detail-body" id="cancelDetailBody"></div>
        <div class="cancel-detail-footer" id="cancelDetailFooter"></div>
      </div>
    </div>

    <style>
      /* Booking Management Styles */
      .bookings-management-page { padding: 0; }
      
      .bookings-page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        flex-wrap: wrap;
        gap: 20px;
      }
      
      .booking-tabs-selector {
        display: flex;
        gap: 10px;
      }
      
      .booking-tab-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        border: 2px solid #e2e8f0;
        background: white;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
      }
      
      .booking-tab-btn.active {
        background: var(--primary-gradient);
        border-color: transparent;
        color: white;
      }
      
      .booking-tab-btn:not(.active):hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }
      
      .cancel-badge {
        background: #f44336;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 700;
        min-width: 22px;
        text-align: center;
      }
      
      .booking-tab-btn.active .cancel-badge {
        background: white;
        color: #f44336;
      }
      
      .booking-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 25px;
      }
      
      .booking-stat-card {
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        display: flex;
        align-items: center;
        gap: 15px;
      }
      
      .booking-stat-icon {
        width: 50px;
        height: 50px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        color: white;
      }
      
      .booking-stat-icon.total { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
      .booking-stat-icon.paid { background: var(--green-gradient); }
      .booking-stat-icon.pending { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
      .booking-stat-icon.revenue { background: var(--orange-gradient); }
      
      .booking-stat-info h4 {
        font-size: 24px;
        font-weight: 700;
        color: #333;
        margin: 0;
      }
      
      .booking-stat-info p {
        font-size: 13px;
        color: #666;
        margin: 0;
      }
      
      .booking-controls {
        display: flex;
        gap: 15px;
        margin-bottom: 25px;
        flex-wrap: wrap;
      }
      
      .booking-search {
        flex: 1;
        min-width: 300px;
        position: relative;
      }
      
      .booking-search input {
        width: 100%;
        padding: 12px 15px 12px 45px;
        border: 2px solid #e2e8f0;
        border-radius: 10px;
        font-size: 14px;
      }
      
      .booking-search input:focus {
        outline: none;
        border-color: var(--primary-color);
      }
      
      .booking-search i {
        position: absolute;
        left: 15px;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8;
      }
      
      .status-filter {
        padding: 12px 20px;
        border: 2px solid #e2e8f0;
        border-radius: 10px;
        font-size: 14px;
        cursor: pointer;
      }
      
      .bookings-table-wrapper {
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        overflow: hidden;
      }
      
      .bookings-table-header {
        padding: 20px 25px;
        background: var(--primary-gradient);
        color: white;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 18px;
        font-weight: 600;
      }
      
      .bookings-table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .bookings-table thead { background: #f8fafc; }
      
      .bookings-table th {
        padding: 15px 20px;
        text-align: left;
        font-weight: 600;
        color: #475569;
        font-size: 13px;
        text-transform: uppercase;
        border-bottom: 2px solid #e2e8f0;
      }
      
      .bookings-table td {
        padding: 15px 20px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 14px;
        color: #334155;
      }
      
      .bookings-table tbody tr:hover { background: #f8fafc; }
      
      .booking-status-badge {
        display: inline-block;
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
      }
      
      .booking-status-badge.paid { background: rgba(56, 239, 125, 0.15); color: #11998e; }
      .booking-status-badge.cancel_pending { background: rgba(156, 39, 176, 0.15); color: #9c27b0; }
      .booking-status-badge.cancelled { background: rgba(244, 67, 54, 0.15); color: #f44336; }
      .booking-status-badge.refunded { background: rgba(156, 39, 176, 0.15); color: #9c27b0; }
      
      .btn-view-cancel {
        padding: 8px 16px;
        background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .btn-view-cancel:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
      }
      
      /* Cancel Request Table */
      .cancel-reason-preview {
        max-width: 200px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .cancel-request-status {
        display: inline-block;
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
      }
      
      .cancel-request-status.pending { background: rgba(255, 152, 0, 0.15); color: #ff9800; }
      .cancel-request-status.approved { background: rgba(76, 175, 80, 0.15); color: #4caf50; }
      .cancel-request-status.rejected { background: rgba(244, 67, 54, 0.15); color: #f44336; }
      
      /* Cancel Detail Modal */
      .cancel-detail-modal {
        display: none;
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6);
        z-index: 2000;
        align-items: center;
        justify-content: center;
      }
      
      .cancel-detail-modal.active { display: flex; }
      
      .cancel-detail-content {
        background: white;
        border-radius: 16px;
        width: 90%;
        max-width: 700px;
        max-height: 90vh;
        overflow: hidden;
        box-shadow: 0 25px 60px rgba(0,0,0,0.3);
        animation: modalSlideIn 0.3s ease;
      }
      
      .cancel-detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
        color: white;
      }
      
      .cancel-detail-header h3 {
        margin: 0;
        font-size: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .cancel-detail-body {
        padding: 24px;
        max-height: 60vh;
        overflow-y: auto;
      }
      
      .detail-section {
        margin-bottom: 24px;
      }
      
      .detail-section h4 {
        font-size: 16px;
        color: #333;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid #f0f0f0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .detail-section h4 i { color: var(--primary-color); }
      
      .detail-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      
      .detail-item {
        display: flex;
        flex-direction: column;
      }
      
      .detail-item label {
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
      }
      
      .detail-item span {
        font-size: 15px;
        font-weight: 600;
        color: #333;
      }
      
      .reason-box {
        background: #fff3e0;
        border: 1px solid #ffcc80;
        border-radius: 10px;
        padding: 16px;
      }
      
      .reason-box h5 {
        margin: 0 0 8px 0;
        color: #e65100;
        font-size: 14px;
      }
      
      .reason-box p {
        margin: 0;
        color: #555;
        line-height: 1.6;
      }
      
      .refund-info {
        background: #e8f5e9;
        border: 1px solid #a5d6a7;
        border-radius: 10px;
        padding: 16px;
        text-align: center;
      }
      
      .refund-info h5 {
        margin: 0 0 8px 0;
        color: #2e7d32;
      }
      
      .refund-info .amount {
        font-size: 28px;
        font-weight: 700;
        color: #1b5e20;
      }
      
      .refund-info .percent {
        font-size: 14px;
        color: #666;
      }
      
      .cancel-detail-footer {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        padding: 20px 24px;
        border-top: 2px solid #f0f0f0;
        background: #fafafa;
      }
      
      .btn-approve {
        padding: 12px 24px;
        background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
        color: white;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
      }
      
      .btn-approve:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
      }
      
      .btn-reject {
        padding: 12px 24px;
        background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
        color: white;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
      }
      
      .btn-reject:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(244, 67, 54, 0.4);
      }
      
      .btn-close-modal {
        padding: 12px 24px;
        background: #e0e0e0;
        color: #333;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .btn-close-modal:hover { background: #d0d0d0; }
    </style>
  `;

  // Setup event listeners
  setupBookingManagementEvents();
  
  // Load initial data
  loadAllBookings();
  loadCancelRequestsCount();
}

// ===================================
// Setup Booking Management Events
// ===================================
function setupBookingManagementEvents() {
  // Tab switching
  document.querySelectorAll('.booking-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.booking-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      currentBookingTab = btn.getAttribute('data-tab');
      
      if (currentBookingTab === 'all') {
        loadAllBookings();
      } else {
        loadCancelRequests();
      }
    });
  });

  // Search
  const searchInput = document.getElementById('bookingSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => filterBookings(e.target.value));
  }

  // Status filter
  const statusFilter = document.getElementById('bookingStatusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      if (currentBookingTab === 'all') {
        loadAllBookings(statusFilter.value);
      }
    });
  }
}

// ===================================
// Load All Bookings
// ===================================
async function loadAllBookings(statusFilter = '') {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    let url = `${API_BASE_URL}/admin/bookings/all?limit=50`;
    if (statusFilter) url += `&status=${statusFilter}`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load bookings');
    
    const data = await response.json();
    bookingsData.all = data.bookings || [];
    
    // Load stats
    loadBookingStats();
    
    // Render table
    renderBookingsTable(bookingsData.all);
  } catch (error) {
    console.error('Error loading bookings:', error);
    Toast.error('Không thể tải danh sách vé');
    renderEmptyBookingTable('Không thể tải dữ liệu');
  }
}

// ===================================
// Load Cancel Requests
// ===================================
async function loadCancelRequests(statusFilter = '') {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    let url = `${API_BASE_URL}/admin/bookings/cancel-requests?limit=50`;
    if (statusFilter) url += `&status=${statusFilter}`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load cancel requests');
    
    const data = await response.json();
    bookingsData.cancelRequests = data.requests || [];
    
    // Update badge
    const badge = document.getElementById('cancelBadge');
    if (badge) badge.textContent = data.pending_count || 0;
    
    // Render table
    renderCancelRequestsTable(bookingsData.cancelRequests);
  } catch (error) {
    console.error('Error loading cancel requests:', error);
    Toast.error('Không thể tải danh sách yêu cầu hủy');
    renderEmptyBookingTable('Không thể tải dữ liệu');
  }
}

// ===================================
// Load Cancel Requests Count (for badge)
// ===================================
async function loadCancelRequestsCount() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/admin/bookings/cancel-requests/pending/count`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const badge = document.getElementById('cancelBadge');
      if (badge) badge.textContent = data.count || 0;
    }
  } catch (error) {
    console.error('Error loading cancel count:', error);
  }
}

// ===================================
// Load Booking Stats
// ===================================
async function loadBookingStats() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/admin/bookings/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load stats');
    
    const stats = await response.json();
    renderBookingStats(stats);
  } catch (error) {
    console.error('Error loading booking stats:', error);
  }
}

// ===================================
// Render Booking Stats
// ===================================
function renderBookingStats(stats) {
  const container = document.getElementById('bookingStats');
  if (!container) return;
  
  container.innerHTML = `
    <div class="booking-stat-card">
      <div class="booking-stat-icon total">
        <i class="fas fa-ticket-alt"></i>
      </div>
      <div class="booking-stat-info">
        <h4>${stats.total_bookings || 0}</h4>
        <p>Tổng số vé</p>
      </div>
    </div>
    <div class="booking-stat-card">
      <div class="booking-stat-icon paid">
        <i class="fas fa-check-circle"></i>
      </div>
      <div class="booking-stat-info">
        <h4>${stats.paid_bookings || 0}</h4>
        <p>Đã thanh toán</p>
      </div>
    </div>
    <div class="booking-stat-card">
      <div class="booking-stat-icon pending">
        <i class="fas fa-clock"></i>
      </div>
      <div class="booking-stat-info">
        <h4>${stats.cancel_pending || 0}</h4>
        <p>Chờ duyệt hủy</p>
      </div>
    </div>
    <div class="booking-stat-card">
      <div class="booking-stat-icon revenue">
        <i class="fas fa-money-bill-wave"></i>
      </div>
      <div class="booking-stat-info">
        <h4>${formatCurrency(stats.total_revenue || 0)}</h4>
        <p>Tổng doanh thu</p>
      </div>
    </div>
  `;
}

// ===================================
// Render Bookings Table
// ===================================
function renderBookingsTable(bookings) {
  const tableHead = document.getElementById('bookingTableHead');
  const tableBody = document.getElementById('bookingTableBody');
  const tableTitle = document.getElementById('bookingTableTitle');
  
  if (!tableHead || !tableBody) return;
  
  tableTitle.textContent = 'Danh sách vé';
  
  tableHead.innerHTML = `
    <tr>
      <th>Mã vé</th>
      <th>Khách hàng</th>
      <th>Tuyến đường</th>
      <th>Ngày đi</th>
      <th>Ghế</th>
      <th>Tổng tiền</th>
      <th>Trạng thái</th>
      <th>Thao tác</th>
    </tr>
  `;

  if (!bookings || bookings.length === 0) {
    renderEmptyBookingTable('Chưa có vé nào');
    return;
  }

  tableBody.innerHTML = bookings.map(booking => {
    const route = booking.routeInfo 
      ? `${booking.routeInfo.diemDi} → ${booking.routeInfo.diemDen}` 
      : booking.maTuyenXe || 'N/A';
    const customer = booking.customerInfo?.hoTen || 'N/A';
    const seats = Array.isArray(booking.soGheNgoi) ? booking.soGheNgoi.join(', ') : booking.soGheNgoi;
    const statusLabel = getBookingStatusLabel(booking.trangThai);
    
    return `
      <tr>
        <td><strong>${booking.maDatVe}</strong></td>
        <td>${customer}</td>
        <td>${route}</td>
        <td>${booking.ngayDi} ${booking.gioDi || ''}</td>
        <td>${seats}</td>
        <td><strong>${formatCurrency(booking.tongTien)}</strong></td>
        <td><span class="booking-status-badge ${booking.trangThai}">${statusLabel}</span></td>
        <td>
          ${booking.trangThai === 'cancel_pending' ? `
            <button class="btn-view-cancel" onclick="viewCancelRequest('${booking.maDatVe}')">
              <i class="fas fa-eye"></i> Xem yêu cầu
            </button>
          ` : '-'}
        </td>
      </tr>
    `;
  }).join('');
}

// ===================================
// Render Cancel Requests Table
// ===================================
function renderCancelRequestsTable(requests) {
  const tableHead = document.getElementById('bookingTableHead');
  const tableBody = document.getElementById('bookingTableBody');
  const tableTitle = document.getElementById('bookingTableTitle');
  
  if (!tableHead || !tableBody) return;
  
  tableTitle.textContent = 'Danh sách yêu cầu hủy vé';
  
  tableHead.innerHTML = `
    <tr>
      <th>Mã YC</th>
      <th>Mã vé</th>
      <th>Khách hàng</th>
      <th>Tuyến</th>
      <th>Lý do hủy</th>
      <th>Tiền hoàn</th>
      <th>Trạng thái</th>
      <th>Thao tác</th>
    </tr>
  `;

  if (!requests || requests.length === 0) {
    renderEmptyBookingTable('Không có yêu cầu hủy vé');
    return;
  }

  tableBody.innerHTML = requests.map(req => {
    const route = req.routeInfo 
      ? `${req.routeInfo.diemDi} → ${req.routeInfo.diemDen}` 
      : req.maTuyenXe || 'N/A';
    const statusLabel = getCancelStatusLabel(req.trangThai);
    
    return `
      <tr>
        <td><strong>${req.maYeuCauHuy}</strong></td>
        <td>${req.maDatVe}</td>
        <td>${req.tenKH || 'N/A'}</td>
        <td>${route}</td>
        <td class="cancel-reason-preview" title="${req.lyDoHuyText}">${req.lyDoHuyText}</td>
        <td><strong>${formatCurrency(req.tienHoanDuKien)}</strong></td>
        <td><span class="cancel-request-status ${req.trangThai}">${statusLabel}</span></td>
        <td>
          <button class="btn-view-cancel" onclick="openCancelDetailModal('${req.maYeuCauHuy}')">
            <i class="fas fa-eye"></i> Chi tiết
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ===================================
// View Cancel Request from Booking
// ===================================
async function viewCancelRequest(maDatVe) {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/admin/bookings/cancel-requests?limit=100`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load');
    
    const data = await response.json();
    const request = data.requests.find(r => r.maDatVe === maDatVe);
    
    if (request) {
      openCancelDetailModal(request.maYeuCauHuy);
    } else {
      Toast.error('Không tìm thấy yêu cầu hủy');
    }
  } catch (error) {
    console.error(error);
    Toast.error('Không thể tải thông tin yêu cầu hủy');
  }
}

// ===================================
// Open Cancel Detail Modal
// ===================================
async function openCancelDetailModal(maYeuCauHuy) {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/admin/bookings/cancel-requests/${maYeuCauHuy}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load cancel request detail');
    
    currentCancelRequest = await response.json();
    
    const route = currentCancelRequest.routeInfo 
      ? `${currentCancelRequest.routeInfo.diemDi} → ${currentCancelRequest.routeInfo.diemDen}` 
      : 'N/A';
    const seats = Array.isArray(currentCancelRequest.soGheNgoi) 
      ? currentCancelRequest.soGheNgoi.join(', ') 
      : currentCancelRequest.soGheNgoi;
    
    const body = document.getElementById('cancelDetailBody');
    body.innerHTML = `
      <div class="detail-section">
        <h4><i class="fas fa-user"></i> Thông tin khách hàng</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Họ tên</label>
            <span>${currentCancelRequest.tenKH || 'N/A'}</span>
          </div>
          <div class="detail-item">
            <label>Email</label>
            <span>${currentCancelRequest.emailKH || 'N/A'}</span>
          </div>
        </div>
      </div>
      
      <div class="detail-section">
        <h4><i class="fas fa-ticket-alt"></i> Thông tin vé</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Mã vé</label>
            <span>${currentCancelRequest.maDatVe}</span>
          </div>
          <div class="detail-item">
            <label>Tuyến đường</label>
            <span>${route}</span>
          </div>
          <div class="detail-item">
            <label>Ngày khởi hành</label>
            <span>${currentCancelRequest.ngayDi} ${currentCancelRequest.gioDi || ''}</span>
          </div>
          <div class="detail-item">
            <label>Ghế</label>
            <span>${seats}</span>
          </div>
          <div class="detail-item">
            <label>Tổng tiền vé</label>
            <span>${formatCurrency(currentCancelRequest.tongTien)}</span>
          </div>
          <div class="detail-item">
            <label>Ngày yêu cầu hủy</label>
            <span>${new Date(currentCancelRequest.ngayTao).toLocaleString('vi-VN')}</span>
          </div>
        </div>
      </div>
      
      <div class="detail-section">
        <h4><i class="fas fa-exclamation-circle"></i> Lý do hủy vé</h4>
        <div class="reason-box">
          <h5>📝 ${currentCancelRequest.lyDoHuyText}</h5>
          ${currentCancelRequest.ghiChu ? `<p><strong>Ghi chú:</strong> ${currentCancelRequest.ghiChu}</p>` : ''}
        </div>
      </div>
      
      <div class="detail-section">
        <h4><i class="fas fa-money-bill-wave"></i> Thông tin hoàn tiền</h4>
        <div class="refund-info">
          <h5>💵 Số tiền hoàn dự kiến</h5>
          <div class="amount">${formatCurrency(currentCancelRequest.tienHoanDuKien)}</div>
          <div class="percent">(${currentCancelRequest.phanTramHoan}% giá vé)</div>
        </div>
      </div>
      
      ${currentCancelRequest.trangThai !== 'pending' ? `
        <div class="detail-section">
          <h4><i class="fas fa-info-circle"></i> Kết quả xử lý</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Trạng thái</label>
              <span class="cancel-request-status ${currentCancelRequest.trangThai}">${getCancelStatusLabel(currentCancelRequest.trangThai)}</span>
            </div>
            <div class="detail-item">
              <label>Người xử lý</label>
              <span>${currentCancelRequest.nguoiXuLy || 'N/A'}</span>
            </div>
            ${currentCancelRequest.ngayXuLy ? `
              <div class="detail-item">
                <label>Ngày xử lý</label>
                <span>${new Date(currentCancelRequest.ngayXuLy).toLocaleString('vi-VN')}</span>
              </div>
            ` : ''}
            ${currentCancelRequest.lyDoTuChoi ? `
              <div class="detail-item" style="grid-column: span 2;">
                <label>Lý do từ chối</label>
                <span style="color: #f44336;">${currentCancelRequest.lyDoTuChoi}</span>
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}
    `;
    
    // Footer buttons
    const footer = document.getElementById('cancelDetailFooter');
    if (currentCancelRequest.trangThai === 'pending') {
      footer.innerHTML = `
        <button class="btn-close-modal" onclick="closeCancelDetailModal()">Đóng</button>
        <button class="btn-reject" onclick="rejectCancelRequest('${maYeuCauHuy}')">
          <i class="fas fa-times"></i> Từ chối
        </button>
        <button class="btn-approve" onclick="approveCancelRequest('${maYeuCauHuy}')">
          <i class="fas fa-check"></i> Duyệt hủy vé
        </button>
      `;
    } else {
      footer.innerHTML = `
        <button class="btn-close-modal" onclick="closeCancelDetailModal()">Đóng</button>
      `;
    }
    
    document.getElementById('cancelDetailModal').classList.add('active');
    
  } catch (error) {
    console.error(error);
    Toast.error('Không thể tải chi tiết yêu cầu hủy');
  }
}

// ===================================
// Close Cancel Detail Modal
// ===================================
function closeCancelDetailModal() {
  document.getElementById('cancelDetailModal').classList.remove('active');
  currentCancelRequest = null;
}

// ===================================
// Approve Cancel Request
// ===================================
async function approveCancelRequest(maYeuCauHuy) {
  const confirmed = await Modal.confirm(
    `Bạn có chắc chắn muốn DUYỆT yêu cầu hủy vé này?\n\nSố tiền hoàn: ${formatCurrency(currentCancelRequest.tienHoanDuKien)}`,
    'Xác nhận duyệt hủy vé',
    'warning'
  );
  
  if (!confirmed) return;
  
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/admin/bookings/cancel-requests/${maYeuCauHuy}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'approve' })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to approve');
    }
    
    const result = await response.json();
    Toast.success(result.message);
    closeCancelDetailModal();
    
    // Reload data
    if (currentBookingTab === 'all') {
      loadAllBookings();
    } else {
      loadCancelRequests();
    }
    loadCancelRequestsCount();
    
  } catch (error) {
    console.error(error);
    Toast.error(error.message || 'Không thể duyệt yêu cầu hủy');
  }
}

// ===================================
// Reject Cancel Request
// ===================================
async function rejectCancelRequest(maYeuCauHuy) {
  const reason = prompt('Nhập lý do từ chối yêu cầu hủy vé:');
  
  if (reason === null) return; // User cancelled
  if (!reason.trim()) {
    Toast.warning('Vui lòng nhập lý do từ chối');
    return;
  }
  
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/admin/bookings/cancel-requests/${maYeuCauHuy}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        action: 'reject',
        lyDoTuChoi: reason.trim()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to reject');
    }
    
    const result = await response.json();
    Toast.success(result.message);
    closeCancelDetailModal();
    
    // Reload data
    if (currentBookingTab === 'all') {
      loadAllBookings();
    } else {
      loadCancelRequests();
    }
    loadCancelRequestsCount();
    
  } catch (error) {
    console.error(error);
    Toast.error(error.message || 'Không thể từ chối yêu cầu hủy');
  }
}

// ===================================
// Helper Functions
// ===================================
function getBookingStatusLabel(status) {
  const labels = {
    'paid': 'Đã thanh toán',
    'cancel_pending': 'Chờ duyệt hủy',
    'cancelled': 'Đã hủy',
    'refunded': 'Đã hoàn tiền'
  };
  return labels[status] || status;
}

function getCancelStatusLabel(status) {
  const labels = {
    'pending': 'Chờ xử lý',
    'approved': 'Đã duyệt',
    'rejected': 'Từ chối'
  };
  return labels[status] || status;
}

function renderEmptyBookingTable(message) {
  const tableBody = document.getElementById('bookingTableBody');
  if (!tableBody) return;
  
  tableBody.innerHTML = `
    <tr class="empty-row">
      <td colspan="8">
        <i class="fas fa-inbox"></i> ${message}
      </td>
    </tr>
  `;
}

function filterBookings(searchTerm) {
  const lowerSearch = searchTerm.toLowerCase();
  
  if (currentBookingTab === 'all') {
    const filtered = bookingsData.all.filter(b => 
      (b.maDatVe || '').toLowerCase().includes(lowerSearch) ||
      (b.customerInfo?.hoTen || '').toLowerCase().includes(lowerSearch) ||
      (b.routeInfo?.diemDi || '').toLowerCase().includes(lowerSearch) ||
      (b.routeInfo?.diemDen || '').toLowerCase().includes(lowerSearch)
    );
    renderBookingsTable(filtered);
  } else {
    const filtered = bookingsData.cancelRequests.filter(r => 
      (r.maYeuCauHuy || '').toLowerCase().includes(lowerSearch) ||
      (r.maDatVe || '').toLowerCase().includes(lowerSearch) ||
      (r.tenKH || '').toLowerCase().includes(lowerSearch) ||
      (r.lyDoHuyText || '').toLowerCase().includes(lowerSearch)
    );
    renderCancelRequestsTable(filtered);
  }
}

// Make functions globally accessible
window.viewCancelRequest = viewCancelRequest;
window.openCancelDetailModal = openCancelDetailModal;
window.closeCancelDetailModal = closeCancelDetailModal;
window.approveCancelRequest = approveCancelRequest;
window.rejectCancelRequest = rejectCancelRequest;


// ===================================
// STATISTICS MODULE
// ===================================

let revenueLineChart = null;
let routesPieChart = null;
let currentStatsPeriod = 'month';

// ===================================
// Load Statistics Page
// ===================================
function loadStatisticsPage() {
  const content = document.querySelector('.content');
  
  content.innerHTML = `
    <div class="statistics-page">
      <!-- Page Header -->
      <div class="stats-page-header">
        <div class="page-title-section">
          <h2><i class="fas fa-chart-bar"></i> Thống kê & Báo cáo</h2>
          <p class="page-subtitle">Phân tích doanh thu và hiệu suất kinh doanh</p>
        </div>
        
        <div class="stats-header-actions">
          <!-- Period Selector -->
          <div class="period-selector">
            <button class="period-btn" data-period="today">Hôm nay</button>
            <button class="period-btn" data-period="week">Tuần này</button>
            <button class="period-btn active" data-period="month">Tháng này</button>
            <button class="period-btn" data-period="year">Năm nay</button>
          </div>
          
          <!-- Export Dropdown -->
          <div class="export-dropdown-wrapper">
            <button class="btn-export-csv" id="btnExportCSV">
              <i class="fas fa-file-download"></i>
              <span>Xuất CSV</span>
              <i class="fas fa-chevron-down"></i>
            </button>
            <div class="export-dropdown-menu" id="exportDropdownMenu">
              <div class="export-menu-header">
                <i class="fas fa-file-csv"></i>
                <span>Chọn loại xuất dữ liệu</span>
              </div>
              <button class="export-menu-item" data-export="invoices">
                <i class="fas fa-receipt"></i>
                <span>Hóa đơn</span>
              </button>
              <button class="export-menu-item" data-export="tickets">
                <i class="fas fa-ticket-alt"></i>
                <span>Vé xe</span>
              </button>
              <button class="export-menu-item" data-export="revenue">
                <i class="fas fa-money-bill-wave"></i>
                <span>Doanh thu</span>
              </button>
              <button class="export-menu-item" data-export="customers">
                <i class="fas fa-users"></i>
                <span>Khách hàng</span>
              </button>
              <button class="export-menu-item" data-export="routes">
                <i class="fas fa-route"></i>
                <span>Tuyến xe</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Overview Stats -->
      <div class="stats-overview-grid" id="statsOverview">
        <div class="stats-card loading">
          <div class="stats-card-icon revenue"><i class="fas fa-money-bill-wave"></i></div>
          <div class="stats-card-content">
            <div class="stats-card-value" id="totalRevenue">--</div>
            <div class="stats-card-label">Doanh thu</div>
          </div>
        </div>
        <div class="stats-card loading">
          <div class="stats-card-icon bookings"><i class="fas fa-ticket-alt"></i></div>
          <div class="stats-card-content">
            <div class="stats-card-value" id="totalBookings">--</div>
            <div class="stats-card-label">Đơn đặt vé</div>
          </div>
        </div>
        <div class="stats-card loading">
          <div class="stats-card-icon tickets"><i class="fas fa-chair"></i></div>
          <div class="stats-card-content">
            <div class="stats-card-value" id="totalTickets">--</div>
            <div class="stats-card-label">Vé đã bán</div>
          </div>
        </div>
        <div class="stats-card loading">
          <div class="stats-card-icon average"><i class="fas fa-calculator"></i></div>
          <div class="stats-card-content">
            <div class="stats-card-value" id="avgPrice">--</div>
            <div class="stats-card-label">Giá vé TB</div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-row">
        <!-- Revenue Chart -->
        <div class="chart-container">
          <div class="chart-header">
            <h3><i class="fas fa-chart-line"></i> Biểu đồ doanh thu</h3>
            <select id="chartDaysSelect">
              <option value="7">7 ngày</option>
              <option value="14">14 ngày</option>
              <option value="30" selected>30 ngày</option>
              <option value="90">90 ngày</option>
            </select>
          </div>
          <div class="chart-wrapper">
            <canvas id="revenueLineChart"></canvas>
          </div>
        </div>

        <!-- Routes Pie Chart -->
        <div class="chart-container small">
          <div class="chart-header">
            <h3><i class="fas fa-route"></i> Tuyến phổ biến</h3>
          </div>
          <div class="chart-wrapper">
            <canvas id="routesPieChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Popular Routes Table -->
      <div class="stats-table-container">
        <div class="stats-table-header">
          <h3><i class="fas fa-trophy"></i> Top tuyến xe đặt nhiều nhất</h3>
        </div>
        <table class="stats-table">
          <thead>
            <tr>
              <th>Hạng</th>
              <th>Tuyến đường</th>
              <th>Số đơn</th>
              <th>Số vé</th>
              <th>Doanh thu</th>
              <th>Tỷ lệ</th>
            </tr>
          </thead>
          <tbody id="popularRoutesTable">
            <tr><td colspan="6" class="loading-cell"><i class="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Top Customers -->
      <div class="stats-table-container">
        <div class="stats-table-header">
          <h3><i class="fas fa-users"></i> Top khách hàng VIP</h3>
        </div>
        <table class="stats-table">
          <thead>
            <tr>
              <th>Hạng</th>
              <th>Khách hàng</th>
              <th>Email</th>
              <th>Số đơn</th>
              <th>Số vé</th>
              <th>Tổng chi tiêu</th>
            </tr>
          </thead>
          <tbody id="topCustomersTable">
            <tr><td colspan="6" class="loading-cell"><i class="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <style>
      /* Statistics Page Styles */
      .statistics-page { padding: 0; }
      
      .stats-page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        flex-wrap: wrap;
        gap: 20px;
      }
      
      .stats-header-actions {
        display: flex;
        align-items: center;
        gap: 15px;
        flex-wrap: wrap;
      }
      
      .period-selector {
        display: flex;
        gap: 8px;
        background: white;
        padding: 6px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      
      .period-btn {
        padding: 10px 20px;
        border: none;
        background: transparent;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        color: #666;
      }
      
      .period-btn:hover { background: #f5f5f5; color: #333; }
      
      .period-btn.active {
        background: var(--primary-gradient);
        color: white;
        box-shadow: 0 4px 12px rgba(255, 102, 0, 0.3);
      }
      
      /* Export CSV Dropdown */
      .export-dropdown-wrapper {
        position: relative;
      }
      
      .btn-export-csv {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        color: white;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(17, 153, 142, 0.3);
      }
      
      .btn-export-csv:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(17, 153, 142, 0.4);
      }
      
      .btn-export-csv i:last-child {
        font-size: 12px;
        transition: transform 0.3s ease;
      }
      
      .btn-export-csv.active i:last-child {
        transform: rotate(180deg);
      }
      
      .export-dropdown-menu {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        min-width: 220px;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.3s ease;
        z-index: 1000;
        overflow: hidden;
      }
      
      .export-dropdown-menu.active {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }
      
      .export-menu-header {
        padding: 15px 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-weight: 600;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .export-menu-item {
        width: 100%;
        padding: 12px 20px;
        border: none;
        background: white;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        color: #333;
        border-bottom: 1px solid #f0f0f0;
      }
      
      .export-menu-item:last-child {
        border-bottom: none;
      }
      
      .export-menu-item:hover {
        background: #f8f9fa;
        padding-left: 25px;
      }
      
      .export-menu-item i {
        color: var(--primary-color);
        width: 20px;
      }
      
      /* Stats Overview Grid */
      .stats-overview-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
        margin-bottom: 30px;
      }
      
      @media (max-width: 1200px) {
        .stats-overview-grid { grid-template-columns: repeat(2, 1fr); }
      }
      
      @media (max-width: 600px) {
        .stats-overview-grid { grid-template-columns: 1fr; }
      }
      
      .stats-card {
        background: white;
        border-radius: 16px;
        padding: 24px;
        display: flex;
        align-items: center;
        gap: 20px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        transition: all 0.3s ease;
      }
      
      .stats-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.1);
      }
      
      .stats-card.loading .stats-card-value {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        color: transparent;
        border-radius: 4px;
      }
      
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      
      .stats-card-icon {
        width: 60px;
        height: 60px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: white;
        flex-shrink: 0;
      }
      
      .stats-card-icon.revenue { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
      .stats-card-icon.bookings { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
      .stats-card-icon.tickets { background: var(--primary-gradient); }
      .stats-card-icon.average { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
      
      .stats-card-content { flex: 1; }
      
      .stats-card-value {
        font-size: 28px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 4px;
      }
      
      .stats-card-label {
        font-size: 14px;
        color: #64748b;
      }
      
      /* Charts Row */
      .charts-row {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 20px;
        margin-bottom: 30px;
      }
      
      @media (max-width: 1000px) {
        .charts-row { grid-template-columns: 1fr; }
      }
      
      .chart-container {
        background: white;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      }
      
      .chart-container.small { max-height: 400px; }
      
      .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      
      .chart-header h3 {
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .chart-header h3 i { color: var(--primary-color); }
      
      .chart-header select {
        padding: 8px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
      }
      
      .chart-wrapper {
        position: relative;
        height: 300px;
      }
      
      /* Stats Tables */
      .stats-table-container {
        background: white;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        margin-bottom: 20px;
      }
      
      .stats-table-header {
        margin-bottom: 20px;
      }
      
      .stats-table-header h3 {
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .stats-table-header h3 i { color: var(--primary-color); }
      
      .stats-table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .stats-table thead { background: #f8fafc; }
      
      .stats-table th {
        padding: 14px 16px;
        text-align: left;
        font-weight: 600;
        color: #475569;
        font-size: 13px;
        text-transform: uppercase;
        border-bottom: 2px solid #e2e8f0;
      }
      
      .stats-table td {
        padding: 14px 16px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 14px;
        color: #334155;
      }
      
      .stats-table tbody tr:hover { background: #f8fafc; }
      
      .loading-cell {
        text-align: center;
        padding: 40px !important;
        color: #94a3b8;
      }
      
      .rank-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        font-weight: 700;
        font-size: 14px;
      }
      
      .rank-badge.gold { background: linear-gradient(135deg, #f7971e 0%, #ffd200 100%); color: white; }
      .rank-badge.silver { background: linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%); color: white; }
      .rank-badge.bronze { background: linear-gradient(135deg, #c9934e 0%, #8B4513 100%); color: white; }
      .rank-badge.normal { background: #e2e8f0; color: #475569; }
      
      .route-name {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
      }
      
      .route-arrow { color: var(--primary-color); }
      
      .percentage-bar {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .bar-container {
        flex: 1;
        height: 8px;
        background: #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .bar-fill {
        height: 100%;
        background: var(--primary-gradient);
        border-radius: 4px;
        transition: width 0.5s ease;
      }
      
      .bar-value {
        font-weight: 600;
        color: var(--primary-color);
        min-width: 45px;
        text-align: right;
      }
    </style>
  `;

  // Setup events
  setupStatisticsEvents();
  
  // Load data
  loadStatisticsData();
}

// ===================================
// Setup Statistics Events
// ===================================
function setupStatisticsEvents() {
  // Period buttons
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatsPeriod = btn.getAttribute('data-period');
      loadStatisticsData();
    });
  });

  // Chart days select
  const chartDaysSelect = document.getElementById('chartDaysSelect');
  if (chartDaysSelect) {
    chartDaysSelect.addEventListener('change', () => {
      loadRevenueChart(parseInt(chartDaysSelect.value));
    });
  }
  
  // Export CSV dropdown toggle
  const btnExportCSV = document.getElementById('btnExportCSV');
  const exportDropdownMenu = document.getElementById('exportDropdownMenu');
  
  if (btnExportCSV && exportDropdownMenu) {
    btnExportCSV.addEventListener('click', (e) => {
      e.stopPropagation();
      btnExportCSV.classList.toggle('active');
      exportDropdownMenu.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.export-dropdown-wrapper')) {
        btnExportCSV.classList.remove('active');
        exportDropdownMenu.classList.remove('active');
      }
    });
    
    // Export menu items
    document.querySelectorAll('.export-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const exportType = item.getAttribute('data-export');
        exportStatisticsCSV(exportType);
        btnExportCSV.classList.remove('active');
        exportDropdownMenu.classList.remove('active');
      });
    });
  }
}

// ===================================
// Load Statistics Data
// ===================================
async function loadStatisticsData() {
  // Show loading state
  document.querySelectorAll('.stats-card').forEach(card => card.classList.add('loading'));
  
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    
    // Load revenue stats for selected period
    const revenueRes = await fetch(`${API_BASE_URL}/statistics/revenue?period=${currentStatsPeriod}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (revenueRes.ok) {
      const data = await revenueRes.json();
      updateOverviewStats(data.stats);
    }
    
    // Load charts
    loadRevenueChart(30);
    loadPopularRoutesChart();
    
    // Load tables
    loadPopularRoutesTable();
    loadTopCustomersTable();
    
  } catch (error) {
    console.error('Error loading statistics:', error);
    Toast.error('Không thể tải dữ liệu thống kê');
  }
}

// ===================================
// Update Overview Stats
// ===================================
function updateOverviewStats(stats) {
  document.querySelectorAll('.stats-card').forEach(card => card.classList.remove('loading'));
  
  const totalRevenueEl = document.getElementById('totalRevenue');
  const totalBookingsEl = document.getElementById('totalBookings');
  const totalTicketsEl = document.getElementById('totalTickets');
  const avgPriceEl = document.getElementById('avgPrice');
  
  if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(stats.total_revenue || 0);
  if (totalBookingsEl) totalBookingsEl.textContent = (stats.total_bookings || 0).toLocaleString();
  if (totalTicketsEl) totalTicketsEl.textContent = (stats.total_tickets || 0).toLocaleString();
  if (avgPriceEl) avgPriceEl.textContent = formatCurrency(stats.average_ticket_price || 0);
}

// ===================================
// Load Revenue Chart
// ===================================
async function loadRevenueChart(days) {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/statistics/revenue/daily?days=${days}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load chart data');
    
    const data = await response.json();
    
    const labels = data.daily_data.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    });
    
    const revenues = data.daily_data.map(d => d.revenue / 1000000); // Convert to millions
    
    const ctx = document.getElementById('revenueLineChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (revenueLineChart) {
      revenueLineChart.destroy();
    }
    
    revenueLineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Doanh thu (triệu đồng)',
          data: revenues,
          borderColor: '#FF6600',
          backgroundColor: 'rgba(255, 102, 0, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: days <= 14 ? 5 : 0,
          pointBackgroundColor: '#FF6600',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            callbacks: {
              label: function(context) {
                return `Doanh thu: ${context.parsed.y.toFixed(2)}M VNĐ`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: {
              callback: function(value) { return value + 'M'; }
            }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Error loading revenue chart:', error);
  }
}

// ===================================
// Load Popular Routes Chart
// ===================================
async function loadPopularRoutesChart() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/statistics/routes/popular?period=${currentStatsPeriod}&limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load routes data');
    
    const data = await response.json();
    
    const labels = data.routes.map(r => `${r.diemDi} → ${r.diemDen}`);
    const values = data.routes.map(r => r.total_bookings);
    
    const ctx = document.getElementById('routesPieChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (routesPieChart) {
      routesPieChart.destroy();
    }
    
    routesPieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: [
            '#FF6600',
            '#667eea',
            '#11998e',
            '#f093fb',
            '#4facfe'
          ],
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              font: { size: 11 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.parsed} đơn (${percentage}%)`;
              }
            }
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Error loading routes chart:', error);
  }
}

// ===================================
// Load Popular Routes Table
// ===================================
async function loadPopularRoutesTable() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/statistics/routes/popular?period=${currentStatsPeriod}&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load routes data');
    
    const data = await response.json();
    const tableBody = document.getElementById('popularRoutesTable');
    
    if (!data.routes || data.routes.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" class="loading-cell">Chưa có dữ liệu</td></tr>';
      return;
    }
    
    // Calculate total for percentage
    const totalBookings = data.routes.reduce((sum, r) => sum + r.total_bookings, 0);
    
    tableBody.innerHTML = data.routes.map((route, index) => {
      const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'normal';
      const percentage = ((route.total_bookings / totalBookings) * 100).toFixed(1);
      
      return `
        <tr>
          <td><span class="rank-badge ${rankClass}">${index + 1}</span></td>
          <td>
            <div class="route-name">
              <span>${route.diemDi}</span>
              <span class="route-arrow">→</span>
              <span>${route.diemDen}</span>
            </div>
          </td>
          <td><strong>${route.total_bookings}</strong></td>
          <td>${route.total_tickets}</td>
          <td><strong>${formatCurrency(route.total_revenue)}</strong></td>
          <td>
            <div class="percentage-bar">
              <div class="bar-container">
                <div class="bar-fill" style="width: ${percentage}%"></div>
              </div>
              <span class="bar-value">${percentage}%</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading routes table:', error);
    document.getElementById('popularRoutesTable').innerHTML = 
      '<tr><td colspan="6" class="loading-cell">Không thể tải dữ liệu</td></tr>';
  }
}

// ===================================
// Load Top Customers Table
// ===================================
async function loadTopCustomersTable() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/statistics/customers/top?period=${currentStatsPeriod}&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load customers data');
    
    const data = await response.json();
    const tableBody = document.getElementById('topCustomersTable');
    
    if (!data.customers || data.customers.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" class="loading-cell">Chưa có dữ liệu</td></tr>';
      return;
    }
    
    tableBody.innerHTML = data.customers.map((customer, index) => {
      const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'normal';
      
      return `
        <tr>
          <td><span class="rank-badge ${rankClass}">${index + 1}</span></td>
          <td><strong>${customer.hoTen}</strong></td>
          <td>${customer.email}</td>
          <td>${customer.total_bookings}</td>
          <td>${customer.total_tickets}</td>
          <td><strong>${formatCurrency(customer.total_spent)}</strong></td>
        </tr>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading customers table:', error);
    document.getElementById('topCustomersTable').innerHTML = 
      '<tr><td colspan="6" class="loading-cell">Không thể tải dữ liệu</td></tr>';
  }
}


// ===================================
// TRIPS MANAGEMENT MODULE
// ===================================

// Trip Management State
let tripsData = [];
let currentEditTrip = null;
let availableBuses = [];
let availableDrivers = [];

// ===================================
// Load Trips Management Page
// ===================================
function loadTripsManagementPage() {
  const content = document.querySelector('.content');
  
  content.innerHTML = `
    <div class="trips-management-page">
      <!-- Page Header -->
      <div class="trips-page-header">
        <div class="page-title-section">
          <h2><i class="fas fa-route"></i> Quản lý Lịch chạy</h2>
          <p class="page-subtitle">Quản lý và điều phối các chuyến xe theo lịch</p>
        </div>
        
        <button class="btn-add-trip" id="btnAddTrip">
          <i class="fas fa-plus-circle"></i>
          <span>Thêm lịch chạy mới</span>
        </button>
      </div>

      <!-- Stats -->
      <div class="trips-stats" id="tripsStats">
        <div class="trip-stat-card">
          <div class="trip-stat-icon total">
            <i class="fas fa-bus"></i>
          </div>
          <div class="trip-stat-info">
            <h4 id="statTotalTrips">0</h4>
            <p>Tổng lịch chạy</p>
          </div>
        </div>
        <div class="trip-stat-card">
          <div class="trip-stat-icon pending">
            <i class="fas fa-clock"></i>
          </div>
          <div class="trip-stat-info">
            <h4 id="statPendingTrips">0</h4>
            <p>Sắp khởi hành</p>
          </div>
        </div>
        <div class="trip-stat-card">
          <div class="trip-stat-icon active">
            <i class="fas fa-road"></i>
          </div>
          <div class="trip-stat-info">
            <h4 id="statActiveTrips">0</h4>
            <p>Đang chạy</p>
          </div>
        </div>
        <div class="trip-stat-card">
          <div class="trip-stat-icon completed">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="trip-stat-info">
            <h4 id="statCompletedTrips">0</h4>
            <p>Hoàn thành</p>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="trips-controls">
        <div class="trips-search">
          <i class="fas fa-search"></i>
          <input type="text" id="tripSearchInput" placeholder="Tìm kiếm theo tuyến, biển số xe...">
        </div>
        <select id="tripStatusFilter" class="status-filter">
          <option value="">Tất cả trạng thái</option>
          <option value="scheduled">Sắp khởi hành</option>
          <option value="running">Đang chạy</option>
          <option value="completed">Hoàn thành</option>
        </select>
      </div>

      <!-- Table -->
      <div class="trips-table-wrapper">
        <div class="trips-table-header">
          <i class="fas fa-table"></i>
          <span>Danh sách lịch chạy</span>
        </div>
        <table class="trips-table">
          <thead>
            <tr>
              <th>Mã lịch</th>
              <th>Tuyến đường</th>
              <th>Xe</th>
              <th>Tài xế</th>
              <th>Khởi hành</th>
              <th>Giá vé</th>
              <th>Ghế đặt</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody id="tripsTableBody">
            <tr class="loading-row">
              <td colspan="9">
                <i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Trip Modal -->
    <div class="trip-modal" id="tripModal">
      <div class="trip-modal-content">
        <div class="trip-modal-header">
          <h3 id="tripModalTitle">
            <i class="fas fa-plus-circle"></i>
            <span>Thêm lịch chạy mới</span>
          </h3>
          <button class="modal-close-btn" onclick="closeTripModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="trip-modal-body">
          <form id="tripForm">
            <!-- Chọn tuyến đường -->
            <div class="form-section">
              <h4><i class="fas fa-map-marker-alt"></i> Chọn tuyến đường</h4>
              <div class="form-group">
                <label for="tripMaCX">Tuyến đường <span class="required">*</span></label>
                <select id="tripMaCX" name="maCX" required>
                  <option value="">-- Chọn tuyến đường --</option>
                </select>
                <small class="form-hint">Chọn tuyến đường có sẵn trong hệ thống</small>
              </div>
              <div id="routeInfo" class="route-info-box" style="display: none;">
                <div class="route-display">
                  <span id="routeDiemDi">-</span>
                  <i class="fas fa-arrow-right"></i>
                  <span id="routeDiemDen">-</span>
                </div>
                <div class="route-details">
                  <span><i class="fas fa-road"></i> <span id="routeQuangDuong">0</span> km</span>
                  <span><i class="fas fa-money-bill"></i> <span id="routeGiaVe">0</span> VNĐ</span>
                </div>
              </div>
            </div>

            <!-- Thời gian -->
            <div class="form-section">
              <h4><i class="fas fa-calendar-alt"></i> Thời gian khởi hành</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="tripNgayKhoiHanh">Ngày khởi hành <span class="required">*</span></label>
                  <input type="date" id="tripNgayKhoiHanh" name="ngayKhoiHanh" required>
                </div>
                <div class="form-group">
                  <label for="tripGioKhoiHanh">Giờ khởi hành <span class="required">*</span></label>
                  <input type="time" id="tripGioKhoiHanh" name="gioKhoiHanh" value="06:00" required>
                </div>
              </div>
              <div class="form-group">
                <label for="tripThoiGianChay">Thời gian chạy dự kiến</label>
                <input type="text" id="tripThoiGianChay" name="thoiGianChay" placeholder="VD: 5 giờ" value="5 giờ">
              </div>
            </div>

            <!-- Phương tiện & Tài xế -->
            <div class="form-section">
              <h4><i class="fas fa-bus"></i> Xe & Tài xế</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="tripMaXe">Chọn xe <span class="required">*</span></label>
                  <select id="tripMaXe" name="maXe" required>
                    <option value="">-- Chọn ngày trước --</option>
                  </select>
                  <small class="form-hint">Chỉ hiển thị xe đang hoạt động và không bận</small>
                </div>
                <div class="form-group">
                  <label for="tripMaNV">Chọn tài xế <span class="required">*</span></label>
                  <select id="tripMaNV" name="maNV" required>
                    <option value="">-- Chọn ngày trước --</option>
                  </select>
                  <small class="form-hint">Chỉ hiển thị tài xế không bận</small>
                </div>
              </div>
            </div>
          </form>
        </div>
        <div class="trip-modal-footer">
          <button class="btn-modal secondary" onclick="closeTripModal()">Hủy</button>
          <button class="btn-modal primary" onclick="saveTrip()">
            <i class="fas fa-save"></i> Xác nhận
          </button>
        </div>
      </div>
    </div>

    <!-- Trip Detail Modal -->
    <div class="trip-detail-modal" id="tripDetailModal">
      <div class="trip-detail-content">
        <div class="trip-detail-header">
          <h3><i class="fas fa-info-circle"></i> Chi tiết lịch chạy</h3>
          <button class="modal-close-btn" onclick="closeTripDetailModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="trip-detail-body" id="tripDetailBody"></div>
        <div class="trip-detail-footer">
          <button class="btn-modal secondary" onclick="closeTripDetailModal()">Đóng</button>
        </div>
      </div>
    </div>

    <style>
      /* Trips Management Styles */
      .trips-management-page { padding: 0; }
      
      .trips-page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        flex-wrap: wrap;
        gap: 20px;
      }
      
      .btn-add-trip {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 14px 28px;
        background: var(--primary-gradient);
        color: white;
        border: none;
        border-radius: 12px;
        font-weight: 600;
        font-size: 15px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(255, 102, 0, 0.3);
      }
      
      .btn-add-trip:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(255, 102, 0, 0.4);
      }
      
      .trips-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 25px;
      }
      
      .trip-stat-card {
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        display: flex;
        align-items: center;
        gap: 15px;
      }
      
      .trip-stat-icon {
        width: 55px;
        height: 55px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: white;
      }
      
      .trip-stat-icon.total { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
      .trip-stat-icon.pending { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
      .trip-stat-icon.active { background: var(--green-gradient); }
      .trip-stat-icon.completed { background: var(--orange-gradient); }
      
      .trip-stat-info h4 {
        font-size: 28px;
        font-weight: 700;
        color: #333;
        margin: 0;
      }
      
      .trip-stat-info p {
        font-size: 13px;
        color: #666;
        margin: 0;
      }
      
      .trips-controls {
        display: flex;
        gap: 15px;
        margin-bottom: 25px;
        flex-wrap: wrap;
      }
      
      .trips-search {
        flex: 1;
        min-width: 300px;
        position: relative;
      }
      
      .trips-search input {
        width: 100%;
        padding: 12px 15px 12px 45px;
        border: 2px solid #e2e8f0;
        border-radius: 10px;
        font-size: 14px;
      }
      
      .trips-search input:focus {
        outline: none;
        border-color: var(--primary-color);
      }
      
      .trips-search i {
        position: absolute;
        left: 15px;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8;
      }
      
      .trips-table-wrapper {
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        overflow: hidden;
      }
      
      .trips-table-header {
        padding: 20px 25px;
        background: var(--primary-gradient);
        color: white;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 18px;
        font-weight: 600;
      }
      
      .trips-table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .trips-table thead { background: #f8fafc; }
      
      .trips-table th {
        padding: 15px 15px;
        text-align: left;
        font-weight: 600;
        color: #475569;
        font-size: 12px;
        text-transform: uppercase;
        border-bottom: 2px solid #e2e8f0;
      }
      
      .trips-table td {
        padding: 15px 15px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 14px;
        color: #334155;
      }
      
      .trips-table tbody tr:hover { background: #f8fafc; }
      
      .trip-route {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .trip-route .from-to {
        font-weight: 600;
        color: #333;
      }
      
      .trip-route .distance {
        font-size: 12px;
        color: #666;
      }
      
      .trip-status-badge {
        display: inline-block;
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
      }
      
      .trip-status-badge.pending { background: rgba(255, 152, 0, 0.15); color: #ff9800; }
      .trip-status-badge.active { background: rgba(76, 175, 80, 0.15); color: #4caf50; }
      .trip-status-badge.completed { background: rgba(158, 158, 158, 0.15); color: #9e9e9e; }
      
      .trips-actions {
        display: flex;
        gap: 8px;
      }
      
      .btn-trip-action {
        padding: 6px 12px;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .btn-trip-action.view {
        background: rgba(102, 126, 234, 0.15);
        color: #667eea;
      }
      
      .btn-trip-action.cancel {
        background: rgba(244, 67, 54, 0.15);
        color: #f44336;
      }
      
      .btn-trip-action:hover {
        transform: translateY(-2px);
      }
      
      /* Trip Modal */
      .trip-modal, .trip-detail-modal {
        display: none;
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6);
        z-index: 2000;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      
      .trip-modal.active, .trip-detail-modal.active { display: flex; }
      
      .trip-modal-content, .trip-detail-content {
        background: white;
        border-radius: 16px;
        width: 100%;
        max-width: 700px;
        max-height: 90vh;
        overflow: hidden;
        box-shadow: 0 25px 60px rgba(0,0,0,0.3);
        animation: modalSlideIn 0.3s ease;
      }
      
      .trip-modal-header, .trip-detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        background: var(--primary-gradient);
        color: white;
      }
      
      .trip-modal-header h3, .trip-detail-header h3 {
        margin: 0;
        font-size: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .trip-modal-body, .trip-detail-body {
        padding: 24px;
        max-height: 60vh;
        overflow-y: auto;
      }
      
      .trip-modal-footer, .trip-detail-footer {
        padding: 16px 24px;
        background: #f8fafc;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        border-top: 1px solid #e2e8f0;
      }
      
      .form-section {
        margin-bottom: 24px;
      }
      
      .form-section h4 {
        font-size: 16px;
        color: var(--primary-color);
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 2px solid #f0f0f0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .form-group label {
        font-size: 13px;
        font-weight: 600;
        color: #475569;
      }
      
      .form-group .required {
        color: #f44336;
      }
      
      .form-group input, .form-group select {
        padding: 12px 14px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
        transition: border-color 0.2s;
      }
      
      .form-group input:focus, .form-group select:focus {
        outline: none;
        border-color: var(--primary-color);
      }
      
      .form-hint {
        font-size: 11px;
        color: #94a3b8;
      }
      
      .btn-modal {
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .btn-modal.primary {
        background: var(--primary-gradient);
        color: white;
      }
      
      .btn-modal.secondary {
        background: #e2e8f0;
        color: #475569;
      }
      
      .btn-modal:hover {
        transform: translateY(-2px);
      }
      
      /* Trip Detail */
      .trip-info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        margin-bottom: 24px;
      }
      
      .trip-info-item {
        padding: 16px;
        background: #f8fafc;
        border-radius: 10px;
      }
      
      .trip-info-item label {
        display: block;
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
      }
      
      .trip-info-item span {
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }
      
      .trip-route-display {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        text-align: center;
        margin-bottom: 24px;
      }
      
      .trip-route-display .route-text {
        font-size: 24px;
        font-weight: 700;
      }
      
      .trip-route-display .route-arrow {
        margin: 0 15px;
      }
      
      .loading-row td {
        text-align: center;
        padding: 40px;
        color: #666;
      }
      
      .empty-row td {
        text-align: center;
        padding: 40px;
        color: #999;
      }
      
      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: translateY(-30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    </style>
  `;

  // Setup event listeners
  setupTripsEvents();
  
  // Load data
  loadTripsData();
  loadTripsStats();
}

// ===================================
// Setup Trips Events
// ===================================
function setupTripsEvents() {
  // Add trip button
  const btnAddTrip = document.getElementById('btnAddTrip');
  if (btnAddTrip) {
    btnAddTrip.addEventListener('click', () => openAddTripModal());
  }

  // Search
  const tripSearchInput = document.getElementById('tripSearchInput');
  if (tripSearchInput) {
    tripSearchInput.addEventListener('input', (e) => filterTrips(e.target.value));
  }

  // Status filter
  const tripStatusFilter = document.getElementById('tripStatusFilter');
  if (tripStatusFilter) {
    tripStatusFilter.addEventListener('change', (e) => filterTripsByStatus(e.target.value));
  }

  // Date change to load available buses/drivers
  const tripNgayKhoiHanh = document.getElementById('tripNgayKhoiHanh');
  if (tripNgayKhoiHanh) {
    tripNgayKhoiHanh.addEventListener('change', (e) => {
      if (e.target.value) {
        loadAvailableBusesAndDrivers(e.target.value);
      }
    });
  }
}

// ===================================
// Load Trips Data
// ===================================
async function loadTripsData() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/admin/trips`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load trips');
    
    const data = await response.json();
    console.log('Trips data:', data);
    
    tripsData = data;
    renderTripsTable(data);
  } catch (error) {
    console.error('Error loading trips:', error);
    Toast.error('Không thể tải danh sách chuyến xe');
    renderEmptyTripsTable('Không thể tải dữ liệu');
  }
}

// ===================================
// Load Trips Stats
// ===================================
async function loadTripsStats() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/admin/trips/stats/overview`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to load stats');
    
    const stats = await response.json();
    
    document.getElementById('statTotalTrips').textContent = stats.total_trips || 0;
    document.getElementById('statPendingTrips').textContent = stats.pending_trips || 0;
    document.getElementById('statActiveTrips').textContent = stats.active_trips || 0;
    document.getElementById('statCompletedTrips').textContent = stats.completed_trips || 0;
  } catch (error) {
    console.error('Error loading trips stats:', error);
  }
}

// ===================================
// Render Trips Table (lichChay-based)
// ===================================
function renderTripsTable(trips) {
  const tableBody = document.getElementById('tripsTableBody');
  if (!tableBody) return;
  
  if (!trips || trips.length === 0) {
    renderEmptyTripsTable('Chưa có lịch chạy nào');
    return;
  }

  tableBody.innerHTML = trips.map(trip => {
    const statusClass = trip.trangThai || 'scheduled';
    const statusText = trip.trangThai === 'completed' ? 'Hoàn thành' :
                       trip.trangThai === 'running' ? 'Đang chạy' : 
                       trip.trangThai === 'cancelled' ? 'Đã hủy' : 'Sắp khởi hành';
    
    const busInfo = trip.xeInfo ? `${trip.xeInfo.bienSoXe || trip.maXe}` : trip.maXe;
    const driverInfo = trip.taiXeInfo ? trip.taiXeInfo.hoTen : 'N/A';
    
    // Get route info from chuyenXeInfo
    const routeInfo = trip.chuyenXeInfo || {};
    const diemDi = routeInfo.diemDi || 'N/A';
    const diemDen = routeInfo.diemDen || 'N/A';
    const giaVe = routeInfo.giaChuyenXe || 0;
    
    // Format departure date/time
    let departureStr = 'N/A';
    if (trip.ngayKhoiHanh && trip.gioKhoiHanh) {
      departureStr = `${trip.ngayKhoiHanh} ${trip.gioKhoiHanh}`;
    } else if (trip.ngayKhoiHanh) {
      departureStr = trip.ngayKhoiHanh;
    }
    
    // Get booked seats count
    const soGheDaDat = trip.gheDaDat ? trip.gheDaDat.length : 0;
    const canCancel = trip.trangThai === 'scheduled' && soGheDaDat === 0;
    
    return `
      <tr>
        <td><strong>${trip.maLC}</strong></td>
        <td>
          <div class="trip-route">
            <span class="from-to">${diemDi} → ${diemDen}</span>
            <span class="route-code">Tuyến: ${trip.maCX}</span>
          </div>
        </td>
        <td>${busInfo}</td>
        <td>${driverInfo}</td>
        <td>${departureStr}</td>
        <td><strong>${formatCurrency(giaVe)}</strong></td>
        <td>${soGheDaDat} / ${trip.soGheTrong + soGheDaDat}</td>
        <td><span class="trip-status-badge ${statusClass}">${statusText}</span></td>
        <td>
          <div class="trips-actions">
            <button class="btn-trip-action view" onclick="viewTripDetail('${trip.maLC}')">
              <i class="fas fa-eye"></i> Xem
            </button>
            ${canCancel ? `
              <button class="btn-trip-action cancel" onclick="cancelTrip('${trip.maLC}')">
                <i class="fas fa-times"></i> Hủy
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ===================================
// Render Empty Trips Table
// ===================================
function renderEmptyTripsTable(message) {
  const tableBody = document.getElementById('tripsTableBody');
  if (!tableBody) return;
  
  tableBody.innerHTML = `
    <tr class="empty-row">
      <td colspan="9">
        <i class="fas fa-inbox"></i> ${message}
      </td>
    </tr>
  `;
}

// ===================================
// Filter Trips (lichChay-based)
// ===================================
function filterTrips(searchTerm) {
  const lowerSearch = searchTerm.toLowerCase();
  
  const filtered = tripsData.filter(trip => {
    const routeInfo = trip.chuyenXeInfo || {};
    return (trip.maLC || '').toLowerCase().includes(lowerSearch) ||
      (trip.maCX || '').toLowerCase().includes(lowerSearch) ||
      (routeInfo.diemDi || '').toLowerCase().includes(lowerSearch) ||
      (routeInfo.diemDen || '').toLowerCase().includes(lowerSearch) ||
      (trip.xeInfo?.bienSoXe || '').toLowerCase().includes(lowerSearch) ||
      (trip.taiXeInfo?.hoTen || '').toLowerCase().includes(lowerSearch);
  });
  
  renderTripsTable(filtered);
}

// ===================================
// Filter Trips By Status
// ===================================
function filterTripsByStatus(status) {
  if (!status) {
    renderTripsTable(tripsData);
    return;
  }
  
  const filtered = tripsData.filter(trip => trip.trangThai === status);
  renderTripsTable(filtered);
}

// ===================================
// Open Add Trip Modal (lichChay-based)
// ===================================
async function openAddTripModal() {
  currentEditTrip = null;
  const modal = document.getElementById('tripModal');
  const form = document.getElementById('tripForm');
  const modalTitle = document.getElementById('tripModalTitle');
  
  if (form) form.reset();
  if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i><span>Thêm lịch chạy mới</span>';
  
  // Set min date to today
  const tripNgayKhoiHanh = document.getElementById('tripNgayKhoiHanh');
  if (tripNgayKhoiHanh) {
    const today = new Date().toISOString().split('T')[0];
    tripNgayKhoiHanh.min = today;
    tripNgayKhoiHanh.value = '';
  }
  
  // Clear bus/driver selects
  document.getElementById('tripMaXe').innerHTML = '<option value="">-- Chọn ngày trước --</option>';
  document.getElementById('tripMaNV').innerHTML = '<option value="">-- Chọn ngày trước --</option>';
  
  // Clear route info
  const routeInfoBox = document.getElementById('routeInfoBox');
  if (routeInfoBox) routeInfoBox.style.display = 'none';
  
  // Load routes into selector
  await loadRoutesForSelect();
  
  modal.classList.add('active');
}

// ===================================
// Load Routes for Select (chuyenXe templates)
// ===================================
async function loadRoutesForSelect() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/admin/trips/routes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Failed to load routes');
    
    const routes = await response.json();
    const routeSelect = document.getElementById('tripMaCX');
    
    if (!routeSelect) return;
    
    routeSelect.innerHTML = '<option value="">-- Chọn tuyến đường --</option>' +
      routes.map(route => 
        `<option value="${route.maCX}" 
          data-diemdi="${route.diemDi}" 
          data-diemden="${route.diemDen}" 
          data-gia="${route.giaChuyenXe || 0}">
          ${route.diemDi} → ${route.diemDen} (${route.maCX})
        </option>`
      ).join('');
    
    // Add change event to show route info
    routeSelect.addEventListener('change', (e) => {
      const selectedOption = e.target.selectedOptions[0];
      const routeInfoBox = document.getElementById('routeInfoBox');
      
      if (selectedOption && selectedOption.value) {
        const diemDi = selectedOption.getAttribute('data-diemdi');
        const diemDen = selectedOption.getAttribute('data-diemden');
        const gia = selectedOption.getAttribute('data-gia');
        
        if (routeInfoBox) {
          routeInfoBox.innerHTML = `
            <strong>Tuyến:</strong> ${diemDi} → ${diemDen}<br>
            <strong>Giá vé:</strong> ${formatCurrency(parseFloat(gia) || 0)}
          `;
          routeInfoBox.style.display = 'block';
        }
      } else {
        if (routeInfoBox) routeInfoBox.style.display = 'none';
      }
    });
  } catch (error) {
    console.error('Error loading routes:', error);
    Toast.error('Không thể tải danh sách tuyến đường');
  }
}

// ===================================
// Load Available Buses and Drivers (lichChay-based)
// ===================================
async function loadAvailableBusesAndDrivers(dateStr) {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  // Send date in YYYY-MM-DD format
  const formattedDate = dateStr; // Already in YYYY-MM-DD from input type="date"
  
  try {
    // Load available buses
    const busResponse = await fetch(`${API_BASE_URL}/admin/trips/available-buses?ngayKhoiHanh=${encodeURIComponent(formattedDate)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (busResponse.ok) {
      availableBuses = await busResponse.json();
      const busSelect = document.getElementById('tripMaXe');
      
      if (availableBuses.length === 0) {
        busSelect.innerHTML = '<option value="">-- Không có xe khả dụng --</option>';
      } else {
        busSelect.innerHTML = '<option value="">-- Chọn xe --</option>' +
          availableBuses.map(bus => 
            `<option value="${bus.maXe}">${bus.bienSoXe} - ${bus.loaiXe || 'N/A'} (${bus.soGhe || bus.soChoNgoi || 0} chỗ)</option>`
          ).join('');
      }
    }
    
    // Load available drivers
    const driverResponse = await fetch(`${API_BASE_URL}/admin/trips/available-drivers?ngayKhoiHanh=${encodeURIComponent(formattedDate)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (driverResponse.ok) {
      availableDrivers = await driverResponse.json();
      const driverSelect = document.getElementById('tripMaNV');
      
      if (availableDrivers.length === 0) {
        driverSelect.innerHTML = '<option value="">-- Không có tài xế khả dụng --</option>';
      } else {
        driverSelect.innerHTML = '<option value="">-- Chọn tài xế --</option>' +
          availableDrivers.map(driver => 
            `<option value="${driver.maNV}">${driver.hoTen} (${driver.SDT || 'N/A'})</option>`
          ).join('');
      }
    }
  } catch (error) {
    console.error('Error loading available resources:', error);
    Toast.error('Không thể tải danh sách xe/tài xế khả dụng');
  }
}

// ===================================
// Save Trip (lichChay-based)
// ===================================
async function saveTrip() {
  const form = document.getElementById('tripForm');
  
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const maCX = document.getElementById('tripMaCX').value;
  const maXe = document.getElementById('tripMaXe').value;
  const maNV = document.getElementById('tripMaNV').value;
  const ngayKhoiHanh = document.getElementById('tripNgayKhoiHanh').value;
  const gioKhoiHanh = document.getElementById('tripGioKhoiHanh').value;
  const thoiGianChay = document.getElementById('tripThoiGianChay').value.trim() || '5 giờ';
  
  // Validate
  if (!maCX) {
    Toast.error('Vui lòng chọn tuyến đường!');
    return;
  }
  
  if (!ngayKhoiHanh) {
    Toast.error('Vui lòng chọn ngày khởi hành!');
    return;
  }
  
  if (!gioKhoiHanh) {
    Toast.error('Vui lòng chọn giờ khởi hành!');
    return;
  }
  
  if (!maXe) {
    Toast.error('Vui lòng chọn xe!');
    return;
  }
  
  if (!maNV) {
    Toast.error('Vui lòng chọn tài xế!');
    return;
  }
  
  const tripData = {
    maCX: maCX,
    maXe: maXe,
    maNV: maNV,
    ngayKhoiHanh: ngayKhoiHanh,   // YYYY-MM-DD
    gioKhoiHanh: gioKhoiHanh,     // HH:MM
    thoiGianChay: thoiGianChay
  };
  
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/admin/trips`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tripData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Có lỗi xảy ra');
    }
    
    Toast.success('Tạo lịch chạy thành công!');
    closeTripModal();
    
    // Reload data
    await loadTripsData();
    await loadTripsStats();
    
  } catch (error) {
    console.error('Error saving trip:', error);
    Toast.error(error.message || 'Không thể tạo lịch chạy');
  }
}

// ===================================
// View Trip Detail (lichChay-based)
// ===================================
async function viewTripDetail(maLC) {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/admin/trips/${maLC}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Failed to load trip detail');
    
    const trip = await response.json();
    
    const modal = document.getElementById('tripDetailModal');
    const body = document.getElementById('tripDetailBody');
    
    // Get route info
    const routeInfo = trip.chuyenXeInfo || {};
    const diemDi = routeInfo.diemDi || 'N/A';
    const diemDen = routeInfo.diemDen || 'N/A';
    const giaVe = routeInfo.giaChuyenXe || 0;
    
    // Format departure
    let departureStr = 'N/A';
    if (trip.ngayKhoiHanh && trip.gioKhoiHanh) {
      departureStr = `${trip.ngayKhoiHanh} lúc ${trip.gioKhoiHanh}`;
    }
    
    const statusText = trip.trangThai === 'completed' ? 'Hoàn thành' :
                       trip.trangThai === 'running' ? 'Đang chạy' : 
                       trip.trangThai === 'cancelled' ? 'Đã hủy' : 'Sắp khởi hành';
    
    const soGheDaDat = trip.gheDaDat ? trip.gheDaDat.length : 0;
    const tongGhe = trip.soGheTrong + soGheDaDat;
    
    body.innerHTML = `
      <div class="trip-route-display">
        <span class="route-text">
          ${diemDi} <span class="route-arrow">→</span> ${diemDen}
        </span>
      </div>
      
      <div class="trip-info-grid">
        <div class="trip-info-item">
          <label>Mã lịch chạy</label>
          <span>${trip.maLC}</span>
        </div>
        <div class="trip-info-item">
          <label>Mã tuyến</label>
          <span>${trip.maCX}</span>
        </div>
        <div class="trip-info-item">
          <label>Trạng thái</label>
          <span class="trip-status-badge ${trip.trangThai || 'scheduled'}">${statusText}</span>
        </div>
        <div class="trip-info-item">
          <label>Khởi hành</label>
          <span>${departureStr}</span>
        </div>
        <div class="trip-info-item">
          <label>Thời gian chạy</label>
          <span>${trip.thoiGianChay || 'N/A'}</span>
        </div>
        <div class="trip-info-item">
          <label>Xe</label>
          <span>${trip.xeInfo?.bienSoXe || trip.maXe} (${trip.xeInfo?.loaiXe || 'N/A'})</span>
        </div>
        <div class="trip-info-item">
          <label>Tài xế</label>
          <span>${trip.taiXeInfo?.hoTen || 'N/A'} ${trip.taiXeInfo?.SDT ? '(' + trip.taiXeInfo.SDT + ')' : ''}</span>
        </div>
        <div class="trip-info-item">
          <label>Giá vé</label>
          <span style="color: var(--primary-color); font-weight: 700;">${formatCurrency(giaVe)}</span>
        </div>
        <div class="trip-info-item">
          <label>Ghế đã đặt</label>
          <span>${soGheDaDat} / ${tongGhe} ghế</span>
        </div>
        ${trip.gheDaDat && trip.gheDaDat.length > 0 ? `
        <div class="trip-info-item" style="grid-column: 1 / -1;">
          <label>Danh sách ghế đã đặt</label>
          <span>${trip.gheDaDat.join(', ')}</span>
        </div>
        ` : ''}
      </div>
    `;
    
    modal.classList.add('active');
    
  } catch (error) {
    console.error('Error loading trip detail:', error);
    Toast.error('Không thể tải chi tiết lịch chạy');
  }
}

// ===================================
// Cancel Trip (lichChay-based)
// ===================================
async function cancelTrip(maLC) {
  const trip = tripsData.find(t => t.maLC === maLC);
  if (!trip) return;
  
  // Get route info
  const routeInfo = trip.chuyenXeInfo || {};
  const diemDi = routeInfo.diemDi || 'N/A';
  const diemDen = routeInfo.diemDen || 'N/A';
  
  // Kiểm tra ghế đã đặt
  const soGheDaDat = trip.gheDaDat ? trip.gheDaDat.length : 0;
  if (soGheDaDat > 0) {
    Toast.error(`Không thể hủy lịch chạy này vì đã có ${soGheDaDat} ghế được đặt!`);
    return;
  }
  
  const confirmed = await Modal.confirm(
    `Bạn có chắc chắn muốn hủy lịch chạy ${diemDi} → ${diemDen} (${trip.ngayKhoiHanh} ${trip.gioKhoiHanh})?`,
    'Xác nhận hủy lịch chạy',
    'warning'
  );
  
  if (!confirmed) return;
  
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/admin/trips/${maLC}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Có lỗi xảy ra');
    }
    
    Toast.success('Đã hủy lịch chạy thành công!');
    
    // Reload data
    await loadTripsData();
    await loadTripsStats();
    
  } catch (error) {
    console.error('Error canceling trip:', error);
    Toast.error(error.message || 'Không thể hủy lịch chạy');
  }
}

// ===================================
// Close Trip Modal
// ===================================
function closeTripModal() {
  const modal = document.getElementById('tripModal');
  if (modal) modal.classList.remove('active');
  currentEditTrip = null;
}

// ===================================
// Close Trip Detail Modal
// ===================================
function closeTripDetailModal() {
  const modal = document.getElementById('tripDetailModal');
  if (modal) modal.classList.remove('active');
}

// ===================================
// Export Statistics CSV with UTF-8
// ===================================
async function exportStatisticsCSV(type) {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    let url = '';
    let filename = '';
    
    // Determine endpoint and filename based on type and period
    const periodText = getPeriodText(currentStatsPeriod);
    const dateStr = formatDateForFilename();
    
    switch(type) {
      case 'invoices':
        url = `${API_BASE_URL}/statistics/export/invoices?period=${currentStatsPeriod}`;
        filename = `hoa_don_${periodText}_${dateStr}.csv`;
        break;
      case 'tickets':
        url = `${API_BASE_URL}/statistics/export/tickets?period=${currentStatsPeriod}`;
        filename = `ve_xe_${periodText}_${dateStr}.csv`;
        break;
      case 'revenue':
        url = `${API_BASE_URL}/statistics/export/revenue`;
        filename = `doanh_thu_${dateStr}.csv`;
        break;
      case 'customers':
        url = `${API_BASE_URL}/statistics/export/customers?period=${currentStatsPeriod}`;
        filename = `khach_hang_${periodText}_${dateStr}.csv`;
        break;
      case 'routes':
        url = `${API_BASE_URL}/statistics/export/routes?period=${currentStatsPeriod}`;
        filename = `tuyen_xe_${periodText}_${dateStr}.csv`;
        break;
      default:
        Toast.error('Loại xuất không hợp lệ');
        return;
    }
    
    Toast.info('Đang chuẩn bị file xuất CSV...');
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Không thể xuất dữ liệu');
    }
    
    // Get the CSV content with UTF-8 BOM
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
    
    Toast.success(`Xuất file CSV thành công! (${filename})`);
    
  } catch (error) {
    console.error('Export CSV error:', error);
    Toast.error(error.message || 'Không thể xuất file CSV');
  }
}

// ===================================
// Get Period Text for Filename
// ===================================
function getPeriodText(period) {
  const periodMap = {
    'today': 'hom_nay',
    'week': 'tuan_nay',
    'month': 'thang_nay',
    'year': 'nam_nay'
  };
  return periodMap[period] || 'tong_quat';
}

// ===================================
// Format Date for Filename
// ===================================
function formatDateForFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Make functions globally accessible
window.viewTripDetail = viewTripDetail;
window.cancelTrip = cancelTrip;
window.closeTripModal = closeTripModal;
window.closeTripDetailModal = closeTripDetailModal;
window.saveTrip = saveTrip;
