import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile } from '../types';
import api from '../lib/api';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (credentials: { email: string; pass: string; role: string }) => Promise<void>;
  register: (data: { name: string; email: string; pass: string; role: string }) => Promise<void>;
  checkAuth: () => Promise<void>;
  logout: () => void;
  setUser: (user: UserProfile | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: false,

      login: async ({ email, pass }) => {
        try {
          const response = await api.post('/login', { email, password: pass });
          const { user, access_token } = response.data;
          set({ user, token: access_token, isAuthenticated: true });
        } catch (error) {
          console.error('Login failed', error);
          throw error;
        }
      },

      register: async ({ name, email, pass, role }) => {
        try {
          const response = await api.post('/register', { name, email, password: pass, role });
          const { user, access_token } = response.data;
          set({ user, token: access_token, isAuthenticated: true });
        } catch (error) {
          console.error('Registration failed', error);
          throw error;
        }
      },

      checkAuth: async () => {
        const token = get().token;
        if (!token) {
          set({ isInitialized: true, isAuthenticated: false });
          return;
        }

        try {
          const response = await api.get('/me');
          set({ user: response.data, isAuthenticated: true, isInitialized: true });
        } catch (error: any) {
          // Only clear session if it's explicitly an authentication error (401)
          if (error.response?.status === 401) {
            set({ user: null, token: null, isAuthenticated: false, isInitialized: true });
          } else {
            // For other errors (network, 500), we keep the session but mark as initialized
            set({ isInitialized: true });
            console.error('Auth verification failed, but keeping session', error);
          }
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        isAuthenticated: state.isAuthenticated 
      }),
      onRehydrateStorage: () => (state) => {
        setTimeout(() => {
          state?.checkAuth();
        }, 0);
      },
    }
  )
);
