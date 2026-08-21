import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, ArrowRight, X, Camera, Globe, Trash2, Edit3, LogIn, Clock, CheckCircle2, Megaphone, Bell } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";
import { supabase } from "../../supabase";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { role, user, activeWorkspace, setActiveWorkspace, employeeId, companyId } = useAuthStore();
  const { companies, employees, projects, tasks, invoices, salaryPayments, announcements, fetchAllData } = useDataStore();

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyModalMode, setCompanyModalMode] = useState<"view" | "edit" | "add">("view");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: "", content: "", company_id: "all" });
  const [activeAnnouncementIndex, setActiveAnnouncementIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({ name: "", area: "", head_name: "", phone: "", website_url: "", logo_url: "" });

  const activeCompanyId = activeWorkspace || companyId;
  const visibleAnnouncements = announcements.filter(a => !a.company_id || a.company_id === activeCompanyId);
  const safeAnnouncementIndex = activeAnnouncementIndex % (visibleAnnouncements.length || 1);

  useEffect(() => {
    if (visibleAnnouncements && visibleAnnouncements.length > 1) {
      const timer = setInterval(() => {
        setActiveAnnouncementIndex((prev) => (prev + 1) % visibleAnnouncements.length);
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [announcements, activeCompanyId]);

  const openAddCompany = () => { setCompanyModalMode("add"); setSelectedCompany(null); setLogoFile(null); setLogoPreview(null); setCompanyFormData({ name: "", area: "", head_name: "", phone: "", website_url: "", logo_url: "" }); setIsCompanyModalOpen(true); };
  const openViewCompany = (company: any) => { setCompanyModalMode("view"); setSelectedCompany(company); setIsCompanyModalOpen(true); };
  const openEditCompany = () => { setCompanyModalMode("edit"); setLogoFile(null); setLogoPreview(null); setCompanyFormData({ name: selectedCompany.name || "", area: selectedCompany.area || "", head_name: selectedCompany.head_name || "", phone: selectedCompany.phone || "", website_url: selectedCompany.website_url || "", logo_url: selectedCompany.logo_url || "" }); };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { setLogoFile(e.target.files[0]); setLogoPreview(URL.createObjectURL(e.target.files[0])); } };

  const handleSaveCompany = async () => {
    if (!companyFormData.name) return alert("Company Name is required.");
    setIsSaving(true);
    let finalLogoUrl = selectedCompany?.logo_url || null;
    try {
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, logoFile);
        if (!uploadError) { const { data } = supabase.storage.from('logos').getPublicUrl(fileName); finalLogoUrl = data.publicUrl; } else { alert(`Logo Upload Error: ${uploadError.message}`); setIsSaving(false); return; }
      }
      const payload = { name: companyFormData.name, area: companyFormData.area, head_name: companyFormData.head_name, phone: companyFormData.phone, website_url: companyFormData.website_url, logo_url: finalLogoUrl };
      if (companyModalMode === 'add') { const { error } = await supabase.from('companies').insert([payload]); if (error) throw error; } else { const { error } = await supabase.from('companies').update(payload).eq('id', selectedCompany.id); if (error) throw error; }
      await fetchAllData(); setIsCompanyModalOpen(false);
    } catch (error: any) { alert(`Database Error: ${error.message}`); } finally { setIsSaving(false); }
  };

  const handleDeleteCompany = async () => { 
    if (!window.confirm(`Delete ${selectedCompany.name}?`)) return; 
    setIsSaving(true); 
    await supabase.from('companies').delete().eq('id', selectedCompany.id); 
    await fetchAllData(); 
    setIsCompanyModalOpen(false); 
    setIsSaving(false); 
  };

  const handlePostAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) return alert("Both title and content are required.");
    setIsSaving(true);
    const payload = {
      title: announcementForm.title,
      content: announcementForm.content,
      company_id: announcementForm.company_id === "all" ? null : parseInt(announcementForm.company_id)
    };
    await supabase.from('announcements').insert([payload]);
    await fetchAllData();
    setAnnouncementForm({ title: "", content: "", company_id: "all" });
    setIsAnnouncementModalOpen(false);
    setIsSaving(false);
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if(!window.confirm("Delete this announcement?")) return;
    await supabase.from('announcements').delete().eq('id', id);
    await fetchAllData();
  };

  const handleEnterWorkspace = async () => { setActiveWorkspace(selectedCompany.id); await fetchAllData(); setIsCompanyModalOpen(false); };

  const isImpersonating = role === 'admin' && activeWorkspace !== null;
  const showHeadView = role === 'head' || isImpersonating;
  
  const myProjects = projects.filter(p => (p.assignee_ids || []).includes(employeeId));
  const globalPayroll = salaryPayments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
  
  const activeWorkspaceEmployees = employees.filter(e => e.company_id === activeCompanyId).map(e => e.id);
  const workspacePayroll = salaryPayments
    .filter(p => activeWorkspaceEmployees.includes(p.employee_id))
    .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);

  const selectedCompanyEmployeeIds = selectedCompany ? employees.filter(e => e.company_id === selectedCompany.id).map(e => e.id) : [];
  const selectedCompanyPayroll = salaryPayments
    .filter(p => selectedCompanyEmployeeIds.includes(p.employee_id))
    .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);

  const mySalaries = salaryPayments.filter(s => s.employee_id === employeeId).sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  const lastSalary = mySalaries[0];

  if (role === 'admin' && !isImpersonating) {
    return (
      <>
        <div className="max-w-[1200px] mx-auto space-y-8 sm:space-y-10 animate-in fade-in duration-700">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
            <div>
              <p className="text-[9px] sm:text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-2 bg-blue-50 inline-block px-3 py-1 rounded-full">Admin Dashboard</p>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-1 sm:mt-2">Company Overview.</h1>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button onClick={() => setIsAnnouncementModalOpen(true)} className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 px-3 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-[11px] sm:text-[13px] font-bold transition-all flex items-center justify-center">
                <Megaphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-blue-600" /> <span className="hidden sm:inline">New</span> Announcement
              </button>
              <button onClick={openAddCompany} className="flex-1 sm:flex-none bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-lg shadow-blue-900/20 hover:shadow-xl hover:-translate-y-0.5 px-3 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-[11px] sm:text-[13px] font-bold transition-all flex items-center justify-center">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" /> Add Company
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white border border-slate-100 p-4 sm:p-7 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col justify-between min-h-[120px] sm:min-h-[160px] relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-16 h-16 sm:w-24 sm:h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors"></div>
              <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest relative z-10 truncate">Companies</p>
              <p className="text-3xl sm:text-5xl font-semibold text-slate-800 tracking-tight relative z-10 mt-2">{companies.length || 0}</p>
            </div>
            <div className="bg-white border border-slate-100 p-4 sm:p-7 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col justify-between min-h-[120px] sm:min-h-[160px] relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-16 h-16 sm:w-24 sm:h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors"></div>
              <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest relative z-10 truncate">Total Employees</p>
              <p className="text-3xl sm:text-5xl font-semibold text-slate-800 tracking-tight relative z-10 mt-2">{employees.length || 0}</p>
            </div>
            <div className="bg-white border border-slate-100 p-4 sm:p-7 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col justify-between min-h-[120px] sm:min-h-[160px] relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-16 h-16 sm:w-24 sm:h-24 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors"></div>
              <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest relative z-10 truncate">Active Projects</p>
              <p className="text-3xl sm:text-5xl font-semibold text-slate-800 tracking-tight relative z-10 mt-2">{projects.length || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 p-4 sm:p-7 rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-900/10 flex flex-col justify-between min-h-[120px] sm:min-h-[160px] relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-24 h-24 sm:w-40 sm:h-40 bg-white/5 rounded-full blur-3xl"></div>
              <p className="text-[9px] sm:text-[11px] font-bold text-blue-200 uppercase tracking-widest relative z-10 truncate">Total Payroll</p>
              <p className="text-2xl sm:text-4xl font-semibold text-white tracking-tight relative z-10 mt-2">₹{globalPayroll.toLocaleString()}</p>
            </div>
          </div>

          <div className="pt-2 sm:pt-4">
            <h2 className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 sm:mb-6 px-1">Company Directory</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {companies.map((company, i) => (
                <motion.div key={company.id} onClick={() => openViewCompany(company)} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white border border-slate-100 p-4 sm:p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group flex items-start justify-between">
                  <div>
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4 sm:mb-5 overflow-hidden border border-slate-100 group-hover:scale-105 transition-transform">
                      {company.logo_url ? <img src={company.logo_url} alt="" className="h-full w-full object-contain p-1.5 sm:p-2" /> : <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />}
                    </div>
                    <h3 className="font-bold text-[14px] sm:text-[15px] text-slate-900 tracking-tight">{company.name}</h3>
                    <p className="text-[11px] sm:text-[12px] font-medium text-slate-400 mt-1">{company.area || "Subsidiary"}</p>
                  </div>
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                    <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-900" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* MODAL: Announcements (Fixed overlay) */}
        <AnimatePresence>
          {isAnnouncementModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }} className="bg-white max-sm:rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[85svh]">
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-50 bg-[#FAFCFF] shrink-0">
                  <h3 className="text-[10px] sm:text-[13px] font-bold text-slate-800 uppercase tracking-wider">Manage Announcements</h3>
                  <button onClick={() => setIsAnnouncementModalOpen(false)} className="h-7 w-7 sm:h-8 sm:w-8 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm"><X className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>
                </div>
                
                <div className="p-4 sm:p-8 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <div className="space-y-3 sm:space-y-4 mb-5 sm:mb-8">
                    <div>
                      <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1 sm:mb-2 px-1">Target Audience</label>
                      <select value={announcementForm.company_id} onChange={e => setAnnouncementForm({...announcementForm, company_id: e.target.value})} className="w-full h-9 sm:h-11 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-[12px] sm:text-[14px] font-medium outline-none focus:border-blue-500 shadow-sm">
                        <option value="all">General (All Companies)</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1 sm:mb-2 px-1">Headline</label>
                      <input type="text" value={announcementForm.title} onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})} className="w-full h-9 sm:h-11 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-[12px] sm:text-[14px] font-medium outline-none focus:border-blue-500 shadow-sm" placeholder="Important update..." />
                    </div>
                    <div>
                      <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1 sm:mb-2 px-1">Message Content</label>
                      <textarea value={announcementForm.content} onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})} className="w-full h-16 sm:h-24 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 text-[12px] sm:text-[14px] font-medium outline-none focus:border-blue-500 shadow-sm resize-none" placeholder="Provide the details..." />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-4 px-1 border-b border-slate-100 pb-2">Active Broadcasts</h4>
                    <div className="space-y-2 sm:space-y-3">
                      {announcements.length === 0 && <p className="text-[11px] sm:text-sm text-slate-400 italic">No active announcements.</p>}
                      {announcements.map(ann => (
                        <div key={ann.id} className="bg-slate-50 border border-slate-100 p-2.5 sm:p-4 rounded-xl flex justify-between items-start gap-3 sm:gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                               <p className="font-bold text-slate-900 text-[12px] sm:text-sm">{ann.title}</p>
                               <span className="text-[7px] sm:text-[9px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500 uppercase font-bold tracking-wider">{ann.company_id ? companies.find(c => c.id === ann.company_id)?.name || 'Specific' : 'General'}</span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1">{ann.content}</p>
                            <p className="text-[8px] sm:text-[10px] text-slate-400 mt-1.5 sm:mt-2">{new Date(ann.created_at).toLocaleDateString()}</p>
                          </div>
                          <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-rose-500 hover:bg-rose-50 p-1.5 sm:p-2 rounded-lg transition-colors shrink-0"><Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6 bg-white border-t border-slate-50 shrink-0">
                    <button onClick={handlePostAnnouncement} disabled={isSaving} className="w-full bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl h-10 sm:h-11 font-bold text-[11px] sm:text-[13px] shadow-md shadow-blue-900/20 hover:shadow-lg transition-all">{isSaving ? "Posting..." : "Broadcast Announcement"}</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: Edit/View Company (Fixed overlay) */}
        <AnimatePresence>
          {isCompanyModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }} className="bg-white max-sm:rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[85svh]">
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-50 bg-[#FAFCFF] shrink-0">
                  <h3 className="text-[10px] sm:text-[13px] font-bold text-slate-800 uppercase tracking-wider">{companyModalMode === 'add' ? 'Add Company' : companyModalMode === 'edit' ? 'Edit Details' : 'Company Profile'}</h3>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {companyModalMode === 'view' && selectedCompany && (
                      <div className="flex sm:hidden items-center gap-1.5 mr-1 pr-2 border-r border-slate-200">
                        {selectedCompany.website_url && (
                          <a href={selectedCompany.website_url.startsWith('http') ? selectedCompany.website_url : `https://${selectedCompany.website_url}`} target="_blank" rel="noopener noreferrer" className="h-7 w-7 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-500 shadow-sm">
                            <Globe className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button onClick={openEditCompany} className="h-7 w-7 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-500 shadow-sm">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    <button onClick={() => setIsCompanyModalOpen(false)} className="h-7 w-7 sm:h-8 sm:w-8 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm"><X className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>
                  </div>
                </div>
                
                <div className="p-4 sm:p-8 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {companyModalMode === 'view' && selectedCompany && (
                    <div className="space-y-4 sm:space-y-8 pb-2 sm:pb-4">
                      <div className="flex items-center gap-3 sm:gap-5">
                        <div className="h-12 w-12 sm:h-20 sm:w-20 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden p-2 sm:p-3 shadow-sm shrink-0">
                          {selectedCompany.logo_url ? <img src={selectedCompany.logo_url} alt="Logo" className="h-full w-full object-contain" /> : <Building2 className="h-5 w-5 sm:h-8 sm:w-8 text-slate-300" />}
                        </div>
                        <div>
                          <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">{selectedCompany.name}</h2>
                          <p className="text-[11px] sm:text-[13px] font-medium text-slate-500 mt-0.5 sm:mt-1">{selectedCompany.area}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl p-2.5 sm:p-4"><p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-1.5">Personnel</p><p className="text-lg sm:text-2xl font-bold text-slate-800 tracking-tight">{employees.filter(e => e.company_id === selectedCompany.id).length}</p></div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl p-2.5 sm:p-4"><p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-1.5">Operations</p><p className="text-lg sm:text-2xl font-bold text-slate-800 tracking-tight">{projects.filter(p => p.company_id === selectedCompany.id).length}</p></div>
                        <div className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl p-2.5 sm:p-4"><p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-1.5">Payroll</p><p className="text-lg sm:text-2xl font-bold text-slate-800 tracking-tight">₹{selectedCompanyPayroll.toLocaleString()}</p></div>
                      </div>

                      <div className="space-y-2 sm:space-y-4 text-[11px] sm:text-[13px] bg-white border border-slate-100 shadow-sm rounded-xl sm:rounded-2xl p-3 sm:p-5">
                        <div className="flex justify-between items-center"><span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] sm:text-[10px]">Director</span><span className="font-bold text-slate-800">{selectedCompany.head_name || "Unassigned"}</span></div>
                        <div className="flex justify-between items-center pt-2 sm:pt-4 border-t border-slate-50"><span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] sm:text-[10px]">Phone</span><span className="font-bold text-slate-800">{selectedCompany.phone || "--"}</span></div>
                      </div>
                    </div>
                  )}

                  {(companyModalMode === 'edit' || companyModalMode === 'add') && (
                    <div className="space-y-4 sm:space-y-6 pb-2 sm:pb-4">
                      
                      <div className="flex items-end gap-3 sm:gap-5 pb-3 sm:pb-5 border-b border-slate-100">
                        <div className="flex flex-col items-center shrink-0">
                          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoSelect} className="hidden" />
                          <div onClick={() => fileInputRef.current?.click()} className="h-14 w-14 sm:h-20 sm:w-20 rounded-[1rem] sm:rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all overflow-hidden relative">
                            {logoPreview || (selectedCompany?.logo_url) ? <img src={logoPreview || selectedCompany.logo_url} alt="Logo" className="h-full w-full object-contain p-1.5 sm:p-2" /> : <Camera className="h-4 w-4 sm:h-6 sm:w-6 opacity-50" />}
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1 sm:mb-2 px-1">Company Name</label>
                          <input type="text" value={companyFormData.name} onChange={(e) => setCompanyFormData({...companyFormData, name: e.target.value})} className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-[12px] sm:text-[14px] font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:gap-5">
                        <div><label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1 sm:mb-2 px-1">Industry</label><input type="text" value={companyFormData.area} onChange={(e) => setCompanyFormData({...companyFormData, area: e.target.value})} className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-[11px] sm:text-[14px] font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" /></div>
                        <div><label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1 sm:mb-2 px-1">Director</label><input type="text" value={companyFormData.head_name} onChange={(e) => setCompanyFormData({...companyFormData, head_name: e.target.value})} className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-[11px] sm:text-[14px] font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" /></div>
                        <div><label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1 sm:mb-2 px-1">Phone</label><input type="text" value={companyFormData.phone} onChange={(e) => setCompanyFormData({...companyFormData, phone: e.target.value})} className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-[11px] sm:text-[14px] font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" /></div>
                        <div><label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1 sm:mb-2 px-1">Website URL</label><input type="url" value={companyFormData.website_url} onChange={(e) => setCompanyFormData({...companyFormData, website_url: e.target.value})} className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-[11px] sm:text-[14px] font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" /></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 sm:p-6 bg-white border-t border-slate-50 shrink-0">
                  {companyModalMode === 'view' && selectedCompany ? (
                    <div className="space-y-3">
                      <div className="hidden sm:flex flex-col sm:flex-row gap-2 sm:gap-3">
                        {selectedCompany.website_url && <a href={selectedCompany.website_url.startsWith('http') ? selectedCompany.website_url : `https://${selectedCompany.website_url}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center h-11 sm:h-12 rounded-xl bg-white text-slate-700 border border-slate-200 font-bold text-[12px] sm:text-[13px] hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all"><Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 text-slate-400" /> Website</a>}
                        <button onClick={openEditCompany} className="flex-1 h-11 sm:h-12 flex items-center justify-center bg-white border border-slate-200 text-slate-700 font-bold text-[12px] sm:text-[13px] rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all"><Edit3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 text-slate-400" /> Edit Data</button>
                      </div>
                      <button onClick={handleEnterWorkspace} className="w-full bg-gradient-to-r from-blue-900 to-indigo-800 text-white hover:shadow-lg hover:-translate-y-0.5 rounded-xl h-10 sm:h-14 font-bold text-[12px] sm:text-[14px] transition-all flex items-center justify-center group shadow-md shadow-blue-900/20">
                        Enter Workspace <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 sm:gap-3">
                      {companyModalMode === 'edit' && <button onClick={handleDeleteCompany} disabled={isSaving} className="border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 rounded-xl h-9 sm:h-12 px-3 sm:px-4 flex items-center justify-center shadow-sm transition-colors shrink-0"><Trash2 className="h-3.5 w-3.5 sm:h-5 sm:w-5" /></button>}
                      <button onClick={() => companyModalMode === 'add' ? setIsCompanyModalOpen(false) : setCompanyModalMode("view")} className="flex-1 rounded-xl border border-slate-200 bg-white h-9 sm:h-12 font-bold text-[11px] sm:text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors">Cancel</button>
                      <button onClick={handleSaveCompany} disabled={isSaving} className="flex-1 bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl h-9 sm:h-12 font-bold text-[11px] sm:text-[13px] shadow-md shadow-blue-900/20 hover:shadow-lg transition-all">{isSaving ? "Saving..." : "Save Record"}</button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // --- Head and User views remain identical, just maintaining layout ---
  if (showHeadView) {
    const activeCompany = companies.find(c => c.id === activeCompanyId) || companies[0]; 
    return (
      <div className="max-w-[1200px] mx-auto space-y-8 sm:space-y-10 animate-in fade-in duration-700">
        
        {visibleAnnouncements.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 relative overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
              <h3 className="text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase tracking-widest">Global Broadcast</h3>
            </div>
            <AnimatePresence mode="wait">
               <motion.div key={safeAnnouncementIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.3 }}>
                 <p className="font-bold text-slate-900 text-[14px] sm:text-base">{visibleAnnouncements[safeAnnouncementIndex].title}</p>
                 <p className="text-[13px] sm:text-sm text-slate-600 mt-1 leading-relaxed">{visibleAnnouncements[safeAnnouncementIndex].content}</p>
               </motion.div>
            </AnimatePresence>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
          <div>
            <p className="text-[9px] sm:text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-2 bg-blue-50 inline-block px-3 py-1 rounded-full">Director Dashboard</p>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-1 sm:mt-2">{activeCompany?.name || 'Workspace'}.</h1>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
          <div onClick={() => navigate('/projects')} className="bg-white border border-slate-100 p-4 sm:p-7 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col justify-between min-h-[120px] sm:min-h-[160px] relative overflow-hidden group cursor-pointer hover:shadow-md hover:border-blue-200 transition-all">
            <div className="absolute -right-6 -top-6 w-16 h-16 sm:w-24 sm:h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors"></div>
            <div className="relative z-10 flex justify-between items-center">
              <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate">Active Projects</p>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all hidden sm:block" />
            </div>
            <p className="text-3xl sm:text-5xl font-semibold text-slate-800 tracking-tight relative z-10 mt-2">{projects.filter(p => p.company_id === activeCompany?.id).length || 0}</p>
          </div>
          <div onClick={() => navigate('/invoices')} className="bg-white border border-slate-100 p-4 sm:p-7 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col justify-between min-h-[120px] sm:min-h-[160px] relative overflow-hidden group cursor-pointer hover:shadow-md hover:border-blue-200 transition-all">
            <div className="absolute -right-6 -top-6 w-16 h-16 sm:w-24 sm:h-24 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors"></div>
            <div className="relative z-10 flex justify-between items-center">
              <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate">Pending Invoices</p>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all hidden sm:block" />
            </div>
            <p className="text-3xl sm:text-5xl font-semibold text-slate-800 tracking-tight relative z-10 mt-2">{invoices.filter(i => i.company_id === activeCompany?.id).length || 0}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 p-4 sm:p-7 rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-900/10 flex flex-col justify-between min-h-[120px] sm:min-h-[160px] relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-24 h-24 sm:w-40 sm:h-40 bg-white/5 rounded-full blur-3xl"></div>
            <p className="text-[9px] sm:text-[11px] font-bold text-blue-200 uppercase tracking-widest relative z-10 truncate">Payroll Disbursed</p>
            <p className="text-2xl sm:text-4xl font-semibold text-white tracking-tight relative z-10 mt-2">₹{workspacePayroll.toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-8 sm:space-y-10 animate-in fade-in duration-700">
      
      {visibleAnnouncements.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
            <h3 className="text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase tracking-widest">Company Update</h3>
          </div>
          <AnimatePresence mode="wait">
             <motion.div key={safeAnnouncementIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.3 }}>
               <p className="font-bold text-slate-900 text-[14px] sm:text-base">{visibleAnnouncements[safeAnnouncementIndex].title}</p>
               <p className="text-[13px] sm:text-sm text-slate-600 mt-1 leading-relaxed">{visibleAnnouncements[safeAnnouncementIndex].content}</p>
             </motion.div>
          </AnimatePresence>
        </div>
      )}

      <div className="pb-5 sm:pb-6 border-b border-slate-100">
        <p className="text-[9px] sm:text-[11px] font-bold text-blue-600 uppercase tracking-[0.3em] mb-2 sm:mb-3 bg-blue-50 inline-block px-3 py-1 rounded-full">Employee Dashboard</p>
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-1 sm:mt-2 mb-1 sm:mb-2">
          Welcome, {user?.email?.split('@')[0]?.toUpperCase() || 'USER'}
        </h1>
        <p className="text-[13px] sm:text-[14px] font-medium text-slate-500">
          View your projects, tasks, and recent payouts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        <div className="lg:col-span-2">
          <h2 className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 sm:mb-4 px-1">My Projects</h2>
          
          {myProjects.length === 0 ? (
            <div className="border border-slate-200 border-dashed rounded-2xl sm:rounded-3xl h-32 sm:h-48 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">No Assigned Projects</span>
            </div>
          ) : (
            <div className="border border-slate-100 shadow-sm rounded-2xl sm:rounded-3xl bg-white overflow-hidden">
              {myProjects.map((project, index) => {
                const isCompleted = project.status === 'Completed';
                return (
                  <div key={project.id} onClick={() => navigate('/projects')} className={`p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5 cursor-pointer hover:bg-blue-50/50 transition-colors group ${index !== myProjects.length - 1 ? 'border-b border-slate-50' : ''}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                        <span className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full shadow-sm ${isCompleted ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-blue-600 shadow-blue-600/50'}`}></span>
                        <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${isCompleted ? 'text-emerald-600' : 'text-blue-600'}`}>{project.status}</span>
                      </div>
                      <h3 className={`font-bold text-[14px] sm:text-[16px] tracking-tight group-hover:text-blue-900 transition-colors ${isCompleted ? 'text-slate-500' : 'text-slate-900'}`}>{project.name}</h3>
                    </div>
                    
                    <div className="flex items-center gap-4 sm:gap-6 sm:text-right">
                      <div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Tasks</p>
                        <p className={`text-[13px] sm:text-[14px] font-bold ${isCompleted ? 'text-slate-400' : 'text-slate-800'}`}>{tasks.filter(t => t.project_id === project.id && t.is_completed).length} / {tasks.filter(t => t.project_id === project.id).length}</p>
                      </div>
                      {project.due_date && (
                        <div>
                          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Deadline</p>
                          <p className="text-[13px] sm:text-[14px] font-bold text-rose-500">{new Date(project.due_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</p>
                        </div>
                      )}
                      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all hidden sm:flex">
                        <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-900" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 sm:mb-4 px-1">Financial Status</h2>
          <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl min-h-[140px] sm:min-h-[180px] flex flex-col justify-between shadow-xl shadow-blue-900/10 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-24 h-24 sm:w-40 sm:h-40 bg-white/5 rounded-full blur-3xl"></div>
            {lastSalary ? (
              <>
                <div className="relative z-10">
                  <p className="text-[9px] sm:text-[10px] text-blue-200 font-bold uppercase tracking-widest mb-1.5 sm:mb-2">Latest Payout</p>
                  <div className="inline-flex items-center gap-1.5 text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md shadow-sm">
                    <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Disbursed</span>
                  </div>
                </div>
                <div className="relative z-10 mt-4 sm:mt-6">
                   <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">₹{lastSalary.amount.toLocaleString()}</p>
                   <p className="text-[9px] sm:text-[10px] text-blue-300 font-medium uppercase tracking-wider mt-1.5 sm:mt-2">Paid on: {new Date(lastSalary.payment_date).toLocaleDateString()}</p>
                </div>
              </>
            ) : (
              <>
                <div className="relative z-10">
                  <p className="text-[9px] sm:text-[10px] text-blue-200 font-bold uppercase tracking-widest mb-1.5 sm:mb-2">Next Payout</p>
                  <div className="inline-flex items-center gap-1.5 sm:gap-2 text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md">
                    <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Processing</span>
                  </div>
                </div>
                <div className="relative z-10 mt-4 sm:mt-6">
                   <p className="text-[12px] sm:text-[13px] text-blue-200 font-medium">Ledger unavailable.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}