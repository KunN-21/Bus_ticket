import { useNavigate } from 'react-router-dom';
import type { Ticket } from '../types';
import { Bus, Calendar, MapPin, Clock } from 'lucide-react';
import './TicketCard.css';

interface TicketCardProps {
  ticket: Ticket;
}

function TicketCard({ ticket }: TicketCardProps) {
  const navigate = useNavigate();

  const handleBook = () => {
    navigate(`/booking/${ticket._id}`);
  };

  return (
    <div className="ticket-card-modern">
      <div className="ticket-header">
        <div className="route-info">
          <div className="bus-type">
            <Bus size={20} />
            <span>{ticket.bus_type}</span>
          </div>
          <h3>{ticket.route}</h3>
        </div>
        <div className="ticket-price">
          <span className="price-amount">{ticket.price.toLocaleString()} ₫</span>
        </div>
      </div>

      <div className="ticket-body">
        <div className="time-section">
          <div className="time-item">
            <Clock size={18} />
            <div>
              <p className="time-label">Giờ đi</p>
              <p className="time-value">{ticket.departure_time}</p>
            </div>
          </div>
          <div className="time-divider">→</div>
          <div className="time-item">
            <Clock size={18} />
            <div>
              <p className="time-label">Giờ đến</p>
              <p className="time-value">{ticket.arrival_time}</p>
            </div>
          </div>
        </div>

        <div className="ticket-details">
          <div className="detail-item">
            <Calendar size={16} />
            <span>{new Date(ticket.date).toLocaleDateString('vi-VN')}</span>
          </div>
          <div className="detail-item">
            <MapPin size={16} />
            <span>{ticket.location}</span>
          </div>
          <div className="detail-item seats-available">
            🪑 Còn {ticket.available_seats} chỗ trống
          </div>
        </div>
      </div>

      <div className="ticket-footer">
        <button onClick={handleBook} className="btn-book-now">
          Đặt vé ngay
        </button>
      </div>
    </div>
  );
}

export default TicketCard;
