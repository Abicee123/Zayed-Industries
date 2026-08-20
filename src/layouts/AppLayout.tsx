import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Briefcase, FileText, Settings, LogOut, ArrowLeft, Banknote, UserSquare2, Menu, X, MessageSquare, Send, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { useDataStore } from "../store/dataStore";
import { supabase } from "../supabase";

export default function AppLayout() {
  const { role, user, employeeId, companyId, signOut, activeWorkspace, setActiveWorkspace } = useAuthStore();
  const { companies, employees, messages, fetchAllData } = useDataStore();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeContact, setActiveContact] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [toastMsg, setToastMsg] = useState<{sender: string, content: string} | null>(null);
  const prevMessageCount = useRef(messages.length);

  const activeCompany = activeWorkspace ? companies.find(c => c.id === activeWorkspace) : null;

  const handleExitWorkspace = async () => { setActiveWorkspace(null); await fetchAllData(); navigate("/dashboard"); };
  const handleSignOut = async () => { await signOut(); navigate("/login"); };

  const allNavLinks = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard", allowedRoles: ['admin', 'head', 'user'] },
    { path: "/projects", icon: Briefcase, label: "Projects", allowedRoles: ['admin', 'head', 'user'] },
    { path: "/finance", icon: Banknote, label: "Finance", allowedRoles: ['admin', 'head'] },
    { path: "/employees", icon: Users, label: "Personnel", allowedRoles: ['admin', 'head'] },
    { path: "/customers", icon: UserSquare2, label: "Customers", allowedRoles: ['admin', 'head'] },
    { path: "/invoices", icon: FileText, label: "Invoices", allowedRoles: ['admin', 'head'] },
    { path: "/settings", icon: Settings, label: "Settings", allowedRoles: ['admin', 'head', 'user'] },
  ];
  const visibleLinks = allNavLinks.filter(link => link.allowedRoles.includes(role || 'user'));

  const allowedContacts = employees.filter(emp => {
    if (emp.id === employeeId) return false; 
    if (role === 'admin') return true; 
    if (role === 'head' || role === 'user') return emp.access_level === 'admin' || emp.company_id === companyId;
    return false;
  });

  const conversation = messages.filter(m => (m.sender_id === employeeId && m.receiver_id === activeContact?.id) || (m.sender_id === activeContact?.id && m.receiver_id === employeeId));
  const totalUnread = messages.filter(m => m.receiver_id === employeeId && !m.is_read).length;

  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      const newMessages = messages.slice(prevMessageCount.current);
      const myNewMsg = newMessages.find(m => m.receiver_id === employeeId && !m.is_read);
      if (myNewMsg && myNewMsg.sender_id !== activeContact?.id) {
        const sender = employees.find(e => e.id === myNewMsg.sender_id);
        setToastMsg({ sender: sender?.name || 'System', content: myNewMsg.content });
        setTimeout(() => setToastMsg(null), 5000);
      }
    }
    prevMessageCount.current = messages.length;
  }, [messages, employeeId, activeContact, employees]);

  const handleSelectContact = async (contact: any) => {
    setActiveContact(contact);
    const hasUnread = messages.some(m => m.sender_id === contact.id && m.receiver_id === employeeId && !m.is_read);
    if (hasUnread) {
      await supabase.from('messages').update({ is_read: true }).eq('sender_id', contact.id).eq('receiver_id', employeeId);
      fetchAllData();
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeContact || !employeeId) return;
    await supabase.from('messages').insert([{ sender_id: employeeId, receiver_id: activeContact.id, content: messageText }]);
    setMessageText(""); await fetchAllData(); 
  };

  const currentUser = employees.find(e => e.id === employeeId);
  const brandName = "Zayd Industries";

  return (
    // PRINTER FIX: Added print:p-0 print:bg-white print:block
    <div className="flex h-[100dvh] w-full bg-[#F8F9FC] text-slate-800 overflow-hidden font-sans sm:p-4 lg:p-6 selection:bg-blue-900 selection:text-white relative print:p-0 print:bg-white print:block print:h-auto">
      
      {/* PRINTER FIX: Removed shadow, borders, and flex structures during print */}
      <div className="flex-1 flex overflow-hidden bg-white sm:rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-slate-100 ring-1 ring-slate-900/5 relative print:shadow-none print:border-none print:ring-0 print:rounded-none print:block print:overflow-visible">
        
        {/* --- SIDEBAR --- */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }} 
              className="bg-white flex flex-col shrink-0 z-20 border-r border-slate-100/50 print:hidden" // PRINTER FIX: Hidden on print
            >
              
              <div className="h-28 flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800 flex items-center justify-center text-white text-[16px] font-black tracking-tighter mr-3 shadow-md z-10">Z</div>
                  
                  <div className="text-[13px] font-bold text-slate-800 tracking-wide mt-0.5 flex overflow-visible">
                    {brandName.split("").map((char, index) => (
                      <motion.span
                        key={index}
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 3.5, delay: index * 0.05, ease: "easeInOut" }}
                        style={{ display: "inline-block", whiteSpace: "pre" }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </div>
                </div>
                
                <button onClick={() => setIsSidebarOpen(false)} className="h-9 w-9 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-6 space-y-2 [&::-webkit-scrollbar]:hidden pt-2">
                {visibleLinks.map((link) => (
                  <NavLink key={link.path} to={link.path} className={({ isActive }) => `group flex items-center gap-4 px-5 py-4 text-[14px] rounded-2xl transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-md shadow-blue-900/20 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-900'}`}>
                    <link.icon className={`h-5 w-5 transition-colors ${({ isActive }: any) => isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-900'}`} />
                    {link.label}
                  </NavLink>
                ))}
              </nav>

              <div className="p-8">
                <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      {currentUser?.profile_image_url ? <img src={currentUser.profile_image_url} alt="" className="h-full w-full object-cover"/> : <span className="text-[13px] font-bold text-slate-400">{user?.email?.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-slate-900 truncate leading-none">{currentUser?.name || user?.email?.split('@')[0]}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-2 leading-none">{role}</p>
                    </div>
                  </div>
                  <button onClick={handleSignOut} className="flex items-center justify-center gap-2 py-3 w-full text-center text-[13px] font-bold text-slate-500 hover:text-rose-600 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-rose-200 hover:bg-rose-50">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 flex flex-col min-w-0 relative bg-[#FAFCFF]/50 print:bg-white print:block">
          
          <header className="absolute top-6 left-0 right-0 flex items-start justify-between px-6 lg:px-10 z-10 pointer-events-none print:hidden">
            <div className="pointer-events-auto">
              {!isSidebarOpen && (
                <button onClick={() => setIsSidebarOpen(true)} className="h-12 w-12 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-900 hover:border-blue-200 shadow-sm transition-all">
                  <Menu className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <div className="pointer-events-auto">
              {activeWorkspace && role === 'admin' && (
                <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Viewing:</span>
                  <span className="text-[12px] font-bold text-blue-900">{activeCompany?.name}</span>
                  <span className="h-5 w-[1px] bg-slate-200 mx-2"></span>
                  <button onClick={handleExitWorkspace} className="text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider flex items-center gap-1.5"><ArrowLeft className="h-3.5 w-3.5"/> Exit</button>
                </div>
              )}
            </div>
          </header>

          <main className={`flex-1 overflow-y-auto pt-10 pb-10 transition-all duration-300 ${!isSidebarOpen ? 'pl-20 lg:pl-28' : 'pl-6 lg:pl-10'} ${activeWorkspace && role === 'admin' ? 'pr-6 lg:pr-64' : 'pr-6 lg:pr-10'} [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full relative z-0 print:p-0 print:pt-0 print:overflow-visible`}>
            <Outlet />
          </main>
        </div>

        {/* --- CHAT DRAWER --- */}
        <AnimatePresence>
          {isChatOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsChatOpen(false)} className="absolute inset-0 bg-slate-900/10 backdrop-blur-sm z-40 rounded-[2.5rem] print:hidden" />
              <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="absolute top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100 print:hidden">
                <div className="h-24 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-white">
                  <div><h3 className="font-bold text-[18px] text-slate-900">Messages</h3></div>
                  <button onClick={() => setIsChatOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>

      {/* --- FLOATING CHAT BUTTON --- */}
      <AnimatePresence>
        {!isChatOpen && (
          <motion.button 
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} onClick={() => setIsChatOpen(true)} 
            className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-[70] h-16 w-16 bg-gradient-to-br from-blue-900 to-indigo-800 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-900/30 hover:shadow-2xl hover:-translate-y-1 transition-all border-[3px] border-[#F8F9FC] print:hidden"
          >
            <MessageSquare className="h-6 w-6" />
            {totalUnread > 0 && <span className="absolute top-0 right-0 h-4 w-4 border-2 border-white bg-rose-500 rounded-full"></span>}
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}