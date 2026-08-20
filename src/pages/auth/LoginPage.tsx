import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { useAuthStore } from "../../store/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  // Bring in the login function from our global store
  const login = useAuthStore((state) => state.login);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Update the Zustand state to authenticate the user
    login({
      id: "1",
      name: "Admin User",
      email: "admin@zaydindustries.com",
      role: "admin"
    });

    // 2. Now navigate to the dashboard (the gatekeeper will let you through)
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-sm border"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded bg-black text-xl font-bold text-white">
            Z
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-500">
            Zayd Industries Business OS
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email address</label>
            <input 
              type="email" 
              defaultValue="admin@zaydindustries.com"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input 
              type="password" 
              defaultValue="password123"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <Button type="submit" className="w-full">
            Sign In
          </Button>
        </form>
      </motion.div>
    </div>
  );
}