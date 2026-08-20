import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Briefcase, FileText, Settings, LogOut, ArrowLeft, Building2, Banknote, UserSquare2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion"; // <-- THIS IS THE MISSING IMPORT!
import { useAuthStore } from "../store/authStore";
import { useDataStore } from "../store/dataStore";
import { useMemo } from "react";

export default function AppLayout() {
  const { role, signOut, activeWorkspace, setActiveWorkspace } = useAuthStore();
  const { companies, fetchAllData } = useDataStore();
  const navigate = useNavigate();

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
    <div className={`flex h-[100dvh] w-full transition-colors duration-1000 ${theme.bg} relative`}>
      {/* Subtle Geometric Pattern Overlay */}
      {theme.pattern && <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: theme.pattern, backgroundSize: '24px 24px' }} />}
      
      {/* The Sidebar */}
      <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col z-10">
        <div className="h-20 flex items-center px-6 border-b border-slate-100">
          <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-xl mr-3 shadow-md">Z</div>
          <span className="font-bold text-slate-900 tracking-tight">Radix OS</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
          {navLinks.map((link) => (
            <NavLink key={link.path} to={link.path} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? `bg-white shadow-sm border border-slate-200/60 ${theme.activeText}` : `text-slate-500 ${theme.navHover}`}`}>
              <link.icon className="h-4 w-4" /> {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative z-10">
        
        {/* IMPERSONATION BANNER */}
        <AnimatePresence>
          {activeWorkspace && role === 'admin' && (
            <motion.div initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }} className="bg-slate-900 text-white px-8 py-3 flex items-center justify-between shadow-lg z-50">
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
        
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}