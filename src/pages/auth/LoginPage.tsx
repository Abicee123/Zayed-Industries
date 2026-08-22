import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Building2, UserCircle, Briefcase, ArrowLeft, Shield, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuthStore } from "../../store/authStore";
import { supabase } from "../../supabase";

// --- DYNAMIC WARDROBE ENGINE ---
const COLOR_PALETTES = [
  { body: "#0ea5e9", arm: "#38bdf8", legFront: "#64748b", legBack: "#475569" }, 
  { body: "#10b981", arm: "#34d399", legFront: "#4b5563", legBack: "#374151" }, 
  { body: "#f43f5e", arm: "#fb7185", legFront: "#334155", legBack: "#1e293b" }, 
  { body: "#8b5cf6", arm: "#a78bfa", legFront: "#1e293b", legBack: "#0f172a" }, 
  { body: "#f59e0b", arm: "#fbbf24", legFront: "#3f3f46", legBack: "#27272a" }, 
  { body: "#14b8a6", arm: "#5eead4", legFront: "#1e3a8a", legBack: "#172554" }, 
  { body: "#6366f1", arm: "#818cf8", legFront: "#4b5563", legBack: "#374151" }, 
  { body: "#ec4899", arm: "#f472b6", legFront: "#1e293b", legBack: "#0f172a" }, 
];

const SKIN_TONES = ["#fdba74", "#fca5a5", "#fcd34d", "#d6d3d1", "#e7e5e4", "#fbcfe8"];
const HAIR_COLORS = ["#1e293b", "#451a03", "#713f12", "#171717", "#fcd34d", "#94a3b8"];

// --- MATHEMATICAL BACKGROUND GEOMETRY ---
const BackgroundGeometry = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
    <div 
      className="absolute inset-0 opacity-[0.3]" 
      style={{ 
        backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', 
        backgroundSize: '40px 40px' 
      }} 
    />
    <svg className="absolute w-full h-full opacity-40 hidden md:block" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="100%" x2="100%" y2="0" stroke="#94a3b8" strokeWidth="0.5" />
      <line x1="0" y1="0" x2="100%" y2="100%" stroke="#94a3b8" strokeWidth="0.5" />
      <circle cx="50%" cy="50%" r="35%" fill="none" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="8 8" />
      <circle cx="50%" cy="50%" r="20%" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
    </svg>
  </div>
);

// --- FULL SCREEN ANIMATED WALKERS ---
const BackgroundWalkers = ({ companies }: { companies: any[] }) => {
  const walkers = useMemo(() => {
    const sortedCompanies = [...companies].sort((a, b) => a.id - b.id);
    const numCompanies = sortedCompanies.length;

    return sortedCompanies.map((c, i) => {
      const isRightToLeft = i % 2 !== 0; 
      const topPosition = 15 + (i * (65 / Math.max(numCompanies - 1, 1)));
      
      return {
        company: c,
        id: c.id,
        direction: isRightToLeft ? -1 : 1,
        top: topPosition,
        zIndex: Math.round(topPosition),
        duration: 20 + (i % 4) * 4, 
        delay: -(i * (40 / Math.max(numCompanies, 1))), 
        colors: COLOR_PALETTES[i % COLOR_PALETTES.length],
        skin: SKIN_TONES[i % SKIN_TONES.length],
        hair: HAIR_COLORS[i % HAIR_COLORS.length]
      };
    });
  }, [companies]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block z-10">
      {walkers.map((walker) => {
        const isRightToLeft = walker.direction === -1;

        return (
          <motion.div
            key={walker.id}
            className="absolute drop-shadow-2xl"
            style={{ 
              top: `${walker.top}%`, 
              left: isRightToLeft ? "100%" : "-250px",
              zIndex: walker.zIndex 
            }}
            animate={{ x: isRightToLeft ? "-120vw" : "120vw" }}
            transition={{ repeat: Infinity, duration: walker.duration, delay: walker.delay, ease: "linear" }}
          >
            <div style={{ transform: isRightToLeft ? "scaleX(-1)" : "scaleX(1)" }}>
              <svg width="180" height="260" viewBox="0 0 160 260">
                <ellipse cx="75" cy="245" rx="30" ry="5" fill="#94a3b8" opacity="0.4" />
                <motion.rect x="68" y="70" width="10" height="50" rx="5" fill={walker.colors.arm} animate={{ rotate: [20, -20, 20] }} style={{ originX: 0.5, originY: 0 }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} />
                <motion.rect x="60" y="130" width="12" height="70" rx="6" fill={walker.colors.legBack} animate={{ rotate: [25, -25, 25] }} style={{ originX: 0.5, originY: 0 }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} />
                <rect x="55" y="60" width="34" height="75" rx="12" fill={walker.colors.body} />
                <motion.rect x="75" y="130" width="12" height="70" rx="6" fill={walker.colors.legFront} animate={{ rotate: [-25, 25, -25] }} style={{ originX: 0.5, originY: 0 }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} />
                
                <motion.g animate={{ rotate: [-15, 15, -15] }} style={{ originX: 0.5, originY: 0.2 }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
                  <rect x="70" y="70" width="10" height="50" rx="5" fill={walker.colors.arm} />
                  <g transform="translate(65, 110)">
                    <rect width="52" height="36" rx="4" fill="#ffffff" stroke="#94a3b8" strokeWidth="2"/>
                    <path d="M 18,0 L 18,-8 L 34,-8 L 34,0" fill="none" stroke="#64748b" strokeWidth="2.5"/>
                    <foreignObject x="3" y="3" width="46" height="30">
                      <div className="w-full h-full flex items-center justify-center bg-white rounded-sm overflow-hidden" style={{ transform: isRightToLeft ? "scaleX(-1)" : "scaleX(1)" }}>
                        {walker.company.logo_url ? (
                          <img src={walker.company.logo_url} className="w-full h-full object-contain p-0.5" alt="Logo" />
                        ) : (
                          <span className="text-[7px] font-bold text-slate-800 text-center leading-tight truncate px-1">
                            {walker.company.name}
                          </span>
                        )}
                      </div>
                    </foreignObject>
                  </g>
                </motion.g>

                <circle cx="72" cy="35" r="16" fill={walker.skin} />
                <path d="M 54,35 Q 72,5 90,35 L 90,42 L 54,42 Z" fill={walker.hair} />
              </svg>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// --- MAIN LOGIN PAGE ---
export default function LoginPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<"admin" | "head" | "user" | null>(null);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [companiesDb, setCompaniesDb] = useState<{id: number, name: string, logo_url: string | null}[]>([]);
  const [headUsers, setHeadUsers] = useState<{name: string, email: string}[]>([]);
  
  // NEW: State to store the Master Admin's logo
  const [adminLogo, setAdminLogo] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const signIn = useAuthStore((state) => state.signIn);

  // Fetch Companies & Admin Profile Image
  useEffect(() => {
    const fetchInitialData = async () => {
      // 1. Fetch Companies
      const { data: compData } = await supabase.from('companies').select('id, name, logo_url');
      if (compData) setCompaniesDb(compData);

      // 2. Fetch Master Admin Logo
      const { data: adminData } = await supabase
        .from('employees')
        .select('profile_image_url')
        .eq('access_level', 'admin')
        .limit(1)
        .single();
      
      if (adminData && adminData.profile_image_url) {
        setAdminLogo(adminData.profile_image_url);
      }
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
    <div className="min-h-[100dvh] w-full bg-[#f4f7f9] flex flex-col relative overflow-hidden font-sans">
      
      {/* Top Header Logo - Now rendering the Admin Logo dynamically */}
      <header className="absolute top-6 left-6 lg:top-10 lg:left-12 z-[110] flex items-center gap-3">
        <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-600/20 overflow-hidden shrink-0">
          {adminLogo ? (
            <img src={adminLogo} alt="Admin Logo" className="h-full w-full object-cover" />
          ) : (
            "Z"
          )}
        </div>
        <span className="font-bold text-xl text-slate-800 tracking-tight">Zayd Industries</span>
      </header>

      {/* Background Orbs & Geometry */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-[100px] pointer-events-none z-0" />
      <BackgroundGeometry />

      {/* Dynamic Background Walkers */}
      <BackgroundWalkers companies={companiesDb} />

      {/* Main Content Area - Z-[100] forces this completely above the walkers */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-[100]">
        
        {/* The Card - Locked Size */}
        <div className="w-full max-w-[460px] h-[520px] sm:h-[600px] bg-white/95 backdrop-blur-md rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-white p-6 sm:p-10 flex flex-col relative">
          
          <div className="relative text-center mb-8 mt-2 shrink-0">
            <AnimatePresence>
              {step > 1 && (
                <motion.button 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={goBack} 
                  className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 p-2 rounded-full transition-colors border border-transparent hover:border-slate-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                </motion.button>
              )}
            </AnimatePresence>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {step === 1 && "Welcome Back."}
              {step === 2 && "Locate Workspace."}
              {step === 3 && selectedCompany ? selectedCompany : step === 3 ? "Secure Login." : ""}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              {step === 1 && "Please select your access tier to continue."}
              {step === 2 && "Select your assigned subsidiary."}
              {step === 3 && "Enter your credentials to access the portal."}
            </p>
          </div>

          <div className="flex-1 relative overflow-y-auto overflow-x-hidden max-sm:[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <AnimatePresence mode="wait">
              
              {/* STEP 1: SELECT ROLE */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="absolute inset-0 pb-4">
                  <div className="space-y-3 sm:space-y-4">
                    <button onClick={() => handleRoleSelect("admin")} className="w-full flex items-center p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-md group transition-all text-left">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mr-4 shadow-sm"><Shield className="h-5 w-5" /></div>
                      <div className="flex-1"><span className="block font-bold text-[14px] sm:text-[15px] text-slate-900">System Admin</span><span className="block text-[11px] sm:text-[12px] font-medium text-slate-500 mt-0.5">Full platform access</span></div>
                      <CheckCircle2 className="h-5 w-5 text-slate-200 group-hover:text-blue-600 transition-colors hidden sm:block" />
                    </button>

                    <button onClick={() => handleRoleSelect("head")} className="w-full flex items-center p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-md group transition-all text-left">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mr-4 shadow-sm"><Briefcase className="h-5 w-5" /></div>
                      <div className="flex-1"><span className="block font-bold text-[14px] sm:text-[15px] text-slate-900">Company Head</span><span className="block text-[11px] sm:text-[12px] font-medium text-slate-500 mt-0.5">Manage your subsidiary</span></div>
                      <CheckCircle2 className="h-5 w-5 text-slate-200 group-hover:text-blue-600 transition-colors hidden sm:block" />
                    </button>

                    <button onClick={() => handleRoleSelect("user")} className="w-full flex items-center p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-md group transition-all text-left">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mr-4 shadow-sm"><UserCircle className="h-5 w-5" /></div>
                      <div className="flex-1"><span className="block font-bold text-[14px] sm:text-[15px] text-slate-900">Employee</span><span className="block text-[11px] sm:text-[12px] font-medium text-slate-500 mt-0.5">Access your workspace</span></div>
                      <CheckCircle2 className="h-5 w-5 text-slate-200 group-hover:text-blue-600 transition-colors hidden sm:block" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: SELECT COMPANY */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="absolute inset-0 pb-4">
                  <form onSubmit={handleCompanySelect} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-blue-600 uppercase tracking-widest pl-1">Subsidiary List</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <select required value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="w-full h-14 rounded-2xl border border-slate-200 bg-white px-4 pl-12 text-[14px] sm:text-[15px] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none text-slate-800 font-semibold cursor-pointer shadow-sm">
                          <option value="" disabled>Choose your company...</option>
                          {companiesDb.map((company) => (
                            <option key={company.id} value={company.name}>{company.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Button type="submit" disabled={!selectedCompany} className="w-full h-[52px] rounded-xl text-[14px] font-bold shadow-md shadow-blue-600/20 hover:shadow-lg transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
                      Next Step
                    </Button>
                  </form>
                </motion.div>
              )}

              {/* STEP 3: CREDENTIALS */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="absolute inset-0 pb-4">
                  
                  {selectedCompany && (
                    <div className="flex justify-center mb-6">
                      <div className="h-16 w-16 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center p-2 text-blue-600 font-bold text-2xl overflow-hidden">
                        {activeCompanyObj?.logo_url ? <img src={activeCompanyObj.logo_url} alt="" className="h-full w-full object-contain"/> : getInitials(selectedCompany)}
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mb-6 rounded-xl bg-rose-50 p-3 text-[12px] font-bold text-rose-600 border border-rose-100 flex items-center gap-2">
                      <Shield className="h-4 w-4 shrink-0" /> {error}
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-5">
                    
                    {/* AUTO-FETCH HEAD LOGIC */}
                    {selectedRole === 'head' && headUsers.length > 0 ? (
                      <div className="space-y-5">
                        {headUsers.length > 1 ? (
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">Select Profile</label>
                            <select required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-12 sm:h-14 rounded-xl border border-slate-200 bg-white px-4 text-[14px] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none text-slate-800 font-semibold cursor-pointer shadow-sm">
                              <option value="" disabled>Choose your profile...</option>
                              {headUsers.map((head) => (
                                <option key={head.email} value={head.email}>{head.name}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                              {headUsers[0].name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active Profile</p>
                              <p className="text-[14px] font-bold text-slate-900 mt-0.5 truncate">{headUsers[0].name}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">Email ID</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="w-full h-12 sm:h-14 rounded-xl border border-slate-200 bg-white px-4 pl-11 text-[14px] font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm text-slate-900" />
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                          type={showPassword ? "text" : "password"} 
                          required 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          placeholder="••••••••" 
                          className="w-full h-12 sm:h-14 rounded-xl border border-slate-200 bg-white px-4 pl-11 pr-10 text-[14px] font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm text-slate-900 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)} 
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" disabled={isLoggingIn} className="w-full h-[52px] mt-4 rounded-xl text-[14px] font-bold shadow-md shadow-blue-600/20 hover:shadow-lg transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
                      {isLoggingIn ? "Logging in..." : "Login"}
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* NEW FOOTER: Idea 1 - Minimalist */}
          <div className="mt-auto shrink-0 pt-4 pb-1 text-center border-t border-transparent">
            <p className="text-[11px] font-medium text-slate-400">
              © 2026 Zayd Industries Pvt. Limited
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}