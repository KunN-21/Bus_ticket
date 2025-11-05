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
      Toast.info("Chức năng Quản lý Vé đang được phát triển");
      break;
    case "users":
      loadUserManagementPage();
      break;
    case "seats":
      Toast.info("Chức năng Quản lý Ghế đang được phát triển");
      break;
    case "revenue":
      Toast.info("Chức năng Báo cáo Doanh thu đang được phát triển");
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
  
  const confirmed = confirm(`Bạn có chắc chắn muốn xóa khách hàng "${customer.hoTen}"?`);
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
  
  const confirmed = confirm(`Bạn có chắc chắn muốn xóa nhân viên "${employee.hoTen}"?`);
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
