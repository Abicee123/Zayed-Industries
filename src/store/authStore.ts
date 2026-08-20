import { create } from "zustand";
import { supabase } from "../supabase";

interface AuthState {
  user: any | null;
  role: 'admin' | 'head' | 'user' | null;
  companyId: number | null;
  isLoading: boolean;
  
  // Actions
  checkSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  companyId: null,
  isLoading: true, // Starts true to prevent flashing the login screen while checking session

  checkSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Note: We will add the logic to fetch the exact role/company from the employees table here soon!
      set({ user: session.user, role: 'admin', isLoading: false }); 
    } else {
      set({ user: null, role: null, isLoading: false });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      set({ isLoading: false });
      return { error: error.message };
    }

    set({ user: data.user, role: 'admin', isLoading: false });
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, role: null, companyId: null });
  }
}));