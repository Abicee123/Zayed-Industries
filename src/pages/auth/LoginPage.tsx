import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Building2, UserCircle, Briefcase, ArrowLeft, Shield, Eye, EyeOff, CheckCircle2, FileText, Monitor, Database, Folder, Settings, Cloud, Layout, PieChart } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuthStore } from "../../store/authStore";
import { supabase } from "../../supabase";

// --- CRASH-PROOF DROPDOWN ICON ---
const DropdownArrow = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

// --- DENSE FLOATING ICONS CLUSTERED AROUND THE LOGIN BOX (RIGHT SIDE) ---
const FLOATING_ICONS = [
  { Icon: Briefcase, top: '8%', left: '55%', size: 36, delay: 0 },
  { Icon: FileText, top: '15%', left: '88%', size: 28, delay: 1.5 },
  { Icon: Building2, top: '85%', left: '85%', size: 48, delay: 0.5 },
  { Icon: Monitor, top: '25%', left: '48%', size: 32, delay: 2 },
  { Icon: Database, top: '12%', left: '72%', size: 40, delay: 1 },
  { Icon: Shield, top: '75%', left: '52%', size: 28, delay: 2.5 },
  { Icon: Folder, top: '45%', left: '92%', size: 36, delay: 0.8 },
  { Icon: Settings, top: '35%', left: '60%', size: 24, delay: 1.2 },
  { Icon: Cloud, top: '65%', left: '46%', size: 50, delay: 1.8 },
  { Icon: Layout, top: '88%', left: '68%', size: 32, delay: 0.3 },
  { Icon: PieChart, top: '32%', left: '95%', size: 28, delay: 2.2 },
  { Icon: Lock, top: '50%', left: '44%', size: 24, delay: 0.7 },
  { Icon: Mail, top: '55%', left: '94%', size: 30, delay: 1.3 },
  { Icon: UserCircle, top: '78%', left: '92%', size: 36, delay: 2.1 },
  { Icon: Briefcase, top: '22%', left: '82%', size: 28, delay: 0.4 },
  { Icon: CheckCircle2, top: '68%', left: '80%', size: 22, delay: 1.9 },
  { Icon: FileText, top: '5%', left: '90%', size: 20, delay: 0.9 },
  { Icon: Database, top: '92%', left: '58%', size: 34, delay: 1.1 },
  { Icon: Cloud, top: '18%', left: '62%', size: 42, delay: 2.4 },
  { Icon: Shield, top: '42%', left: '50%', size: 26, delay: 0.6 },
  { Icon: PieChart, top: '72%', left: '72%', size: 30, delay: 1.6 },
  { Icon: Layout, top: '38%', left: '86%', size: 24, delay: 1.4 },
  { Icon: Settings, top: '62%', left: '62%', size: 28, delay: 0.2 },
  { Icon: Building2, top: '10%', left: '48%', size: 26, delay: 1.7 },
  { Icon: Monitor, top: '90%', left: '78%', size: 24, delay: 2.8 },
];

const FloatingBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {FLOATING_ICONS.map((item, i) => (
        <motion.div
          key={i}
          className="absolute text-slate-200/50"
          style={{ top: item.top, left: item.left }}
          animate={{
            y: [0, -20, 0],
            x: [0, 15, 0],
            rotate: [0, 8, -8, 0]
          }}
          transition={{
            duration: 8 + (i % 4),
            repeat: Infinity,
            ease: "easeInOut",
            delay: item.delay
          }}
        >
          <item.Icon size={item.size} strokeWidth={1.5} />
        </motion.div>
      ))}
    </div>
  );
};

// --- DYNAMIC DIRECTIONAL SLIDING ANIMATION ---
const pageVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 40 : -40,
    scale: 0.96,
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } 
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -40 : 40,
    scale: 0.96,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  }),
};

// --- MAIN LOGIN PAGE ---
export default function LoginPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState(1);
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
    if (!document.getElementById('nunito-google-font')) {
      const link = document.createElement('link');
      link.id = 'nunito-google-font';
      link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    const fetchInitialData = async () => {
      try {
        const { data: compData } = await supabase.from('companies').select('id, name, logo_url');
        if (compData) setCompaniesDb(compData);

        const { data: adminData } = await supabase.from('employees').select('profile_image_url').eq('access_level', 'admin').limit(1).single();
        
        const fallbackFavicon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%231e3a8a'/%3E%3Crect x='25' y='50' width='12' height='30' rx='2' fill='%2360a5fa'/%3E%3Crect x='44' y='35' width='12' height='45' rx='2' fill='%233b82f6'/%3E%3Crect x='63' y='20' width='12' height='60' rx='2' fill='%23bfdbfe'/%3E%3C/svg%3E";
        let currentFavicon = fallbackFavicon;

        if (adminData && adminData.profile_image_url) {
          setAdminLogo(adminData.profile_image_url);
          currentFavicon = adminData.profile_image_url;
        }

        let linkFav = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!linkFav) {
          linkFav = document.createElement('link');
          linkFav.rel = 'icon';
          document.head.appendChild(linkFav);
        }
        linkFav.href = currentFavicon;
      } catch (e) {
        console.error("Failed to load initial data", e);
      }
    };
    fetchInitialData();
  }, []);

  const activeCompanyObj = useMemo(() => {
    if (!selectedCompany) return null;
    return companiesDb.find(c => c.name === selectedCompany) || null;
  }, [selectedCompany, companiesDb]);

  const handleRoleSelect = (role: "admin" | "head" | "user") => {
    setError("");
    setSelectedRole(role); 
    setSelectedCompany(""); 
    setEmail(""); 
    setPassword(""); 
    setDirection(1);
    setStep(role === "admin" ? 3 : 2);
  };

  const handleCompanySelect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    
    if (selectedRole === 'head') {
      if (activeCompanyObj) {
        const { data } = await supabase.from('employees').select('name, email').eq('company_id', activeCompanyObj.id).eq('access_level', 'head');
        if (data && data.length > 0) {
          setHeadUsers(data);
          if (data.length === 1) setEmail(data[0].email);
          else setEmail("");
        } else setHeadUsers([]); 
      }
    }
    setDirection(1);
    setStep(3);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setIsLoggingIn(true);
    const result = await signIn(email, password);
    if (result.error) { setError("Authentication failed. Please verify your credentials."); setIsLoggingIn(false); } 
    else navigate("/dashboard");
  };

  const goBack = () => {
    setError(""); setEmail(""); setPassword(""); setHeadUsers([]);
    setDirection(-1);
    
    if (step === 3 && selectedRole !== "admin") setStep(2);
    else if (step === 3 && selectedRole === "admin") { setSelectedCompany(""); setSelectedRole(null); setStep(1); } 
    else if (step === 2) { setSelectedCompany(""); setSelectedRole(null); setStep(1); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
        .font-rounded { font-family: 'Nunito', sans-serif !important; }
      `}</style>
      
      <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#fafbfc] relative overflow-hidden font-rounded">
        
        {/* DENSE FLOATING BACKGROUND ICONS AROUND THE BOX */}
        <FloatingBackground />

        {/* LEFT COLUMN: BRANDING & WELCOME MESSAGE */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-8 md:pl-24 lg:pl-32 pt-16 md:pt-0 z-10">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="max-w-lg w-full md:h-[540px] flex flex-col justify-start">
            
            {/* Master Admin Logo - perfectly aligned with the top of the login box */}
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-[1.25rem] overflow-hidden shadow-sm bg-white border border-slate-200 flex items-center justify-center mb-10 md:mb-16 shrink-0">
              {adminLogo ? (
                <img src={adminLogo} alt="Corporate Identity" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-blue-600">Z</span>
              )}
            </div>

            <h1 className="text-[2.5rem] md:text-[3.5rem] leading-[1.1] font-black text-slate-900 tracking-tight mb-6">
              Welcome to<br />
              The Zayd Industries
            </h1>
            
            <p className="text-[15px] text-slate-500 font-semibold leading-relaxed max-w-sm">
              To request organizational access or technical support, please contact your designated administrator.
            </p>
          </motion.div>
        </div>

        {/* RIGHT COLUMN: FIXED SIZE LOGIN CARD */}
        <div className="w-full md:w-1/2 flex justify-center items-center p-6 sm:p-12 z-10 mt-8 md:mt-0 pb-24 md:pb-0">
          {/* Card is forced to a strict height (540px) matching the left side so it never resizes during step changes */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white w-full max-w-[480px] h-[540px] relative overflow-hidden">
            
            <AnimatePresence mode="wait" custom={direction}>
              
              {/* STEP 1: SELECT ROLE */}
              {step === 1 && (
                <motion.div 
                  key="step1" 
                  custom={direction}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="absolute inset-0 flex flex-col p-8 md:p-12"
                >
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Secure Access.</h2>
                  <p className="text-[15px] font-semibold text-slate-500 mb-8">Please select your designated organizational role to proceed securely.</p>
                  
                  <div className="space-y-4">
                    <button onClick={() => handleRoleSelect("admin")} className="w-full flex items-center p-4 rounded-[1.25rem] bg-[#fafbfc] hover:bg-white border-2 border-transparent hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 group transition-all duration-300 text-left">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mr-5 shrink-0"><Shield className="h-6 w-6" /></div>
                      <div className="flex-1"><span className="block font-extrabold text-[16px] text-slate-900 tracking-wide">System Administrator</span></div>
                      <CheckCircle2 className="h-6 w-6 text-slate-200 group-hover:text-blue-600 transition-colors hidden sm:block shrink-0" />
                    </button>
                    <button onClick={() => handleRoleSelect("head")} className="w-full flex items-center p-4 rounded-[1.25rem] bg-[#fafbfc] hover:bg-white border-2 border-transparent hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 group transition-all duration-300 text-left">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm text-amber-500 group-hover:bg-amber-400 group-hover:text-white transition-colors mr-5 shrink-0"><Briefcase className="h-6 w-6" /></div>
                      <div className="flex-1"><span className="block font-extrabold text-[16px] text-slate-900 tracking-wide">Organizational Head</span></div>
                      <CheckCircle2 className="h-6 w-6 text-slate-200 group-hover:text-blue-600 transition-colors hidden sm:block shrink-0" />
                    </button>
                    <button onClick={() => handleRoleSelect("user")} className="w-full flex items-center p-4 rounded-[1.25rem] bg-[#fafbfc] hover:bg-white border-2 border-transparent hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 group transition-all duration-300 text-left">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm text-slate-600 group-hover:bg-slate-700 group-hover:text-white transition-colors mr-5 shrink-0"><UserCircle className="h-6 w-6" /></div>
                      <div className="flex-1"><span className="block font-extrabold text-[16px] text-slate-900 tracking-wide">Corporate Employee</span></div>
                      <CheckCircle2 className="h-6 w-6 text-slate-200 group-hover:text-blue-600 transition-colors hidden sm:block shrink-0" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: SELECT WORKSPACE */}
              {step === 2 && (
                <motion.div 
                  key="step2" 
                  custom={direction}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="absolute inset-0 flex flex-col p-8 md:p-12"
                >
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Organizational Unit.</h2>
                  <p className="text-[15px] font-semibold text-slate-500 mb-8">Please specify your designated branch or corporate entity.</p>
                  
                  <form onSubmit={handleCompanySelect} className="space-y-5">
                    <div className="relative">
                      <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 pointer-events-none" />
                      <select required value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="w-full h-[68px] rounded-[1.25rem] bg-[#fafbfc] border border-slate-200 hover:border-slate-300 px-5 pl-14 text-[16px] outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all appearance-none text-slate-900 font-extrabold cursor-pointer">
                        <option value="" disabled>Select your organization...</option>
                        {(companiesDb || []).map((company, idx) => (
                          <option key={company.id || idx} value={company.name}>{company.name}</option>
                        ))}
                      </select>
                      <DropdownArrow className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    
                    <Button type="submit" disabled={!selectedCompany} className="w-full h-[68px] rounded-[1.25rem] text-[16px] font-black tracking-wide shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 mt-4">
                      Continue to Portal
                    </Button>
                  </form>

                  <div className="mt-auto pt-6 border-t border-slate-100 text-center">
                    <button onClick={goBack} className="text-[12px] font-extrabold text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors flex items-center justify-center w-full gap-2">
                      <ArrowLeft className="h-4 w-4" /> Return to role selection
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: CREDENTIALS */}
              {step === 3 && (
                <motion.div 
                  key="step3" 
                  custom={direction}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="absolute inset-0 flex flex-col p-8 md:p-12 overflow-y-auto max-sm:[&::-webkit-scrollbar]:hidden"
                >
                  
                  {/* DYNAMIC AVATAR / COMPANY LOGO HEADER */}
                  <div className="flex items-center gap-4 mb-4 shrink-0">
                    <div className="h-14 w-14 rounded-[1rem] overflow-hidden shadow-sm bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      {selectedRole === 'admin' ? (
                        adminLogo ? <img src={adminLogo} alt="Admin" className="h-full w-full object-cover" /> : <Shield className="h-7 w-7 text-blue-600" />
                      ) : (
                        activeCompanyObj?.logo_url ? <img src={activeCompanyObj.logo_url} alt={activeCompanyObj.name} className="h-full w-full object-contain p-1.5" /> : <Building2 className="h-7 w-7 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none truncate">Authentication.</h2>
                      <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 mt-1 uppercase tracking-widest truncate">
                        {selectedRole === 'admin' ? 'Master Administration' : activeCompanyObj?.name}
                      </p>
                    </div>
                  </div>

                  <p className="text-[14px] font-semibold text-slate-500 mb-6 shrink-0">Enter your secure credentials. Your session is protected by end-to-end encryption.</p>

                  {error && (
                    <div className="mb-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600 border border-rose-100 flex items-center gap-3 shrink-0">
                      <Shield className="h-5 w-5 shrink-0" /> {error}
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4 w-full shrink-0">
                    
                    {selectedRole === 'head' ? (
                      (headUsers || []).length > 1 ? (
                        <div className="relative">
                          <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 pointer-events-none" />
                          <select required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-[68px] rounded-[1.25rem] bg-[#fafbfc] border border-slate-200 hover:border-slate-300 px-5 pl-14 text-[16px] outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all appearance-none text-slate-900 font-extrabold cursor-pointer">
                            <option value="" disabled>Select your profile...</option>
                            {(headUsers || []).map((head, idx) => (
                              <option key={head.email || idx} value={head.email}>{head.name}</option>
                            ))}
                          </select>
                          <DropdownArrow className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      ) : (
                        <div className="relative">
                          <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 pointer-events-none" />
                          <input type="text" readOnly value={headUsers[0]?.name || email} className="w-full h-[68px] rounded-[1.25rem] bg-slate-50 border border-slate-200 px-5 pl-14 text-[16px] font-extrabold outline-none text-slate-500 cursor-not-allowed" />
                        </div>
                      )
                    ) : (
                      <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 pointer-events-none" />
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="w-full h-[68px] rounded-[1.25rem] bg-[#fafbfc] border border-slate-200 hover:border-slate-300 px-5 pl-14 text-[16px] font-extrabold outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all text-slate-900 placeholder:text-slate-400" />
                      </div>
                    )}
                    
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 pointer-events-none" />
                      <input 
                        type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Secure Password" className="w-full h-[68px] rounded-[1.25rem] bg-[#fafbfc] border border-slate-200 hover:border-slate-300 px-5 pl-14 pr-14 text-[16px] font-extrabold outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all text-slate-900 placeholder:text-slate-400 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden" 
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-lg">
                        {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                      </button>
                    </div>

                    <Button type="submit" disabled={isLoggingIn} className="w-full h-[68px] mt-6 rounded-[1.25rem] text-[16px] font-black tracking-wide shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:hover:translate-y-0">
                      {isLoggingIn ? "Authenticating Identity..." : "Authorize Access"}
                    </Button>
                  </form>

                  <div className="mt-auto pt-6 border-t border-slate-100 text-center shrink-0">
                    <button onClick={goBack} className="text-[12px] font-extrabold text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors flex items-center justify-center w-full gap-2">
                      <ArrowLeft className="h-4 w-4" /> Modify Selection
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* COPYRIGHT & DEVELOPER FOOTER */}
        <div className="absolute bottom-6 left-0 right-0 px-8 flex justify-between items-end z-20 pointer-events-none">
          <p className="text-[10px] font-extrabold text-slate-400/80 uppercase tracking-[0.2em] pointer-events-auto">
            © 2026 ZAYD INDUSTRIES PVT LTD.
          </p>
          
          <a 
            href="https://wa.me/917558957246" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xl font-black text-slate-300 hover:text-blue-600 transition-colors select-none pointer-events-auto"
            title="Developer"
          >
            R.
          </a>
        </div>

      </div>
    </>
  );
}