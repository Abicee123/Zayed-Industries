import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useDataStore } from "../store/dataStore";
import ProtectedRoute from "./ProtectedRoute";

// FIXED IMPORT: Now properly pointing to AppLayout
import AppLayout from "../layouts/AppLayout"; 

import LoginPage from "../pages/auth/LoginPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import ProjectsPage from "../pages/projects/ProjectsPage";
import ProjectDetailsPage from "../pages/projects/ProjectDetailsPage";
import EmployeesPage from "../pages/employees/EmployeesPage";
import CustomersPage from "../pages/customers/CustomersPage";
import FinancePage from "../pages/finance/FinancePage";
import InvoicesPage from "../pages/invoices/InvoicesPage";
import SettingsPage from "../pages/settings/SettingsPage";

export default function AppRouter() {
  const fetchAllData = useDataStore((state) => state.fetchAllData);
  const { checkSession, user } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, fetchAllData]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* The Gatekeeper */}
        <Route element={<ProtectedRoute />}>
          
          {/* FIXED WRAPPER: Wrapping the dashboard pages inside AppLayout so the Sidebar shows up */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailsPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}