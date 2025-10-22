import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeftRight, MapPin, Calendar, User, Phone, Mail } from 'lucide-react';
import { authService } from '../services/auth';
import './Home.css';

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getUser());
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  
  const [searchData, setSearchData] = useState({
    from: '',
    to: '',
    date: new Date().toISOString().split('T')[0],
    passengers: 1,
  });

  useEffect(() => {
    setUser(authService.getUser());
  }, []);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    window.location.href = '/';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/tickets', { state: searchData });
  };

  const popularRoutes = [
    { from: 'TP Hồ Chí Minh', to: 'Đà Lạt', price: '350.000đ', distance: '310km', time: '11 giờ' },
    { from: 'TP Hồ Chí Minh', to: 'Cần Thơ', price: '200.000đ', distance: '167km', time: '4 giờ 30 phút' },
    { from: 'Đà Lạt', to: 'TP Hồ Chí Minh', price: '300.000đ', distance: '293km', time: '8 giờ' },
    { from: 'Đà Nẵng', to: 'TP Hồ Chí Minh', price: '900.000đ', distance: '850km', time: '23 giờ' },
  ];

  return (
    <div className="home-container">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-bar-content">
          <div className="top-bar-left">
            <Phone size={14} />
            <span>Hotline: 1900 6067</span>
          </div>
          <div className="top-bar-right">
            <Mail size={14} />
            <span>support@bookingticket.vn</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">🚌</div>
            <div className="logo-text">
              <span className="logo-brand">BOOKING</span>
              <span className="logo-sub">TICKET</span>
            </div>
          </div>
          
          <nav className="nav-menu">
            <Link to="/">Trang chủ</Link>
            <Link to="/tickets">Lịch trình</Link>
            <a href="#tracuu">Tra cứu vé</a>
            <a href="#tintuc">Tin tức</a>
            <a href="#lienhe">Liên hệ</a>
          </nav>

          <div className="header-actions">
            {user ? (
              <div className="user-menu">
                <div className="user-avatar">
                  <User size={20} />
                </div>
                <div className="user-dropdown">
                  <span>{user.full_name}</span>
                  <button onClick={handleLogout} className="btn-logout-link">
                    Đăng xuất
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/auth" className="btn-auth">
                <User size={18} />
                Đăng nhập/Đăng ký
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="hero-banner">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="search-card">
            <div className="trip-type">
              <label className={tripType === 'one-way' ? 'active' : ''}>
                <input
                  type="radio"
                  name="tripType"
                  checked={tripType === 'one-way'}
                  onChange={() => setTripType('one-way')}
                />
                <span>Một chiều</span>
              </label>
              <label className={tripType === 'round-trip' ? 'active' : ''}>
                <input
                  type="radio"
                  name="tripType"
                  checked={tripType === 'round-trip'}
                  onChange={() => setTripType('round-trip')}
                />
                <span>Khứ hồi</span>
              </label>
            </div>

            <form className="search-form" onSubmit={handleSearch}>
              <div className="search-row">
                <div className="search-field">
                  <label htmlFor="from">
                    <MapPin size={16} />
                    Điểm đi
                  </label>
                  <input
                    id="from"
                    type="text"
                    placeholder="Chọn điểm đi"
                    value={searchData.from}
                    onChange={(e) => setSearchData({ ...searchData, from: e.target.value })}
                    required
                  />
                </div>

                <button type="button" className="btn-swap">
                  <ArrowLeftRight size={20} />
                </button>

                <div className="search-field">
                  <label htmlFor="to">
                    <MapPin size={16} />
                    Điểm đến
                  </label>
                  <input
                    id="to"
                    type="text"
                    placeholder="Chọn điểm đến"
                    value={searchData.to}
                    onChange={(e) => setSearchData({ ...searchData, to: e.target.value })}
                    required
                  />
                </div>

                <div className="search-field">
                  <label htmlFor="date">
                    <Calendar size={16} />
                    Ngày đi
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={searchData.date}
                    onChange={(e) => setSearchData({ ...searchData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="search-field small">
                  <label htmlFor="passengers">Số vé</label>
                  <input
                    id="passengers"
                    type="number"
                    min="1"
                    max="10"
                    value={searchData.passengers}
                    onChange={(e) => setSearchData({ ...searchData, passengers: Number.parseInt(e.target.value) })}
                    required
                  />
                </div>

                <button type="submit" className="btn-search">
                  Tìm chuyến xe
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Popular Routes */}
      <section className="popular-routes">
        <div className="section-content">
          <div className="section-header">
            <h2>TUYẾN PHỔ BIẾN</h2>
            <p>Được khách hàng tin tưởng và lựa chọn</p>
          </div>

          <div className="routes-grid">
            {popularRoutes.map((route) => (
              <div key={`${route.from}-${route.to}`} className="route-card">
                <div className="route-header">
                  <h3>Tuyến xe từ</h3>
                  <h4>{route.from}</h4>
                </div>
                <div className="route-body">
                  <div className="route-item">
                    <span className="route-destination">{route.to}</span>
                    <div className="route-info">
                      <span className="route-price">{route.price}</span>
                      <span className="route-details">{route.distance} - {route.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="section-content">
          <h2 className="stats-title">BOOKING TICKET - CHẤT LƯỢNG LÀ DANH DỰ</h2>
          <p className="stats-subtitle">Được khách hàng tin tưởng và lựa chọn</p>
          
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">20 Triệu</div>
              <div className="stat-label">Lượt khách</div>
              <p>Phục vụ hơn 20 triệu lượt khách bình quân 1 năm trên toàn quốc</p>
            </div>

            <div className="stat-card">
              <div className="stat-number">350+</div>
              <div className="stat-label">Phòng vé - Bưu cục</div>
              <p>Có hơn 350 phòng vé, trạm trung chuyển, bến xe,... trên toàn hệ thống</p>
            </div>

            <div className="stat-card">
              <div className="stat-number">1,000+</div>
              <div className="stat-label">Chuyến xe</div>
              <p>Phục vụ hơn 1,000 chuyến xe đường dài và liên tỉnh mỗi ngày</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-col">
            <div className="footer-logo">
              <div className="logo-icon">🚌</div>
              <div className="logo-text">
                <span className="logo-brand">BOOKING</span>
                <span className="logo-sub">TICKET</span>
              </div>
            </div>
            <p className="footer-desc">Hệ thống đặt vé xe khách hàng đầu Việt Nam</p>
            <div className="footer-social">
              <a href="#fb" aria-label="Facebook">📘</a>
              <a href="#yt" aria-label="YouTube">📺</a>
            </div>
          </div>

          <div className="footer-col">
            <h4>Về chúng tôi</h4>
            <ul>
              <li><a href="#gioithieu">Giới thiệu</a></li>
              <li><a href="#tuyendung">Tuyển dụng</a></li>
              <li><a href="#chinhanh">Mạng lưới văn phòng</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Hỗ trợ</h4>
            <ul>
              <li><a href="#huongdan">Hướng dẫn đặt vé</a></li>
              <li><a href="#hoidap">Câu hỏi thường gặp</a></li>
              <li><a href="#chinhsach">Chính sách & Quy định</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Liên hệ</h4>
            <p><Phone size={14} /> Hotline: 1900 6067</p>
            <p><Mail size={14} /> Email: support@bookingticket.vn</p>
            <p>Địa chỉ: 486 Lê Văn Lương, Q.7, TP.HCM</p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 BookingTicket. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
