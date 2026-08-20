import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Briefcase, FileText, Settings, DollarSign, Menu, X } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { motion } from "framer-motion";

const sidebarLinks = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Finance", href: "/finance", icon: DollarSign },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Projects", href: "/projects", icon: Briefcase },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

const animatedTitle = "ZAYD INDUSTRIES";

export default function AppLayout() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-slate-50 text-slate-900 overflow-hidden">
      
      {/* Left Sidebar */}
      <aside 
        className={`flex flex-col border-r border-white/50 bg-white/40 backdrop-blur-xl shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-20 transition-all duration-300 ease-in-out shrink-0 ${
          isSidebarOpen ? "w-64 translate-x-0 ml-0" : "w-64 -translate-x-full -ml-64"
        }`}
      >
        {/* Sidebar Header with 'X' Close Button */}
        <div className="flex h-16 items-center justify-between border-b border-white/50 px-4 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white text-xl font-bold shadow-md">
            Z
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-white/60 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white/50 ring-1 ring-black/5 shadow-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const isActive = location.pathname.includes(link.href);
            return (
              <Link
                key={link.name}
                to={link.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? "bg-white/60 text-slate-900 shadow-sm ring-1 ring-black/5" 
                    : "text-slate-500 hover:bg-white/40 hover:text-slate-900 hover:shadow-sm"
                }`}
              >
                <link.icon className={`h-5 w-5 shrink-0 ${isActive ? "text-slate-900" : "text-slate-400"}`} />
                <span className="whitespace-nowrap">{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden transition-all duration-300">
        
        {/* Top Header */}
        <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-white/50 bg-white/40 backdrop-blur-xl px-4 sm:px-8 z-10 sticky top-0">
          
          {/* Left: Hamburger Menu (Only shows when sidebar is closed) */}
          <div className="flex items-center text-sm text-slate-500 z-10 min-w-[40px]">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="group flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-white/60 hover:text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-sm ring-1 ring-black/5 bg-white/50"
              >
                <Menu className="h-5 w-5 transition-transform group-hover:scale-110" />
              </button>
            )}
          </div>
          
          {/* Center: Continuous 3D Flip Animation */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:flex z-0" style={{ perspective: "1000px" }}>
            {animatedTitle.split("").map((char, index) => (
              <motion.span
                key={index}
                animate={{
                  opacity: [0, 1, 1, 0],
                  x: [-40, 0, 0, 40],
                  rotateY: [-90, 0, 0, 90],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  times: [0, 0.1, 0.9, 1],
                  delay: index * 0.1
                }}
                className="inline-block text-lg font-black tracking-widest text-slate-800"
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </div>

          {/* Right: Profile */}
          <div className="flex items-center gap-3 z-10">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-700 ring-1 ring-slate-200 shadow-sm">
              {user?.name?.charAt(0) || "U"}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:block">
              {user?.name || "User"}
            </span>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}