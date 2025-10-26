// Admin Module JavaScript

// Toggle Sidebar
function toggleSidebar() {
  const sidebar = document.querySelector('.admin-sidebar');
  sidebar.classList.toggle('show');
}

// Initialize Submenu Toggles
document.addEventListener('DOMContentLoaded', () => {
  // Submenu toggle
  const submenuItems = document.querySelectorAll('.has-submenu');
  submenuItems.forEach(item => {
    const navTitle = item.querySelector('.nav-title');
    if (navTitle) {
      navTitle.addEventListener('click', () => {
        item.classList.toggle('active');
        const submenu = item.querySelector('.submenu');
        if (submenu) {
          submenu.classList.toggle('show');
        }
      });
    }
  });

  // Close sidebar on mobile when clicking outside
  const sidebar = document.querySelector('.admin-sidebar');
  const toggleBtn = document.querySelector('.toggle-sidebar');
  
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 1024) {
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('show');
      }
    }
  });

  // Table row selection
  const selectAllCheckbox = document.querySelector('thead input[type="checkbox"]');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
      checkboxes.forEach(cb => {
        cb.checked = e.target.checked;
      });
    });
  }
});

// Customer Management Functions
function openAddCustomerModal() {
  alert('Mở modal thêm khách hàng mới\n(Chức năng này sẽ được triển khai với backend)');
}

function viewCustomer(id) {
  console.log('Xem chi tiết khách hàng:', id);
  alert(`Xem chi tiết khách hàng ID: ${id}`);
}

function editCustomer(id) {
  console.log('Chỉnh sửa khách hàng:', id);
  alert(`Chỉnh sửa khách hàng ID: ${id}`);
}

function deleteCustomer(id) {
  if (confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
    console.log('Xóa khách hàng:', id);
    alert(`Đã xóa khách hàng ID: ${id}`);
  }
}

// Staff Management Functions
function openAddStaffModal() {
  alert('Mở modal thêm nhân viên mới\n(Chức năng này sẽ được triển khai với backend)');
}

function viewStaff(id) {
  console.log('Xem chi tiết nhân viên:', id);
  alert(`Xem chi tiết nhân viên ID: ${id}`);
}

function editStaff(id) {
  console.log('Chỉnh sửa nhân viên:', id);
  alert(`Chỉnh sửa nhân viên ID: ${id}`);
}

function deleteStaff(id) {
  if (confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
    console.log('Xóa nhân viên:', id);
    alert(`Đã xóa nhân viên ID: ${id}`);
  }
}

// Ticket Management Functions
function openAddTicketModal() {
  alert('Mở modal thêm vé mới\n(Chức năng này sẽ được triển khai với backend)');
}

function viewTicket(id) {
  console.log('Xem chi tiết vé:', id);
  alert(`Xem chi tiết vé ID: ${id}`);
}

function editTicket(id) {
  console.log('Chỉnh sửa vé:', id);
  alert(`Chỉnh sửa vé ID: ${id}`);
}

function deleteTicket(id) {
  if (confirm('Bạn có chắc chắn muốn xóa vé này?')) {
    console.log('Xóa vé:', id);
    alert(`Đã xóa vé ID: ${id}`);
  }
}

// Schedule Management Functions
function openAddScheduleModal() {
  alert('Mở modal thêm lịch trình mới\n(Chức năng này sẽ được triển khai với backend)');
}

function viewSchedule(id) {
  console.log('Xem chi tiết lịch trình:', id);
  alert(`Xem chi tiết lịch trình ID: ${id}`);
}

function editSchedule(id) {
  console.log('Chỉnh sửa lịch trình:', id);
  alert(`Chỉnh sửa lịch trình ID: ${id}`);
}

function deleteSchedule(id) {
  if (confirm('Bạn có chắc chắn muốn xóa lịch trình này?')) {
    console.log('Xóa lịch trình:', id);
    alert(`Đã xóa lịch trình ID: ${id}`);
  }
}

// Search and Filter Functions
function handleSearch(event) {
  event.preventDefault();
  const searchInput = event.target.querySelector('.search-input');
  const searchTerm = searchInput.value.trim();
  console.log('Tìm kiếm:', searchTerm);
  alert(`Tìm kiếm: ${searchTerm}\n(Chức năng này sẽ được triển khai với backend)`);
}

function handleFilterChange(filterType, value) {
  console.log(`Lọc theo ${filterType}:`, value);
  alert(`Lọc theo ${filterType}: ${value}\n(Chức năng này sẽ được triển khai với backend)`);
}

// Pagination Functions
function changePage(pageNumber) {
  console.log('Chuyển trang:', pageNumber);
  alert(`Chuyển đến trang: ${pageNumber}\n(Chức năng này sẽ được triển khai với backend)`);
}

// Logout Function
function handleLogout() {
  if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
    localStorage.removeItem('authToken');
    window.location.href = '../auth.html';
  }
}

// Check authentication
function checkAuth() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    // Tạm thời tắt redirect để xem giao diện
    // window.location.href = '../auth.html';
    console.log('Chưa đăng nhập - tạm thời bỏ qua để xem giao diện');
  }
}

// Initialize authentication check
// checkAuth(); // Tạm thời comment để xem giao diện mà không cần đăng nhập

// Export functions for global access
window.toggleSidebar = toggleSidebar;
window.openAddCustomerModal = openAddCustomerModal;
window.viewCustomer = viewCustomer;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
window.openAddStaffModal = openAddStaffModal;
window.viewStaff = viewStaff;
window.editStaff = editStaff;
window.deleteStaff = deleteStaff;
window.openAddTicketModal = openAddTicketModal;
window.viewTicket = viewTicket;
window.editTicket = editTicket;
window.deleteTicket = deleteTicket;
window.openAddScheduleModal = openAddScheduleModal;
window.viewSchedule = viewSchedule;
window.editSchedule = editSchedule;
window.deleteSchedule = deleteSchedule;
window.handleSearch = handleSearch;
window.handleFilterChange = handleFilterChange;
window.changePage = changePage;
window.handleLogout = handleLogout;
