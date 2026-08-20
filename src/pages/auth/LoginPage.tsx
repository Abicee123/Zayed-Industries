import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, ArrowRight, Building2, UserCircle, Briefcase, ArrowLeft, Shield } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuthStore } from "../../store/authStore";
import { supabase } from "../../supabase";

export default function LoginPage() {
  const navigate = useNavigate();

  // Multi-step State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<"admin" | "head" | "user" | null>(null);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [companiesDb, setCompaniesDb] = useState<{id: number, name: string}[]>([]);
  
  // Head Auto-Fetch State
  const [headUsers, setHeadUsers] = useState<{name: string, email: string}[]>([]);

  // Auth State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const signIn = useAuthStore((state) => state.signIn);

  // Fetch Companies
  useEffect(() => {
    const fetchCompanies = async () => {
      const { data } = await supabase.from('companies').select('id, name');
      if (data) setCompaniesDb(data);
    };
    fetchCompanies();
  }, []);

  // Smooth, organic corporate color themes
  const activeTheme = useMemo(() => {
    if (!selectedCompany) {
      return { orb1: "bg-blue-400/20", orb2: "bg-indigo-400/20", button: "bg-slate-900 hover:bg-slate-800", text: "text-slate-900" };
    }
    const charSum = selectedCompany.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const themes = [
      { orb1: "bg-emerald-400/20", orb2: "bg-teal-400/20", button: "bg-emerald-700 hover:bg-emerald-800", text: "text-emerald-700" },
      { orb1: "bg-rose-400/20", orb2: "bg-orange-400/20", button: "bg-rose-700 hover:bg-rose-800", text: "text-rose-700" },
      { orb1: "bg-purple-400/20", orb2: "bg-fuchsia-400/20", button: "bg-purple-700 hover:bg-purple-800", text: "text-purple-700" },
      { orb1: "bg-cyan-400/20", orb2: "bg-blue-400/20", button: "bg-cyan-700 hover:bg-cyan-800", text: "text-cyan-700" },
      { orb1: "bg-indigo-400/20", orb2: "bg-violet-400/20", button: "bg-indigo-700 hover:bg-indigo-800", text: "text-indigo-700" },
    ];
    return themes[charSum % themes.length];
  }, [selectedCompany]);

  const handleRoleSelect = (role: "admin" | "head" | "user") => {
    setSelectedRole(role);
    if (role === "admin") setStep(3);
    else setStep(2);
  };

  const handleCompanySelect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    // The Magic: Auto-Fetch Heads from Database
    if (selectedRole === 'head') {
      const company = companiesDb.find(c => c.name === selectedCompany);
      if (company) {
        const { data } = await supabase
          .from('employees')
          .select('name, email')
          .eq('company_id', company.id)
          .eq('access_level', 'head');
        
        if (data && data.length > 0) {
          setHeadUsers(data);
          if (data.length === 1) {
            setEmail(data[0].email); // Auto-fill if only 1 head
          } else {
            setEmail(""); // Clear it so they must choose from dropdown
          }
        } else {
          setHeadUsers([]); // Fallback if no heads are in the database yet
        }
      }
    }
    setStep(3);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoggingIn(true);

    const result = await signIn(email, password);
    
    if (result.error) {
      setError("Invalid credentials. Please try again.");
      setIsLoggingIn(false);
    } else {
      navigate("/dashboard");
    }
  };

  const goBack = () => {
    setError("");
    setEmail("");
    setHeadUsers([]);
    if (step === 3 && selectedRole !== "admin") setStep(2);
    else if (step === 3 && selectedRole === "admin") setStep(1);
    else if (step === 2) setStep(1);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#f8fafc] flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-1000">
      
      {/* Smooth Organic Background Animations */}
      <motion.div animate={{ x: [0, 30, 0, -30, 0], y: [0, -30, -10, 20, 0], scale: [1, 1.1, 0.9, 1.05, 1] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className={`absolute top-[10%] left-[15%] h-96 w-96 rounded-full blur-[100px] mix-blend-multiply transition-colors duration-1000 ${activeTheme.orb1}`} />
      <motion.div animate={{ x: [0, -40, 10, 30, 0], y: [0, 40, -20, -10, 0], scale: [1, 0.9, 1.1, 0.95, 1] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} className={`absolute bottom-[10%] right-[15%] h-96 w-96 rounded-full blur-[100px] mix-blend-multiply transition-colors duration-1000 ${activeTheme.orb2}`} />

      <div className="w-full max-w-md relative z-10">
        
        {/* Main Clean Card */}
        <div className="rounded-[24px] border border-white/60 bg-white/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl relative overflow-hidden">
          
          {step > 1 && (
            <button onClick={goBack} className="absolute top-6 left-6 text-slate-400 hover:text-slate-800 transition-colors z-20 bg-slate-50 p-2 rounded-full hover:bg-slate-100">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          <div className="flex flex-col items-center justify-center mb-8 pt-2">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm mb-4 transition-colors duration-700 ${step === 3 && selectedCompany ? activeTheme.button : 'bg-slate-900 text-white'}`}>
              {step === 3 && selectedCompany ? (
                <span className="text-xl font-bold tracking-wider text-white">{getInitials(selectedCompany)}</span>
              ) : (
                <span className="text-2xl font-bold text-white">Z</span>
              )}
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 text-center tracking-tight">
              {step === 3 && selectedCompany ? selectedCompany : "Zayd Industries"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {step === 1 && "Welcome back. Please select your role."}
              {step === 2 && "Select your workspace to continue."}
              {step === 3 && "Enter your credentials to sign in."}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 1: SELECT ROLE */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                <div className="space-y-3">
                  <button onClick={() => handleRoleSelect("admin")} className="w-full flex items-center p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm group transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-colors mr-4"><Shield className="h-5 w-5" /></div>
                    <div className="text-left flex-1"><span className="block font-medium text-slate-900">System Admin</span><span className="block text-xs text-slate-500">Full platform access</span></div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
                  </button>
                  <button onClick={() => handleRoleSelect("head")} className="w-full flex items-center p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm group transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-colors mr-4"><Briefcase className="h-5 w-5" /></div>
                    <div className="text-left flex-1"><span className="block font-medium text-slate-900">Company Head</span><span className="block text-xs text-slate-500">Manage your subsidiary</span></div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
                  </button>
                  <button onClick={() => handleRoleSelect("user")} className="w-full flex items-center p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm group transition-all">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-colors mr-4"><UserCircle className="h-5 w-5" /></div>
                    <div className="text-left flex-1"><span className="block font-medium text-slate-900">Employee</span><span className="block text-xs text-slate-500">Access your workspace</span></div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: SELECT COMPANY */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                <form onSubmit={handleCompanySelect} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 ml-1">Workspace</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <select required value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 pl-12 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all appearance-none text-slate-700 font-medium">
                        <option value="" disabled>Select your company...</option>
                        {companiesDb.map((company) => (
                          <option key={company.id} value={company.name}>{company.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button type="submit" disabled={!selectedCompany} className={`w-full h-12 rounded-xl text-sm font-medium transition-all ${activeTheme.button} text-white`}>
                    Continue
                  </Button>
                </form>
              </motion.div>
            )}

            {/* STEP 3: CREDENTIALS */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                {error && (
                  <div className="mb-6 rounded-lg bg-rose-50 p-3 text-sm text-rose-600 border border-rose-100 text-center">
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  
                  {/* AUTO-FETCH HEAD LOGIC */}
                  {selectedRole === 'head' && headUsers.length > 0 ? (
                    <div className="space-y-4">
                      {headUsers.length > 1 ? (
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700 ml-1">Select Profile</label>
                          <select required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all appearance-none text-slate-700 font-medium">
                            <option value="" disabled>Choose your profile...</option>
                            {headUsers.map((head) => (
                              <option key={head.email} value={head.email}>{head.name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-full ${activeTheme.orb1} flex items-center justify-center text-slate-700 font-bold text-lg border border-white`}>
                            {headUsers[0].name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Welcome back,</p>
                            <p className="text-base font-bold text-slate-800">{headUsers[0].name}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Standard Email Input for Admin, User, or fallback */
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 ml-1">Email address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 pl-11 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" />
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 ml-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 pl-11 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" />
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoggingIn} className={`w-full h-12 mt-2 rounded-xl text-sm font-medium transition-all shadow-sm ${activeTheme.button} text-white`}>
                    {isLoggingIn ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">Secure login for Zayd Industries personnel.</p>
        </div>
      </div>
    </div>
  );
}