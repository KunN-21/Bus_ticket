// ========== USER TYPES ==========
export interface User {
  _id: string;
  phone: string;
  full_name: string;
  email?: string;
  created_at: string;
  is_verified: boolean;
}

export interface UserRegister {
  phone: string;
  full_name: string;
  password: string;
}

export interface UserLogin {
  phone: string;
  password: string;
}

export interface OTPRequest {
  phone: string;
}

export interface OTPVerify {
  phone: string;
  otp: string;
}

export interface OTPResponse {
  message: string;
  expires_in: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ========== TICKET TYPES ==========
export interface Ticket {
  _id: string;
  event_name: string;
  price: number;
  date: string;
  location: string;
  available_seats: number;
  departure_time: string;
  arrival_time: string;
  bus_type: string;
  route: string;
}

export interface TicketCreate {
  event_name: string;
  price: number;
  date: string;
  location: string;
  available_seats: number;
  departure_time: string;
  arrival_time: string;
  bus_type: string;
  route: string;
}

// ========== BOOKING TYPES ==========
export interface Booking {
  id: string;
  ticket_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  quantity: number;
  seat_numbers: string[];
  total_price: number;
  booking_date: string;
  status: string;
  payment_status: string;
  qr_code_url?: string;
  user_id?: string;
}

export interface BookingCreate {
  ticket_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  quantity: number;
  seat_numbers: string[];
  user_id?: string;
}

// ========== PAYMENT TYPES ==========
export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  method: string;
  status: string;
  qr_code_url?: string;
  created_at: string;
  completed_at?: string;
}

export interface PaymentCreate {
  booking_id: string;
  amount: number;
  method: string;
}
