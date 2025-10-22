import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { authService } from '../services/auth';
import type { UserLogin, UserRegister } from '../types';
import { CheckCircle } from 'lucide-react';
import './Auth.css';

function Auth() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login state
  const [loginData, setLoginData] = useState<UserLogin>({
    phone: '',
    password: '',
  });
  
  // Register state
  const [step, setStep] = useState<'phone' | 'otp' | 'password'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [registerData, setRegisterData] = useState<UserRegister>({
    phone: '',
    full_name: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpExpiry, setOtpExpiry] = useState(0);

  // ========== LOGIN HANDLERS ==========
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(loginData);
      authService.setAuth(response.data);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  // ========== REGISTER HANDLERS ==========
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await authAPI.requestOTP({ phone });
      setOtpExpiry(response.data.expires_in);
      setStep('otp');
      setSuccess('📱 ' + response.data.message);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Không thể gửi OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await authAPI.verifyOTP({ phone, otp });
      setRegisterData({ ...registerData, phone });
      setStep('password');
      setSuccess('✅ OTP xác thực thành công!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'OTP không hợp lệ');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (registerData.password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (registerData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register(registerData);
      authService.setAuth(response.data);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const resetRegister = () => {
    setStep('phone');
    setPhone('');
    setOtp('');
    setRegisterData({ phone: '', full_name: '', password: '' });
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        {/* Left Side - Branding */}
        <div className="auth-left">
          <div className="auth-branding">
            <div className="auth-logo">🚌</div>
            <h1>BookingTicket</h1>
            <p>Hệ thống đặt vé xe khách hàng đầu Việt Nam</p>
            
            <div className="auth-features">
              <div className="auth-feature-item">
                <CheckCircle size={20} />
                <span>Đặt vé nhanh chóng, tiện lợi</span>
              </div>
              <div className="auth-feature-item">
                <CheckCircle size={20} />
                <span>Thanh toán an toàn bảo mật</span>
              </div>
              <div className="auth-feature-item">
                <CheckCircle size={20} />
                <span>Hơn 100+ tuyến đường</span>
              </div>
              <div className="auth-feature-item">
                <CheckCircle size={20} />
                <span>Hỗ trợ 24/7</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Forms */}
        <div className="auth-right">
          <div className="auth-card">
            {/* Tabs */}
            <div className="auth-tabs">
              <button
                className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('login');
                  setError('');
                  setSuccess('');
                  resetRegister();
                }}
              >
                Đăng nhập
              </button>
              <button
                className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('register');
                  setError('');
                  setSuccess('');
                  setLoginData({ phone: '', password: '' });
                }}
              >
                Đăng ký
              </button>
            </div>

            {/* Messages */}
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {/* ========== LOGIN FORM ========== */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin}>
                <p className="auth-subtitle">Đăng nhập để tiếp tục đặt vé</p>

                <div className="form-group">
                  <label htmlFor="login-phone">Số điện thoại</label>
                  <input
                    id="login-phone"
                    type="tel"
                    placeholder="Nhập số điện thoại"
                    value={loginData.phone}
                    onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                    required
                    pattern="[0-9]{10,11}"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="login-password">Mật khẩu</label>
                  <input
                    id="login-password"
                    type="password"
                    placeholder="Nhập mật khẩu"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                </div>

                <div className="forgot-password">
                  <a href="#forgot">Quên mật khẩu?</a>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
              </form>
            )}

            {/* ========== REGISTER FORM ========== */}
            {activeTab === 'register' && (
              <>
                {/* Progress Steps */}
                {step !== 'phone' && (
                  <div className="progress-steps">
                    <div className="step completed" data-step="1">
                      Số điện thoại
                    </div>
                    <div className={`step ${step === 'otp' ? 'active' : 'completed'}`} data-step="2">
                      Xác thực OTP
                    </div>
                    <div className={`step ${step === 'password' ? 'active' : ''}`} data-step="3">
                      Hoàn tất
                    </div>
                  </div>
                )}

                {/* Step 1: Phone */}
                {step === 'phone' && (
                  <form onSubmit={handleRequestOTP}>
                    <p className="auth-subtitle">Nhập số điện thoại để nhận mã OTP</p>
                    <div className="form-group">
                      <label htmlFor="register-phone">Số điện thoại</label>
                      <input
                        id="register-phone"
                        type="tel"
                        placeholder="VD: 0912345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        pattern="[0-9]{10,11}"
                      />
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? 'Đang gửi...' : 'Nhận mã OTP'}
                    </button>
                  </form>
                )}

                {/* Step 2: OTP */}
                {step === 'otp' && (
                  <form onSubmit={handleVerifyOTP}>
                    <p className="auth-subtitle">Nhập mã OTP đã gửi đến {phone}</p>
                    <div className="otp-info">
                      <p>⏱️ Mã có hiệu lực trong {Math.floor(otpExpiry / 60)} phút</p>
                      <p className="otp-debug">💡 Kiểm tra console backend để xem mã OTP</p>
                    </div>
                    <div className="form-group">
                      <label htmlFor="otp">Mã OTP</label>
                      <input
                        id="otp"
                        type="text"
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                        pattern="[0-9]{6}"
                        maxLength={6}
                        className="otp-input"
                      />
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? 'Đang xác thực...' : 'Xác thực'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={resetRegister}>
                      Gửi lại mã
                    </button>
                  </form>
                )}

                {/* Step 3: Password */}
                {step === 'password' && (
                  <form onSubmit={handleRegister}>
                    <p className="auth-subtitle">Hoàn tất đăng ký tài khoản</p>
                    <div className="form-group">
                      <label htmlFor="fullname">Họ và tên</label>
                      <input
                        id="fullname"
                        type="text"
                        placeholder="Nhập họ và tên"
                        value={registerData.full_name}
                        onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="register-password">Mật khẩu</label>
                      <input
                        id="register-password"
                        type="password"
                        placeholder="Tối thiểu 6 ký tự"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="confirm-password">Xác nhận mật khẩu</label>
                      <input
                        id="confirm-password"
                        type="password"
                        placeholder="Nhập lại mật khẩu"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? 'Đang đăng ký...' : 'Hoàn tất'}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* Footer */}
            <div className="auth-footer">
              <p>
                Bằng việc đăng ký, bạn đồng ý với{' '}
                <a href="#terms">Điều khoản sử dụng</a> của chúng tôi
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;
