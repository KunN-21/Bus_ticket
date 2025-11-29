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
    // Load stats (simulate API call)
    loadStats();

    // Load recent bookings
    loadRecentBookings();

    // Load active buses
    loadActiveBuses();
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    Toast.error("Không thể tải dữ liệu dashboard. Vui lòng thử lại sau.");
  }
}

// ===================================
// Load Statistics
// ===================================
function loadStats() {
  // Simulate loading stats with animation
  animateNumber("totalUsers", 1234, 1500);
  animateNumber("totalBookings", 5678, 1500);
  animateNumber("totalBuses", 45, 1500);

  // Format revenue
  setTimeout(() => {
    const revEl = document.getElementById("totalRevenue");
    if (revEl) revEl.textContent = "123M";
  }, 1500);
}

// Animate numbers counting up
function animateNumber(elementId, targetNumber, duration) {
  const element = document.getElementById(elementId);
  if (!element) return; // defensive: element may not exist in custom layouts
  const startNumber = 0;
  const increment = targetNumber / (duration / 16); // 60 FPS
  let currentNumber = startNumber;

  const timer = setInterval(() => {
    currentNumber += increment;
    if (currentNumber >= targetNumber) {
      currentNumber = targetNumber;
      clearInterval(timer);
    }
    element.textContent = Math.floor(currentNumber).toLocaleString();
  }, 16);
}

// ===================================
// Load Recent Bookings
// ===================================
function loadRecentBookings() {
  const bookings = [
    {
      id: "BK001",
      customer: "Nguyễn Văn A",
      route: "TP.HCM - Hà Nội",
      seats: "A12, A13",
      price: "850,000đ",
      status: "completed",
      statusText: "Đã thanh toán",
      time: "2 giờ trước",
    },
    {
      id: "BK002",
      customer: "Trần Thị B",
      route: "TP.HCM - Đà Nẵng",
      seats: "B05",
      price: "450,000đ",
      status: "pending",
      statusText: "Chờ thanh toán",
      time: "3 giờ trước",
    },
    {
      id: "BK003",
      customer: "Lê Văn C",
      route: "Hà Nội - Hải Phòng",
      seats: "C08, C09",
      price: "250,000đ",
      status: "completed",
      statusText: "Đã thanh toán",
      time: "5 giờ trước",
    },
    {
      id: "BK004",
      customer: "Phạm Thị D",
      route: "TP.HCM - Nha Trang",
      seats: "A01",
      price: "350,000đ",
      status: "cancelled",
      statusText: "Đã hủy",
      time: "6 giờ trước",
    },
    {
      id: "BK005",
      customer: "Hoàng Văn E",
      route: "Đà Nẵng - Huế",
      seats: "B12, B13, B14",
      price: "450,000đ",
      status: "completed",
      statusText: "Đã thanh toán",
      time: "8 giờ trước",
    },
  ];

  const tableBody = document.getElementById("recentBookingsTable");
  if (!tableBody) return; // defensive: element may not exist in some admin layouts
  tableBody.innerHTML = bookings
    .map(
      (booking) => `
        <tr>
            <td><strong>${booking.id}</strong></td>
            <td>${booking.customer}</td>
            <td>${booking.route}</td>
            <td>${booking.seats}</td>
            <td><strong>${booking.price}</strong></td>
            <td><span class="status-badge ${booking.status}">${booking.statusText}</span></td>
            <td>${booking.time}</td>
        </tr>
    `
    )
    .join("");
}

// ===================================
// Load Active Buses
// ===================================
function loadActiveBuses() {
  const buses = [
    {
      name: "Xe số 101",
      route: "TP.HCM - Hà Nội",
      status: "active",
      statusText: "Đang chạy",
    },
    {
      name: "Xe số 205",
      route: "TP.HCM - Đà Nẵng",
      status: "active",
      statusText: "Đang chạy",
    },
    {
      name: "Xe số 312",
      route: "Hà Nội - Hải Phòng",
      status: "maintenance",
      statusText: "Bảo trì",
    },
    {
      name: "Xe số 408",
      route: "TP.HCM - Nha Trang",
      status: "active",
      statusText: "Đang chạy",
    },
    {
      name: "Xe số 516",
      route: "Đà Nẵng - Huế",
      status: "inactive",
      statusText: "Chờ khởi hành",
    },
  ];

  const busList = document.getElementById("activeBusesList");
  if (!busList) return; // defensive: skip if element missing
  busList.innerHTML = buses
    .map(
      (bus) => `
        <div class="bus-item">
            <div class="bus-info">
                <h4>${bus.name}</h4>
                <p>${bus.route}</p>
            </div>
            <div class="bus-status ${bus.status}">
                <span class="status-dot ${bus.status}"></span>
                ${bus.statusText}
            </div>
        </div>
    `
    )
    .join("");
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
      Toast.info("Chức năng Quản lý Tuyến đang được phát triển");
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
        
        <!-- Period Selector -->
        <div class="period-selector">
          <button class="period-btn" data-period="today">Hôm nay</button>
          <button class="period-btn" data-period="week">Tuần này</button>
          <button class="period-btn active" data-period="month">Tháng này</button>
          <button class="period-btn" data-period="year">Năm nay</button>
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
