import axios from 'axios';
import type { Ticket, TicketCreate, Booking, BookingCreate, UserRegister, UserLogin, AuthResponse, User, Payment, PaymentCreate, OTPRequest, OTPResponse, OTPVerify } from '../types';

const API_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ========== AUTH API ==========
export const authAPI = {
  requestOTP: (data: OTPRequest) => api.post<OTPResponse>('/auth/request-otp', data),
  verifyOTP: (data: OTPVerify) => api.post('/auth/verify-otp', data),
  register: (data: UserRegister) => api.post<AuthResponse>('/auth/register', data),
  login: (data: UserLogin) => api.post<AuthResponse>('/auth/login', data),
  getCurrentUser: (token: string) => api.get<User>(`/auth/me?token=${token}`),
};

// ========== TICKETS API ==========
export const ticketsAPI = {
  getAll: () => api.get<Ticket[]>('/tickets'),
  getById: (id: string) => api.get<Ticket>(`/tickets/${id}`),
  create: (data: TicketCreate) => api.post<Ticket>('/tickets', data),
  update: (id: string, data: Partial<TicketCreate>) => api.put<Ticket>(`/tickets/${id}`, data),
  delete: (id: string) => api.delete(`/tickets/${id}`),
};

// ========== BOOKINGS API ==========
export const bookingsAPI = {
  getAll: () => api.get<Booking[]>('/bookings'),
  getById: (id: string) => api.get<Booking>(`/bookings/${id}`),
  create: (data: BookingCreate) => api.post<Booking>('/bookings', data),
};

// ========== PAYMENTS API ==========
export const paymentsAPI = {
  create: (data: PaymentCreate) => api.post<Payment>('/payments', data),
  getById: (id: string) => api.get<Payment>(`/payments/${id}`),
  getByBookingId: (bookingId: string) => api.get<Payment>(`/payments/booking/${bookingId}`),
  confirm: (id: string) => api.post<Payment>(`/payments/${id}/confirm`),
};

export default api;
