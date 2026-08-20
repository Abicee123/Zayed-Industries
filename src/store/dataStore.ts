import { create } from "zustand";

export interface Project {
  id: number;
  title: string;
  tag: string;
  startDate: string; // New field
  dueDate: string;   // New field
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
  age: string;       // New field
  proofId: string;   // New field (Aadhaar / PAN)
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
  addProject: (project: Omit<Project, "id">) => void;
  moveProject: (id: number, newStatus: Project["status"]) => void;
  
  employees: Employee[];
  addEmployee: (employee: Omit<Employee, "id" | "initial">) => void;

  customers: Customer[];
  addCustomer: (customer: Omit<Customer, "id" | "projects" | "spent">) => void;

  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, "id">) => void;
}

export const useDataStore = create<DataState>((set) => ({
  // --- PROJECTS DATA ---
  projects: [
    { id: 1, title: "Luxury Master Bedroom Renders", tag: "3D Visualization", startDate: "Oct 10, 2026", dueDate: "Oct 25, 2026", attachments: 3, comments: 4, color: "bg-purple-100 text-purple-700 ring-purple-600/20", status: "todo" },
    { id: 2, title: "Lumion 3D Walkthrough - Villa", tag: "Client Presentation", startDate: "Oct 12, 2026", dueDate: "Oct 30, 2026", attachments: 5, comments: 2, color: "bg-blue-100 text-blue-700 ring-blue-600/20", status: "todo" },
  ],
  addProject: (project) => set((state) => ({ projects: [...state.projects, { ...project, id: Date.now() }] })),
  moveProject: (id, newStatus) => set((state) => ({ projects: state.projects.map(p => p.id === id ? { ...p, status: newStatus } : p) })),

  // --- EMPLOYEES DATA ---
  employees: [
    { id: 1, name: "Sarah Jenkins", role: "Lead Architect", email: "sarah@zaydindustries.com", phone: "+1 (555) 019-2834", age: "34", proofId: "XXXX-XXXX-XXXX", initial: "S" },
    { id: 2, name: "Marcus Chen", role: "3D Visualization Artist", email: "marcus@zaydindustries.com", phone: "+1 (555) 012-9482", age: "28", proofId: "XXXX-XXXX-XXXX", initial: "M" },
  ],
  addEmployee: (employee) => set((state) => ({ employees: [...state.employees, { ...employee, id: Date.now(), initial: employee.name.charAt(0).toUpperCase() }] })),

  // --- CUSTOMERS DATA ---
  customers: [
    { id: 1, name: "Nexus Architectural", contact: "James Wilson", projects: 12, spent: "$145,000", status: "Active" },
  ],
  addCustomer: (customer) => set((state) => ({ customers: [...state.customers, { ...customer, id: Date.now(), projects: 0, spent: "$0" }] })),

  // --- INVOICES DATA ---
  invoices: [
    { id: "INV-2026-089", client: "Nexus Architectural", amount: "$12,500.00", date: "Oct 18, 2026", status: "Paid" },
  ],
  addInvoice: (invoice) => set((state) => {
    const nextNumber = state.invoices.length + 90;
    const nextId = `INV-2026-0${nextNumber}`;
    return { invoices: [{ ...invoice, id: nextId }, ...state.invoices] };
  })
}));