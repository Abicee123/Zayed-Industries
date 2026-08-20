import { create } from 'zustand';

// Define the shape of our User data
interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

// Define the shape of our Store
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
}

// Create the Zustand store
export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false, // Starts as false (logged out)
  user: null,
  
  login: (userData) => set({ 
    isAuthenticated: true, 
    user: userData 
  }),
  
  logout: () => set({ 
    isAuthenticated: false, 
    user: null 
  }),
}));