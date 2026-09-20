import { create } from "zustand";
import { persist } from "zustand/middleware"; // <-- Import persist
import { supabase } from "../supabase";

interface AuthState {
  user: any | null;
  role: 'admin' | 'head' | 'user' | null;
  companyId: number | null;
  employeeId: number | null;
  activeWorkspace: number | null;
  isLoading: boolean;
  
  checkSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  setActiveWorkspace: (id: number | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, 
      role: null, 
      companyId: null, 
      employeeId: null, 
      activeWorkspace: null, 
      isLoading: false, // Default to false

      checkSession: async () => {
        set({ isLoading: true });
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: emp } = await supabase.from('employees').select('access_level, company_id, id').eq('email', session.user.email).single();
          
          set({ 
            user: session.user, 
            role: emp?.access_level || 'user', 
            companyId: emp?.company_id || null, 
            employeeId: emp?.id || null, 
            // NOTE: activeWorkspace is omitted here so it doesn't overwrite the persisted value on refresh
            isLoading: false 
          }); 
        } else {
          set({ user: null, role: null, companyId: null, employeeId: null, activeWorkspace: null, isLoading: false });
        }
      },

      signIn: async (email, password) => {
        set({ isLoading: true });
        const { data: auth, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) { 
          set({ isLoading: false }); 
          return { error: error.message }; 
        }
        
        const { data: emp } = await supabase.from('employees').select('access_level, company_id, id').eq('email', email).single();
        
        set({ 
          user: auth.user, 
          role: emp?.access_level || 'user', 
          companyId: emp?.company_id || null, 
          employeeId: emp?.id || null, 
          activeWorkspace: null, // Reset workspace on fresh login
          isLoading: false 
        });
        
        return { error: null };
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, role: null, companyId: null, employeeId: null, activeWorkspace: null });
      },

      setActiveWorkspace: (id) => set({ activeWorkspace: id })
    }),
    {
      name: 'auth-storage', // The name of the key in localStorage
      // partialize ensures we don't accidentally freeze the UI by saving `isLoading: true` to localStorage
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        companyId: state.companyId,
        employeeId: state.employeeId,
        activeWorkspace: state.activeWorkspace,
      }),
    }
  )
);