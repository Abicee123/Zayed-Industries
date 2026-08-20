import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function ProtectedRoute() {
  const { user, isLoading } = useAuthStore();

  // Show a clean loading spinner while checking the Supabase session
  if (isLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"></div>
      </div>
    );
  }

  // If they have a user token, let them through. If not, kick them to the login page!
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}