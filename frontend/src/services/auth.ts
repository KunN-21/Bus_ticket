import type { AuthResponse, User } from '../types';

const TOKEN_KEY = 'access_token';
const USER_KEY = 'user';

export const authService = {
  setAuth: (authData: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, authData.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(authData.user));
  },

  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser: (): User | null => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
