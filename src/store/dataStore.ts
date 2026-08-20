import { create } from "zustand";
import { supabase } from "../supabase";
import { useAuthStore } from "./authStore";

interface DataState {
  companies: any[]; projects: any[]; employees: any[]; customers: any[]; invoices: any[]; isLoading: boolean;
  fetchAllData: () => Promise<void>;
}

export const useDataStore = create<DataState>((set) => ({
  companies: [], projects: [], employees: [], customers: [], invoices: [], isLoading: false,

  fetchAllData: async () => {
    set({ isLoading: true });
    const { role, companyId, activeWorkspace } = useAuthStore.getState();
    
    // THE ENGINE: If Admin enters a workspace, strictly lock queries to that ID!
    const targetCompanyId = (role === 'admin' && activeWorkspace) ? activeWorkspace : (role !== 'admin' ? companyId : null);

    try {
      let companiesQuery = supabase.from('companies').select('*');
      let projectsQuery = supabase.from('projects').select('*');
      let employeesQuery = supabase.from('employees').select('*');
      let customersQuery = supabase.from('customers').select('*');
      let invoicesQuery = supabase.from('invoices').select('*');

      if (targetCompanyId) {
        companiesQuery = companiesQuery.eq('id', targetCompanyId);
        projectsQuery = projectsQuery.eq('company_id', targetCompanyId);
        employeesQuery = employeesQuery.eq('company_id', targetCompanyId);
        customersQuery = customersQuery.eq('company_id', targetCompanyId);
        invoicesQuery = invoicesQuery.eq('company_id', targetCompanyId);
      }

      const [ { data: companies }, { data: projects }, { data: employees }, { data: customers }, { data: invoices } ] = await Promise.all([
        companiesQuery, projectsQuery, employeesQuery, customersQuery, invoicesQuery
      ]);

      set({
        companies: companies || [], projects: projects || [], employees: employees || [],
        customers: customers || [], invoices: invoices || [], isLoading: false
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      set({ isLoading: false });
    }
  }
}));