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
        noResultsDiv.style.display = 'none';
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
    const seatLayoutLower = document.getElementById('seatLayoutLower');
    const seatLayoutUpper = document.getElementById('seatLayoutUpper');
    
    // Reset
    selectedSeats = [];
    seatLayoutLower.innerHTML = '';
    seatLayoutUpper.innerHTML = '';

    // Display route info
    const routeInfo = document.getElementById('routeInfo');
    const departTime = routeDetails.thoiGianXuatBen || 'Chưa xác định';
    const arrivalTime = routeDetails.thoiGianDenDuKien || 'Chưa xác định';
    const duration = routeDetails.thoiGianQuangDuong || 'Chưa xác định';
    const loaiXe = (routeDetails.xe && routeDetails.xe.loaiXe) ? routeDetails.xe.loaiXe : 'Chưa có thông tin';
    
    // Separate seats into lower and upper floors based on seat number
    const lowerFloorSeats = [];
    const upperFloorSeats = [];
    
    routeDetails.gheNgoi.forEach(seat => {
        const seatCode = seat.maGhe;
        
        // Extract number from seat code (e.g., A01 -> 1, A17 -> 17)
        const seatNumber = parseInt(seatCode.replace(/[A-Z]/g, ''));
        
        // A01-A17 = lower floor, A18-A34 = upper floor
        if (seatNumber >= 1 && seatNumber <= 17) {
            lowerFloorSeats.push(seat);
        } else if (seatNumber >= 18 && seatNumber <= 34) {
            upperFloorSeats.push(seat);
        } else {
            // Default to lower floor if doesn't match pattern
            lowerFloorSeats.push(seat);
        }
    });

    // Render lower floor seats with spacing for first row
    lowerFloorSeats.forEach((seat, index) => {
        const seatNumber = parseInt(seat.maGhe.replace(/[A-Z]/g, ''));
        
        // Add seat A01
        if (seatNumber === 1) {
            const seatDiv = createSeatElement(seat);
            seatLayoutLower.appendChild(seatDiv);
            
            // Add empty space
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'seat seat-empty';
            seatLayoutLower.appendChild(emptyDiv);
        }
        // Add seat A02 (skip A01 since already added)
        else if (seatNumber === 2) {
            const seatDiv = createSeatElement(seat);
            seatLayoutLower.appendChild(seatDiv);
        }
        // Normal seats A03-A17
        else if (seatNumber >= 3 && seatNumber <= 17) {
            const seatDiv = createSeatElement(seat);
            seatLayoutLower.appendChild(seatDiv);
        }
    });

    // Render upper floor seats with spacing for first row
    upperFloorSeats.forEach((seat, index) => {
        const seatNumber = parseInt(seat.maGhe.replace(/[A-Z]/g, ''));
        
        // Add seat A18
        if (seatNumber === 18) {
            // Add empty space first
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'seat seat-empty';
            seatLayoutUpper.appendChild(emptyDiv);
            
            const seatDiv = createSeatElement(seat);
            seatLayoutUpper.appendChild(seatDiv);
        }
        // Add seat A19
        else if (seatNumber === 19) {
            const seatDiv = createSeatElement(seat);
            seatLayoutUpper.appendChild(seatDiv);
        }
        // Normal seats A20-A34
        else if (seatNumber >= 20 && seatNumber <= 34) {
            const seatDiv = createSeatElement(seat);
            seatLayoutUpper.appendChild(seatDiv);
        }
    });

    modal.classList.add('active');
    updateBookingSummary();
}

// Create seat element
function createSeatElement(seat) {
    const seatDiv = document.createElement('div');
    seatDiv.className = `seat ${seat.trangThai ? 'booked' : 'available'}`;
    seatDiv.textContent = seat.maGhe;
    seatDiv.dataset.seatId = seat.maGhe;

    if (!seat.trangThai) {
        seatDiv.onclick = () => toggleSeat(seat.maGhe);
    }

    return seatDiv;
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

    console.log('Booking data:', {
        maTuyenXe: currentRoute.maTuyenXe,
        gheNgoi: selectedSeats,
        tongTien: ticketPrice * selectedSeats.length,
        ngayDi: searchDate
    });

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
            console.error('Booking error response:', error);
            throw new Error(error.detail || 'Đặt vé thất bại');
        }

        const booking = await response.json();
        
        // Close seat modal and show ticket info modal
        closeSeatModal();
        showTicketInfoModal(booking);

    } catch (error) {
        console.error('Booking error:', error);
        alert(error.message || 'Đặt vé thất bại. Vui lòng thử lại!');
    }
}

// Show ticket info modal
async function showTicketInfoModal(booking) {
    // Get user info
    const token = localStorage.getItem('access_token');
    let userInfo = { hoTen: '', email: '', soDienThoai: '' };
    
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            userInfo = await response.json();
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
    }

    const modal = document.getElementById('ticketInfoModal');
    const ticketInfo = document.getElementById('ticketInfoContent');
    
    const departTime = currentRoute.thoiGianXuatBen || 'Chưa xác định';
    const arrivalTime = currentRoute.thoiGianDenDuKien || 'Chưa xác định';
    
    ticketInfo.innerHTML = `
        <div class="ticket-header">
            <h3>THÔNG TIN VÉ XE</h3>
            <p class="ticket-code">Mã đặt vé: <strong>${booking.maDatVe}</strong></p>
        </div>

        <div class="ticket-body">
            <!-- Thông tin chuyến đi -->
            <div class="ticket-section">
                <h4>Thông tin chuyến đi</h4>
                <div class="ticket-row">
                    <span class="label">Điểm đi:</span>
                    <span class="value">${currentRoute.diemDi}</span>
                </div>
                <div class="ticket-row">
                    <span class="label">Điểm đến:</span>
                    <span class="value">${currentRoute.diemDen}</span>
                </div>
                <div class="ticket-row">
                    <span class="label">Ngày đi:</span>
                    <span class="value">${formatDate(searchDate)}</span>
                </div>
                <div class="ticket-row">
                    <span class="label">Giờ xuất bến:</span>
                    <span class="value">${departTime}</span>
                </div>
                <div class="ticket-row">
                    <span class="label">Giờ đến dự kiến:</span>
                    <span class="value">${arrivalTime}</span>
                </div>
            </div>

            <!-- Thông tin khách hàng -->
            <div class="ticket-section">
                <h4>Thông tin khách hàng</h4>
                <div class="ticket-row">
                    <span class="label">Họ tên:</span>
                    <span class="value">${userInfo.hoTen || 'Chưa cập nhật'}</span>
                </div>
                <div class="ticket-row">
                    <span class="label">Email:</span>
                    <span class="value">${userInfo.email || 'Chưa cập nhật'}</span>
                </div>
                <div class="ticket-row">
                    <span class="label">Số điện thoại:</span>
                    <span class="value">${userInfo.soDienThoai || 'Chưa cập nhật'}</span>
                </div>
            </div>

            <!-- Thông tin vé -->
            <div class="ticket-section">
                <h4>Chi tiết vé</h4>
                <div class="ticket-row">
                    <span class="label">Ghế ngồi:</span>
                    <span class="value highlight">${booking.gheNgoi.join(', ')}</span>
                </div>
                <div class="ticket-row">
                    <span class="label">Số lượng vé:</span>
                    <span class="value">${booking.gheNgoi.length} vé</span>
                </div>
                <div class="ticket-row">
                    <span class="label">Đơn giá:</span>
                    <span class="value">${formatPrice(ticketPrice)}</span>
                </div>
                <div class="ticket-row total">
                    <span class="label">Tổng tiền:</span>
                    <span class="value">${formatPrice(booking.tongTien)}</span>
                </div>
            </div>
        </div>

        <div class="ticket-footer">
            <button class="btn-payment" onclick="processPayment('${booking.maDatVe}', ${booking.tongTien}, '${userInfo.hoTen}', '${userInfo.email}', '${userInfo.soDienThoai}', '${booking.maKH}', '${JSON.stringify(booking.gheNgoi)}')">
                💳 Thanh toán
            </button>
            <button class="btn-cancel" onclick="closeTicketInfoModal()">
                Hủy
            </button>
        </div>
    `;

    modal.classList.add('active');
}

// Close ticket info modal
function closeTicketInfoModal() {
    const modal = document.getElementById('ticketInfoModal');
    modal.classList.remove('active');
}

// Process payment and create invoice
async function processPayment(maDatVe, tongTien, hoTen, email, soDienThoai, maKH, gheNgoiStr) {
    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('Vui lòng đăng nhập!');
        return;
    }

    // Parse gheNgoi from string back to array
    let gheNgoi = [];
    try {
        gheNgoi = JSON.parse(gheNgoiStr);
    } catch (e) {
        gheNgoi = selectedSeats;
    }

    try {
        // Create invoice
        const response = await fetch(`${API_URL}/routes/invoice/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                maKH: maKH,
                hoTen: hoTen || 'Khách hàng',
                email: email,
                soDienThoai: soDienThoai,
                maTuyenXe: currentRoute.maTuyenXe,
                diemDi: currentRoute.diemDi,
                diemDen: currentRoute.diemDen,
                gheNgoi: gheNgoi,
                donGia: ticketPrice,
                soVeMua: gheNgoi.length,
                tongTien: tongTien,
                phuongThucThanhToan: 'Online',
                ngayDi: searchDate
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Thanh toán thất bại');
        }

        const invoice = await response.json();
        
        alert(`✅ Thanh toán thành công!\n\nMã hóa đơn: ${invoice.maHoaDon}\nTổng tiền: ${formatPrice(invoice.tongTien)}\n\nCảm ơn quý khách đã sử dụng dịch vụ!`);
        
        closeTicketInfoModal();
        
        // Redirect to home or booking history
        window.location.href = 'index.html';

    } catch (error) {
        console.error('Payment error:', error);
        alert(error.message || 'Thanh toán thất bại. Vui lòng thử lại!');
    }
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Show no results
function showNoResults() {
    document.getElementById('loadingDiv').style.display = 'none';
    document.getElementById('noResultsDiv').style.display = 'none';
}

// Format price
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}
