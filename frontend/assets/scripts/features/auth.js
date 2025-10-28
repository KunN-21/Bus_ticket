// API Configuration
const API_BASE_URL = 'http://localhost:8000';
const API_AUTH = `${API_BASE_URL}/auth`;

// Registration State
let registrationEmail = '';

// Wait for Toast to be available
function showToast(type, message, title) {
    if (typeof Toast !== 'undefined') {
        if (type === 'success') {
            Toast.success(message, title);
        } else if (type === 'error') {
            Toast.error(message, title);
        } else if (type === 'warning') {
            Toast.warning(message, title);
        } else {
            Toast.info(message, title);
        }
    } else {
        // Fallback to alert if Toast not available
        alert((title ? title + '\n\n' : '') + message);
    }
}

// DOM Elements
const forms = {
    login: document.getElementById('loginFormWrapper'),
    registerEmail: document.getElementById('registerEmailForm'),
    verifyOTP: document.getElementById('verifyOTPForm'),
    setPassword: document.getElementById('setPasswordForm'),
    completeRegistration: document.getElementById('completeRegistrationForm')
};

const loading = document.getElementById('loading');

// Helper Functions
function showForm(formName) {
    Object.keys(forms).forEach(key => {
        if (forms[key]) {
            forms[key].classList.remove('active');
        }
    });
    if (forms[formName]) {
        forms[formName].classList.add('active');
    }
}

function showLoading() {
    if (loading) loading.style.display = 'flex';
}

function hideLoading() {
    if (loading) loading.style.display = 'none';
}

// No longer needed - using Toast instead
// function showError(message) {
//     alert('❌ ' + message);
// }

// function showSuccess(message) {
//     alert('✅ ' + message);
// }

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
}

// Make togglePassword global
window.togglePassword = togglePassword;

// Tab switching (for login/register tabs)
const tabs = document.querySelectorAll('.tab');
if (tabs.length > 0) {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const tabType = tab.getAttribute('data-tab');
            if (tabType === 'register') {
                showForm('registerEmail');
            } else {
                showForm('login');
            }
        });
    });
}

// Back to email button
const backToEmailBtn = document.getElementById('backToEmail');
if (backToEmailBtn) {
    backToEmailBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showForm('registerEmail');
    });
}

// ========== LOGIN ==========
document.getElementById('loginFormElement')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    const formData = new FormData(e.target);
    const data = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const response = await fetch(`${API_AUTH}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Đăng nhập thất bại');
        }

        // Save token and user info
        localStorage.setItem('access_token', result.access_token);
        localStorage.setItem('user', JSON.stringify(result.user));

        showToast('success', 'Đăng nhập thành công! Đang chuyển đến trang chủ...');
        
        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);

    } catch (error) {
        showToast('error', error.message, 'Lỗi đăng nhập');
    } finally {
        hideLoading();
    }
});

// ========== REGISTRATION FLOW ==========

// Step 1: Initiate Registration
document.getElementById('registerEmailFormElement')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    const formData = new FormData(e.target);
    registrationEmail = formData.get('email');

    try {
        const response = await fetch(`${API_AUTH}/register/initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: registrationEmail })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Không thể gửi OTP');
        }

        showToast('success', result.message);
        document.getElementById('displayEmail').textContent = registrationEmail;
        showForm('verifyOTP');

    } catch (error) {
        showToast('error', error.message, 'Lỗi gửi OTP');
    } finally {
        hideLoading();
    }
});

// Step 2: Verify OTP
document.getElementById('verifyOTPFormElement')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    const formData = new FormData(e.target);
    const data = {
        email: registrationEmail,
        otp: formData.get('otp')
    };

    try {
        const response = await fetch(`${API_AUTH}/register/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'OTP không chính xác');
        }

        showToast('success', result.message);
        showForm('setPassword');

    } catch (error) {
        showToast('error', error.message, 'Lỗi xác thực OTP');
    } finally {
        hideLoading();
    }
});

// Resend OTP
document.getElementById('resendOTP')?.addEventListener('click', async () => {
    showLoading();

    try {
        const response = await fetch(`${API_AUTH}/register/resend-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: registrationEmail })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Không thể gửi OTP');
        }

        showToast('success', result.message);

    } catch (error) {
        showToast('error', error.message, 'Lỗi gửi lại OTP');
    } finally {
        hideLoading();
    }
});

// Step 3: Set Password
document.getElementById('setPasswordFormElement')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    const formData = new FormData(e.target);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (password !== confirmPassword) {
        hideLoading();
        showToast('error', 'Mật khẩu xác nhận không khớp', 'Lỗi');
        return;
    }

    if (password.length < 6) {
        hideLoading();
        showToast('error', 'Mật khẩu phải có ít nhất 6 ký tự', 'Lỗi');
        return;
    }

    try {
        const response = await fetch(`${API_AUTH}/register/set-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                email: registrationEmail, 
                password: password 
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Không thể đặt mật khẩu');
        }

        showToast('success', result.message);
        showForm('completeRegistration');

    } catch (error) {
        showToast('error', error.message, 'Lỗi đặt mật khẩu');
    } finally {
        hideLoading();
    }
});

// Step 4: Complete Registration
document.getElementById('completeRegistrationFormElement')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    const formData = new FormData(e.target);
    const data = {
        email: registrationEmail,
        hoTen: formData.get('hoTen'),
        SDT: formData.get('SDT'),
        CCCD: formData.get('CCCD'),
        diaChi: formData.get('diaChi')
    };

    try {
        const response = await fetch(`${API_AUTH}/register/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Đăng ký thất bại');
        }

        // Save token and user info
        localStorage.setItem('access_token', result.access_token);
        localStorage.setItem('user', JSON.stringify(result.user));

        showToast('success', result.message + '\nĐang chuyển đến trang chủ...', 'Đăng ký thành công');
        
        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (error) {
        showToast('error', error.message, 'Lỗi đăng ký');
    } finally {
        hideLoading();
    }
});

// Auto-format phone number input
document.getElementById('phoneNumber')?.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
});

// Auto-format CCCD input
document.getElementById('idCard')?.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
});

// Auto-format OTP input
document.getElementById('otpCode')?.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
});

// Initialize - show login form by default
document.addEventListener('DOMContentLoaded', () => {
    showForm('login');
});

// Check if user is already logged in
if (localStorage.getItem('access_token')) {
    const currentPage = window.location.pathname;
    if (currentPage.includes('login_register.html')) {
        // User is already logged in, redirect to home
        window.location.href = 'index.html';
    }
}

