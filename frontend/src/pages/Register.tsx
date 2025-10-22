import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { authService } from '../services/auth';
import type { UserRegister } from '../types';
import './Auth.css';

function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'otp' | 'password'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState<UserRegister>({
    phone: '',
    full_name: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpExpiry, setOtpExpiry] = useState(0);

  // Step 1: Request OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.requestOTP({ phone });
      setOtpExpiry(response.data.expires_in);
      setStep('otp');
      alert('📱 ' + response.data.message);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Không thể gửi OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authAPI.verifyOTP({ phone, otp });
      setFormData({ ...formData, phone });
      setStep('password');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'OTP không hợp lệ');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set password and register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register(formData);
      authService.setAuth(response.data);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-left">
          <div className="auth-branding">
            <h1>🎫 BookingTicket</h1>
            <p>Hệ thống đặt vé xe khách trực tuyến</p>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-card">
            <h2>Đăng ký tài khoản</h2>
            
            {/* Progress Indicator */}
            <div className="progress-steps">
              <div className={`step ${step === 'phone' ? 'active' : 'completed'}`}>1. Số điện thoại</div>
              <div className={`step ${step === 'otp' ? 'active' : step === 'password' ? 'completed' : ''}`}>2. Xác thực OTP</div>
              <div className={`step ${step === 'password' ? 'active' : ''}`}>3. Đặt mật khẩu</div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Step 1: Phone Number */}
            {step === 'phone' && (
              <form onSubmit={handleRequestOTP}>
                <p className="auth-subtitle">Nhập số điện thoại để nhận mã OTP</p>
                <div className="form-group">
                  <label htmlFor="phone">Số điện thoại</label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="VD: 0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    pattern="[0-9]{10,11}"
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
                </button>
              </form>
            )}

            {/* Step 2: OTP Verification */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOTP}>
                <p className="auth-subtitle">Nhập mã OTP đã gửi đến {phone}</p>
                <div className="otp-info">
                  <p>⏱️ Mã có hiệu lực trong {Math.floor(otpExpiry / 60)} phút</p>
                  <p className="otp-debug">💡 Kiểm tra console/terminal để xem mã OTP (demo)</p>
                </div>
                <div className="form-group">
                  <label htmlFor="otp">Mã OTP</label>
                  <input
                    id="otp"
                    type="text"
                    placeholder="Nhập 6 số"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    pattern="[0-9]{6}"
                    maxLength={6}
                    className="otp-input"
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Đang xác thực...' : 'Xác thực OTP'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setStep('phone')}>
                  Gửi lại OTP
                </button>
              </form>
            )}

            {/* Step 3: Set Password */}
            {step === 'password' && (
              <form onSubmit={handleRegister}>
                <p className="auth-subtitle">Hoàn tất đăng ký</p>
                <div className="form-group">
                  <label htmlFor="fullname">Họ và tên</label>
                  <input
                    id="fullname"
                    type="text"
                    placeholder="Nhập họ và tên"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Mật khẩu</label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Đang đăng ký...' : 'Hoàn tất đăng ký'}
                </button>
              </form>
            )}

            <div className="auth-footer">
              <p>
                Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
