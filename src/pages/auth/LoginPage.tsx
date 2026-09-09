import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Building2, UserCircle, Briefcase, ArrowLeft, Shield, Eye, EyeOff, CheckCircle2, Cpu, BatteryCharging } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuthStore } from "../../store/authStore";
import { supabase } from "../../supabase";

// --- MATHEMATICAL BACKGROUND GEOMETRY ---
const BackgroundGeometry = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
    <div 
      className="absolute inset-0 opacity-[0.4]" 
      style={{ 
        backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', 
        backgroundSize: '40px 40px' 
      }} 
    />
    <svg className="absolute w-full h-full opacity-30 hidden md:block" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="100%" x2="100%" y2="0" stroke="#94a3b8" strokeWidth="0.5" />
      <line x1="0" y1="0" x2="100%" y2="100%" stroke="#94a3b8" strokeWidth="0.5" />
      <circle cx="50%" cy="50%" r="35%" fill="none" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="8 8" />
      <circle cx="50%" cy="50%" r="20%" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
    </svg>
  </div>
);

// --- CUSTOM 3D-STYLE ANIMATED GRAPHIC (ASSEMBLY & HOVER SCATTER) ---
const AnimatedGraphic = ({ companies }: { companies: any[] }) => {
  const [logoIndex, setLogoIndex] = useState(0);
  const validLogos = useMemo(() => companies.filter(c => c.logo_url), [companies]);

  useEffect(() => {
    if (validLogos.length <= 1) return;
    const timer = setInterval(() => {
      setLogoIndex((prev) => (prev + 1) % validLogos.length);
    }, 3000); 
    return () => clearInterval(timer);
  }, [validLogos]);

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className="relative w-[300px] h-[350px] flex items-center justify-center mt-10 scale-110 lg:scale-125 cursor-pointer z-20"
    >
      {/* Floor Shadow */}
      <motion.div 
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 1 } } }}
        className="absolute -bottom-4 w-64 h-16 bg-blue-900/10 blur-xl rounded-[100%] z-0" 
      />
      
      {/* Yellow Cylinder Back */}
      <motion.div 
        variants={{
          hidden: { x: 200, y: -200, opacity: 0, scale: 0.5 },
          visible: { x: 0, y: 0, opacity: 1, scale: 1, transition: { type: "spring", bounce: 0.4, duration: 1.5, delay: 0.1 } },
          hover: { x: 40, y: -30, rotateZ: 15, transition: { type: "spring", stiffness: 200, damping: 15 } }
        }}
        className="absolute bottom-16 right-6 w-20 h-48 z-0"
      >
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="w-full h-full bg-amber-400 rounded-[2.5rem] shadow-[inset_-12px_-12px_20px_rgba(0,0,0,0.15)]" />
      </motion.div>
      
      {/* Gray Cylinder Left */}
      <motion.div 
        variants={{
          hidden: { x: -200, y: 200, opacity: 0, scale: 0.5 },
          visible: { x: 0, y: 0, opacity: 1, scale: 1, transition: { type: "spring", bounce: 0.4, duration: 1.5, delay: 0.3 } },
          hover: { x: -40, y: 20, rotateZ: -12, transition: { type: "spring", stiffness: 200, damping: 15 } }
        }}
        className="absolute bottom-8 left-6 w-24 h-36 z-10"
      >
        <motion.div animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 4.5, delay: 0.5, ease: "easeInOut" }} className="w-full h-full bg-slate-700 rounded-[3rem] shadow-[inset_-10px_-10px_20px_rgba(0,0,0,0.25)]" />
      </motion.div>
      
      {/* Main Blue Cylinder Center */}
      <motion.div 
        variants={{
          hidden: { y: 300, opacity: 0, scale: 0.5 },
          visible: { y: 0, opacity: 1, scale: 1, transition: { type: "spring", bounce: 0.4, duration: 1.5, delay: 0.5 } },
          hover: { y: -30, scale: 1.05, transition: { type: "spring", stiffness: 200, damping: 15 } }
        }}
        className="absolute bottom-4 left-24 w-28 h-60 z-20"
      >
        <motion.div animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 5, delay: 1, ease: "easeInOut" }} className="w-full h-full bg-blue-600 rounded-[3.5rem] shadow-[inset_-16px_-16px_24px_rgba(0,0,0,0.2),_15px_15px_30px_rgba(0,0,0,0.15)]" />
      </motion.div>
      
      {/* Small Yellow Cylinder Front */}
      <motion.div 
        variants={{
          hidden: { x: 100, y: 200, opacity: 0, scale: 0.5 },
          visible: { x: 0, y: 0, opacity: 1, scale: 1, transition: { type: "spring", bounce: 0.4, duration: 1.5, delay: 0.7 } },
          hover: { x: 30, y: 40, rotateZ: -10, transition: { type: "spring", stiffness: 200, damping: 15 } }
        }}
        className="absolute -bottom-2 right-20 w-20 h-28 z-30"
      >
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3.5, delay: 1.5, ease: "easeInOut" }} className="w-full h-full bg-amber-300 rounded-[2.5rem] shadow-[inset_-8px_-8px_16px_rgba(0,0,0,0.15),_8px_8px_16px_rgba(0,0,0,0.1)]" />
      </motion.div>

      {/* Floating Mobile Phone (Assembly Animation) */}
      <motion.div 
        variants={{
          hidden: { y: -300, opacity: 0 },
          visible: { y: 0, opacity: 1, transition: { type: "spring", bounce: 0.5, duration: 1.5, delay: 1 } },
          hover: { y: -30, x: -20, rotateZ: -8, scale: 1.1, transition: { type: "spring", stiffness: 200, damping: 15 } }
        }}
        className="absolute top-0 left-[110px] z-40"
      >
        <motion.div animate={{ y: [0, -20, 0], rotateZ: [0, 2, -2, 0] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }} className="w-28 h-[210px] bg-slate-100 rounded-[1.8rem] border-[6px] border-slate-900 shadow-2xl relative overflow-hidden">
          
          {/* THE COMPONENTS FLYING IN TO BUILD THE PHONE */}
          <motion.div initial={{ x: -100, y: -50, rotateZ: -90, opacity: 0 }} animate={{ x: 0, y: 0, rotateZ: 0, opacity: [0, 1, 1, 0] }} transition={{ duration: 2.5, delay: 1.5, times: [0, 0.2, 0.8, 1] }} className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500 z-0">
            <Cpu className="h-10 w-10" />
          </motion.div>

          <motion.div initial={{ x: 100, y: 100, rotateZ: 90, opacity: 0 }} animate={{ x: 0, y: 0, rotateZ: 0, opacity: [0, 1, 1, 0] }} transition={{ duration: 2.5, delay: 1.8, times: [0, 0.2, 0.8, 1] }} className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 z-0">
            <BatteryCharging className="h-10 w-10" />
          </motion.div>

          {/* FINAL ASSEMBLED SCREEN FADES IN */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 3.5 }} className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center p-3">
             {/* Phone Notch */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-4 bg-slate-900 rounded-b-xl z-50 flex justify-center items-center">
               <div className="w-2 h-2 rounded-full bg-slate-800 border border-slate-700/50" />
             </div>

             {/* Dynamic Logo Slideshow */}
             <div className="flex-1 w-full flex items-center justify-center mt-2 relative">
               <AnimatePresence mode="wait">
                 {validLogos.length > 0 ? (
                   <motion.img
                     key={validLogos[logoIndex].id}
                     src={validLogos[logoIndex].logo_url!}
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.8 }}
                     transition={{ duration: 0.4 }}
                     className="w-full max-h-16 object-contain drop-shadow-sm"
                     alt="Company Logo"
                   />
                 ) : (
                   <motion.div 
                     initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                     className="flex flex-col items-center"
                   >
                     <span className="text-amber-400 font-black tracking-tighter text-2xl mb-1">ZAYD</span>
                     <span className="text-blue-500 font-bold text-[8px] uppercase tracking-widest">Portal</span>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>

             {/* Home Indicator */}
             <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-300 rounded-full" />
          </motion.div>

        </motion.div>
      </motion.div>

    </motion.div>
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
    <div className="min-h-[100dvh] w-full flex flex-col md:flex-row overflow-hidden font-sans bg-white relative">
      
      {/* LEFT COLUMN - LOGIN LOGIC */}
      <div className="w-full md:w-1/2 lg:w-[45%] flex flex-col relative z-20 bg-white border-r border-slate-100 shadow-[20px_0_40px_-15px_rgba(0,0,0,0.05)] min-h-[100dvh]">
        
        {/* Header - Fixed Business Logo */}
        <div className="p-8 sm:p-12 flex items-center gap-4 shrink-0">
          <div className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center overflow-hidden shrink-0">
            {adminLogo ? (
              <img src={adminLogo} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <div className="h-full w-full bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md">
                <span className="tracking-tighter">Z</span>
              </div>
            )}
          </div>
          <span className="font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">Zayd Industries</span>
        </div>

        {/* Dynamic Login Steps with FIXED Layout Container */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 xl:px-24 w-full">
          <div className="mb-8 flex items-center relative h-12 shrink-0">
            <AnimatePresence>
              {step > 1 && (
                <motion.button 
                  initial={{ opacity: 0, scale: 0.8, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -10 }}
                  onClick={goBack} 
                  className="absolute left-0 text-slate-400 hover:text-blue-600 p-2 rounded-full transition-colors bg-slate-50 border border-slate-100"
                >
                  <ArrowLeft className="h-5 w-5" />
                </motion.button>
              )}
            </AnimatePresence>
            <h1 className={`text-4xl sm:text-5xl font-black text-slate-900 tracking-tight transition-all duration-300 ${step > 1 ? 'ml-14' : ''}`}>
              {step === 1 && "Select Role."}
              {step === 2 && "Workspace."}
              {step === 3 && selectedCompany ? selectedCompany : step === 3 ? "Secure Login." : ""}
            </h1>
          </div>

          {/* Fixed height container to prevent layout jumping */}
          <div className="relative h-[320px] sm:h-[350px] w-full">
            <AnimatePresence mode="wait">
              
              {/* STEP 1: SELECT ROLE */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="absolute inset-0 w-full">
                  <div className="space-y-4">
                    <button onClick={() => handleRoleSelect("admin")} className="w-full flex items-center p-4 sm:p-5 rounded-[1.5rem] border-2 border-slate-100 bg-white hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 group transition-all text-left">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mr-5 shrink-0"><Shield className="h-6 w-6" /></div>
                      <div className="flex-1"><span className="block font-bold text-[16px] text-slate-900">System Admin</span></div>
                      <CheckCircle2 className="h-6 w-6 text-slate-200 group-hover:text-blue-600 transition-colors hidden sm:block shrink-0" />
                    </button>

                    <button onClick={() => handleRoleSelect("head")} className="w-full flex items-center p-4 sm:p-5 rounded-[1.5rem] border-2 border-slate-100 bg-white hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 group transition-all text-left">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50 text-amber-500 group-hover:bg-amber-400 group-hover:text-white transition-colors mr-5 shrink-0"><Briefcase className="h-6 w-6" /></div>
                      <div className="flex-1"><span className="block font-bold text-[16px] text-slate-900">Company Head</span></div>
                      <CheckCircle2 className="h-6 w-6 text-slate-200 group-hover:text-blue-600 transition-colors hidden sm:block shrink-0" />
                    </button>

                    <button onClick={() => handleRoleSelect("user")} className="w-full flex items-center p-4 sm:p-5 rounded-[1.5rem] border-2 border-slate-100 bg-white hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 group transition-all text-left">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-slate-700 group-hover:text-white transition-colors mr-5 shrink-0"><UserCircle className="h-6 w-6" /></div>
                      <div className="flex-1"><span className="block font-bold text-[16px] text-slate-900">Employee</span></div>
                      <CheckCircle2 className="h-6 w-6 text-slate-200 group-hover:text-blue-600 transition-colors hidden sm:block shrink-0" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: SELECT COMPANY */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="absolute inset-0 w-full">
                  <form onSubmit={handleCompanySelect} className="space-y-6">
                    <div className="relative">
                      <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <select required value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="w-full h-16 rounded-[1.25rem] border-2 border-slate-200 bg-white px-5 pl-14 text-[16px] outline-none focus:border-blue-600 transition-all appearance-none text-slate-800 font-bold cursor-pointer shadow-sm">
                        <option value="" disabled>Choose your company...</option>
                        {companiesDb.map((company) => (
                          <option key={company.id} value={company.name}>{company.name}</option>
                        ))}
                      </select>
                    </div>
                    <Button type="submit" disabled={!selectedCompany} className="w-full h-16 rounded-[1.25rem] text-[16px] font-bold shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:shadow-blue-600/30 transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
                      Continue
                    </Button>
                  </form>
                </motion.div>
              )}

              {/* STEP 3: CREDENTIALS */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="absolute inset-0 w-full">
                  
                  {selectedCompany && (
                    <div className="flex justify-start mb-6">
                      <div className="h-16 w-16 bg-white rounded-2xl border-2 border-slate-100 shadow-sm flex items-center justify-center p-2.5 text-blue-600 font-black text-2xl overflow-hidden shrink-0">
                        {activeCompanyObj?.logo_url ? <img src={activeCompanyObj.logo_url} alt="" className="h-full w-full object-contain"/> : getInitials(selectedCompany)}
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-[13px] font-bold text-rose-600 border border-rose-100 flex items-center gap-3">
                      <Shield className="h-5 w-5 shrink-0" /> {error}
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                    {selectedRole === 'head' && headUsers.length > 0 ? (
                      <div className="space-y-5">
                        {headUsers.length > 1 ? (
                          <select required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-16 rounded-[1.25rem] border-2 border-slate-200 bg-white px-5 text-[16px] outline-none focus:border-blue-600 transition-all appearance-none text-slate-800 font-bold cursor-pointer shadow-sm">
                            <option value="" disabled>Choose your profile...</option>
                            {headUsers.map((head) => (
                              <option key={head.email} value={head.email}>{head.name}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="p-4 rounded-[1.25rem] bg-slate-50 border-2 border-slate-100 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-sm shrink-0">
                              {headUsers[0].name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Active Profile</p>
                              <p className="text-[15px] font-bold text-slate-900 truncate">{headUsers[0].name}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="w-full h-16 rounded-[1.25rem] border-2 border-slate-200 bg-white px-5 pl-14 text-[16px] font-bold outline-none focus:border-blue-600 transition-all text-slate-900 shadow-sm" />
                      </div>
                    )}
                    
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Password" 
                        className="w-full h-16 rounded-[1.25rem] border-2 border-slate-200 bg-white px-5 pl-14 pr-14 text-[16px] font-bold outline-none focus:border-blue-600 transition-all text-slate-900 shadow-sm [&::-ms-reveal]:hidden [&::-ms-clear]:hidden" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>

                    <Button type="submit" disabled={isLoggingIn} className="w-full h-16 mt-6 rounded-[1.25rem] text-[16px] font-bold shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:-translate-y-0.5 transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:hover:translate-y-0">
                      {isLoggingIn ? "Authenticating..." : "Log in"}
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Basic Left Column Footer */}
        <div className="p-8 sm:px-12 shrink-0 border-t border-transparent mt-auto relative z-20 hidden md:block">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            © {new Date().getFullYear()} Zayd Industries Pvt Ltd.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN - ANIMATED GRAPHIC */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center relative bg-gradient-to-br from-[#eef2ff] via-[#f8fafc] to-[#e0e7ff] overflow-hidden">
        
        {/* Soft Background Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/40 rounded-full blur-[100px] pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-200/20 rounded-full blur-[100px] pointer-events-none z-0" />
        <BackgroundGeometry />
        
        <AnimatedGraphic companies={companiesDb} />
        
      </div>

      {/* GLOBAL RIGHT-ALIGNED DEVELOPER BADGE */}
      <div className="absolute bottom-6 right-6 z-[100]">
        <a 
          href="https://wa.me/917558957246" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/50 shadow-sm hover:shadow-md hover:bg-white transition-all group"
        >
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1">Built By</span>
          <span className="h-6 w-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center text-[11px] font-black group-hover:scale-110 transition-transform shadow-inner">
            R
          </span>
        </a>
      </div>

      {/* Mobile-Only Copyright Fallback */}
      <div className="md:hidden absolute bottom-6 left-6 z-[100]">
         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            © {new Date().getFullYear()} Zayd
          </p>
      </div>

    </div>
  );
}