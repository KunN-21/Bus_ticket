// Lịch trình xe - Schedule page script

const API_URL = 'http://localhost:8000';
let allRoutes = [];
let filteredRoutes = [];

// Load all routes on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllRoutes();
    populateFilters();
});

// Swap locations function
function swapLocations() {
    const fromSelect = document.getElementById('filterFrom');
    const toSelect = document.getElementById('filterTo');
    
    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;
    
    console.log('🔄 Đã đổi chiều: ' + toSelect.value + ' → ' + fromSelect.value);
}

// Filter by time function
function filterByTime() {
    // Get all checked time filters
    const timeCheckboxes = document.querySelectorAll('.time-option input[type="checkbox"]:checked');
    const selectedTimes = Array.from(timeCheckboxes).map(cb => cb.value);
    
    // If no time filter selected, show all filtered routes
    if (selectedTimes.length === 0) {
        displayRoutes(filteredRoutes);
        console.log('⏰ Không có bộ lọc thời gian, hiển thị tất cả');
        return;
    }
    
    // Filter routes by time
    const timeFilteredRoutes = filteredRoutes.filter(route => {
        if (!route.thoiGianXuatBen) return false;
        
        // Parse time (format: "HH:MM" or "HH:MM:SS")
        const timeParts = route.thoiGianXuatBen.split(':');
        const hour = parseInt(timeParts[0]);
        
        // Check against selected time ranges
        return selectedTimes.some(timeRange => {
            switch(timeRange) {
                case 'early-morning': // 00:00 - 06:00
                    return hour >= 0 && hour < 6;
                case 'morning': // 06:00 - 12:00
                    return hour >= 6 && hour < 12;
                case 'afternoon': // 12:00 - 18:00
                    return hour >= 12 && hour < 18;
                case 'evening': // 18:00 - 24:00
                    return hour >= 18 && hour < 24;
                default:
                    return false;
            }
        });
    });
    
    displayRoutes(timeFilteredRoutes);
    console.log(`⏰ Lọc theo thời gian: ${timeFilteredRoutes.length}/${filteredRoutes.length} tuyến`);
    
    // Show no results if needed
    const noResults = document.getElementById('noResults');
    const routesGrid = document.getElementById('routesGrid');
    if (timeFilteredRoutes.length === 0) {
        noResults.style.display = 'block';
        routesGrid.innerHTML = '';
    } else {
        noResults.style.display = 'none';
    }
}

// Load all routes from API
async function loadAllRoutes() {
    const loading = document.getElementById('loading');
    const noResults = document.getElementById('noResults');
    const routesGrid = document.getElementById('routesGrid');

    try {
        loading.style.display = 'block';
        noResults.style.display = 'none';
        routesGrid.innerHTML = '';

        const response = await fetch(`${API_URL}/routes/all`);
        
        if (!response.ok) {
            throw new Error('Không thể tải danh sách tuyến xe');
        }

        allRoutes = await response.json();
        filteredRoutes = [...allRoutes];

        loading.style.display = 'none';

        if (allRoutes.length === 0) {
            noResults.style.display = 'block';
        } else {
            displayRoutes(filteredRoutes);
        }

        console.log(`✅ Đã tải ${allRoutes.length} tuyến xe`);
    } catch (error) {
        console.error('Error loading routes:', error);
        loading.style.display = 'none';
        noResults.style.display = 'block';
        
        if (typeof Toast !== 'undefined') {
            Toast.error('Không thể tải danh sách tuyến xe. Vui lòng thử lại sau.', 'Lỗi');
        }
    }
}

// Populate filter dropdowns with unique values
function populateFilters() {
    const fromSet = new Set();
    const toSet = new Set();
    const vehicleSet = new Set();

    allRoutes.forEach(route => {
        if (route.diemDi) fromSet.add(route.diemDi);
        if (route.diemDen) toSet.add(route.diemDen);
        if (route.xe && route.xe.loaiXe) vehicleSet.add(route.xe.loaiXe);
    });

    // Populate From filter
    const filterFrom = document.getElementById('filterFrom');
    Array.from(fromSet).sort().forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        filterFrom.appendChild(option);
    });

    // Populate To filter
    const filterTo = document.getElementById('filterTo');
    Array.from(toSet).sort().forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        filterTo.appendChild(option);
    });

    // Populate Vehicle filter
    const filterVehicle = document.getElementById('filterVehicle');
    Array.from(vehicleSet).sort().forEach(vehicle => {
        const option = document.createElement('option');
        option.value = vehicle;
        option.textContent = vehicle;
        filterVehicle.appendChild(option);
    });
}

// Apply filters
function applyFilter(event) {
    // Prevent form submission if called from form submit
    if (event) {
        event.preventDefault();
    }
    
    const from = document.getElementById('filterFrom').value;
    const to = document.getElementById('filterTo').value;
    const vehicle = document.getElementById('filterVehicle').value;

    filteredRoutes = allRoutes.filter(route => {
        const matchFrom = !from || route.diemDi === from;
        const matchTo = !to || route.diemDen === to;
        const matchVehicle = !vehicle || (route.xe && route.xe.loaiXe === vehicle);
        
        return matchFrom && matchTo && matchVehicle;
    });

    const noResults = document.getElementById('noResults');
    const routesGrid = document.getElementById('routesGrid');

    if (filteredRoutes.length === 0) {
        noResults.style.display = 'block';
        routesGrid.innerHTML = '';
    } else {
        noResults.style.display = 'none';
        // Apply time filter if any checkbox is checked
        filterByTime();
    }

    console.log(`🔍 Lọc: ${filteredRoutes.length}/${allRoutes.length} tuyến`);
}

// Reset filters
function resetFilter() {
    document.getElementById('filterFrom').value = '';
    document.getElementById('filterTo').value = '';
    document.getElementById('filterVehicle').value = '';
    
    const filterDate = document.getElementById('filterDate');
    if (filterDate) {
        filterDate.value = '';
    }
    
    // Reset time filters
    const timeCheckboxes = document.querySelectorAll('.time-option input[type="checkbox"]');
    timeCheckboxes.forEach(cb => {
        cb.checked = false;
    });
    
    filteredRoutes = [...allRoutes];
    displayRoutes(filteredRoutes);
    
    document.getElementById('noResults').style.display = 'none';
    
    console.log('🔄 Đã reset bộ lọc');
}

// Display routes in grid
function displayRoutes(routes) {
    const routesGrid = document.getElementById('routesGrid');
    routesGrid.innerHTML = '';

    routes.forEach(route => {
        const card = createRouteCard(route);
        routesGrid.appendChild(card);
    });
}

// Create route card HTML
function createRouteCard(route) {
    const card = document.createElement('div');
    card.className = 'route-card';
    card.onclick = () => viewRouteDetail(route);

    // Calculate price (if not available, estimate based on distance)
    const price = route.giaVe || (route.quangDuong * 1000);
    const formattedPrice = formatPrice(price);

    // Get time info
    const departTime = route.thoiGianXuatBen || 'N/A';
    const arrivalTime = route.thoiGianDenDuKien || 'N/A';
    const duration = route.thoiGianQuangDuong || 'N/A';
    
    // Get vehicle info (handle null/undefined xe)
    const vehicleType = (route.xe && route.xe.loaiXe) ? route.xe.loaiXe : 'Chưa có thông tin';
    const vehicleCode = (route.xe && route.xe.maXe) ? route.xe.maXe : 'N/A';

    // Total seats
    const totalSeats = route.gheNgoi ? route.gheNgoi.length : 0;

    // Schedule type
    const scheduleType = route.lichChay === 'daily' ? 'Hằng ngày' : (route.lichChay || 'Theo lịch');

    card.innerHTML = `
        <div class="route-header">
            <span class="route-code">${route.maTuyenXe}</span>
            <div class="route-status">
                <span class="status-dot"></span>
                ${scheduleType}
            </div>
        </div>

        <div class="route-direction">
            <div class="location">
                <div class="location-label">Điểm đi</div>
                <div class="location-name">${route.diemDi}</div>
            </div>
            <div class="route-arrow">→</div>
            <div class="location">
                <div class="location-label">Điểm đến</div>
                <div class="location-name">${route.diemDen}</div>
            </div>
        </div>

        <div class="route-details">
            <div class="detail-item">
                <div class="detail-icon">🕐</div>
                <div class="detail-info">
                    <div class="detail-label">Xuất bến</div>
                    <div class="detail-value">${departTime}</div>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-icon">🕐</div>
                <div class="detail-info">
                    <div class="detail-label">Đến dự kiến</div>
                    <div class="detail-value">${arrivalTime}</div>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-icon">⏱️</div>
                <div class="detail-info">
                    <div class="detail-label">Thời gian</div>
                    <div class="detail-value">${duration}</div>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-icon">📏</div>
                <div class="detail-info">
                    <div class="detail-label">Quãng đường</div>
                    <div class="detail-value">${route.quangDuong} km</div>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-icon">🚌</div>
                <div class="detail-info">
                    <div class="detail-label">Loại xe</div>
                    <div class="detail-value">${vehicleType}</div>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-icon">💺</div>
                <div class="detail-info">
                    <div class="detail-label">Số ghế</div>
                    <div class="detail-value">${totalSeats} ghế</div>
                </div>
            </div>
        </div>

        <div class="route-footer">
            <div>
                <div class="price-label">Giá vé</div>
                <div class="price">${formattedPrice}</div>
            </div>
            <button class="btn-book" onclick="bookRoute(event, '${route.maTuyenXe}')">
                Đặt vé ngay
            </button>
        </div>
    `;

    return card;
}

// View route detail
function viewRouteDetail(route) {
    console.log('📄 Xem chi tiết tuyến:', route.maTuyenXe);
    
    const details = `
🚌 Tuyến: ${route.maTuyenXe}
📍 ${route.diemDi} → ${route.diemDen}
🕐 Xuất bến: ${route.thoiGianXuatBen || 'N/A'}
🕐 Đến dự kiến: ${route.thoiGianDenDuKien || 'N/A'}
⏱️ Thời gian: ${route.thoiGianQuangDuong || 'N/A'}
📏 Quãng đường: ${route.quangDuong} km
🚌 Loại xe: ${route.xe && route.xe.loaiXe ? route.xe.loaiXe : 'Chưa có thông tin'}
💺 Số ghế: ${route.gheNgoi ? route.gheNgoi.length : 0}
💰 Giá vé: ${formatPrice(route.giaVe || (route.quangDuong * 1000))}
📅 Lịch chạy: ${route.lichChay === 'daily' ? 'Hằng ngày' : (route.lichChay || 'Theo lịch')}
    `.trim();

    if (typeof Modal !== 'undefined') {
        Modal.info(details, `Chi tiết tuyến ${route.maTuyenXe}`);
    } else if (typeof Toast !== 'undefined') {
        Toast.info(details, `Chi tiết tuyến ${route.maTuyenXe}`);
    }
}

// Book route - redirect to home page with pre-filled info
function bookRoute(event, maTuyenXe) {
    event.stopPropagation(); // Prevent card click event
    
    const route = allRoutes.find(r => r.maTuyenXe === maTuyenXe);
    
    if (!route) {
        if (typeof Toast !== 'undefined') {
            Toast.error('Không tìm thấy tuyến xe', 'Lỗi');
        }
        return;
    }

    console.log('🎫 Đặt vé cho tuyến:', maTuyenXe);

    // Store route info in sessionStorage to pre-fill booking form
    sessionStorage.setItem('selectedRoute', JSON.stringify({
        from: route.diemDi,
        to: route.diemDen,
        maTuyenXe: route.maTuyenXe
    }));

    // Redirect to home page
    window.location.href = 'index.html';
}

// Format price
function formatPrice(price) {
    if (!price) return '0 đ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}
