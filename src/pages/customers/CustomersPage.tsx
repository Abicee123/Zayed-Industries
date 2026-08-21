import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, X, Building2, Phone, Mail, MapPin, Briefcase, FileText, Edit3, Trash2, UserSquare2, CheckCircle2, AlertCircle, CreditCard, TrendingUp } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";
import { supabase } from "../../supabase";

export default function CustomersPage() {
  const { role, activeWorkspace, companyId } = useAuthStore();
  const { customers, companies, projects, invoices, fetchAllData } = useDataStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState<string>("all");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"profile" | "projects" | "finance">("profile");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentCompanyId = role === 'admin' ? (activeWorkspace || "") : companyId;

  const [formData, setFormData] = useState({
    company_id: currentCompanyId?.toString() || "", 
    name: "", 
    contact_person: "", 
    email: "", 
    phone: "", 
    address: ""
  });

  const visibleCustomers = customers.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.contact_person?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (role === 'admin' && !activeWorkspace) {
      const matchesCompany = filterCompanyId === "all" || c.company_id?.toString() === filterCompanyId;
      return matchesSearch && matchesCompany;
    }
    
    return matchesSearch && c.company_id === currentCompanyId;
  }).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const openNewCustomer = () => {
    setSelectedCustomer(null);
    setFormData({ 
      company_id: currentCompanyId?.toString() || "", 
      name: "", contact_person: "", email: "", phone: "", address: "" 
    });
    setModalTab("profile");
    setIsModalOpen(true);
  };

  const openCustomerDossier = (customer: any) => {
    setSelectedCustomer(customer);
    setFormData({
      company_id: customer.company_id?.toString() || "",
      name: customer.name || "",
      contact_person: customer.contact_person || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || ""
    });
    setModalTab("profile");
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!formData.name.trim()) return alert("Company/Client Name is required.");
    if (role === 'admin' && !activeWorkspace && !formData.company_id) return alert("Please select a network subsidiary.");

    setIsSaving(true);
    try {
      const payload = {
        company_id: parseInt(formData.company_id),
        name: formData.name,
        contact_person: formData.contact_person,
        email: formData.email,
        phone: formData.phone,
        address: formData.address
      };

      if (!selectedCustomer) {
        const { error } = await supabase.from('customers').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customers').update(payload).eq('id', selectedCustomer.id);
        if (error) throw error;
      }
      
      await fetchAllData();
      setIsModalOpen(false);
    } catch (error: any) { 
      alert(error.message); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedCustomer.name}? This cannot be undone.`)) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.from('customers').delete().eq('id', selectedCustomer.id);
      if (error) throw error;
      await fetchAllData();
      setIsModalOpen(false);
    } catch (error: any) { 
      alert(`Error deleting client: ${error.message}`); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const getClientFinancials = (clientId: number) => {
    const clientInvoices = invoices.filter(i => i.customer_id === clientId);
    const totalBilled = clientInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    const totalPaid = clientInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount_paid || 0), 0);
    const totalPending = Math.max(0, totalBilled - totalPaid);
    return { totalBilled, totalPaid, totalPending, invoiceCount: clientInvoices.length };
  };

  return (
    <>
      <div className="max-w-[1200px] mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-700 pb-8 relative z-0">
        
        {/* Subtle Background Animation */}
        <div className="absolute inset-0 pointer-events-none z-[-1] overflow-hidden rounded-3xl print:hidden">
          <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 10, repeat: Infinity }} className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-100/40 blur-[80px]" />
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 15, repeat: Infinity, delay: 2 }} className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] rounded-full bg-emerald-50/40 blur-[100px]" />
        </div>

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
          <div>
            <p className="text-[9px] sm:text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1.5 sm:mb-2 bg-blue-50 inline-block px-3 py-1 rounded-full">Client Management</p>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-1 sm:mt-2">Customers.</h1>
          </div>
          {(role === 'admin' || role === 'head') && (
            <button onClick={openNewCustomer} className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-lg shadow-blue-900/20 hover:shadow-xl hover:-translate-y-0.5 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-[13px] font-bold transition-all flex items-center shrink-0">
              <Plus className="h-4 w-4 mr-1.5 sm:mr-2" /> Add Client
            </button>
          )}
        </div>

        {/* SEARCH BAR AND COMPANY FILTER */}
        <div className="bg-white p-2 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-slate-400" />
            <input type="text" placeholder="Search clients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 sm:h-11 pl-9 sm:pl-11 pr-4 rounded-lg sm:rounded-xl border-none text-[13px] sm:text-sm font-medium outline-none bg-transparent focus:ring-0 placeholder:text-slate-400" />
          </div>

          {/* Master Admin Company Filter Dropdown */}
          {role === 'admin' && !activeWorkspace && (
            <div className="sm:w-64 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-2">
              <select
                value={filterCompanyId}
                onChange={(e) => setFilterCompanyId(e.target.value)}
                className="w-full h-10 sm:h-11 rounded-lg sm:rounded-xl bg-slate-50 border-none px-3 sm:px-4 text-[12px] sm:text-sm font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors focus:ring-4 focus:ring-blue-500/10 appearance-none"
                style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '14px' }}
              >
                <option value="all">Global (All Subsidiaries)</option>
                {companies.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* CLIENT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {visibleCustomers.length === 0 ? (
            <div className="col-span-full h-48 sm:h-64 border border-slate-200 border-dashed rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <UserSquare2 className="h-8 w-8 sm:h-10 sm:w-10 mb-2 sm:mb-3 text-slate-300" />
              <p className="text-[11px] sm:text-sm font-bold uppercase tracking-wider">No Clients Found</p>
            </div>
          ) : (
            visibleCustomers.map(client => {
              const financials = getClientFinancials(client.id);
              const clientProjects = projects.filter(p => p.customer_id === client.id).length;
              
              return (
                <motion.div key={client.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={() => openCustomerDossier(client)} className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col relative overflow-hidden group cursor-pointer">
                  
                  {/* Status Badge */}
                  {financials.totalPending > 0 && (
                    <div className="absolute top-3 right-3 sm:top-5 sm:right-5 z-10">
                      <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg flex items-center gap-1 shadow-sm">
                        <AlertCircle className="h-2 w-2 sm:h-3 sm:w-3"/> Due
                      </span>
                    </div>
                  )}

                  {/* Horizontal Layout on Mobile, Vertical on Desktop */}
                  <div className="p-4 sm:p-6 pb-4 sm:pb-5 border-b border-slate-50 flex flex-row sm:flex-col items-center sm:items-start text-left relative">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 mr-3 sm:mr-0 sm:mb-4 rounded-[1rem] sm:rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm group-hover:scale-105 transition-transform">
                       <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0 w-full flex flex-col items-start">
                      <h3 className="text-[14px] sm:text-[18px] font-bold text-slate-900 tracking-tight group-hover:text-blue-900 transition-colors truncate w-full pr-10 sm:pr-0">{client.name}</h3>
                      <div className="space-y-0.5 sm:space-y-1.5 mt-1 sm:mt-2 w-full">
                        <p className="text-[10px] sm:text-[12px] font-medium text-slate-600 flex items-center gap-1.5 sm:gap-2 truncate"><UserSquare2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400 shrink-0" /> <span className="truncate">{client.contact_person || 'No Primary Contact'}</span></p>
                        {client.phone && <p className="text-[10px] sm:text-[12px] font-medium text-slate-600 flex items-center gap-1.5 sm:gap-2 truncate"><Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400 shrink-0" /> <span className="truncate">{client.phone}</span></p>}
                        {role === 'admin' && !activeWorkspace && (
                           <p className="text-[8px] sm:text-[10px] font-bold text-blue-600/80 uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-slate-50 truncate"><Building2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" /> <span className="truncate">{companies.find(c => c.id === client.company_id)?.name}</span></p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FAFCFF] p-3 sm:p-5 flex items-center justify-between mt-auto">
                     <div>
                       <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Projects</p>
                       <p className="text-[12px] sm:text-sm font-bold text-slate-800 flex items-center gap-1 sm:gap-1.5"><Briefcase className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500" /> {clientProjects}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Billed</p>
                       <p className="text-[14px] sm:text-lg font-black text-emerald-600 tracking-tight">₹{financials.totalBilled.toLocaleString()}</p>
                     </div>
                  </div>

                </motion.div>
              )
            })
          )}
        </div>

        {/* --- CLIENT MODAL --- */}
        <AnimatePresence>
          {isModalOpen && (
            // Safe Zone Padding to bracket the modal perfectly between floating top and bottom nav bars.
            <div className="fixed inset-0 z-[100] flex items-center justify-center max-sm:px-4 max-sm:pt-24 max-sm:pb-28 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }} className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-full sm:max-h-[85svh] flex flex-col overflow-hidden border border-slate-100 mt-auto sm:mt-0">
                
                <div className="px-5 sm:px-8 pt-5 sm:pt-7 border-b border-slate-100 bg-[#FAFCFF] shrink-0">
                  <div className="flex items-center justify-between mb-4 sm:mb-5">
                    <div className="pr-4">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 sm:px-2.5 py-1 rounded-full">Client Profile</span>
                      <h3 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight mt-1.5 truncate">{selectedCustomer ? selectedCustomer.name : 'Register New Client'}</h3>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="h-8 w-8 sm:h-9 sm:w-9 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-colors shrink-0"><X className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>
                  </div>
                  
                  <div className="flex gap-4 sm:gap-8 overflow-x-auto max-sm:[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <button onClick={() => setModalTab('profile')} className={`pb-2.5 sm:pb-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${modalTab === 'profile' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>1. Profile & Details</button>
                    <button onClick={() => setModalTab('projects')} disabled={!selectedCustomer} className={`pb-2.5 sm:pb-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${!selectedCustomer ? 'opacity-30 cursor-not-allowed' : modalTab === 'projects' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>2. Project History</button>
                    <button onClick={() => setModalTab('finance')} disabled={!selectedCustomer} className={`pb-2.5 sm:pb-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${!selectedCustomer ? 'opacity-30 cursor-not-allowed' : modalTab === 'finance' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>3. Billing & Payouts</button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-8 bg-white max-sm:[&::-webkit-scrollbar]:hidden max-sm:[-ms-overflow-style:none] max-sm:[scrollbar-width:none]">
                  
                  {/* TAB 1: PROFILE & DETAILS */}
                  {modalTab === 'profile' && (
                    <div className="space-y-5 sm:space-y-6 max-w-3xl mx-auto">
                      {role === 'admin' && !activeWorkspace && (
                        <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 sm:mb-6">
                          <label className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-2 sm:mb-3 px-1">Owning Subsidiary</label>
                          <select value={formData.company_id} onChange={(e) => setFormData({...formData, company_id: e.target.value})} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-[12px] sm:text-sm font-bold outline-none cursor-pointer">
                            <option value="" disabled>-- Assign to Company --</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      )}

                      <div className="bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-5">
                         <h4 className="text-[12px] sm:text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 sm:pb-3 mb-3 sm:mb-4 flex items-center gap-2"><Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400"/> Company Details</h4>
                         <div>
                           <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Company / Entity Name *</label>
                           <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 px-3 sm:px-4 text-[12px] sm:text-sm font-bold outline-none focus:border-blue-500 shadow-sm" />
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                           <div>
                             <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Primary Contact</label>
                             <input type="text" placeholder="John Doe" value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 px-3 sm:px-4 text-[12px] sm:text-sm font-medium outline-none focus:border-blue-500 shadow-sm" />
                           </div>
                           <div>
                             <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Contact Email</label>
                             <input type="email" placeholder="contact@company.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 px-3 sm:px-4 text-[12px] sm:text-sm font-medium outline-none focus:border-blue-500 shadow-sm" />
                           </div>
                           <div>
                             <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Phone Number</label>
                             <input type="text" placeholder="+1 234 567 8900" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 px-3 sm:px-4 text-[12px] sm:text-sm font-medium outline-none focus:border-blue-500 shadow-sm" />
                           </div>
                           <div className="md:col-span-2">
                             <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Registered Address</label>
                             <textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full h-20 sm:h-24 rounded-xl border border-slate-200 p-3 sm:p-4 text-[12px] sm:text-sm font-medium outline-none focus:border-blue-500 shadow-sm resize-none" placeholder="123 Business Avenue..." />
                           </div>
                         </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PROJECTS HISTORY */}
                  {modalTab === 'projects' && selectedCustomer && (
                    <div className="space-y-5 sm:space-y-6">
                      <div className="flex items-center justify-between mb-2 sm:mb-4 pb-2 border-b border-slate-100">
                         <h4 className="text-[12px] sm:text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500"/> Project History</h4>
                      </div>

                      {projects.filter(p => p.customer_id === selectedCustomer.id).length === 0 ? (
                        <p className="text-[12px] sm:text-sm text-slate-400 italic text-center py-10">No projects linked to this client yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                          {projects.filter(p => p.customer_id === selectedCustomer.id).map(proj => (
                            <div key={proj.id} className="bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:bg-blue-50/50 transition-colors cursor-default">
                               <div className="flex justify-between items-start mb-2 sm:mb-3">
                                 <p className="font-bold text-slate-900 text-[13px] sm:text-[15px] pr-2">{proj.name}</p>
                                 <span className={`px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-widest shrink-0 ${proj.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{proj.status}</span>
                               </div>
                               <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed mb-3 sm:mb-4">{proj.description || 'No description provided.'}</p>
                               <div className="flex justify-between items-end border-t border-slate-200 pt-2.5 sm:pt-3">
                                 <div>
                                   <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Expected Value</p>
                                   <p className="text-[12px] sm:text-sm font-black text-slate-800">₹{(proj.expected_amount || 0).toLocaleString()}</p>
                                 </div>
                                 <div className="text-right">
                                   <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Due Date</p>
                                   <p className="text-[11px] sm:text-xs font-bold text-slate-600">{proj.due_date ? new Date(proj.due_date).toLocaleDateString() : 'Unscheduled'}</p>
                                 </div>
                               </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: BILLING & PAYMENTS */}
                  {modalTab === 'finance' && selectedCustomer && (
                    <div className="space-y-6 sm:space-y-8">
                      {(() => {
                        const financials = getClientFinancials(selectedCustomer.id);
                        return (
                          <div className="grid grid-cols-3 gap-2 sm:gap-4">
                            <div className="bg-slate-50 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-100 text-center">
                              <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Billed</p>
                              <p className="text-[13px] sm:text-2xl font-black text-slate-700">₹{financials.totalBilled.toLocaleString()}</p>
                            </div>
                            <div className="bg-emerald-50 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-emerald-100 text-center">
                              <p className="text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Paid</p>
                              <p className="text-[13px] sm:text-2xl font-black text-emerald-700">₹{financials.totalPaid.toLocaleString()}</p>
                            </div>
                            <div className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border text-center ${financials.totalPending > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                              <p className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mb-1 ${financials.totalPending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>Pending Balance</p>
                              <p className={`text-[13px] sm:text-2xl font-black ${financials.totalPending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>₹{financials.totalPending.toLocaleString()}</p>
                            </div>
                          </div>
                        )
                      })()}

                      <div className="pb-2">
                        <h4 className="text-[12px] sm:text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 sm:mb-4 flex items-center gap-2"><FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500"/> Invoicing Ledger</h4>
                        
                        {invoices.filter(i => i.customer_id === selectedCustomer.id).length === 0 ? (
                          <p className="text-[12px] sm:text-sm text-slate-400 italic text-center py-6 sm:py-10">No invoices issued to this client.</p>
                        ) : (
                          <div className="bg-white border border-slate-100 shadow-sm rounded-xl sm:rounded-3xl overflow-hidden">
                             {/* Mobile Scrollable Table */}
                             <div className="overflow-x-auto max-sm:[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                               <div className="min-w-[600px]">
                                 <div className="grid grid-cols-12 gap-4 bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    <div className="col-span-3">Invoice No.</div>
                                    <div className="col-span-3">Project</div>
                                    <div className="col-span-2">Status</div>
                                    <div className="col-span-2 text-right">Billed (₹)</div>
                                    <div className="col-span-2 text-right">Paid (₹)</div>
                                 </div>
                                 <div className="divide-y divide-slate-50">
                                   {invoices.filter(i => i.customer_id === selectedCustomer.id).sort((a,b)=>new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(inv => (
                                     <div key={inv.id} className="grid grid-cols-12 gap-4 items-center px-4 sm:px-6 py-3 sm:py-4 hover:bg-slate-50/50 transition-colors">
                                       <div className="col-span-3">
                                         <p className="font-bold text-slate-900 text-[11px] sm:text-[13px] truncate">{inv.invoice_number}</p>
                                         <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 sm:mt-1 truncate">Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</p>
                                       </div>
                                       <div className="col-span-3 text-[11px] sm:text-[12px] font-medium text-slate-600 truncate pr-2">
                                         {inv.project_id ? projects.find(p=>p.id===inv.project_id)?.name : 'General / Standalone'}
                                       </div>
                                       <div className="col-span-2">
                                         <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'Partially Paid' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</span>
                                       </div>
                                       <div className="col-span-2 text-right font-black text-slate-800 text-[12px] sm:text-sm">
                                         ₹{parseFloat(inv.total_amount || 0).toLocaleString()}
                                       </div>
                                       <div className="col-span-2 text-right font-bold text-emerald-600 text-[12px] sm:text-sm">
                                         ₹{parseFloat(inv.amount_paid || 0).toLocaleString()}
                                       </div>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-6 border-t border-slate-100 bg-[#FAFCFF] flex justify-end items-center gap-2 sm:gap-4 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  {selectedCustomer && (role === 'admin' || role === 'head') && modalTab === 'profile' ? (
                    <button onClick={handleDeleteCustomer} disabled={isSaving} className="border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 rounded-xl h-10 sm:h-12 px-3 sm:px-5 flex items-center justify-center shadow-sm transition-colors mr-auto shrink-0"><Trash2 className="h-4 w-4" /></button>
                  ) : <div className="mr-auto"></div>}
                  
                  <button onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 bg-white h-10 sm:h-12 px-4 sm:px-8 font-bold text-[12px] sm:text-sm text-slate-600 hover:bg-slate-50 shadow-sm transition-colors flex-1 sm:flex-none">Close</button>
                  {modalTab === 'profile' && (
                    <button onClick={handleSaveCustomer} disabled={isSaving} className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl h-10 sm:h-12 px-6 sm:px-10 font-bold text-[12px] sm:text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex-1 sm:flex-none">
                      {isSaving ? "Saving..." : "Save Profile"}
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}