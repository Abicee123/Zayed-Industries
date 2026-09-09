import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Lock, Mail, Building2, UserCircle, Briefcase, ArrowLeft, Shield, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuthStore } from "../../store/authStore";
import { supabase } from "../../supabase";

// --- DYNAMIC TIME-OF-DAY THEMES ---
const THEMES = {
  morning: {
    bgClass: "from-rose-100 via-orange-50 to-sky-100",
    sun: "bg-orange-300 shadow-[0_0_80px_rgba(253,186,116,0.8)]",
    building: "#7dd3fc", parent: "#38bdf8",
    hillsBack: "#93c5fd", hillsFront: "#60a5fa", bridge: "#1e40af", fg: "#1e3a8a",
  },
  day: {
    bgClass: "from-amber-50 via-blue-50 to-blue-200",
    sun: "bg-amber-300 shadow-[0_0_80px_rgba(251,191,36,0.6)]",
    building: "#93c5fd", parent: "#60a5fa",
    hillsBack: "#3b82f6", hillsFront: "#2563eb", bridge: "#1e40af", fg: "#0f172a",
  },
  evening: {
    bgClass: "from-orange-200 via-rose-100 to-purple-200",
    sun: "bg-rose-400 shadow-[0_0_80px_rgba(251,113,133,0.8)]",
    building: "#c084fc", parent: "#a855f7",
    hillsBack: "#9333ea", hillsFront: "#7e22ce", bridge: "#4c1d95", fg: "#2e1065",
  },
  night: {
    bgClass: "from-slate-900 via-indigo-950 to-blue-950",
    sun: "bg-slate-100 shadow-[0_0_60px_rgba(255,255,255,0.4)] w-24 h-24", 
    building: "#312e81", parent: "#3730a3",
    hillsBack: "#1e3a8a", hillsFront: "#172554", bridge: "#0f172a", fg: "#020617",
  }
};

// Ultra-smooth, slow cinematic curve
const slowEase = [0.25, 0.1, 0.25, 1];

// Building Coordinates for the Skyline Layer
const subBuildings = [
  { x: 50, y: 200, w: 70, h: 200 }, { x: 150, y: 150, w: 60, h: 250 },
  { x: 250, y: 220, w: 80, h: 180 }, { x: 400, y: 180, w: 60, h: 220 },
  { x: 500, y: 240, w: 70, h: 160 }, { x: 850, y: 170, w: 60, h: 230 },
  { x: 950, y: 210, w: 90, h: 190 }, { x: 1100, y: 140, w: 60, h: 260 },
  { x: 1250, y: 230, w: 70, h: 170 }, { x: 1400, y: 190, w: 80, h: 210 }
];

// --- THE CONNECTED SKYLINE PARALLAX ANIMATION ---
const ParallaxScene = ({ activeCompanyIndex, activeCompanyObj, mouseX, mouseY }: { activeCompanyIndex: number | null, activeCompanyObj: any, mouseX: any, mouseY: any }) => {
  const [isTrainStopped, setIsTrainStopped] = useState(false);

  const hour = new Date().getHours();
  let timeTheme: keyof typeof THEMES = "day";
  if (hour >= 6 && hour < 10) timeTheme = "morning";
  else if (hour >= 10 && hour < 17) timeTheme = "day";
  else if (hour >= 17 && hour < 20) timeTheme = "evening";
  else timeTheme = "night";
  const t = THEMES[timeTheme];

  const smoothX = useSpring(mouseX, { stiffness: 40, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 40, damping: 20 });
  const mSunX = useTransform(smoothX, [-1, 1], [-20, 20]);
  const mSunY = useTransform(smoothY, [-1, 1], [-20, 20]);

  const hasSelection = activeCompanyIndex !== null;

  return (
    <>
      <style>{`
        @keyframes trainDrive { 0% { transform: translateX(-20vw); } 100% { transform: translateX(120vw); } }
        .train-track { animation: trainDrive 8s linear infinite; }
      `}</style>

      <div className={`absolute inset-0 overflow-hidden bg-gradient-to-b ${t.bgClass} transition-colors duration-1000`}>
        
        {timeTheme === 'night' && (
          <div className="absolute inset-0 z-0 opacity-40">
            <svg width="100%" height="100%">
              {[...Array(30)].map((_, i) => (
                <circle key={i} cx={`${Math.random() * 100}%`} cy={`${Math.random() * 60}%`} r={Math.random() * 1.5} fill="#fff" opacity={Math.random()} />
              ))}
            </svg>
          </div>
        )}

        <div className="absolute inset-0 opacity-[0.2]" style={{ backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <motion.div style={{ x: mSunX, y: mSunY }} className="absolute inset-0 z-0">
          <div className={`absolute top-[15%] right-[20%] w-32 h-32 md:w-48 md:h-48 rounded-full blur-[2px] transition-all duration-1000 ${t.sun}`} />
        </motion.div>

        {/* LAYER 1: The Skyline (Background Buildings) */}
        <motion.div 
          animate={{ scale: hasSelection ? 1.15 : 1 }}
          transition={{ duration: 3, ease: slowEase }}
          className="absolute bottom-[20%] left-0 w-full h-[60%] z-10 origin-bottom"
        >
          <motion.div className="flex h-full w-max flex-nowrap" style={{ willChange: "transform", WebkitTransform: "translateZ(0)" }} animate={{ x: ["0px", "-1600px"] }} transition={{ ease: "linear", duration: 60, repeat: Infinity }}>
            {[1, 2].map((key) => (
              <svg key={key} width="1600" height="400" viewBox="0 0 1600 400" className="h-full w-[1600px] shrink-0" preserveAspectRatio="none">
                
                {subBuildings.map((b, i) => {
                  const isActive = activeCompanyIndex === i;
                  return (
                    <motion.g key={i} animate={{ opacity: hasSelection && !isActive ? 0.25 : 1 }} transition={{ duration: 2.5, ease: slowEase }}>
                      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="4" fill={t.building} style={{ transition: "fill 1s ease" }} />
                      
                      <AnimatePresence>
                        {isActive && activeCompanyObj?.logo_url && (
                          <motion.image 
                            key={`logo-${i}`}
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1, transition: { duration: 1.5, delay: 1.2, ease: "easeOut" } }} 
                            exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeIn" } }} 
                            href={activeCompanyObj.logo_url} 
                            x={b.x + b.w/2 - 20} 
                            y={b.y + 15} 
                            width="40" 
                            height="40" 
                            preserveAspectRatio="xMidYMid meet" 
                          />
                        )}
                      </AnimatePresence>
                    </motion.g>
                  );
                })}

                <motion.g transform="translate(650, 50)" animate={{ opacity: hasSelection ? 0.25 : 1 }} transition={{ duration: 2.5, ease: slowEase }}>
                  <rect width="140" height="350" rx="8" fill={t.parent} style={{ transition: "fill 1s ease" }} />
                  <rect x="30" y="-30" width="80" height="50" rx="4" fill={t.parent} style={{ transition: "fill 1s ease" }} />
                  <circle cx="70" cy="-30" r="4" fill={timeTheme === 'night' ? '#ef4444' : '#fbbf24'} />
                </motion.g>
              </svg>
            ))}
          </motion.div>
        </motion.div>

        {/* LAYER 2 & 3: Depth of field blur wrapper */}
        <motion.div animate={{ opacity: hasSelection ? 0.6 : 1, filter: hasSelection ? "blur(3px)" : "blur(0px)" }} transition={{ duration: 3, ease: slowEase }} className="absolute inset-0 z-20 pointer-events-none">
          
          <div className="absolute bottom-[10%] left-0 w-full h-[50%] z-20 pointer-events-auto">
            <motion.div className="flex h-full w-max flex-nowrap" style={{ willChange: "transform", WebkitTransform: "translateZ(0)" }} animate={{ x: ["0px", "-1600px"] }} transition={{ ease: "linear", duration: 30, repeat: Infinity }}>
              {[1, 2].map((key) => (
                <svg key={key} width="1600" height="300" viewBox="0 0 1600 300" className="h-full w-[1600px] shrink-0" preserveAspectRatio="none">
                  <path d="M0,150 C200,150 200,300 400,300 C600,300 600,150 800,150 C1000,150 1000,300 1200,300 C1400,300 1400,150 1600,150 L1600,300 L0,300 Z" fill={t.hillsBack} style={{ transition: "fill 1s ease" }} />
                  <path d="M0,200 C150,200 150,100 300,100 C450,100 450,200 600,200 C750,200 750,150 900,150 C1050,150 1050,250 1200,250 C1400,250 1400,200 1600,200 L1600,300 L0,300 Z" fill={t.hillsFront} opacity="0.85" style={{ transition: "fill 1s ease" }} />
                  <g fill={t.bridge} style={{ transition: "fill 1s ease" }}>
                    <rect x="0" y="120" width="1600" height="12" />
                    <rect x="200" y="132" width="24" height="168" rx="8" />
                    <rect x="600" y="132" width="24" height="168" rx="8" />
                    <rect x="1000" y="132" width="24" height="168" rx="8" />
                    <rect x="1400" y="132" width="24" height="168" rx="8" />
                    <path d="M212,132 Q400,200 588,132" fill="none" stroke={t.bridge} strokeWidth="8" />
                    <path d="M612,132 Q800,200 988,132" fill="none" stroke={t.bridge} strokeWidth="8" />
                    <path d="M1012,132 Q1200,200 1388,132" fill="none" stroke={t.bridge} strokeWidth="8" />
                    <path d="M1412,132 Q1500,165 1600,132" fill="none" stroke={t.bridge} strokeWidth="8" />
                    <path d="M0,132 Q100,165 188,132" fill="none" stroke={t.bridge} strokeWidth="8" />
                  </g>
                </svg>
              ))}
            </motion.div>

            <div 
              onClick={() => setIsTrainStopped(!isTrainStopped)}
              title="Click to Stop/Resume Train"
              className="absolute top-[28%] md:top-[32%] w-56 h-6 bg-white rounded-full flex items-center px-3 shadow-[0_10px_30px_rgba(0,0,0,0.3)] z-20 cursor-pointer train-track hover:scale-105 transition-transform"
              style={{ animationPlayState: isTrainStopped ? 'paused' : 'running', willChange: "transform" }}
            >
              <div className="w-8 h-2.5 bg-slate-200 rounded-sm mr-2" />
              <div className="w-8 h-2.5 bg-slate-200 rounded-sm mr-2" />
              <div className="w-8 h-2.5 bg-slate-200 rounded-sm mr-2" />
              <div className="w-8 h-2.5 bg-slate-200 rounded-sm mr-auto" />
              <div className={`w-3 h-3 rounded-full transition-colors ${isTrainStopped ? 'bg-rose-500 shadow-[0_0_12px_#ef4444]' : 'bg-amber-400 shadow-[0_0_12px_#fbbf24]'}`} />
            </div>
          </div>

          {/* LAYER 3: Foreground Nature */}
          <div className="absolute bottom-0 left-0 w-full h-[30%] z-30 pointer-events-none">
            <motion.div className="flex h-full w-max flex-nowrap" style={{ willChange: "transform", WebkitTransform: "translateZ(0)" }} animate={{ x: ["0px", "-1600px"] }} transition={{ ease: "linear", duration: 15, repeat: Infinity }}>
              {[1, 2].map((key) => (
                <svg key={key} width="1600" height="200" viewBox="0 0 1600 200" className="h-full w-[1600px] shrink-0" preserveAspectRatio="none">
                  <path d="M0,100 C100,0 200,150 400,100 C600,50 800,150 1000,80 C1200,10 1400,150 1600,100 L1600,200 L0,200 Z" fill={t.hillsBack} style={{ transition: "fill 1s ease" }} opacity="0.6" />
                  <g fill={t.fg} style={{ transition: "fill 1s ease" }}>
                    <polygon points="150,40 135,120 165,120" /> <circle cx="150" cy="40" r="16" />
                    <polygon points="400,60 385,140 415,140" /> <circle cx="400" cy="60" r="20" />
                    <polygon points="850,20 835,100 865,100" /> <circle cx="850" cy="20" r="24" />
                    <polygon points="1200,50 1185,130 1215,130" /> <circle cx="1200" cy="50" r="18" />
                    <polygon points="1450,80 1435,160 1465,160" /> <circle cx="1450" cy="80" r="14" />
                  </g>
                </svg>
              ))}
            </motion.div>
          </div>
        </motion.div>

      </div>
    </>
  );
};


// --- MAIN LOGIN PAGE ---
export default function LoginPage() {
  const navigate = useNavigate();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

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

  const activeCompanyIndex = useMemo(() => {
    if (!selectedCompany) return null;
    return companiesDb.findIndex(c => c.name === selectedCompany);
  }, [selectedCompany, companiesDb]);

  const activeCompanyObj = useMemo(() => {
    if (activeCompanyIndex === null) return null;
    return companiesDb[activeCompanyIndex];
  }, [activeCompanyIndex, companiesDb]);

  const activeHeadUser = useMemo(() => {
    return headUsers.find(u => u.email === email) || headUsers[0] || null;
  }, [email, headUsers]);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: compData } = await supabase.from('companies').select('id, name, logo_url');
      if (compData) setCompaniesDb(compData);

      const { data: adminData } = await supabase.from('employees').select('profile_image_url').eq('access_level', 'admin').limit(1).single();
      
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

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    mouseX.set((clientX / window.innerWidth - 0.5) * 2);
    mouseY.set((clientY / window.innerHeight - 0.5) * 2);
  };

  const handleRoleSelect = (role: "admin" | "head" | "user") => {
    setSelectedRole(role); setSelectedCompany(""); setEmail(""); setPassword(""); setError("");
    if (role === "admin") setStep(3); else setStep(2);
  };

  const handleCompanySelect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    if (selectedRole === 'head') {
      const activeObj = companiesDb.find(c => c.name === selectedCompany);
      if (activeObj) {
        const { data } = await supabase.from('employees').select('name, email').eq('company_id', activeObj.id).eq('access_level', 'head');
        if (data && data.length > 0) {
          setHeadUsers(data);
          if (data.length === 1) setEmail(data[0].email);
          else setEmail("");
        } else setHeadUsers([]); 
      }
    }
    setStep(3);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setIsLoggingIn(true);
    const result = await signIn(email, password);
    if (result.error) { setError("Invalid credentials. Please try again."); setIsLoggingIn(false); } 
    else navigate("/dashboard");
  };

  const goBack = () => {
    setError(""); setEmail(""); setPassword(""); setHeadUsers([]);
    if (step === 3 && selectedRole !== "admin") setStep(2);
    else if (step === 3 && selectedRole === "admin") { setSelectedCompany(""); setSelectedRole(null); setStep(1); } 
    else if (step === 2) { setSelectedCompany(""); setSelectedRole(null); setStep(1); }
  };

  return (
    <div onMouseMove={handleMouseMove} className="h-[100dvh] w-full flex flex-col md:flex-row overflow-hidden font-sans bg-white relative">
      
      {/* MOBILE PARALLAX BANNER */}
      <div className="md:hidden w-full h-[35vh] relative z-0 shrink-0">
        <ParallaxScene activeCompanyIndex={activeCompanyIndex} activeCompanyObj={activeCompanyObj} mouseX={mouseX} mouseY={mouseY} />
      </div>

      {/* DESKTOP FULL SCREEN PARALLAX */}
      <div className="hidden md:block absolute inset-0 z-0 bg-gradient-to-b from-amber-50 via-blue-50 to-blue-200 overflow-hidden">
        <ParallaxScene activeCompanyIndex={activeCompanyIndex} activeCompanyObj={activeCompanyObj} mouseX={mouseX} mouseY={mouseY} />
      </div>

      {/* FIXED LOGIN CARD */}
      <div className="w-full md:w-[440px] lg:w-[480px] flex flex-col relative z-20 bg-white md:bg-white/95 md:backdrop-blur-xl md:absolute md:left-6 lg:left-10 md:top-6 lg:top-8 md:bottom-6 lg:bottom-8 rounded-t-[2.5rem] md:rounded-[2.5rem] -mt-8 md:mt-0 flex-1 md:flex-none shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:shadow-[0_30px_100px_-15px_rgba(0,0,0,0.3)] md:border border-white/60 overflow-hidden">
        
        {/* Header - Fixed Height */}
        <div className="h-24 px-8 md:px-12 flex items-center gap-4 shrink-0 relative z-50">
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

        {/* Scrollable / Flexible Form Area */}
        <div className="flex-1 px-8 md:px-12 flex flex-col overflow-y-auto min-h-0 py-2 w-full relative z-40">
          
          <div className="relative w-full flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              
              {/* STEP 1: SELECT ROLE */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.4, ease: slowEase }} className="w-full flex-col">
                  <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-8">Select Role.</h1>
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

              {/* STEP 2: SELECT WORKSPACE */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.4, ease: slowEase }} className="w-full">
                  <button onClick={goBack} className="flex items-center text-[10px] font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors mb-4 group w-max">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5 group-hover:-translate-x-1 transition-transform" /> Go Back
                  </button>
                  <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-8">Workspace.</h1>
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
                <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4, ease: slowEase }} className="w-full flex flex-col pt-2">
                  
                  <button onClick={goBack} className="flex items-center text-[10px] font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors mb-6 group w-max">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5 group-hover:-translate-x-1 transition-transform" /> Go Back
                  </button>

                  <div className="flex flex-col items-center text-center mb-8">
                    <div className="h-24 w-24 rounded-[2rem] bg-gradient-to-tr from-blue-500 to-indigo-500 p-1 shadow-lg shadow-blue-500/30 mb-5 relative">
                      <div className="absolute inset-0 bg-white/20 rounded-[2rem] blur-md pointer-events-none"></div>
                      <div className="relative h-full w-full bg-white rounded-[1.75rem] flex items-center justify-center shadow-inner overflow-hidden p-3">
                        {selectedRole === 'admin' ? (
                          adminLogo ? <img src={adminLogo} alt="Admin Logo" className="h-full w-full object-contain" /> : <Shield className="w-10 h-10 text-blue-600" />
                        ) : (
                          activeCompanyObj?.logo_url ? <img src={activeCompanyObj.logo_url} alt="Company Logo" className="h-full w-full object-contain" /> : <Building2 className="w-10 h-10 text-blue-600" />
                        )}
                      </div>
                    </div>
                    
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {selectedRole === 'admin' ? "System Admin" : selectedRole === 'user' ? "Employee Portal" : `Welcome, ${activeHeadUser?.name.split(' ')[0] || 'Head'}`}
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">
                      {selectedRole === 'admin' ? "Master Access" : `${selectedRole === 'head' ? 'Company Head' : 'Employee'} • ${selectedCompany}`}
                    </p>
                  </div>

                  {error && (
                    <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-[13px] font-bold text-rose-600 border border-rose-100 flex items-center gap-3">
                      <Shield className="h-5 w-5 shrink-0" /> {error}
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                    {selectedRole === 'head' && headUsers.length > 1 ? (
                      <div className="relative">
                        <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <select required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-16 rounded-[1.25rem] border-2 border-slate-200 bg-white px-5 pl-14 text-[16px] outline-none focus:border-blue-600 transition-all appearance-none text-slate-800 font-bold cursor-pointer shadow-sm">
                          <option value="" disabled>Choose your profile...</option>
                          {headUsers.map((head) => (
                            <option key={head.email} value={head.email}>{head.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : selectedRole !== 'head' ? (
                      <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="w-full h-16 rounded-[1.25rem] border-2 border-slate-200 bg-white px-5 pl-14 text-[16px] font-bold outline-none focus:border-blue-600 transition-all text-slate-900 shadow-sm" />
                      </div>
                    ) : null}
                    
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input 
                        type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Password" className="w-full h-16 rounded-[1.25rem] border-2 border-slate-200 bg-white px-5 pl-14 pr-14 text-[16px] font-bold outline-none focus:border-blue-600 transition-all text-slate-900 shadow-sm [&::-ms-reveal]:hidden [&::-ms-clear]:hidden" 
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-1">
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

            {/* IN-FLOW COPYRIGHT / DEVELOPER FOOTER */}
            <div className="mt-12 mb-4 w-full flex flex-col shrink-0">
              <div className="w-full h-px bg-slate-100 mb-6" />
              <div className="flex items-center justify-between relative px-2">
                
                <div className="flex-1 flex justify-start">
                  <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                    © {new Date().getFullYear()} Zayd
                  </p>
                </div>
                
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-4 bg-slate-200" />
                
                <div className="flex-1 flex justify-end">
                  <a 
                    href="https://wa.me/917558957246" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[10px] font-bold text-slate-300 hover:text-blue-500 transition-colors select-none tracking-widest"
                    title="Developer"
                  >
                    radix.
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}