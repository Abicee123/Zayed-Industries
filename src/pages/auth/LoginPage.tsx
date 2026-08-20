import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, ArrowRight, ShieldCheck, Building2, UserCircle, Briefcase, ArrowLeft } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuthStore } from "../../store/authStore";

const SUBSIDIARIES = [
  "Archizaid",
  "Zypher Technologies",
  "Rizwix Technologies",
  "Zypher Digihub",
  "180 Productions",
  "FlyOrio",
  "Go Club",
  "Bright Events",
  "Maverix Academy"
];

export default function LoginPage() {
  // Multi-step State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<"admin" | "head" | "user" | null>(null);
  const [selectedCompany, setSelectedCompany] = useState("");

  // Auth State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const signIn = useAuthStore((state) => state.signIn);

  const handleRoleSelect = (role: "admin" | "head" | "user") => {
    setSelectedRole(role);
    if (role === "admin") {
      setStep(3); // Admins skip company selection
    } else {
      setStep(2); // Heads and Users pick their company
    }
  };

  const handleCompanySelect = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCompany) setStep(3);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoggingIn(true);

    const result = await signIn(email, password);
    
    if (result.error) {
      setError(result.error);
      setIsLoggingIn(false);
    }
  };

  const goBack = () => {
    setError("");
    if (step === 3 && selectedRole !== "admin") setStep(2);
    else if (step === 3 && selectedRole === "admin") setStep(1);
    else if (step === 2) setStep(1);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background styling */}
      <div className="absolute top-[-5%] left-[-10%] h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-indigo-500/10 blur-[80px] sm:blur-[100px]" />
      <div className="absolute bottom-[-5%] right-[-10%] h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-blue-500/10 blur-[80px] sm:blur-[100px]" />

      <div className="w-full max-w-md relative z-10 mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-widest text-slate-900 uppercase">
            Zayd Industries
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-2">Enterprise Operating System</p>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          
          {/* Optional Back Button */}
          {step > 1 && (
            <button onClick={goBack} className="absolute top-6 left-6 text-slate-400 hover:text-slate-700 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <div className="flex justify-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 1: SELECT ROLE */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 text-center mb-6">Identify Your Role</h2>
                <div className="space-y-3">
                  <button onClick={() => handleRoleSelect("admin")} className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white/60 hover:bg-slate-900 hover:text-white group transition-all">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" />
                      <span className="font-medium">System Admin</span>
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button onClick={() => handleRoleSelect("head")} className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white/60 hover:bg-slate-900 hover:text-white group transition-all">
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-5 w-5 text-blue-500 group-hover:text-blue-400" />
                      <span className="font-medium">Company Head</span>
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button onClick={() => handleRoleSelect("user")} className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white/60 hover:bg-slate-900 hover:text-white group transition-all">
                    <div className="flex items-center gap-3">
                      <UserCircle className="h-5 w-5 text-emerald-500 group-hover:text-emerald-400" />
                      <span className="font-medium">Employee / User</span>
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: SELECT COMPANY */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 text-center mb-6">Select Subsidiary</h2>
                <form onSubmit={handleCompanySelect} className="space-y-4">
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <select 
                      required
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      className="w-full h-12 rounded-xl border-none bg-white/60 px-4 pl-12 text-base outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all appearance-none"
                    >
                      <option value="" disabled>Choose your company...</option>
                      {SUBSIDIARIES.map((company) => (
                        <option key={company} value={company}>{company}</option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" disabled={!selectedCompany} className="w-full bg-slate-900 text-white h-12 rounded-xl text-base mt-2">
                    Continue <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </form>
              </motion.div>
            )}

            {/* STEP 3: CREDENTIALS */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 text-center mb-2">Secure Login</h2>
                <p className="text-center text-sm text-slate-500 mb-6 capitalize">
                  {selectedRole} Portal {selectedCompany ? `• ${selectedCompany}` : ""}
                </p>

                {error && (
                  <div className="mb-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-600 ring-1 ring-inset ring-rose-600/20 text-center">
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="w-full h-12 rounded-xl border-none bg-white/60 px-4 pl-12 text-base outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all" />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full h-12 rounded-xl border-none bg-white/60 px-4 pl-12 text-base outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all" />
                  </div>
                  <Button type="submit" disabled={isLoggingIn} className="w-full bg-slate-900 text-white shadow-md h-12 mt-4 rounded-xl text-base font-medium flex items-center justify-center gap-2">
                    {isLoggingIn ? "Authenticating..." : "Access System"}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}