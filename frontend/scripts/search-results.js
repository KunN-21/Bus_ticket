// API Configuration
const API_URL = 'http://localhost:8000';

// Global variables
let currentRoute = null;
let selectedSeats = [];
let ticketPrice = 0;
let searchDate = null;
let allRoutes = []; // Store all routes for filtering
let filteredRoutes = []; // Store filtered routes

// Load search results on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Get search params from URL
    const urlParams = new URLSearchParams(window.location.search);
    const diemDi = urlParams.get('from');
    const diemDen = urlParams.get('to');
    const ngayDi = urlParams.get('date');

    if (!diemDi || !diemDen || !ngayDi) {
        showNoResults();
        return;
    }

    searchDate = ngayDi;
    await searchRoutes(diemDi, diemDen, ngayDi);
});

// Filter by time function
function filterByTime() {
    // Get all checked time filters
    const timeCheckboxes = document.querySelectorAll('.time-option input[type="checkbox"]:checked');
    const selectedTimes = Array.from(timeCheckboxes).map(cb => cb.value);
    
    // If no time filter selected, show all routes
    if (selectedTimes.length === 0) {
        displayResults(allRoutes);
        console.log('⏰ Không có bộ lọc thời gian, hiển thị tất cả');
        return;
    }
    
    // Filter routes by time
    const timeFilteredRoutes = allRoutes.filter(route => {
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
    
    displayResults(timeFilteredRoutes);
    console.log(`⏰ Lọc theo thời gian: ${timeFilteredRoutes.length}/${allRoutes.length} tuyến`);
}

// Search routes
async function searchRoutes(diemDi, diemDen, ngayDi) {
    try {
        const response = await fetch(`${API_URL}/routes/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                diemDi: diemDi,
                diemDen: diemDen,
                ngayDi: ngayDi
            })
        });

        if (!response.ok) {
            throw new Error('Search failed');
        }

        const routes = await response.json();
        allRoutes = routes; // Store all routes
        filteredRoutes = routes;
        displayResults(routes);

    } catch (error) {
        console.error('Search error:', error);
        showNoResults();
    }
}

// Display search results
function displayResults(routes) {
    const loadingDiv = document.getElementById('loadingDiv');
    const resultsDiv = document.getElementById('resultsDiv');
    const noResultsDiv = document.getElementById('noResultsDiv');
    const routesList = document.getElementById('routesList');
    const resultsHeader = document.getElementById('resultsHeader');
    const resultCount = document.getElementById('resultCount');

    loadingDiv.style.display = 'none';

    if (routes.length === 0) {
        noResultsDiv.style.display = 'block';
        return;
    }

    // Show results count
    if (resultsHeader && resultCount) {
        resultCount.textContent = routes.length;
        resultsHeader.style.display = 'block';
    }

    resultsDiv.style.display = 'block';
    routesList.innerHTML = '';

    routes.forEach(route => {
        const routeCard = createRouteCard(route);
        routesList.appendChild(routeCard);
    });
}

// Create route card HTML - VeXeRe Modern Style
function createRouteCard(route) {
    const card = document.createElement('div');
    card.className = 'route-card';

    // Extract data
    const departTime = route.thoiGianXuatBen || 'N/A';
    const arrivalTime = route.thoiGianDenDuKien || 'N/A';
    const duration = route.thoiGianQuangDuong || 'N/A';
    const vehicleType = route.loaiXe || 'Xe khách';
    const seatsAvailable = route.soGheTrong || 0;
    const price = route.giaVe || 0;

    card.innerHTML = `
        <!-- Trip Header -->
        <div class="trip-header">
            <div class="trip-time-section">
                <!-- Departure -->
                <div class="trip-point">
                    <div class="trip-time">${departTime}</div>
                    <div class="trip-station">
                        <span class="dot-green"></span>
                        <span>${route.diemDi}</span>
                    </div>
                </div>

                <!-- Duration -->
                <div class="trip-duration">
                    <div class="duration-line-wrapper">
                        <div class="duration-line"></div>
                    </div>
                    <div class="duration-text">${duration}</div>
                </div>

                <!-- Arrival -->
                <div class="trip-point">
                    <div class="trip-time">${arrivalTime}</div>
                    <div class="trip-station">
                        <span class="dot-green"></span>
                        <span>${route.diemDen}</span>
                    </div>
                </div>
            </div>

            <!-- Price -->
            <div class="trip-price">
                <div class="price-amount">${formatPrice(price)}</div>
            </div>
        </div>

        <!-- Trip Info -->
        <div class="trip-info">
            <div class="trip-details">
                <span>${vehicleType}</span>
                <span>•</span>
                <span class="seats-available">${seatsAvailable} chỗ trống</span>
            </div>
        </div>

        <!-- Trip Footer -->
        <div class="trip-footer">
            <div class="trip-links">
                <a href="#">Chọn ghế</a>
                <a href="#">Lịch trình</a>
                <a href="#">Trung chuyển</a>
                <a href="#">Chính sách</a>
            </div>
            <button 
                class="btn-select-trip" 
                onclick='selectRoute(${JSON.stringify(route).replace(/'/g, "&#39;")})'
                ${seatsAvailable === 0 ? 'disabled' : ''}
            >
                ${seatsAvailable === 0 ? 'Hết chỗ' : 'Chọn chuyến'}
            </button>
        </div>
    `;

    return card;
}

// Select route and open seat modal
async function selectRoute(route) {
    currentRoute = route;
    ticketPrice = route.giaVe;

    // Check authentication
    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('Vui lòng đăng nhập để đặt vé!');
        window.location.href = 'login_register.html';
        return;
    }

    // Fetch full route details with seats for the selected date
    try {
        const response = await fetch(`${API_URL}/routes/${route.maTuyenXe}?date=${searchDate}`);
        if (!response.ok) throw new Error('Failed to fetch route details');

        const routeDetails = await response.json();
        openSeatModal(routeDetails);

    } catch (error) {
        console.error('Error:', error);
        alert('Không thể tải thông tin ghế. Vui lòng thử lại!');
    }
}

// Open seat selection modal
function openSeatModal(routeDetails) {
    const modal = document.getElementById('seatModal');
    const seatLayout = document.getElementById('seatLayout');
    
    // Reset
    selectedSeats = [];
    seatLayout.innerHTML = '';

    // Display route info
    const routeInfo = document.getElementById('routeInfo');
    const departTime = routeDetails.thoiGianXuatBen || 'Chưa xác định';
    const arrivalTime = routeDetails.thoiGianDenDuKien || 'Chưa xác định';
    const duration = routeDetails.thoiGianQuangDuong || 'Chưa xác định';
    const loaiXe = (routeDetails.xe && routeDetails.xe.loaiXe) ? routeDetails.xe.loaiXe : 'Chưa có thông tin';
    
    routeInfo.innerHTML = `
        <p style="margin: 10px 0;"><strong>Tuyến:</strong> ${routeDetails.diemDi} → ${routeDetails.diemDen}</p>
        <p style="margin: 10px 0;"><strong>Xuất bến:</strong> ${departTime}</p>
        <p style="margin: 10px 0;"><strong>Đến dự kiến:</strong> ${arrivalTime}</p>
        <p style="margin: 10px 0;"><strong>Thời gian:</strong> ${duration}</p>
        <p style="margin: 10px 0;"><strong>Loại xe:</strong> ${loaiXe}</p>
    `;

    // Render seats
    routeDetails.gheNgoi.forEach(seat => {
        const seatDiv = document.createElement('div');
        seatDiv.className = `seat ${seat.trangThai ? 'booked' : 'available'}`;
        seatDiv.textContent = seat.maGhe;
        seatDiv.dataset.seatId = seat.maGhe;

        if (!seat.trangThai) {
            seatDiv.onclick = () => toggleSeat(seat.maGhe);
        }

        seatLayout.appendChild(seatDiv);
    });

    modal.classList.add('active');
    updateBookingSummary();
}

// Close modal
function closeSeatModal() {
    const modal = document.getElementById('seatModal');
    modal.classList.remove('active');
    selectedSeats = [];
}

// Toggle seat selection
function toggleSeat(seatId) {
    const seatDiv = document.querySelector(`[data-seat-id="${seatId}"]`);
    
    if (selectedSeats.includes(seatId)) {
        // Deselect
        selectedSeats = selectedSeats.filter(s => s !== seatId);
        seatDiv.classList.remove('selected');
        seatDiv.classList.add('available');
    } else {
        // Select
        selectedSeats.push(seatId);
        seatDiv.classList.remove('available');
        seatDiv.classList.add('selected');
    }

    updateBookingSummary();
}

// Update booking summary
function updateBookingSummary() {
    const selectedSeatsSpan = document.getElementById('selectedSeats');
    const seatCountSpan = document.getElementById('seatCount');
    const totalPriceSpan = document.getElementById('totalPrice');
    const confirmBtn = document.getElementById('btnConfirmBooking');

    if (selectedSeats.length > 0) {
        selectedSeatsSpan.textContent = selectedSeats.join(', ');
        seatCountSpan.textContent = selectedSeats.length;
        totalPriceSpan.textContent = formatPrice(ticketPrice * selectedSeats.length);
        confirmBtn.disabled = false;
    } else {
        selectedSeatsSpan.textContent = '-';
        seatCountSpan.textContent = '0';
        totalPriceSpan.textContent = '0đ';
        confirmBtn.disabled = true;
    }
}

// Confirm booking
async function confirmBooking() {
    if (selectedSeats.length === 0) {
        alert('Vui lòng chọn ít nhất 1 ghế!');
        return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('Vui lòng đăng nhập để đặt vé!');
        window.location.href = 'login_register.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/routes/book`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                maTuyenXe: currentRoute.maTuyenXe,
                gheNgoi: selectedSeats,
                tongTien: ticketPrice * selectedSeats.length,
                ngayDi: searchDate
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Đặt vé thất bại');
        }

        const booking = await response.json();
        
        alert(`Đặt vé thành công!\nMã đặt vé: ${booking.maDatVe}\nTổng tiền: ${formatPrice(booking.tongTien)}`);
        
        closeSeatModal();
        
        // Redirect to booking history or payment page
        // window.location.href = 'my-bookings.html';

    } catch (error) {
        console.error('Booking error:', error);
        alert(error.message || 'Đặt vé thất bại. Vui lòng thử lại!');
    }
}

// Show no results
function showNoResults() {
    document.getElementById('loadingDiv').style.display = 'none';
    document.getElementById('noResultsDiv').style.display = 'block';
}

// Format price
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}
