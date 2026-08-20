import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "../pages/landing/LandingPage";
import LoginPage from "../pages/auth/LoginPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import FinancePage from "../pages/finance/FinancePage";
import EmployeesPage from "../pages/employees/EmployeesPage";
import CustomersPage from "../pages/customers/CustomersPage";
import ProjectsPage from "../pages/projects/ProjectsPage";
import ProjectDetailsPage from "../pages/projects/ProjectDetailsPage";
import InvoicesPage from "../pages/invoices/InvoicesPage";
import SettingsPage from "../pages/settings/SettingsPage";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}