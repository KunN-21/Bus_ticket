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
  const role = localStorage.getItem("role");

  console.log("Auth Check:", { token: !!token, userType, role }); // Debug log

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
    document.getElementById("totalRevenue").textContent = "123M";
  }, 1500);
}

// Animate numbers counting up
function animateNumber(elementId, targetNumber, duration) {
  const element = document.getElementById(elementId);
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
  const revenueCtx = document.getElementById("revenueChart").getContext("2d");
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

  // Top Routes Chart (Doughnut)
  const routesCtx = document.getElementById("routesChart").getContext("2d");
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
      Toast.info("Chức năng Quản lý Người dùng đang được phát triển");
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
