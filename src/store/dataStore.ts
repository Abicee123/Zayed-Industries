import { create } from "zustand";
import { supabase } from "../supabase";

export interface Project {
  id: number;
  title: string;
  tag: string;
  startDate: string;
  dueDate: string;
  attachments: number;
  comments: number;
  color: string;
  status: "todo" | "inProgress" | "completed";
}

export interface Employee {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  age: string;
  proofId: string;
  initial: string;
}

export interface Customer {
  id: number;
  name: string;
  contact: string;
  projects: number;
  spent: string;
  status: "Active" | "Onboarding" | "Inactive";
}

export interface Invoice {
  id: string;
  client: string;
  amount: string;
  date: string;
  status: "Paid" | "Pending" | "Processing" | "Overdue";
}

interface DataState {
  projects: Project[];
  employees: Employee[];
  customers: Customer[];
  invoices: Invoice[];
  
  fetchAllData: () => Promise<void>;
  
  addProject: (project: Omit<Project, "id">) => Promise<void>;
  moveProject: (id: number, newStatus: Project["status"]) => Promise<void>;
  updateProject: (id: number, updates: Partial<Project>) => Promise<void>; // <-- NEW FUNCTION
  
  addEmployee: (employee: Omit<Employee, "id" | "initial">) => Promise<void>;
  addCustomer: (customer: Omit<Customer, "id" | "projects" | "spent">) => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, "id">) => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  projects: [],
  employees: [],
  customers: [],
  invoices: [],

  fetchAllData: async () => {
    const [ { data: projects }, { data: employees }, { data: customers }, { data: invoices } ] = await Promise.all([
      supabase.from('projects').select('*').order('id', { ascending: true }),
      supabase.from('employees').select('*').order('id', { ascending: true }),
      supabase.from('customers').select('*').order('id', { ascending: true }),
      supabase.from('invoices').select('*').order('created_at', { ascending: false })
    ]);

    set({
      projects: projects || [],
      employees: employees || [],
      customers: customers || [],
      invoices: invoices || []
    });
  },

  addEmployee: async (employee) => {
    const initial = employee.name.charAt(0).toUpperCase();
    const { data } = await supabase.from('employees').insert([{ ...employee, initial }]).select().single();
    if (data) set((state) => ({ employees: [...state.employees, data] }));
  },

  addProject: async (project) => {
    const { data } = await supabase.from('projects').insert([project]).select().single();
    if (data) set((state) => ({ projects: [...state.projects, data] }));
  },

  moveProject: async (id, newStatus) => {
    set((state) => ({ projects: state.projects.map(p => p.id === id ? { ...p, status: newStatus } : p) }));
    await supabase.from('projects').update({ status: newStatus }).eq('id', id);
  },

  // NEW: Update any detail of a project
  updateProject: async (id, updates) => {
    set((state) => ({ projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p) }));
    await supabase.from('projects').update(updates).eq('id', id);
  },

  addCustomer: async (customer) => {
    const { data } = await supabase.from('customers').insert([{ ...customer, projects: 0, spent: "$0" }]).select().single();
    if (data) set((state) => ({ customers: [...state.customers, data] }));
  },

  addInvoice: async (invoice) => {
    const currentInvoices = get().invoices;
    const nextNumber = currentInvoices.length + 90;
    const nextId = `INV-2026-0${nextNumber}`;
    const { data } = await supabase.from('invoices').insert([{ ...invoice, id: nextId }]).select().single();
    if (data) set((state) => ({ invoices: [data, ...state.invoices] }));
  }
}));