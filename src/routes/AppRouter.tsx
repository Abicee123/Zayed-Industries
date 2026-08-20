import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"; // <-- Added BrowserRouter here
import { useAuthStore } from "../store/authStore";
import { useDataStore } from "../store/dataStore";
import ProtectedRoute from "./ProtectedRoute";

import LoginPage from "../pages/auth/LoginPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import ProjectsPage from "../pages/projects/ProjectsPage";
import ProjectDetailsPage from "../pages/projects/ProjectDetailsPage";
import EmployeesPage from "../pages/employees/EmployeesPage";
import CustomersPage from "../pages/customers/CustomersPage";
import FinancePage from "../pages/finance/FinancePage";
import InvoicesPage from "../pages/invoices/InvoicesPage";

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
    /* We wrap everything in BrowserRouter to fix the crash! */
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailsPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}