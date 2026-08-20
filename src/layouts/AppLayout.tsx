import { useState, useMemo } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Briefcase, FileText, Settings, LogOut, ArrowLeft, Building2, Banknote, UserSquare2, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { useDataStore } from "../store/dataStore";

export default function AppLayout() {
  const { role, user, signOut, activeWorkspace, setActiveWorkspace } = useAuthStore();
  const { companies, fetchAllData } = useDataStore();
  const navigate = useNavigate();

  // SIDEBAR TOGGLE STATE
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const activeCompany = activeWorkspace ? companies.find(c => c.id === activeWorkspace) : null;

  // DYNAMIC THEME ENGINE
  const theme = useMemo(() => {
    if (!activeWorkspace || !activeCompany) {
      return { bg: "bg-[#f8fafc]", navHover: "hover:bg-slate-100", activeText: "text-slate-900", pattern: "" };
    }
    
    const companyName = activeCompany.name || "";
    const charSum = companyName.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    
    const themes = [
      { bg: "bg-emerald-50/40", navHover: "hover:bg-emerald-100/50", activeText: "text-emerald-700", pattern: "radial-gradient(#10b98122 1px, transparent 1px)" },
      { bg: "bg-indigo-50/40", navHover: "hover:bg-indigo-100/50", activeText: "text-indigo-700", pattern: "radial-gradient(#6366f122 1px, transparent 1px)" },
      { bg: "bg-rose-50/40", navHover: "hover:bg-rose-100/50", activeText: "text-rose-700", pattern: "radial-gradient(#f43f5e22 1px, transparent 1px)" },
      { bg: "bg-amber-50/40", navHover: "hover:bg-amber-100/50", activeText: "text-amber-700", pattern: "radial-gradient(#f59e0b22 1px, transparent 1px)" },
    ];
    return themes[charSum % themes.length];
  }, [activeWorkspace, activeCompany]);

  const handleExitWorkspace = async () => {
    setActiveWorkspace(null);
    await fetchAllData();
    navigate("/dashboard");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navLinks = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/finance", icon: Banknote, label: "Finance" },
    { path: "/employees", icon: Users, label: "Employees" },
    { path: "/customers", icon: UserSquare2, label: "Customers" },
    { path: "/projects", icon: Briefcase, label: "Projects" },
    { path: "/invoices", icon: FileText, label: "Invoices" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className={`flex flex-col h-[100dvh] w-full transition-colors duration-1000 ${theme.bg} relative`}>
      {/* Subtle Geometric Pattern Overlay */}
      {theme.pattern && <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: theme.pattern, backgroundSize: '24px 24px' }} />}
      
      {/* --- RESTORED TOP NAVBAR --- */}
      <header className="h-20 flex items-center justify-between px-6 shrink-0 z-30 relative bg-transparent">
        {/* Left: Logo & Sidebar Toggle */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md">
            Z
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="h-10 w-10 bg-white border border-slate-200/60 rounded-2xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Center: Animated Zayd Industries Brand */}
        <motion.div 
          initial={{ opacity: 0, y: -10, letterSpacing: "0em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.2em" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none hidden sm:flex"
        >
          <h1 className="font-extrabold text-slate-900 uppercase text-lg">
            Zayd Industries
          </h1>
        </motion.div>

        {/* Right: User Profile Pill */}
        <div className="flex items-center gap-3 bg-white border border-slate-200/60 pl-1.5 pr-5 py-1.5 rounded-full shadow-sm">
          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-semibold text-slate-700">
            {user?.email?.split('@')[0] || 'User'}
          </span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* --- COLLAPSIBLE SIDEBAR --- */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0, x: -20 }}
              animate={{ width: 256, opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="bg-transparent flex flex-col z-20 shrink-0 border-r border-slate-200/40"
            >
              <nav className="flex-1 overflow-y-auto py-2 px-4 space-y-1.5">
                {navLinks.map((link) => (
                  <NavLink key={link.path} to={link.path} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${isActive ? `bg-white shadow-sm border border-slate-200/60 ${theme.activeText}` : `text-slate-500 ${theme.navHover}`}`}>
                    <link.icon className="h-4 w-4" /> <span className="whitespace-nowrap">{link.label}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="p-4">
                <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-2xl text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors whitespace-nowrap">
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* IMPERSONATION BANNER */}
          <AnimatePresence>
            {activeWorkspace && role === 'admin' && (
              <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="bg-slate-900 text-white px-8 py-3 flex items-center justify-between shadow-md z-50">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm font-medium tracking-wide">Managing Workspace: <span className="font-bold text-emerald-400 ml-1">{activeCompany?.name}</span></span>
                </div>
                <button onClick={handleExitWorkspace} className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:text-emerald-400 transition-colors bg-white/10 px-4 py-1.5 rounded-full">
                  <ArrowLeft className="h-4 w-4" /> Return to Global Network
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}