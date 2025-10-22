import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { authService } from '../services/auth';
import type { UserLogin } from '../types';
import './Auth.css';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UserLogin>({
    phone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      authService.setAuth(response.data);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Đăng nhập thất bại');
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
            <h2>Đăng nhập</h2>
            <p className="auth-subtitle">Đăng nhập để tiếp tục đặt vé</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="phone">Số điện thoại</label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="Nhập số điện thoại (VD: 0912345678)"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  pattern="[0-9]{10,11}"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Mật khẩu</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Nhập mật khẩu"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
