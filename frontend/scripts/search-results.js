// API Configuration
const API_URL = 'http://localhost:8000';

// Global variables
let currentRoute = null;
let selectedSeats = [];
let ticketPrice = 0;
let searchDate = null;
let allRoutes = []; // Store all routes for filtering
let filteredRoutes = []; // Store filtered routes

// Helper function to extract display seat code from full maGhe (e.g., "XE001_A15" -> "A15")
function getDisplaySeatCode(maGhe) {
    if (!maGhe) return '';
    // If contains underscore, get the part after it
    if (maGhe.includes('_')) {
        return maGhe.split('_').pop();
    }
    return maGhe;
}

// Load search results on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Get search params from URL
    const urlParams = new URLSearchParams(window.location.search);
    const diemDi = urlParams.get('from');
    const diemDen = urlParams.get('to');
    const ngayDi = urlParams.get('date');
    const maTuyenXe = urlParams.get('maTuyenXe'); // Get specific route if provided

    if (!diemDi || !diemDen || !ngayDi) {
        showNoResults();
        return;
    }

    searchDate = ngayDi;
    await searchRoutes(diemDi, diemDen, ngayDi, maTuyenXe);
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
            switch (timeRange) {
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
async function searchRoutes(diemDi, diemDen, ngayDi, maTuyenXe = null) {
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

        let routes = await response.json();

        // If specific maTuyenXe provided, filter to show only that route
        if (maTuyenXe) {
            const specificRoute = routes.find(r => r.maTuyenXe === maTuyenXe);
            if (specificRoute) {
                routes = [specificRoute];
                console.log('🎯 Đã chọn tuyến xe cụ thể:', maTuyenXe);
            }
        }

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
        Toast.warning('Vui lòng đăng nhập để đặt vé!', 'Yêu cầu đăng nhập');
        setTimeout(() => {
            window.location.href = 'login_register.html';
        }, 1500);
        return;
    }

    // Get or create session ID
    let sessionId = sessionStorage.getItem('booking_session_id');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('booking_session_id', sessionId);
    }

    // Fetch full route details with seats for the selected date
    try {
        const response = await fetch(`${API_URL}/routes/${route.maTuyenXe}?date=${searchDate}&sessionId=${sessionId}`);
        if (!response.ok) throw new Error('Failed to fetch route details');

        const routeDetails = await response.json();

        // Store maLC from response for booking
        if (routeDetails.maLC) {
            currentRoute.maLC = routeDetails.maLC;
        }

        openSeatModal(routeDetails);

    } catch (error) {
        console.error('Error:', error);
        Toast.error('Không thể tải thông tin ghế. Vui lòng thử lại!', 'Lỗi tải dữ liệu');
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

    // Get held seats info from routeDetails
    const heldSeats = routeDetails.heldSeats || [];
    const myHeldSeats = routeDetails.myHeldSeats || [];

    // Separate seats into lower and upper floors based on seat number
    // Sort seats by number for proper horizontal layout
    const allSeats = [...routeDetails.gheNgoi].sort((a, b) => {
        const numA = parseInt(getDisplaySeatCode(a.maGhe).replace(/[A-Z]/g, ''));
        const numB = parseInt(getDisplaySeatCode(b.maGhe).replace(/[A-Z]/g, ''));
        return numA - numB;
    });

    const lowerFloorSeats = [];
    const upperFloorSeats = [];

    allSeats.forEach(seat => {
        const displayCode = getDisplaySeatCode(seat.maGhe);
        const seatNumber = parseInt(displayCode.replace(/[A-Z]/g, ''));

        // A01-A17 = lower floor, A18-A34 = upper floor
        if (seatNumber >= 1 && seatNumber <= 17) {
            lowerFloorSeats.push(seat);
        } else if (seatNumber >= 18 && seatNumber <= 34) {
            upperFloorSeats.push(seat);
        } else {
            lowerFloorSeats.push(seat);
        }
    });

    // Render lower floor seats in horizontal rows (6 columns)
    // Row 1: A01, [empty], A02 | A03, A04, A05
    // Row 2: A06, A07, A08 | A09, A10, A11
    // ...
    lowerFloorSeats.forEach((seat, index) => {
        const displayCode = getDisplaySeatCode(seat.maGhe);
        const seatNumber = parseInt(displayCode.replace(/[A-Z]/g, ''));

        // Add seat A01
        if (seatNumber === 1) {
            const seatDiv = createSeatElement(seat, heldSeats, myHeldSeats);
            seatLayoutLower.appendChild(seatDiv);

            // Add empty space after A01 (driver area)
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'seat seat-empty';
            seatLayoutLower.appendChild(emptyDiv);
        } else {
            const seatDiv = createSeatElement(seat, heldSeats, myHeldSeats);
            seatLayoutLower.appendChild(seatDiv);
        }
    });

    // Render upper floor seats (A18-A34)
    upperFloorSeats.forEach((seat, index) => {
        const displayCode = getDisplaySeatCode(seat.maGhe);
        const seatNumber = parseInt(displayCode.replace(/[A-Z]/g, ''));

        // Add seat A18
        if (seatNumber === 18) {
            const seatDiv = createSeatElement(seat, heldSeats, myHeldSeats);
            seatLayoutUpper.appendChild(seatDiv);

            // Add empty space after A18 (same as lower floor layout)
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'seat seat-empty';
            seatLayoutUpper.appendChild(emptyDiv);
        } else {
            const seatDiv = createSeatElement(seat, heldSeats, myHeldSeats);
            seatLayoutUpper.appendChild(seatDiv);
        }
    });

    modal.classList.add('active');
    updateBookingSummary();
}

// Create seat element
function createSeatElement(seat, heldSeats = [], myHeldSeats = []) {
    const seatDiv = document.createElement('div');
    const maGhe = seat.maGhe;
    const displayCode = getDisplaySeatCode(maGhe);

    // Determine seat status
    let seatClass = 'seat ';
    let isClickable = false;

    if (!seat.trangThai) {
        // Ghế đã được đặt và thanh toán
        seatClass += 'booked';
    } else if (myHeldSeats.includes(maGhe)) {
        // Ghế tôi đang giữ (có thể chọn lại)
        seatClass += 'my-held';
        isClickable = true;
    } else if (heldSeats.includes(maGhe)) {
        // Ghế đang được người khác giữ
        seatClass += 'held';
    } else {
        // Ghế còn trống
        seatClass += 'available';
        isClickable = true;
    }

    seatDiv.className = seatClass;
    seatDiv.textContent = displayCode;
    seatDiv.dataset.seatId = maGhe;

    if (isClickable) {
        seatDiv.onclick = () => toggleSeat(maGhe);
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
        // Display only seat codes (A15) instead of full maGhe (XE001_A15)
        const displaySeats = selectedSeats.map(s => getDisplaySeatCode(s));
        selectedSeatsSpan.textContent = displaySeats.join(', ');
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

// Confirm booking - Create pending booking in Redis
async function confirmBooking() {
    if (selectedSeats.length === 0) {
        Toast.warning('Vui lòng chọn ít nhất 1 ghế!', 'Chưa chọn ghế');
        return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
        Toast.warning('Vui lòng đăng nhập để đặt vé!', 'Yêu cầu đăng nhập');
        setTimeout(() => {
            window.location.href = 'login_register.html';
        }, 1500);
        return;
    }

    // Generate unique session ID for this user
    let sessionId = sessionStorage.getItem('booking_session_id');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('booking_session_id', sessionId);
    }

    console.log('Booking data:', {
        maLC: currentRoute.maLC,
        ngayDi: searchDate,
        danhSachGhe: selectedSeats,
        tongTien: ticketPrice * selectedSeats.length,
        sessionId: sessionId
    });

    try {
        // Create pending booking in Redis (TTL 3 minutes)
        const response = await fetch(`${API_URL}/api/v1/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                maLC: currentRoute.maLC,
                ngayDi: searchDate,
                danhSachGhe: selectedSeats,
                sessionId: sessionId
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Booking error response:', error);
            throw new Error(error.detail || 'Đặt vé thất bại');
        }

        const booking = await response.json();
        console.log('Booking created:', booking);

        // Close seat modal and show payment QR modal
        closeSeatModal();
        showPaymentModal(booking);

    } catch (error) {
        console.error('Booking error:', error);
        Toast.error(error.message || 'Đặt vé thất bại. Vui lòng thử lại!', 'Lỗi đặt vé');
    }
}

// Show payment modal with QR code and countdown timer
async function showPaymentModal(booking) {
    console.log('showPaymentModal called with:', booking);

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

    if (!modal || !ticketInfo) {
        console.error('Modal elements not found!');
        return;
    }

    console.log('Modal elements found, rendering...');

    const departTime = currentRoute.thoiGianXuatBen || 'Chưa xác định';
    const arrivalTime = currentRoute.thoiGianDenDuKien || 'Chưa xác định';

    // Normalize field names: backend uses maHD, danhSachGhe
    const maHD = booking.maHD || booking.maDatVe;
    const danhSachGhe = booking.danhSachGhe || booking.soGheNgoi || selectedSeats;

    ticketInfo.innerHTML = `
        <div class="ticket-header">
            <h3>THANH TOÁN BẰNG QR CODE</h3>
            <p class="ticket-code">Mã đặt vé: <strong>${maHD}</strong></p>
            <div class="countdown-timer" id="countdownTimer">
                <span>⏱️ Thời gian còn lại: </span>
                <strong id="timerDisplay">10:00</strong>
            </div>
        </div>

        <div class="ticket-body">
            <!-- QR Code Payment -->
            <div class="ticket-section qr-section">
                <h4>Quét mã QR để thanh toán</h4>
                <div class="qr-code-container">
                    ${booking.qrCode
            ? `<img src="${booking.qrCode}" alt="QR Payment" class="qr-code-image" onerror="this.onerror=null; this.src=''; this.alt='Không thể tải QR code';" />`
            : '<p style="color: red;">❌ Không thể tạo QR code. Vui lòng thử lại.</p>'
        }
                </div>
                <p class="qr-instruction">
                    📱 Mở ứng dụng Ngân hàng → Quét QR → Thanh toán
                </p>
                <div class="bank-info">
                    <p><strong>Ngân hàng:</strong> TP Bank</p>
                    <p><strong>Số tài khoản:</strong> 0921508957</p>
                    <p><strong>Chủ tài khoản:</strong> VU KHANH NAM</p>
                    <p><strong>Số tiền:</strong> ${formatPrice(booking.tongTien)}</p>
                    <p style="font-size: 12px; color: #666; margin-top: 10px;">
                        💡 Nội dung CK: <strong>VOOBUS ${maHD}</strong>
                    </p>
                </div>
            </div>

            <!-- Thông tin chuyến đi -->
            <div class="ticket-section">
                <h4>Thông tin chuyến đi</h4>
                <div class="ticket-row">
                    <span class="label">Tuyến:</span>
                    <span class="value">${currentRoute.diemDi} → ${currentRoute.diemDen}</span>
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
                    <span class="label">Ghế ngồi:</span>
                    <span class="value highlight">${Array.isArray(danhSachGhe) ? danhSachGhe.map(s => getDisplaySeatCode(s)).join(', ') : getDisplaySeatCode(danhSachGhe)}</span>
                </div>
                <div class="ticket-row total">
                    <span class="label">Tổng tiền:</span>
                    <span class="value">${formatPrice(booking.tongTien)}</span>
                </div>
            </div>
        </div>

        <div class="ticket-footer">
            <button class="btn-payment" onclick="confirmPayment('${maHD}')">
                ✅ Đã thanh toán
            </button>
            <button class="btn-cancel" onclick="cancelPayment('${maHD}')">
                ❌ Hủy đặt vé
            </button>
        </div>
    `;

    modal.classList.add('active');

    // Start countdown timer (10 minutes = 600 seconds)
    startCountdown(600, maHD);
}

// Countdown timer
function startCountdown(seconds, maDatVe) {
    let remaining = seconds;
    const timerDisplay = document.getElementById('timerDisplay');

    const interval = setInterval(() => {
        remaining--;

        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        // Change color when less than 1 minute
        if (remaining < 60) {
            timerDisplay.style.color = 'red';
        }

        // Time's up
        if (remaining <= 0) {
            clearInterval(interval);
            Toast.warning('⏰ Hết thời gian giữ ghế! Vui lòng đặt lại.', 'Hết thời gian');
            closeTicketInfoModal();
            window.location.reload(); // Reload to refresh seat availability
        }
    }, 1000);

    // Store interval ID to clear when user confirms/cancels
    window.currentBookingTimer = interval;
}

// Confirm payment - Save to Redis
async function confirmPayment(maHD) {
    const token = localStorage.getItem('access_token');
    if (!token) {
        Toast.warning('Vui lòng đăng nhập!', 'Yêu cầu đăng nhập');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/v1/bookings/payment/confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                maHD: maHD
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Xác nhận thanh toán thất bại');
        }

        const result = await response.json();

        // Clear countdown timer
        if (window.currentBookingTimer) {
            clearInterval(window.currentBookingTimer);
        }

        Toast.success(`✅ Thanh toán thành công!\n\nMã đặt vé: ${result.maHD}\nTổng tiền: ${formatPrice(result.tongTien)}\n\nCảm ơn quý khách!`, 'Thanh toán thành công');

        closeTicketInfoModal();
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);

    } catch (error) {
        console.error('Payment confirmation error:', error);
        Toast.error(error.message || 'Xác nhận thanh toán thất bại. Vui lòng thử lại!', 'Lỗi thanh toán');
    }
}

// Cancel payment - Release seats from Redis
async function cancelPayment(maHD) {
    const token = localStorage.getItem('access_token');
    if (!token) {
        Toast.warning('Vui lòng đăng nhập!', 'Yêu cầu đăng nhập');
        return;
    }

    // Temporarily hide the payment modal to show confirmation dialog clearly
    const paymentModal = document.getElementById('ticketInfoModal');
    const wasActive = paymentModal.classList.contains('active');
    if (wasActive) {
        paymentModal.style.display = 'none';
    }

    const confirmed = await Modal.confirm(
        'Bạn có chắc muốn hủy đặt vé?',
        'Xác nhận hủy vé',
        'warning'
    );

    // Restore payment modal if user cancels
    if (!confirmed) {
        if (wasActive) {
            paymentModal.style.display = 'flex';
        }
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/v1/bookings/payment/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                maHD: maHD
            })
        });

        if (!response.ok) {
            const error = await response.json();
            // Restore payment modal on error
            if (wasActive) {
                paymentModal.style.display = 'flex';
            }
            throw new Error(error.detail || 'Hủy đặt vé thất bại');
        }

        // Clear countdown timer
        if (window.currentBookingTimer) {
            clearInterval(window.currentBookingTimer);
        }

        Toast.info('❌ Đã hủy đặt vé. Ghế đã được giải phóng.', 'Hủy thành công');

        closeTicketInfoModal();
        setTimeout(() => {
            window.location.reload(); // Reload to refresh seat availability
        }, 1500);

    } catch (error) {
        console.error('Cancel booking error:', error);
        Toast.error(error.message || 'Hủy đặt vé thất bại. Vui lòng thử lại!', 'Lỗi hủy vé');
    }
}

// Close ticket info modal
function closeTicketInfoModal() {
    // Clear countdown timer if exists
    if (window.currentBookingTimer) {
        clearInterval(window.currentBookingTimer);
        window.currentBookingTimer = null;
    }

    const modal = document.getElementById('ticketInfoModal');
    modal.classList.remove('active');
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
