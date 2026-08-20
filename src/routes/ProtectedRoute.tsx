import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import AppLayout from "../layouts/AppLayout";

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Instead of just <Outlet />, we return the AppLayout which contains the <Outlet />
  return <AppLayout />;
}