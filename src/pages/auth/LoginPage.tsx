import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Building2, UserCircle, Briefcase, ArrowLeft, Shield, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuthStore } from "../../store/authStore";
import { supabase } from "../../supabase";

// --- CUSTOM 3D-STYLE ANIMATED GRAPHIC ---
const AnimatedGraphic = () => {
  return (
    <div className="relative w-[300px] h-[350px] flex items-center justify-center mt-10">
      {/* Floor Shadow */}
      <div className="absolute -bottom-4 w-64 h-16 bg-black/5 blur-xl rounded-[100%]" />
      
      {/* Yellow Cylinder Back */}
      <motion.div 
        animate={{ y: [0, -10, 0] }} 
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} 
        className="absolute bottom-16 right-6 w-20 h-48 bg-amber-400 rounded-[2.5rem] shadow-[inset_-12px_-12px_20px_rgba(0,0,0,0.15)] z-0" 
      />
      
      {/* Gray Cylinder Left */}
      <motion.div 
        animate={{ y: [0, -12, 0] }} 
        transition={{ repeat: Infinity, duration: 4.5, delay: 0.5, ease: "easeInOut" }} 
        className="absolute bottom-8 left-6 w-24 h-36 bg-slate-700 rounded-[3rem] shadow-[inset_-10px_-10px_20px_rgba(0,0,0,0.25)] z-10" 
      />
      
      {/* Main Blue Cylinder Center */}
      <motion.div 
        animate={{ y: [0, -15, 0] }} 
        transition={{ repeat: Infinity, duration: 5, delay: 1, ease: "easeInOut" }} 
        className="absolute bottom-4 left-24 w-28 h-60 bg-blue-600 rounded-[3.5rem] shadow-[inset_-16px_-16px_24px_rgba(0,0,0,0.2),_15px_15px_30px_rgba(0,0,0,0.15)] z-20" 
      />
      
      {/* Small Yellow Cylinder Front */}
      <motion.div 
        animate={{ y: [0, -8, 0] }} 
        transition={{ repeat: Infinity, duration: 3.5, delay: 1.5, ease: "easeInOut" }} 
        className="absolute -bottom-2 right-20 w-20 h-28 bg-amber-300 rounded-[2.5rem] shadow-[inset_-8px_-8px_16px_rgba(0,0,0,0.15),_8px_8px_16px_rgba(0,0,0,0.1)] z-30" 
      />

      {/* Floating Dark Screen/Phone Object */}
      <motion.div 
        animate={{ y: [0, -20, 0], rotateZ: [0, 2, -2, 0] }} 
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }} 
        className="absolute top-0 left-28 w-24 h-48 bg-slate-900 rounded-[1.5rem] border-[4px] border-slate-800 shadow-2xl flex items-center justify-center z-40 overflow-hidden"
      >
         <div className="w-full h-full relative">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-slate-700 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <span className="text-amber-400 font-black tracking-tighter text-xl mb-1">ZAYD</span>
              <span className="text-blue-500 font-bold text-[8px] uppercase tracking-widest">Login</span>
            </div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-700 rounded-full" />
         </div>
      </motion.div>
    </div>
  );
};

export default function LoginPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<"admin" | "head" | "user" | null>(null);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [companiesDb, setCompaniesDb] = useState<{id: number, name: string, logo_url: string | null}[]>([]);
  const [headUsers, setHeadUsers] = useState<{name: string, email: string}[]>([]);
  
  const [adminLogo, setAdminLogo] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const signIn = useAuthStore((state) => state.signIn);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: compData } = await supabase.from('companies').select('id, name, logo_url');
      if (compData) setCompaniesDb(compData);

      const { data: adminData } = await supabase
        .from('employees')
        .select('profile_image_url')
        .eq('access_level', 'admin')
        .limit(1)
        .single();
      
      const fallbackFavicon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%231e3a8a'/%3E%3Crect x='25' y='50' width='12' height='30' rx='2' fill='%2360a5fa'/%3E%3Crect x='44' y='35' width='12' height='45' rx='2' fill='%233b82f6'/%3E%3Crect x='63' y='20' width='12' height='60' rx='2' fill='%23bfdbfe'/%3E%3C/svg%3E";
      let currentFavicon = fallbackFavicon;

      if (adminData && adminData.profile_image_url) {
        setAdminLogo(adminData.profile_image_url);
        currentFavicon = adminData.profile_image_url;
      }

      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = currentFavicon;
    };
    fetchInitialData();
  }, []);

  const activeCompanyObj = useMemo(() => companiesDb.find(c => c.name === selectedCompany), [selectedCompany, companiesDb]);

  const handleRoleSelect = (role: "admin" | "head" | "user") => {
    setSelectedRole(role);
    setSelectedCompany("");
    setEmail("");
    setPassword("");
    setError("");

    if (role === "admin") setStep(3);
    else setStep(2);
  };

  const handleCompanySelect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    if (selectedRole === 'head') {
      if (activeCompanyObj) {
        const { data } = await supabase
          .from('employees')
          .select('name, email')
          .eq('company_id', activeCompanyObj.id)
          .eq('access_level', 'head');
        
        if (data && data.length > 0) {
          setHeadUsers(data);
          if (data.length === 1) setEmail(data[0].email);
          else setEmail("");
        } else {
          setHeadUsers([]); 
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
    setPassword("");
    setHeadUsers([]);
    
    if (step === 3 && selectedRole !== "admin") setStep(2);
    else if (step === 3 && selectedRole === "admin") { setSelectedCompany(""); setSelectedRole(null); setStep(1); } 
    else if (step === 2) { setSelectedCompany(""); setSelectedRole(null); setStep(1); }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-[#eef2ff] via-[#f8fafc] to-[#e0e7ff] flex flex-col items-center justify-center relative font-sans overflow-hidden p-4 sm:p-8">
      
      {/* Main Container */}
      <div className="w-full max-w-[1100px] min-h-[600px] bg-[#f8fafc] rounded-[2rem] sm:rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden relative z-10 border border-white">
        
        {/* LEFT COLUMN - LOGIN LOGIC */}
        <div className="w-full md:w-[45%] lg:w-[40%] p-8 sm:p-12 flex flex-col relative z-20 bg-white">
          
          <div className="flex items-center gap-3 mb-12 shrink-0">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md overflow-hidden shrink-0">
              {adminLogo ? (
                <img src={adminLogo} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <span className="tracking-tighter">Z</span>
              )}
            </div>
            <span className="font-black text-xl text-slate-900 tracking-tight">Zayd Industries</span>
          </div>

          <div className="flex-1 flex flex-col justify-center relative">
            
            <div className="mb-8 flex items-center relative">
              <AnimatePresence>
                {step > 1 && (
                  <motion.button 
                    initial={{ opacity: 0, scale: 0.8, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: -10 }}
                    onClick={goBack} 
                    className="absolute -left-2 text-slate-400 hover:text-blue-600 p-2 rounded-full transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </motion.button>
                )}
              </AnimatePresence>
              <h1 className={`text-4xl font-black text-slate-900 tracking-tight ${step > 1 ? 'ml-8' : ''}`}>
                {step === 1 && "Select Role."}
                {step === 2 && "Workspace."}
                {step === 3 && selectedCompany ? selectedCompany : step === 3 ? "Secure Login." : ""}
              </h1>
            </div>

            <div className="relative">
              <AnimatePresence mode="wait">
                
                {/* STEP 1: SELECT ROLE */}
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <div className="space-y-4">
                      <button onClick={() => handleRoleSelect("admin")} className="w-full flex items-center p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-blue-600 hover:shadow-lg group transition-all text-left">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mr-4"><Shield className="h-5 w-5" /></div>
                        <div className="flex-1"><span className="block font-bold text-[15px] text-slate-900">System Admin</span></div>
                        <CheckCircle2 className="h-5 w-5 text-slate-200 group-hover:text-blue-600 transition-colors hidden sm:block" />
                      </button>

                      <button onClick={() => handleRoleSelect("head")} className="w-full flex items-center p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-blue-600 hover:shadow-lg group transition-all text-left">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500 group-hover:bg-amber-400 group-hover:text-white transition-colors mr-4"><Briefcase className="h-5 w-5" /></div>
                        <div className="flex-1"><span className="block font-bold text-[15px] text-slate-900">Company Head</span></div>
                        <CheckCircle2 className="h-5 w-5 text-slate-200 group-hover:text-blue-600 transition-colors hidden sm:block" />
                      </button>

                      <button onClick={() => handleRoleSelect("user")} className="w-full flex items-center p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-blue-600 hover:shadow-lg group transition-all text-left">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-slate-700 group-hover:text-white transition-colors mr-4"><UserCircle className="h-5 w-5" /></div>
                        <div className="flex-1"><span className="block font-bold text-[15px] text-slate-900">Employee</span></div>
                        <CheckCircle2 className="h-5 w-5 text-slate-200 group-hover:text-blue-600 transition-colors hidden sm:block" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: SELECT COMPANY */}
                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <form onSubmit={handleCompanySelect} className="space-y-6">
                      <div className="space-y-2">
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <select required value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="w-full h-14 rounded-xl border-2 border-slate-200 bg-white px-4 pl-12 text-[15px] outline-none focus:border-blue-600 transition-all appearance-none text-slate-800 font-bold cursor-pointer shadow-sm">
                            <option value="" disabled>Choose your company...</option>
                            {companiesDb.map((company) => (
                              <option key={company.id} value={company.name}>{company.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <Button type="submit" disabled={!selectedCompany} className="w-full h-14 rounded-xl text-[15px] font-bold shadow-lg shadow-blue-600/30 hover:shadow-xl transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
                        Continue
                      </Button>
                    </form>
                  </motion.div>
                )}

                {/* STEP 3: CREDENTIALS */}
                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    
                    {selectedCompany && (
                      <div className="flex justify-start mb-6">
                        <div className="h-16 w-16 bg-white rounded-2xl border-2 border-slate-100 shadow-sm flex items-center justify-center p-2 text-blue-600 font-black text-2xl overflow-hidden">
                          {activeCompanyObj?.logo_url ? <img src={activeCompanyObj.logo_url} alt="" className="h-full w-full object-contain"/> : getInitials(selectedCompany)}
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="mb-6 rounded-xl bg-rose-50 p-4 text-[13px] font-bold text-rose-600 border border-rose-100 flex items-center gap-2">
                        <Shield className="h-4 w-4 shrink-0" /> {error}
                      </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                      {selectedRole === 'head' && headUsers.length > 0 ? (
                        <div className="space-y-5">
                          {headUsers.length > 1 ? (
                            <select required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-14 rounded-xl border-2 border-slate-200 bg-white px-4 text-[15px] outline-none focus:border-blue-600 transition-all appearance-none text-slate-800 font-bold cursor-pointer">
                              <option value="" disabled>Choose your profile...</option>
                              {headUsers.map((head) => (
                                <option key={head.email} value={head.email}>{head.name}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                                {headUsers[0].name.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[15px] font-bold text-slate-900 truncate">{headUsers[0].name}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="w-full h-14 rounded-xl border-2 border-slate-200 bg-white px-4 pl-12 text-[15px] font-bold outline-none focus:border-blue-600 transition-all text-slate-900" />
                        </div>
                      )}
                      
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input 
                          type={showPassword ? "text" : "password"} 
                          required 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          placeholder="Password" 
                          className="w-full h-14 rounded-xl border-2 border-slate-200 bg-white px-4 pl-12 pr-12 text-[15px] font-bold outline-none focus:border-blue-600 transition-all text-slate-900 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)} 
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>

                      <Button type="submit" disabled={isLoggingIn} className="w-full h-14 mt-4 rounded-xl text-[15px] font-bold shadow-lg shadow-blue-600/30 hover:shadow-xl transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
                        {isLoggingIn ? "Logging in..." : "Log in"}
                      </Button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - ANIMATED GRAPHIC */}
        <div className="hidden md:flex flex-1 items-center justify-center relative bg-[#FAFCFF]">
          <AnimatedGraphic />
        </div>

      </div>

      {/* FOOTER */}
      <div className="absolute bottom-6 w-full flex flex-col items-center justify-center gap-1 z-0">
        <p className="text-[12px] font-bold text-slate-400">
          © {new Date().getFullYear()} Zayd Industries Pvt Ltd.
        </p>
        <p className="text-[11px] font-bold text-slate-400">
          Developed by <a href="https://wa.me/917558957246" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 hover:underline transition-all">R</a>
        </p>
      </div>

    </div>
  );
}