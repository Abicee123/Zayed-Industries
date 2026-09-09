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
    building: "#7dd3fc", buildingDark: "#38bdf8", parent: "#0ea5e9",
    hillsBack: "#93c5fd", hillsFront: "#60a5fa", bridge: "#1e40af", bridgeDark: "#1e3a8a", fg: "#1e3a8a",
  },
  day: {
    bgClass: "from-amber-50 via-blue-50 to-blue-200",
    sun: "bg-amber-300 shadow-[0_0_80px_rgba(251,191,36,0.6)]",
    building: "#93c5fd", buildingDark: "#60a5fa", parent: "#3b82f6",
    hillsBack: "#60a5fa", hillsFront: "#3b82f6", bridge: "#1e40af", bridgeDark: "#172554", fg: "#0f172a",
  },
  evening: {
    bgClass: "from-orange-200 via-rose-100 to-purple-200",
    sun: "bg-rose-400 shadow-[0_0_80px_rgba(251,113,133,0.8)]",
    building: "#c084fc", buildingDark: "#a855f7", parent: "#9333ea",
    hillsBack: "#a855f7", hillsFront: "#7e22ce", bridge: "#4c1d95", bridgeDark: "#2e1065", fg: "#2e1065",
  },
  night: {
    bgClass: "from-slate-900 via-indigo-950 to-blue-950",
    sun: "bg-slate-100 shadow-[0_0_60px_rgba(255,255,255,0.4)] w-24 h-24", 
    building: "#312e81", buildingDark: "#1e1b4b", parent: "#3730a3",
    hillsBack: "#1e3a8a", hillsFront: "#172554", bridge: "#0f172a", bridgeDark: "#020617", fg: "#020617",
  }
};

const slowEase = [0.25, 0.1, 0.25, 1];

const subBuildings = [
  { x: 10, y: 150, w: 40, h: 250, z: 0 }, { x: 30, y: 200, w: 70, h: 200, z: 1 }, { x: 80, y: 120, w: 50, h: 280, z: 0 },
  { x: 120, y: 180, w: 60, h: 220, z: 1 }, { x: 160, y: 140, w: 80, h: 260, z: 0 }, { x: 220, y: 210, w: 50, h: 190, z: 1 },
  { x: 260, y: 130, w: 70, h: 270, z: 0 }, { x: 310, y: 190, w: 60, h: 210, z: 1 }, { x: 360, y: 160, w: 55, h: 240, z: 0 },
  { x: 400, y: 220, w: 80, h: 180, z: 1 }, { x: 460, y: 150, w: 45, h: 250, z: 0 }, { x: 490, y: 180, w: 65, h: 220, z: 1 },
  { x: 540, y: 240, w: 70, h: 160, z: 0 }, { x: 590, y: 170, w: 50, h: 230, z: 1 }, 
  { x: 820, y: 180, w: 60, h: 220, z: 0 }, { x: 860, y: 140, w: 50, h: 260, z: 1 }, { x: 900, y: 210, w: 75, h: 190, z: 0 },
  { x: 950, y: 160, w: 85, h: 240, z: 1 }, { x: 1020, y: 230, w: 50, h: 170, z: 0 }, { x: 1060, y: 150, w: 60, h: 250, z: 1 },
  { x: 1110, y: 190, w: 70, h: 210, z: 0 }, { x: 1170, y: 130, w: 55, h: 270, z: 1 }, { x: 1210, y: 220, w: 65, h: 180, z: 0 },
  { x: 1260, y: 170, w: 80, h: 230, z: 1 }, { x: 1320, y: 240, w: 50, h: 160, z: 0 }, { x: 1360, y: 140, w: 75, h: 260, z: 1 },
  { x: 1420, y: 190, w: 60, h: 210, z: 0 }, { x: 1470, y: 160, w: 80, h: 240, z: 1 }, { x: 1530, y: 210, w: 50, h: 190, z: 0 }
];

// Ultra-realistic, complex volumetric forest generation
const forestTrees = Array.from({ length: 150 }).map((_, i) => {
  const typeSeed = (i * 11) % 3;
  const types = ['pine', 'oak', 'cypress'];
  const x = (i * 11) % 1600 + Math.random() * 15;
  const yOffset = Math.pow(Math.random(), 2) * 45; 
  return { 
    x, 
    y: 80 + yOffset, 
    type: types[typeSeed], 
    scale: 0.35 + (yOffset / 45) * 0.8 + Math.random() * 0.2, 
    opacity: 0.5 + (yOffset / 45) * 0.5 
  };
}).sort((a, b) => a.y - b.y);

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
        @keyframes trainRight { 0% { transform: translate3d(-50vw, 0, 0); } 100% { transform: translate3d(150vw, 0, 0); } }
        @keyframes trainLeft { 0% { transform: translate3d(150vw, 0, 0); } 100% { transform: translate3d(-50vw, 0, 0); } }
        .anim-train-1 { animation: trainRight 16s linear infinite; }
        .anim-train-2 { animation: trainLeft 22s linear infinite; }
        .anim-train-3 { animation: trainRight 9s linear infinite; }
      `}</style>

      <div className={`absolute inset-0 overflow-hidden bg-gradient-to-b ${t.bgClass} transition-colors duration-1000`}>
        
        {timeTheme === 'night' && (
          <div className="absolute inset-0 z-0 opacity-40">
            <svg width="100%" height="100%">
              {[...Array(40)].map((_, i) => (
                <circle key={i} cx={`${Math.random() * 100}%`} cy={`${Math.random() * 60}%`} r={Math.random() * 1.5} fill="#fff" opacity={Math.random()} />
              ))}
            </svg>
          </div>
        )}

        <div className="absolute inset-0 opacity-[0.2]" style={{ backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <motion.div style={{ x: mSunX, y: mSunY }} className="absolute inset-0 z-0">
          <div className={`absolute top-[15%] right-[20%] w-32 h-32 md:w-48 md:h-48 rounded-full blur-[2px] transition-all duration-1000 ${t.sun}`} />
        </motion.div>

        {/* LAYER 1: Highly Congested Skyline */}
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
                  const isPrimary = i < 15; 
                  return (
                    <motion.g key={i} animate={{ opacity: hasSelection && !isActive ? (b.z === 0 ? 0.15 : 0.25) : 1 }} transition={{ duration: 2.5, ease: slowEase }}>
                      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="3" fill={b.z === 0 ? t.buildingDark : t.building} style={{ transition: "fill 1s ease" }} />
                      <AnimatePresence>
                        {isActive && isPrimary && activeCompanyObj?.logo_url && (
                          <motion.image 
                            key={`logo-${i}`}
                            initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 1.5, delay: 1.2, ease: "easeOut" } }} exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeIn" } }} 
                            href={activeCompanyObj.logo_url} x={b.x + b.w/2 - 20} y={b.y + 15} width="40" height="40" preserveAspectRatio="xMidYMid meet" 
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
                  {[...Array(6)].map((_, r) => (
                    <g key={r} opacity="0.4">
                      <rect x="20" y={20 + r*50} width="30" height="30" rx="2" fill={t.building} />
                      <rect x="60" y={20 + r*50} width="30" height="30" rx="2" fill={t.building} />
                      <rect x="100" y={20 + r*50} width="20" height="30" rx="2" fill={t.building} />
                    </g>
                  ))}
                </motion.g>
              </svg>
            ))}
          </motion.div>
        </motion.div>

        {/* LAYER 2 & 3: Depth of field blur wrapper */}
        <motion.div animate={{ opacity: hasSelection ? 0.6 : 1, filter: hasSelection ? "blur(3px)" : "blur(0px)" }} transition={{ duration: 3, ease: slowEase }} className="absolute inset-0 z-20 pointer-events-none">
          
          <div className="absolute bottom-[10%] left-0 w-full h-[50%] z-20">
            <motion.div className="flex h-full w-max flex-nowrap" style={{ willChange: "transform", WebkitTransform: "translateZ(0)" }} animate={{ x: ["0px", "-1600px"] }} transition={{ ease: "linear", duration: 30, repeat: Infinity }}>
              {[1, 2].map((key) => (
                <svg key={key} width="1600" height="300" viewBox="0 0 1600 300" className="h-full w-[1600px] shrink-0 pointer-events-none" preserveAspectRatio="none">
                  <path d="M0,100 C200,80 300,180 500,150 C700,120 800,200 1000,160 C1200,120 1400,180 1600,140 L1600,300 L0,300 Z" fill={t.hillsBack} opacity="0.6" style={{ transition: "fill 1s ease" }} />
                  <path d="M0,150 C200,150 200,300 400,300 C600,300 600,150 800,150 C1000,150 1000,300 1200,300 C1400,300 1400,150 1600,150 L1600,300 L0,300 Z" fill={t.hillsBack} style={{ transition: "fill 1s ease" }} />
                  <path d="M0,200 C150,200 150,100 300,100 C450,100 450,200 600,200 C750,200 750,150 900,150 C1050,150 1050,250 1200,250 C1400,250 1400,200 1600,200 L1600,300 L0,300 Z" fill={t.hillsFront} opacity="0.85" style={{ transition: "fill 1s ease" }} />
                  
                  {/* Far Background Bridge (y=110) */}
                  <g fill={t.bridgeDark} opacity="0.7">
                    <rect x="0" y="110" width="1600" height="6" />
                    <rect x="150" y="116" width="12" height="200" rx="2" />
                    <rect x="550" y="116" width="12" height="200" rx="2" />
                    <rect x="950" y="116" width="12" height="200" rx="2" />
                    <rect x="1350" y="116" width="12" height="200" rx="2" />
                  </g>

                  {/* Main Midground Bridge (y=180) */}
                  <g fill={t.bridge} style={{ transition: "fill 1s ease" }}>
                    <rect x="0" y="180" width="1600" height="10" />
                    <rect x="200" y="190" width="20" height="160" rx="4" />
                    <rect x="600" y="190" width="20" height="160" rx="4" />
                    <rect x="1000" y="190" width="20" height="160" rx="4" />
                    <rect x="1400" y="190" width="20" height="160" rx="4" />
                    <path d="M210,180 Q400,230 590,180" fill="none" stroke={t.bridge} strokeWidth="6" />
                    <path d="M610,180 Q800,230 990,180" fill="none" stroke={t.bridge} strokeWidth="6" />
                    <path d="M1010,180 Q1200,230 1390,180" fill="none" stroke={t.bridge} strokeWidth="6" />
                    <path d="M1410,180 Q1500,205 1600,180" fill="none" stroke={t.bridge} strokeWidth="6" />
                    <path d="M0,180 Q100,205 190,180" fill="none" stroke={t.bridge} strokeWidth="6" />
                  </g>
                </svg>
              ))}
            </motion.div>

            {/* FULL-SCREEN ABSOLUTE TRAINS (Bound perfectly to the rails) */}
            
            {/* Train 2: Far Background (Moving Left) */}
            <div className="absolute left-0 w-[140px] h-[14px] bg-slate-300 rounded-t-md rounded-b-none flex items-center px-1.5 shadow-sm z-10 anim-train-2 opacity-60" style={{ top: "calc(36.66% - 14px)", animationPlayState: isTrainStopped ? 'paused' : 'running' }}>
              <div className="w-1.5 h-1.5 bg-amber-200 rounded-full shadow-[0_0_8px_#fbbf24] mr-auto" />
              <div className="w-5 h-1.5 bg-slate-400 rounded-sm ml-1" />
              <div className="w-5 h-1.5 bg-slate-400 rounded-sm ml-1" />
              <div className="w-5 h-1.5 bg-slate-400 rounded-sm ml-1" />
            </div>

            {/* Train 1: Main Midground (Moving Right) */}
            <div onClick={() => setIsTrainStopped(!isTrainStopped)} title="Click to Stop/Resume Trains" className="absolute left-0 w-[220px] h-[22px] bg-white rounded-t-xl rounded-b-none flex items-center px-2.5 shadow-lg z-20 cursor-pointer pointer-events-auto anim-train-1 hover:brightness-110 transition-all" style={{ top: "calc(60% - 22px)", animationPlayState: isTrainStopped ? 'paused' : 'running' }}>
              <div className="w-7 h-2 bg-slate-200 rounded-sm mr-2" />
              <div className="w-7 h-2 bg-slate-200 rounded-sm mr-2" />
              <div className="w-7 h-2 bg-slate-200 rounded-sm mr-2" />
              <div className="w-7 h-2 bg-slate-200 rounded-sm mr-auto" />
              <div className={`w-2.5 h-2.5 rounded-full transition-colors ${isTrainStopped ? 'bg-rose-500 shadow-[0_0_10px_#ef4444]' : 'bg-amber-400 shadow-[0_0_10px_#fbbf24]'}`} />
            </div>
          </div>

          {/* LAYER 3: Ultra-Realistic Forest & Foreground Track */}
          <div className="absolute bottom-0 left-0 w-full h-[30%] z-30">
            <motion.div className="flex h-full w-max flex-nowrap pointer-events-none" style={{ willChange: "transform", WebkitTransform: "translateZ(0)" }} animate={{ x: ["0px", "-1600px"] }} transition={{ ease: "linear", duration: 15, repeat: Infinity }}>
              {[1, 2].map((key) => (
                <svg key={key} width="1600" height="200" viewBox="0 0 1600 200" className="h-full w-[1600px] shrink-0" preserveAspectRatio="none">
                  
                  {/* Distant Ground for Trees */}
                  <path d="M0,120 C300,90 500,130 800,100 C1100,70 1300,120 1600,90 L1600,200 L0,200 Z" fill={t.hillsBack} style={{ transition: "fill 1s ease" }} opacity="0.4" />
                  
                  {/* Ultra-Realistic Mixed Forest Canopy */}
                  {forestTrees.map((tree, i) => {
                    const { x, y, type, scale, opacity } = tree;
                    return (
                      <g key={`tree-${i}`} transform={`translate(${x}, ${y}) scale(${scale})`} fill={t.fg} opacity={opacity} style={{ transition: "fill 1s ease" }}>
                        {type === 'pine' && (
                          <>
                            <rect x="-3" y="10" width="6" height="50" fill="#020617" opacity="0.9" />
                            <path d="M0,-55 L-14,-25 L-6,-25 L-20,0 L-10,0 L-28,25 L-14,25 L-35,50 L35,50 L14,25 L28,25 L10,0 L20,0 L6,-25 L14,-25 Z" fill={t.fg} />
                            <path d="M0,-55 L0,50 L-35,50 L-14,25 L-28,25 L-10,0 L-20,0 L-6,-25 L-14,-25 Z" fill="#020617" opacity="0.35" />
                          </>
                        )}
                        {type === 'oak' && (
                          <>
                            <path d="M-4,50 L-4,10 L-15,-5 M4,50 L4,10 L15,-10 M0,20 L0,-15" stroke="#020617" strokeWidth="6" fill="none" opacity="0.9" />
                            <path d="M-15,20 C-40,20 -50,-10 -25,-25 C-35,-50 -5,-65 15,-50 C40,-65 60,-30 35,-15 C55,10 30,30 5,20 Z" fill={t.fg} />
                            <path d="M-15,20 C-40,20 -50,-10 -25,-25 C-35,-50 -5,-65 15,-50 C15,-20 0,0 -15,20 Z" fill="#020617" opacity="0.25" />
                            <circle cx="-10" cy="-10" r="15" fill={t.fg} />
                            <circle cx="15" cy="-20" r="18" fill={t.fg} />
                            <circle cx="5" cy="5" r="14" fill={t.fg} />
                          </>
                        )}
                        {type === 'cypress' && (
                          <>
                            <rect x="-2" y="10" width="4" height="50" fill="#020617" opacity="0.9" />
                            <path d="M0,-60 L-5,-30 L-2,-25 L-9,-5 L-4,0 L-14,25 L-8,30 L-18,50 L18,50 L8,30 L14,25 L4,0 L9,-5 L2,-25 L5,-30 Z" fill={t.fg} />
                            <path d="M0,-60 L0,50 L-18,50 L-8,30 L-14,25 L-4,0 L-9,-5 L-2,-25 L-5,-30 Z" fill="#020617" opacity="0.3" />
                          </>
                        )}
                      </g>
                    );
                  })}
                  
                  {/* Foreground Solid Hill - Beautifully covers the trunks */}
                  <path d="M0,150 C400,120 800,160 1200,130 C1400,115 1500,140 1600,120 L1600,200 L0,200 Z" fill={t.hillsFront} style={{ transition: "fill 1s ease" }} />

                  {/* Foreground Solid High-Speed Track (y=160) */}
                  <rect x="0" y="160" width="1600" height="16" fill="#0f172a" />
                  <rect x="0" y="160" width="1600" height="2" fill="#334155" />
                </svg>
              ))}
            </motion.div>

            {/* Train 3: High Speed Foreground (Moving Right) -> Bound to top: calc(80% - 30px) */}
            <div onClick={() => setIsTrainStopped(!isTrainStopped)} title="Click to Stop/Resume Trains" className="absolute left-0 w-[300px] h-[30px] bg-slate-100 rounded-t-2xl rounded-b-none flex items-center px-4 shadow-xl z-30 cursor-pointer pointer-events-auto anim-train-3 hover:brightness-105 transition-all" style={{ top: "calc(80% - 30px)", animationPlayState: isTrainStopped ? 'paused' : 'running' }}>
              <div className="w-12 h-3.5 bg-slate-300 rounded-sm mr-2.5" />
              <div className="w-12 h-3.5 bg-slate-300 rounded-sm mr-2.5" />
              <div className="w-12 h-3.5 bg-slate-300 rounded-sm mr-2.5" />
              <div className="w-12 h-3.5 bg-slate-300 rounded-sm mr-auto" />
              <div className={`w-3.5 h-3.5 rounded-full transition-colors ${isTrainStopped ? 'bg-rose-500 shadow-[0_0_15px_#ef4444]' : 'bg-sky-400 shadow-[0_0_15px_#38bdf8]'}`} />
            </div>
          </div>
        </motion.div>

      </div>
    </>
  );
};


// --- MAIN LOGIN PAGE (100% UNTOUCHED LAYOUT) ---
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
      
      {/* MOBILE PARALLAX BANNER (Slightly shorter to guarantee footer space without scrolling) */}
      <div className="md:hidden w-full h-[28vh] min-h-[200px] relative z-0 shrink-0">
        <ParallaxScene activeCompanyIndex={activeCompanyIndex} activeCompanyObj={activeCompanyObj} mouseX={mouseX} mouseY={mouseY} />
      </div>

      {/* DESKTOP FULL SCREEN PARALLAX */}
      <div className="hidden md:block absolute inset-0 z-0 bg-gradient-to-b from-amber-50 via-blue-50 to-blue-200 overflow-hidden">
        <ParallaxScene activeCompanyIndex={activeCompanyIndex} activeCompanyObj={activeCompanyObj} mouseX={mouseX} mouseY={mouseY} />
      </div>

      {/* FIXED LOGIN CARD - overflow-hidden prevents scrollbars */}
      <div className="w-full md:w-[440px] lg:w-[480px] flex flex-col relative z-20 bg-white md:bg-white/95 md:backdrop-blur-xl md:absolute md:left-6 lg:left-10 md:top-6 lg:top-8 md:bottom-6 lg:bottom-8 rounded-t-[2.5rem] md:rounded-[2.5rem] -mt-8 md:mt-0 flex-1 md:flex-none shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:shadow-[0_30px_100px_-15px_rgba(0,0,0,0.3)] md:border border-white/60 overflow-y-auto md:overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* Header - Fixed Height */}
        <div className="h-20 md:h-24 px-8 md:px-12 flex items-center gap-4 shrink-0 relative z-50">
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

        {/* Content Area */}
        <div className="flex-1 px-8 md:px-12 flex flex-col w-full relative z-40">
          
          {/* Step Wrapper Height carefully adjusted */}
          <div className="relative w-full h-[340px] md:h-[380px] shrink-0 mt-2 md:mt-4">
            <AnimatePresence mode="wait">
              
              {/* STEP 1: SELECT ROLE */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.4, ease: slowEase }} className="absolute inset-0 w-full flex flex-col">
                  <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-6">Select Role.</h1>
                  <div className="space-y-3">
                    <button onClick={() => handleRoleSelect("admin")} className="w-full flex items-center p-3 sm:p-4 rounded-[1.25rem] border-2 border-slate-100 bg-white hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 group transition-all text-left">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mr-4 shrink-0"><Shield className="h-5 w-5" /></div>
                      <div className="flex-1"><span className="block font-bold text-[15px] text-slate-900">System Admin</span></div>
                      <CheckCircle2 className="h-5 w-5 text-slate-200 group-hover:text-blue-600 transition-colors hidden sm:block shrink-0" />
                    </button>
                    <button onClick={() => handleRoleSelect("head")} className="w-full flex items-center p-3 sm:p-4 rounded-[1.25rem] border-2 border-slate-100 bg-white hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 group transition-all text-left">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500 group-hover:bg-amber-400 group-hover:text-white transition-colors mr-4 shrink-0"><Briefcase className="h-5 w-5" /></div>
                      <div className="flex-1"><span className="block font-bold text-[15px] text-slate-900">Company Head</span></div>
                      <CheckCircle2 className="h-5 w-5 text-slate-200 group-hover:text-blue-600 transition-colors hidden sm:block shrink-0" />
                    </button>
                    <button onClick={() => handleRoleSelect("user")} className="w-full flex items-center p-3 sm:p-4 rounded-[1.25rem] border-2 border-slate-100 bg-white hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 group transition-all text-left">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-slate-700 group-hover:text-white transition-colors mr-4 shrink-0"><UserCircle className="h-5 w-5" /></div>
                      <div className="flex-1"><span className="block font-bold text-[15px] text-slate-900">Employee</span></div>
                      <CheckCircle2 className="h-5 w-5 text-slate-200 group-hover:text-blue-600 transition-colors hidden sm:block shrink-0" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: SELECT WORKSPACE */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.4, ease: slowEase }} className="absolute inset-0 w-full flex flex-col">
                  <button onClick={goBack} className="flex items-center text-[10px] font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors mb-4 group w-max">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5 group-hover:-translate-x-1 transition-transform" /> Go Back
                  </button>
                  <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-6">Workspace.</h1>
                  <form onSubmit={handleCompanySelect} className="space-y-4">
                    <div className="relative">
                      <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <select required value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="w-full h-14 rounded-[1.25rem] border-2 border-slate-200 bg-white px-5 pl-14 text-[15px] outline-none focus:border-blue-600 transition-all appearance-none text-slate-800 font-bold cursor-pointer shadow-sm">
                        <option value="" disabled>Choose your company...</option>
                        {companiesDb.map((company) => (
                          <option key={company.id} value={company.name}>{company.name}</option>
                        ))}
                      </select>
                    </div>
                    <Button type="submit" disabled={!selectedCompany} className="w-full h-14 rounded-[1.25rem] text-[15px] font-bold shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:shadow-blue-600/30 transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
                      Continue
                    </Button>
                  </form>
                </motion.div>
              )}

              {/* STEP 3: CREDENTIALS */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4, ease: slowEase }} className="absolute inset-0 w-full flex flex-col">
                  
                  <button onClick={goBack} className="flex items-center text-[10px] font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors mb-3 md:mb-5 group w-max">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5 group-hover:-translate-x-1 transition-transform" /> Go Back
                  </button>

                  <div className="flex flex-col items-center text-center mb-4 md:mb-5">
                    <div className="h-16 w-16 md:h-20 md:w-20 rounded-[1.5rem] md:rounded-[1.75rem] bg-gradient-to-tr from-blue-500 to-indigo-500 p-1 shadow-md shadow-blue-500/20 mb-3 md:mb-4 relative">
                      <div className="absolute inset-0 bg-white/20 rounded-[1.5rem] md:rounded-[1.75rem] blur-md pointer-events-none"></div>
                      <div className="relative h-full w-full bg-white rounded-[1.25rem] md:rounded-[1.5rem] flex items-center justify-center shadow-inner overflow-hidden p-2.5 md:p-3">
                        {selectedRole === 'admin' ? (
                          adminLogo ? <img src={adminLogo} alt="Admin Logo" className="h-full w-full object-contain" /> : <Shield className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                        ) : (
                          activeCompanyObj?.logo_url ? <img src={activeCompanyObj.logo_url} alt="Company Logo" className="h-full w-full object-contain" /> : <Building2 className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                        )}
                      </div>
                    </div>
                    
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none mb-1.5">
                      {selectedRole === 'admin' ? "System Admin" : selectedRole === 'user' ? "Employee Portal" : `Welcome, ${activeHeadUser?.name.split(' ')[0] || 'Head'}`}
                    </h2>
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {selectedRole === 'admin' ? "Master Access" : `${selectedRole === 'head' ? 'Company Head' : 'Employee'} • ${selectedCompany}`}
                    </p>
                  </div>

                  {error && (
                    <div className="mb-3 rounded-xl bg-rose-50 p-2.5 text-[12px] font-bold text-rose-600 border border-rose-100 flex items-center gap-2">
                      <Shield className="h-4 w-4 shrink-0" /> {error}
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-3 w-full">
                    {selectedRole === 'head' && headUsers.length > 1 ? (
                      <div className="relative">
                        <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <select required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-14 rounded-2xl border-2 border-slate-200 bg-white px-4 pl-12 text-[15px] outline-none focus:border-blue-600 transition-all appearance-none text-slate-800 font-bold cursor-pointer shadow-sm">
                          <option value="" disabled>Choose your profile...</option>
                          {headUsers.map((head) => (
                            <option key={head.email} value={head.email}>{head.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : selectedRole !== 'head' ? (
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="w-full h-14 rounded-2xl border-2 border-slate-200 bg-white px-4 pl-12 text-[15px] font-bold outline-none focus:border-blue-600 transition-all text-slate-900 shadow-sm" />
                      </div>
                    ) : null}
                    
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input 
                        type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Password" className="w-full h-14 rounded-2xl border-2 border-slate-200 bg-white px-4 pl-12 pr-12 text-[15px] font-bold outline-none focus:border-blue-600 transition-all text-slate-900 shadow-sm [&::-ms-reveal]:hidden [&::-ms-clear]:hidden" 
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-1">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>

                    <Button type="submit" disabled={isLoggingIn} className="w-full h-14 mt-1 rounded-2xl text-[15px] font-bold shadow-lg shadow-blue-600/20 hover:shadow-xl hover:-translate-y-0.5 transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:hover:translate-y-0">
                      {isLoggingIn ? "Authenticating..." : "Log in"}
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* IN-FLOW COPYRIGHT / DEVELOPER FOOTER */}
          <div className="mt-auto mb-4 md:mb-6 w-full flex flex-col shrink-0">
            <div className="w-full h-px bg-slate-100 mb-3 md:mb-4" />
            <div className="flex items-center justify-between relative px-2">
              
              <div className="flex-1 flex justify-start overflow-hidden">
                <p className="text-[7px] sm:text-[9px] font-bold text-slate-300 uppercase tracking-wider sm:tracking-widest text-left whitespace-nowrap">
                  © 2026 ZAYD INDUSTRIES PVT LTD.
                </p>
              </div>
              
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-3 md:h-4 bg-slate-200" />
              
              <div className="flex-1 flex justify-end">
                <a 
                  href="https://wa.me/917558957246" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[9px] sm:text-[10px] font-bold text-slate-300 hover:text-blue-500 transition-colors select-none tracking-widest whitespace-nowrap"
                  title="Developer"
                >
                  R.
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}