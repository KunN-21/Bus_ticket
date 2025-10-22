import axios from 'axios';
import type { UserRegister, UserLogin, AuthResponse, User, OTPRequest, OTPResponse, OTPVerify } from '../types';

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

export default api;
