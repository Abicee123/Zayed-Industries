import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Briefcase, FileText, Settings, LogOut, ArrowLeft, Banknote, UserSquare2, Menu, X, MessageSquare, Send, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { useDataStore } from "../store/dataStore";
import { supabase } from "../supabase";

export default function AppLayout() {
  const { role, user, employeeId, companyId, signOut, activeWorkspace, setActiveWorkspace } = useAuthStore();
  const { companies, employees, messages, fetchAllData } = useDataStore();
  const navigate = useNavigate();
  const location = useLocation();

  const dragConstraintRef = useRef(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeContact, setActiveContact] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [toastMsg, setToastMsg] = useState<{sender: string, content: string} | null>(null);
  const [chatCompanyFilter, setChatCompanyFilter] = useState<string>("all");
  
  const prevMessageCount = useRef(messages.length);

  const activeCompany = activeWorkspace ? companies.find(c => c.id === activeWorkspace) : null;
  const currentDisplayCompany = (role !== 'admin' || activeWorkspace) ? companies.find(c => c.id === (activeWorkspace || companyId)) : null;
  const brandName = currentDisplayCompany?.name || "Zayd Industries";
  const brandLogo = currentDisplayCompany?.logo_url || null;
  
  // Route check for Chat Emblem visibility
  const isDashboard = location.pathname.includes('/dashboard');

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
    if (emp.id == employeeId) return false; 
    const currentRole = role?.toLowerCase() || 'user';
    
    if (currentRole === 'admin') {
      if (activeWorkspace) return emp.company_id === activeWorkspace || emp.access_level === 'admin';
      if (chatCompanyFilter !== "all") return emp.company_id?.toString() === chatCompanyFilter || emp.access_level === 'admin';
      return true;
    }
    
    if (currentRole === 'head' || currentRole === 'user') return emp.access_level === 'admin' || emp.company_id == companyId;
    return false;
  });

  const conversation = messages.filter(m => (m.sender_id == employeeId && m.receiver_id == activeContact?.id) || (m.sender_id == activeContact?.id && m.receiver_id == employeeId));
  const totalUnread = messages.filter(m => m.receiver_id == employeeId && !m.is_read).length;

  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      const newMessages = messages.slice(prevMessageCount.current);
      const myNewMsg = newMessages.find(m => m.receiver_id == employeeId && !m.is_read);
      if (myNewMsg && myNewMsg.sender_id != activeContact?.id) {
        const sender = employees.find(e => e.id == myNewMsg.sender_id);
        setToastMsg({ sender: sender?.name || 'System', content: myNewMsg.content });
        setTimeout(() => setToastMsg(null), 5000);
      }
    }
    prevMessageCount.current = messages.length;
  }, [messages, employeeId, activeContact, employees]);

  const handleSelectContact = async (contact: any) => {
    setActiveContact(contact);
    const hasUnread = messages.some(m => m.sender_id == contact.id && m.receiver_id == employeeId && !m.is_read);
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

  const currentUser = employees.find(e => e.id == employeeId);

  const displayEmail = user?.email || 'User';
  const displayInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : displayEmail.charAt(0).toUpperCase();
  const displayName = currentUser?.name || displayEmail.split('@')[0];

  return (
    <div ref={dragConstraintRef} className="flex h-[100dvh] w-full bg-[#F8F9FC] text-slate-800 overflow-hidden font-sans sm:p-4 lg:p-6 selection:bg-blue-900 selection:text-white relative print:p-0 print:bg-white print:block print:h-auto">
      
      <div className="flex-1 flex overflow-hidden bg-white sm:rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] sm:border border-slate-100 sm:ring-1 ring-slate-900/5 relative print:shadow-none print:border-none print:ring-0 print:rounded-none print:block print:overflow-visible">
        
        {/* --- DESKTOP SIDEBAR (Hidden on Mobile) --- */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }} 
              className="hidden sm:flex bg-white flex-col shrink-0 z-20 border-r border-slate-100/50 print:hidden"
            >
              <div className="h-28 flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center">
                  {brandLogo ? (
                    <img src={brandLogo} alt="Logo" className="h-10 w-10 rounded-2xl object-cover shadow-sm mr-3 border border-slate-100" />
                  ) : (
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800 flex items-center justify-center text-white text-[16px] font-black tracking-tighter mr-3 shadow-md z-10">
                      {brandName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
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
                    {({ isActive }) => (
                      <>
                        <link.icon className={`h-5 w-5 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-900'}`} />
                        {link.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>

              <div className="px-6 pb-6 flex flex-col shrink-0">
                <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-3 border border-slate-100 mb-4 shadow-sm hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      {currentUser?.profile_image_url ? (
                        <img src={currentUser.profile_image_url} alt="" className="h-full w-full object-cover"/>
                      ) : (
                        <span className="text-[12px] font-bold text-slate-400">{displayInitial}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-[13px] font-bold text-slate-900 truncate leading-tight">{displayName}</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5 leading-none">{role || 'Operator'}</p>
                    </div>
                  </div>
                  <button onClick={handleSignOut} className="h-8 w-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm shrink-0" title="Sign Out">
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Powered by</p>
                  <p className="text-[9px] font-black text-slate-400 mt-0.5 uppercase tracking-widest">Zayd Industries Pvt Ltd.</p>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 flex flex-col min-w-0 relative bg-[#FAFCFF] print:bg-white print:block overflow-hidden">
          
          {/* --- SUBTLE ANIMATED BACKGROUND --- */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden print:hidden">
            <motion.div 
              animate={{ scale: [1, 1.1, 1], x: [0, 30, 0], y: [0, 20, 0] }} 
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} 
              className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-blue-100/50 to-indigo-50/50 blur-[100px]" 
            />
            <motion.div 
              animate={{ scale: [1, 1.2, 1], x: [0, -40, 0], y: [0, -30, 0] }} 
              transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 2 }} 
              className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-bl from-indigo-50/50 to-blue-100/50 blur-[120px]" 
            />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTQ4LCAxNjMsIDE4NCwgMC4wOCkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]" />
          </div>

          {/* --- DESKTOP HEADER (Hidden on Mobile) --- */}
          <header className="absolute top-6 left-0 right-0 hidden sm:flex items-start justify-between px-6 lg:px-10 z-20 pointer-events-none print:hidden">
            <div className="pointer-events-auto">
              {!isSidebarOpen && (
                <button onClick={() => setIsSidebarOpen(true)} className="h-12 w-12 bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-900 hover:border-blue-200 shadow-sm transition-all">
                  <Menu className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <div className="pointer-events-auto">
              {activeWorkspace && role === 'admin' && (
                <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-200/50 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Viewing:</span>
                  <span className="text-[12px] font-bold text-blue-900">{activeCompany?.name}</span>
                  <span className="h-5 w-[1px] bg-slate-200 mx-2"></span>
                  <button onClick={handleExitWorkspace} className="text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider flex items-center gap-1.5"><ArrowLeft className="h-3.5 w-3.5"/> Exit</button>
                </div>
              )}
            </div>
          </header>

          {/* --- MOBILE TOP BAR (Floating Pill Style - Hidden on Desktop) --- */}
          <div className="sm:hidden flex items-center justify-between px-4 py-2.5 mx-4 mt-4 bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] rounded-full z-20 sticky top-4 print:hidden">
             <div className="flex items-center gap-3 min-w-0">
               {brandLogo ? (
                 <img src={brandLogo} alt="Logo" className="h-8 w-8 rounded-full object-cover shadow-sm border border-slate-100 shrink-0" />
               ) : (
                 <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800 flex items-center justify-center text-white text-[13px] font-black tracking-tighter shadow-md shrink-0">
                   {brandName.charAt(0).toUpperCase()}
                 </div>
               )}
               <div className="flex flex-col min-w-0 pr-2">
                 <span className="font-bold text-slate-900 text-[13px] leading-tight truncate">{brandName}</span>
                 {activeWorkspace && role === 'admin' ? (
                   <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest leading-none mt-0.5 truncate">Admin View</span>
                 ) : (
                   <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-0.5 truncate">{role}</span>
                 )}
               </div>
             </div>
             <div className="flex items-center gap-2 shrink-0">
               {activeWorkspace && role === 'admin' && (
                  <button onClick={handleExitWorkspace} className="h-8 w-8 bg-rose-50/80 text-rose-600 rounded-full flex items-center justify-center shadow-sm backdrop-blur-sm"><ArrowLeft className="h-4 w-4"/></button>
               )}
               <button onClick={handleSignOut} className="h-8 w-8 bg-slate-50/80 text-slate-500 rounded-full flex items-center justify-center shadow-sm hover:text-rose-600 transition-colors backdrop-blur-sm"><LogOut className="h-4 w-4"/></button>
             </div>
          </div>

          <main className={`flex-1 overflow-y-auto transition-all duration-300 relative z-10 print:p-0 print:pt-0 print:overflow-visible
             max-sm:px-4 max-sm:pt-6 max-sm:pb-36
             sm:pt-10 sm:pb-10
             ${!isSidebarOpen ? 'sm:pl-20 lg:pl-28' : 'sm:pl-6 lg:pl-10'} 
             ${activeWorkspace && role === 'admin' ? 'sm:pr-6 lg:pr-64' : 'sm:pr-6 lg:pr-10'}
             [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full`}>
            <Outlet />
          </main>
        </div>

        {/* --- CRITICAL FIX: MOBILE BOTTOM DOCK (Dynamic iOS-Style Centered Pill) --- */}
        <div className="sm:hidden fixed bottom-6 left-0 right-0 z-[60] flex justify-center pointer-events-none px-4 print:hidden">
           {/* The pointer-events-auto puts the click ability ONLY on the dock, allowing you to scroll the page outside of it */}
           <div className="pointer-events-auto max-w-full bg-[#0f172a]/95 backdrop-blur-2xl rounded-[2rem] p-1.5 flex items-center justify-start shadow-[0_20px_40px_rgba(0,0,0,0.3)] border border-slate-800 overflow-x-auto [&::-webkit-scrollbar]:hidden gap-1">
              {visibleLinks.map((link) => (
                <NavLink key={link.path} to={link.path} className={({ isActive }) => `flex flex-col items-center justify-center shrink-0 min-w-[72px] h-14 rounded-2xl transition-all ${isActive ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
                  {({ isActive }) => (
                    <>
                      <link.icon className={`h-5 w-5 mb-1 transition-all ${isActive ? 'text-blue-400 drop-shadow-md' : 'text-slate-400'}`} />
                      <span className="text-[9px] font-bold tracking-wide">{link.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
           </div>
        </div>

        {/* --- CHAT DRAWER --- */}
        <AnimatePresence>
          {isChatOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsChatOpen(false)} className="fixed inset-0 sm:absolute sm:inset-auto bg-slate-900/40 sm:bg-slate-900/10 backdrop-blur-sm z-[75] sm:z-40 sm:rounded-[2.5rem] print:hidden" />
              <motion.div 
                initial={{ x: typeof window !== "undefined" && window.innerWidth >= 640 ? "100%" : 0, y: typeof window !== "undefined" && window.innerWidth < 640 ? "100%" : 0 }} 
                animate={{ x: 0, y: 0 }} 
                exit={{ x: typeof window !== "undefined" && window.innerWidth >= 640 ? "100%" : 0, y: typeof window !== "undefined" && window.innerWidth < 640 ? "100%" : 0 }} 
                transition={{ type: "spring", damping: 30, stiffness: 300 }} 
                className="fixed inset-0 sm:absolute sm:inset-auto sm:top-0 sm:right-0 sm:h-full sm:w-[400px] bg-white shadow-2xl z-[80] sm:z-50 flex flex-col sm:border-l border-slate-100 print:hidden"
              >
                
                <div className="h-16 sm:h-24 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-white">
                  {activeContact ? (
                    <div className="flex items-center gap-3">
                      <button onClick={() => setActiveContact(null)} className="h-10 w-10 bg-slate-50 flex items-center justify-center rounded-full text-slate-500 hover:text-blue-900 hover:bg-blue-50 transition-colors"><ChevronLeft className="h-5 w-5" /></button>
                      <div><h3 className="font-bold text-[15px] text-slate-900 leading-none">{activeContact.name}</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">{activeContact.access_level}</p></div>
                    </div>
                  ) : (
                    <div><h3 className="font-bold text-[18px] text-slate-900">Messages</h3><p className="text-[11px] text-slate-400 mt-1 font-medium">Internal Communications</p></div>
                  )}
                  <button onClick={() => setIsChatOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition-colors"><X className="h-5 w-5" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-[#FAFCFF]">
                  {!activeContact ? (
                    <div className="space-y-4">
                      
                      {role === 'admin' && !activeWorkspace && (
                        <div>
                          <select
                            value={chatCompanyFilter}
                            onChange={(e) => setChatCompanyFilter(e.target.value)}
                            className="w-full h-11 rounded-xl bg-white border border-slate-200 px-4 text-sm font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-50 transition-colors shadow-sm focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="all">Global Directory</option>
                            {companies.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                          </select>
                        </div>
                      )}

                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Contacts</p>
                        <div className="space-y-2">
                          {allowedContacts.length === 0 && (
                            <p className="text-xs text-slate-400 italic px-2">No team members available.</p>
                          )}
                          {allowedContacts.map(contact => {
                            const contactUnread = messages.filter(m => m.sender_id == contact.id && m.receiver_id == employeeId && !m.is_read).length;
                            return (
                              <button key={contact.id} onClick={() => handleSelectContact(contact)} className="w-full flex items-center gap-4 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all text-left group">
                                <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[13px] font-bold text-slate-600 overflow-hidden shrink-0">
                                  {contact.profile_image_url ? <img src={contact.profile_image_url} alt="" className="h-full w-full object-cover" /> : (contact.name ? contact.name.charAt(0).toUpperCase() : 'U')}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-[14px] truncate ${contactUnread > 0 ? 'font-bold text-blue-900' : 'font-semibold text-slate-700 group-hover:text-blue-900 transition-colors'}`}>{contact.name}</p>
                                </div>
                                {contactUnread > 0 && <div className="h-2.5 w-2.5 bg-rose-500 rounded-full shrink-0 shadow-sm"></div>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 flex flex-col justify-end min-h-full pb-4">
                      {conversation.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center flex-col text-slate-400 mb-8">
                          <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4"><MessageSquare className="h-6 w-6 text-slate-300" /></div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Encrypted Channel Open</p>
                        </div>
                      ) : (
                        conversation.map((msg, i) => {
                          const isMe = msg.sender_id == employeeId;
                          return (
                            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] px-5 py-3.5 text-[14px] font-medium leading-relaxed shadow-sm ${isMe ? 'bg-gradient-to-br from-blue-900 to-indigo-800 text-white rounded-2xl rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-700 rounded-2xl rounded-tl-sm'}`}>
                                {msg.content}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {activeContact && (
                  <div className="p-5 bg-white border-t border-slate-100 shrink-0 mb-[env(safe-area-inset-bottom)]">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-blue-900/20 focus-within:border-blue-900 transition-all shadow-sm">
                      <input type="text" placeholder="Type your message..." value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 bg-transparent border-none text-[14px] outline-none placeholder:text-slate-400 px-4 py-2.5 font-medium" />
                      <button onClick={handleSendMessage} className="h-12 w-12 bg-gradient-to-r from-blue-900 to-indigo-800 rounded-xl flex items-center justify-center text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 shrink-0 transition-all"><Send className="h-5 w-5 ml-0.5" /></button>
                    </div>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>

      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} onClick={() => { setIsChatOpen(true); setToastMsg(null); }} className="fixed top-20 sm:top-auto sm:bottom-28 lg:bottom-32 left-4 right-4 sm:left-auto sm:right-6 lg:right-10 z-[90] bg-gradient-to-r from-blue-900 to-indigo-800 text-white p-5 rounded-2xl shadow-2xl flex items-start gap-4 sm:min-w-[300px] cursor-pointer border border-blue-700/50 print:hidden">
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[9px] font-bold text-blue-200 uppercase tracking-widest mb-1.5">New Message</p>
              <p className="text-[14px] font-bold truncate">{toastMsg.sender}</p>
              <p className="text-[13px] text-blue-100 truncate mt-1">{toastMsg.content}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setToastMsg(null); }} className="text-blue-300 hover:text-white transition-colors bg-blue-800/50 p-1.5 rounded-lg"><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- FLOATING CHAT BUTTON (Restricted to Dashboard) --- */}
      <AnimatePresence>
        {(!isChatOpen && isDashboard) && (
          <motion.button 
            drag 
            dragConstraints={dragConstraintRef} 
            dragMomentum={false} 
            whileDrag={{ scale: 1.1, cursor: "grabbing" }}
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} onClick={() => setIsChatOpen(true)} 
            className="fixed bottom-28 right-5 sm:bottom-10 sm:right-10 z-[65] sm:z-[70] h-14 w-14 sm:h-16 sm:w-16 bg-gradient-to-br from-blue-900 to-indigo-800 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-900/30 hover:shadow-2xl hover:-translate-y-1 transition-all border-[3px] border-[#FAFCFF] print:hidden cursor-grab active:cursor-grabbing"
          >
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
            {totalUnread > 0 && <span className="absolute top-0 right-0 h-3.5 w-3.5 sm:h-4 sm:w-4 border-2 border-white bg-rose-500 rounded-full"></span>}
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}