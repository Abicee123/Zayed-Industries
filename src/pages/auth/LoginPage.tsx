import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuthStore } from "../../store/authStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const signIn = useAuthStore((state) => state.signIn);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoggingIn(true);

    const result = await signIn(email, password);
    
    if (result.error) {
      setError(result.error);
      setIsLoggingIn(false);
    }
    // If successful, the router will detect the session change and redirect automatically.
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements (scales safely on mobile) */}
      <div className="absolute top-[-5%] left-[-10%] h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-indigo-500/10 blur-[80px] sm:blur-[100px]" />
      <div className="absolute bottom-[-5%] right-[-10%] h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-blue-500/10 blur-[80px] sm:blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10 mx-auto"
      >
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-widest text-slate-900 uppercase">
            Zayd Industries
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-2">Enterprise Operating System</p>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex justify-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
          
          <h2 className="text-lg sm:text-xl font-semibold text-slate-800 text-center mb-6">
            Secure Global Login
          </h2>

          {error && (
            <div className="mb-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-600 ring-1 ring-inset ring-rose-600/20 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 rounded-xl border-none bg-white/60 px-4 pl-12 text-base outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all"
                  placeholder="admin@zaydindustries.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 rounded-xl border-none bg-white/60 px-4 pl-12 text-base outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full bg-slate-900 text-white hover:bg-slate-800 shadow-md h-12 mt-4 rounded-xl text-base font-medium transition-all flex items-center justify-center gap-2"
            >
              {isLoggingIn ? "Authenticating..." : "Access System"}
              {!isLoggingIn && <ArrowRight className="h-5 w-5" />}
            </Button>
          </form>
        </div>
        
        <p className="text-center text-xs text-slate-400 mt-6 px-4">
          Authorized personnel only. Access is monitored and logged.
        </p>
      </motion.div>
    </div>
  );
}