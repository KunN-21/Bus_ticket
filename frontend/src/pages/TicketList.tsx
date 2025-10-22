import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ticketsAPI } from '../services/api';
import type { Ticket } from '../types';
import TicketCard from '../components/TicketCard';
import './TicketList.css';

function TicketList() {
  const location = useLocation();
  const searchData = location.state;
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await ticketsAPI.getAll();
      let filteredTickets = response.data;

      // Filter by search criteria if available
      if (searchData) {
        filteredTickets = filteredTickets.filter(ticket => {
          const matchFrom = !searchData.from || ticket.route.toLowerCase().includes(searchData.from.toLowerCase());
          const matchTo = !searchData.to || ticket.route.toLowerCase().includes(searchData.to.toLowerCase());
          const matchDate = !searchData.date || ticket.date.startsWith(searchData.date);
          return matchFrom && matchTo && matchDate;
        });
      }

      setTickets(filteredTickets);
    } catch (err) {
      setError('Không thể tải danh sách vé');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-page">Đang tải...</div>;
  if (error) return <div className="error-page">{error}</div>;

  return (
    <div className="ticket-list-page">
      <div className="page-header">
        <h1>Danh sách vé xe</h1>
        <p>Tìm thấy {tickets.length} chuyến xe</p>
      </div>

      <div className="tickets-container">
        {tickets.length === 0 ? (
          <div className="no-tickets">
            <p>Không tìm thấy chuyến xe phù hợp</p>
          </div>
        ) : (
          <div className="tickets-list">
            {tickets.map((ticket) => (
              <TicketCard key={ticket._id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketList;
