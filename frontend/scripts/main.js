// ==================== MOBILE MENU TOGGLE ====================
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (navMenu) {
        navMenu.classList.toggle('active');
        if (menuToggle) menuToggle.classList.toggle('active');
    }
}

// Close menu when clicking on nav link
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const navMenu = document.querySelector('.nav-menu');
            if (navMenu) navMenu.classList.remove('active');
        });
    });
});

// ==================== TRIP TYPE TOGGLE ====================
document.addEventListener('DOMContentLoaded', () => {
    const tripOptions = document.querySelectorAll('.trip-option');
    const returnDateGroup = document.querySelector('.return-date-group');
    
    tripOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove active from all options
            tripOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active to clicked option
            option.classList.add('active');
            
            // Check the radio inside
            const radio = option.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
            
            // Toggle return date visibility
            if (returnDateGroup && radio) {
                if (radio.value === 'round-trip') {
                    returnDateGroup.classList.add('active');
                } else {
                    returnDateGroup.classList.remove('active');
                }
            }
        });
    });
});

// ==================== SWAP LOCATIONS ====================
function swapLocations() {
    const fromSelect = document.getElementById('from');
    const toSelect = document.getElementById('to');
    
    if (fromSelect && toSelect) {
        const fromValue = fromSelect.value;
        const toValue = toSelect.value;
        
        fromSelect.value = toValue;
        toSelect.value = fromValue;
    }
}

// ==================== DATE PICKER ====================
document.addEventListener('DOMContentLoaded', () => {
    const departDateInput = document.getElementById('depart-date');
    const returnDateInput = document.getElementById('return-date');
    
    // Set minimum date to today
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    if (departDateInput) {
        departDateInput.min = todayString;
        
        // Set default value to today
        departDateInput.value = todayString;
        
        // Update return date min when depart date changes
        departDateInput.addEventListener('change', (e) => {
            if (returnDateInput) {
                returnDateInput.min = e.target.value;
                
                // Clear return date if it's before the new depart date
                if (returnDateInput.value && returnDateInput.value < e.target.value) {
                    returnDateInput.value = '';
                }
            }
        });
    }
    
    if (returnDateInput) {
        returnDateInput.min = todayString;
    }
});

// ==================== FORM VALIDATION & SUBMISSION ====================
function searchTickets(event) {
    event.preventDefault();
    
    // Get form values
    const from = document.getElementById('from').value;
    const to = document.getElementById('to').value;
    const departDate = document.getElementById('depart-date').value;
    const tickets = document.getElementById('tickets').value;
    const tripType = document.querySelector('input[name="tripType"]:checked').value;
    const returnDateInput = document.getElementById('return-date');
    const returnDate = returnDateInput ? returnDateInput.value : '';
    
    // Validation
    let errors = [];
    
    if (!from) {
        errors.push('⚠️ Vui lòng chọn điểm đi');
    }
    
    if (!to) {
        errors.push('⚠️ Vui lòng chọn điểm đến');
    }
    
    if (from && to && from === to) {
        errors.push('⚠️ Điểm đi và điểm đến không thể giống nhau');
    }
    
    if (!departDate) {
        errors.push('⚠️ Vui lòng chọn ngày đi');
    }
    
    if (!tickets || tickets < 1) {
        errors.push('⚠️ Vui lòng chọn số lượng vé');
    }
    
    if (tripType === 'round-trip') {
        if (!returnDate) {
            errors.push('⚠️ Vui lòng chọn ngày về cho chuyến khứ hồi');
        } else if (returnDate < departDate) {
            errors.push('⚠️ Ngày về phải sau ngày đi');
        }
    }
    
    // Display errors or submit
    if (errors.length > 0) {
        alert('LỖI:\n\n' + errors.join('\n'));
    } else {
        // Success - would normally submit to backend
        const fromText = document.querySelector(`#from option[value="${from}"]`).text;
        const toText = document.querySelector(`#to option[value="${to}"]`).text;
        
        console.log('🎫 Tìm kiếm vé xe:', {
            from: fromText,
            to: toText,
            departDate,
            returnDate: tripType === 'round-trip' ? returnDate : null,
            tickets,
            tripType
        });
        
        let message = `✅ TÌM CHUYẾN XE THÀNH CÔNG!\n\n` +
                     `🚌 Từ: ${fromText}\n` +
                     `📍 Đến: ${toText}\n` +
                     `📅 Ngày đi: ${formatDate(departDate)}\n`;
        
        if (tripType === 'round-trip' && returnDate) {
            message += `🔄 Ngày về: ${formatDate(returnDate)}\n`;
        }
        
        message += `🎫 Số vé: ${tickets} vé`;
        
        alert(message);
    }
}

// Format date to Vietnamese format
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const dayName = days[date.getDay()];
    
    return `${day}/${month}/${year} ${dayName}`;
}

// ==================== LOGIN MODAL ====================
function openLoginModal() {
    alert('🔐 ĐĂNG NHẬP / ĐĂNG KÝ\n\nChức năng đăng nhập sẽ được phát triển trong phiên bản tiếp theo.');
}

// ==================== SMOOTH SCROLL ====================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href && href !== '#') {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const headerOffset = 80;
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
});

// ==================== HEADER SCROLL EFFECT ====================
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    const currentScroll = window.pageYOffset;
    
    if (header) {
        if (currentScroll > 50) {
            header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
        } else {
            header.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        }
    }
    
    lastScroll = currentScroll;
});

// ==================== ACTIVE NAV LINK ====================
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath.includes('index.html') && href === '/')) {
            link.classList.add('active');
        }
    });
});

// ==================== CONSOLE BRANDING ====================
console.log('%c🚌 BUS TICKET BOOKING SYSTEM', 'color: #FF6600; font-size: 28px; font-weight: bold; font-family: Roboto;');
console.log('%cProfessional Transport Services', 'color: #333; font-size: 14px; font-weight: 600; font-family: Roboto;');
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #999;');
console.log('%cDeveloped by NoSQL Team 💻', 'color: #666; font-size: 11px;');
console.log('%cVersion: 1.0.0 | 2025', 'color: #999; font-size: 10px;');
