// Mobile menu toggle
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu.classList.toggle('active');
}

// Trip type switching
document.addEventListener('DOMContentLoaded', () => {
    const tripTypeRadios = document.querySelectorAll('input[name="tripType"]');
    const returnDateGroup = document.querySelector('.return-date-group');

    tripTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            // Update active class
            document.querySelectorAll('.trip-option').forEach(option => {
                option.classList.remove('active');
            });
            e.target.closest('.trip-option').classList.add('active');

            // Show/hide return date
            if (e.target.value === 'round-trip') {
                returnDateGroup.classList.add('active');
            } else {
                returnDateGroup.classList.remove('active');
            }
        });
    });

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('depart-date').value = today;
});

// Swap locations
function swapLocations() {
    const fromSelect = document.getElementById('from');
    const toSelect = document.getElementById('to');

    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;
}

// Search tickets
function searchTickets(event) {
    event.preventDefault();

    const from = document.getElementById('from').value;
    const to = document.getElementById('to').value;
    const departDate = document.getElementById('depart-date').value;
    const returnDate = document.getElementById('return-date').value;
    const tripType = document.querySelector('input[name="tripType"]:checked').value;

    // Validation
    if (!from || !to || !departDate) {
        if (typeof Toast !== 'undefined') {
            Toast.warning('Vui lòng điền đầy đủ thông tin!', 'Thông tin chưa đầy đủ');
        }
        return;
    }

    if (from === to) {
        if (typeof Toast !== 'undefined') {
            Toast.warning('Điểm đi và điểm đến không được trùng nhau!', 'Lỗi chọn điểm');
        }
        return;
    }

    if (tripType === 'round-trip' && !returnDate) {
        if (typeof Toast !== 'undefined') {
            Toast.warning('Vui lòng chọn ngày về!', 'Thiếu ngày về');
        }
        return;
    }

    // Get city names
    const fromText = document.querySelector(`#from option[value="${from}"]`).textContent;
    const toText = document.querySelector(`#to option[value="${to}"]`).textContent;

    // Redirect to search results page with query params
    const params = new URLSearchParams({
        from: fromText,
        to: toText,
        date: departDate,
        tripType: tripType
    });

    if (tripType === 'round-trip') {
        params.append('returnDate', returnDate);
    }

    window.location.href = `search-results.html?${params.toString()}`;
}

// Console branding
console.log(
    '%c🚌 BUS TICKET BOOKING SYSTEM',
    'color: #FF6600; font-size: 20px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);'
);
console.log(
    '%cPowered by VooBus',
    'color: #666; font-size: 12px;'
);
