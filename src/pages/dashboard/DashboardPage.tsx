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
  const [announcementForm, setAnnouncementForm] = useState({ title: "", content: "" });
  const [activeAnnouncementIndex, setActiveAnnouncementIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({ name: "", area: "", head_name: "", phone: "", website_url: "", logo_url: "" });

  useEffect(() => {
    if (announcements && announcements.length > 1) {
      const timer = setInterval(() => {
        setActiveAnnouncementIndex((prev) => (prev + 1) % announcements.length);
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [announcements]);

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
    await supabase.from('announcements').insert([announcementForm]);
    await fetchAllData();
    setAnnouncementForm({ title: "", content: "" });
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
  
  // --- DYNAMIC DATA ISOLATION PIPELINES ---
  const myProjects = projects.filter(p => (p.assignee_ids || []).includes(employeeId));
  const globalPayroll = salaryPayments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
  
  // Isolate current active workspace payroll
  const activeCompanyId = activeWorkspace || companyId;
  const activeWorkspaceEmployees = employees.filter(e => e.company_id === activeCompanyId).map(e => e.id);
  const workspacePayroll = salaryPayments
    .filter(p => activeWorkspaceEmployees.includes(p.employee_id))
    .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);

  // Isolate payroll for the specific company clicked in the Admin view
  const selectedCompanyEmployeeIds = selectedCompany ? employees.filter(e => e.company_id === selectedCompany.id).map(e => e.id) : [];
  const selectedCompanyPayroll = salaryPayments
    .filter(p => selectedCompanyEmployeeIds.includes(p.employee_id))
    .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);

  const mySalaries = salaryPayments.filter(s => s.employee_id === employeeId).sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  const lastSalary = mySalaries[0];

  // --- 1. ADMIN VIEW ---
  if (role === 'admin' && !isImpersonating) {
    return (
      <div className="max-w-[1200px] mx-auto space-y-10 animate-in fade-in duration-700">
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-2 bg-blue-50 inline-block px-3 py-1 rounded-full">Admin Dashboard</p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 mt-2">Company Overview.</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setIsAnnouncementModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 px-6 py-3 rounded-2xl text-[13px] font-bold transition-all flex items-center">
              <Megaphone className="h-4 w-4 mr-2 text-blue-600" /> New Announcement
            </button>
            <button onClick={openAddCompany} className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-lg shadow-blue-900/20 hover:shadow-xl hover:-translate-y-0.5 px-6 py-3 rounded-2xl text-[13px] font-bold transition-all flex items-center">
              <Plus className="h-4 w-4 mr-2" /> Add Company
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-100 p-7 rounded-3xl shadow-sm flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors"></div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest relative z-10">Companies</p>
            <p className="text-5xl font-semibold text-slate-800 tracking-tight relative z-10">{companies.length || 0}</p>
          </div>
          <div className="bg-white border border-slate-100 p-7 rounded-3xl shadow-sm flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors"></div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest relative z-10">Total Employees</p>
            <p className="text-5xl font-semibold text-slate-800 tracking-tight relative z-10">{employees.length || 0}</p>
          </div>
          <div className="bg-white border border-slate-100 p-7 rounded-3xl shadow-sm flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors"></div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest relative z-10">Active Projects</p>
            <p className="text-5xl font-semibold text-slate-800 tracking-tight relative z-10">{projects.length || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 p-7 rounded-3xl shadow-xl shadow-blue-900/10 flex flex-col justify-between min-h-[160px] relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
            <p className="text-[11px] font-bold text-blue-200 uppercase tracking-widest relative z-10">Total Payroll</p>
            <p className="text-4xl font-semibold text-white tracking-tight relative z-10">₹{globalPayroll.toLocaleString()}</p>
          </div>
        </div>

        <div className="pt-4">
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 px-1">Company Directory</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {companies.map((company, i) => (
              <motion.div key={company.id} onClick={() => openViewCompany(company)} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group flex items-start justify-between">
                <div>
                  <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center mb-5 overflow-hidden border border-slate-100 group-hover:scale-105 transition-transform">
                    {company.logo_url ? <img src={company.logo_url} alt="" className="h-full w-full object-contain p-2" /> : <Building2 className="h-5 w-5 text-slate-400" />}
                  </div>
                  <h3 className="font-bold text-[15px] text-slate-900 tracking-tight">{company.name}</h3>
                  <p className="text-[12px] font-medium text-slate-400 mt-1">{company.area || "Subsidiary"}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                  <ArrowRight className="h-4 w-4 text-blue-900" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* MODAL: Announcements */}
        <AnimatePresence>
          {isAnnouncementModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-50 bg-[#FAFCFF] shrink-0">
                  <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">Manage Announcements</h3>
                  <button onClick={() => setIsAnnouncementModalOpen(false)} className="h-8 w-8 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm"><X className="h-4 w-4" /></button>
                </div>
                
                <div className="p-8 flex-1 overflow-y-auto">
                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Headline</label>
                      <input type="text" value={announcementForm.title} onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-medium outline-none focus:border-blue-500 shadow-sm" placeholder="Important update..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Message Content</label>
                      <textarea value={announcementForm.content} onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})} className="w-full h-24 rounded-xl border border-slate-200 bg-white p-4 text-[14px] font-medium outline-none focus:border-blue-500 shadow-sm resize-none" placeholder="Provide the details..." />
                    </div>
                    <button onClick={handlePostAnnouncement} disabled={isSaving} className="w-full bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl h-11 font-bold text-[13px] shadow-md shadow-blue-900/20 hover:shadow-lg transition-all">{isSaving ? "Posting..." : "Broadcast Announcement"}</button>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-1 border-b border-slate-100 pb-2">Active Broadcasts</h4>
                    <div className="space-y-3">
                      {announcements.length === 0 && <p className="text-sm text-slate-400 italic">No active announcements.</p>}
                      {announcements.map(ann => (
                        <div key={ann.id} className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex justify-between items-start gap-4">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{ann.title}</p>
                            <p className="text-xs text-slate-600 mt-1">{ann.content}</p>
                            <p className="text-[10px] text-slate-400 mt-2">{new Date(ann.created_at).toLocaleDateString()}</p>
                          </div>
                          <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: Edit/View Company */}
        <AnimatePresence>
          {isCompanyModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
                <div className="flex items-center justify-between p-6 border-b border-slate-50 bg-[#FAFCFF]">
                  <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">{companyModalMode === 'add' ? 'Add Company' : companyModalMode === 'edit' ? 'Edit Details' : 'Company Profile'}</h3>
                  <button onClick={() => setIsCompanyModalOpen(false)} className="h-8 w-8 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm"><X className="h-4 w-4" /></button>
                </div>
                <div className="p-8">
                  {companyModalMode === 'view' && selectedCompany && (
                    <div className="space-y-8">
                      <div className="flex items-center gap-5">
                        <div className="h-20 w-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden p-3 shadow-sm">
                          {selectedCompany.logo_url ? <img src={selectedCompany.logo_url} alt="Logo" className="h-full w-full object-contain" /> : <Building2 className="h-8 w-8 text-slate-300" />}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedCompany.name}</h2>
                          <p className="text-[13px] font-medium text-slate-500 mt-1">{selectedCompany.area}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Personnel</p><p className="text-2xl font-bold text-slate-800 tracking-tight">{employees.filter(e => e.company_id === selectedCompany.id).length}</p></div>
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Operations</p><p className="text-2xl font-bold text-slate-800 tracking-tight">{projects.filter(p => p.company_id === selectedCompany.id).length}</p></div>
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Payroll</p><p className="text-2xl font-bold text-slate-800 tracking-tight">₹{selectedCompanyPayroll.toLocaleString()}</p></div>
                      </div>

                      <div className="space-y-4 text-[13px] bg-white border border-slate-100 shadow-sm rounded-2xl p-5">
                        <div className="flex justify-between items-center"><span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Director</span><span className="font-bold text-slate-800">{selectedCompany.head_name || "Unassigned"}</span></div>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-50"><span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Phone</span><span className="font-bold text-slate-800">{selectedCompany.phone || "--"}</span></div>
                      </div>

                      <div className="flex gap-3">
                        {selectedCompany.website_url && <a href={selectedCompany.website_url.startsWith('http') ? selectedCompany.website_url : `https://${selectedCompany.website_url}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center h-12 rounded-xl bg-white text-slate-700 border border-slate-200 font-bold text-[13px] hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all"><Globe className="h-4 w-4 mr-2 text-slate-400" /> Website</a>}
                        <button onClick={openEditCompany} className="flex-1 h-12 flex items-center justify-center bg-white border border-slate-200 text-slate-700 font-bold text-[13px] rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all"><Edit3 className="h-4 w-4 mr-2 text-slate-400" /> Edit Data</button>
                      </div>
                      <button onClick={handleEnterWorkspace} className="w-full bg-gradient-to-r from-blue-900 to-indigo-800 text-white hover:shadow-lg hover:-translate-y-0.5 rounded-xl h-14 font-bold text-[14px] transition-all flex items-center justify-center group shadow-md shadow-blue-900/20">
                        Enter Workspace <LogIn className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  )}

                  {(companyModalMode === 'edit' || companyModalMode === 'add') && (
                    <div className="space-y-6">
                      <div className="flex flex-col items-center pb-5 border-b border-slate-100">
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoSelect} className="hidden" />
                        <div onClick={() => fileInputRef.current?.click()} className="h-24 w-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all overflow-hidden relative">
                          {logoPreview || (selectedCompany?.logo_url) ? <img src={logoPreview || selectedCompany.logo_url} alt="Logo" className="h-full w-full object-contain p-2" /> : <Camera className="h-6 w-6 mb-1 opacity-50" />}
                        </div>
                      </div>
                      <div className="space-y-5">
                        <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Company Name</label><input type="text" value={companyFormData.name} onChange={(e) => setCompanyFormData({...companyFormData, name: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" /></div>
                        <div className="grid grid-cols-2 gap-5">
                          <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Industry</label><input type="text" value={companyFormData.area} onChange={(e) => setCompanyFormData({...companyFormData, area: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" /></div>
                          <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Director Name</label><input type="text" value={companyFormData.head_name} onChange={(e) => setCompanyFormData({...companyFormData, head_name: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" /></div>
                          <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Phone</label><input type="text" value={companyFormData.phone} onChange={(e) => setCompanyFormData({...companyFormData, phone: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" /></div>
                          <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Website URL</label><input type="url" value={companyFormData.website_url} onChange={(e) => setCompanyFormData({...companyFormData, website_url: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" /></div>
                        </div>
                      </div>
                      <div className="flex gap-3 pt-5 border-t border-slate-100">
                        {companyModalMode === 'edit' && <button onClick={handleDeleteCompany} disabled={isSaving} className="border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 rounded-xl h-12 px-4 flex items-center justify-center shadow-sm transition-colors"><Trash2 className="h-5 w-5" /></button>}
                        <button onClick={() => setCompanyModalMode("view")} className="flex-1 rounded-xl border border-slate-200 bg-white h-12 font-bold text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors">Cancel</button>
                        <button onClick={handleSaveCompany} disabled={isSaving} className="flex-1 bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl h-12 font-bold text-[13px] shadow-md shadow-blue-900/20 hover:shadow-lg transition-all">{isSaving ? "Saving..." : "Save Record"}</button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // --- 2. HEAD VIEW ---
  if (showHeadView) {
    const activeCompany = companies.find(c => c.id === activeCompanyId) || companies[0]; 
    return (
      <div className="max-w-[1200px] mx-auto space-y-10 animate-in fade-in duration-700">
        
        {/* Dynamic Announcement Banner */}
        {announcements.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 relative overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-4 w-4 text-blue-600" />
              <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Global Broadcast</h3>
            </div>
            <AnimatePresence mode="wait">
               <motion.div key={activeAnnouncementIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.3 }}>
                 <p className="font-bold text-slate-900 text-base">{announcements[activeAnnouncementIndex].title}</p>
                 <p className="text-sm text-slate-600 mt-1 leading-relaxed">{announcements[activeAnnouncementIndex].content}</p>
               </motion.div>
            </AnimatePresence>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-2 bg-blue-50 inline-block px-3 py-1 rounded-full">Director Dashboard</p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 mt-2">{activeCompany?.name || 'Workspace'}.</h1>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div onClick={() => navigate('/projects')} className="bg-white border border-slate-100 p-7 rounded-3xl shadow-sm flex flex-col justify-between min-h-[160px] relative overflow-hidden group cursor-pointer hover:shadow-md hover:border-blue-200 transition-all">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors"></div>
            <div className="relative z-10 flex justify-between items-center">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Active Projects</p>
              <ArrowRight className="h-4 w-4 text-blue-500 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
            </div>
            <p className="text-5xl font-semibold text-slate-800 tracking-tight relative z-10">{projects.filter(p => p.company_id === activeCompany?.id).length || 0}</p>
          </div>
          <div onClick={() => navigate('/invoices')} className="bg-white border border-slate-100 p-7 rounded-3xl shadow-sm flex flex-col justify-between min-h-[160px] relative overflow-hidden group cursor-pointer hover:shadow-md hover:border-blue-200 transition-all">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors"></div>
            <div className="relative z-10 flex justify-between items-center">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pending Invoices</p>
              <ArrowRight className="h-4 w-4 text-blue-500 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
            </div>
            <p className="text-5xl font-semibold text-slate-800 tracking-tight relative z-10">{invoices.filter(i => i.company_id === activeCompany?.id).length || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 p-7 rounded-3xl shadow-xl shadow-blue-900/10 flex flex-col justify-between min-h-[160px] relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
            <p className="text-[11px] font-bold text-blue-200 uppercase tracking-widest relative z-10">Payroll Disbursed</p>
            <p className="text-4xl font-semibold text-white tracking-tight relative z-10">₹{workspacePayroll.toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  }

  // --- 3. USER VIEW ---
  return (
    <div className="max-w-[1000px] mx-auto space-y-10 animate-in fade-in duration-700">
      
      {/* Dynamic Announcement Banner */}
      {announcements.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4 text-blue-600" />
            <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Company Update</h3>
          </div>
          <AnimatePresence mode="wait">
             <motion.div key={activeAnnouncementIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.3 }}>
               <p className="font-bold text-slate-900 text-base">{announcements[activeAnnouncementIndex].title}</p>
               <p className="text-sm text-slate-600 mt-1 leading-relaxed">{announcements[activeAnnouncementIndex].content}</p>
             </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Clean Welcome */}
      <div className="pb-6 border-b border-slate-100">
        <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.3em] mb-3 bg-blue-50 inline-block px-3 py-1 rounded-full">Employee Dashboard</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mt-2 mb-2">
          Welcome, {user?.email?.split('@')[0]?.toUpperCase() || 'USER'}
        </h1>
        <p className="text-[14px] font-medium text-slate-500">
          View your projects, tasks, and recent payouts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Clickable Assignments List */}
        <div className="lg:col-span-2">
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">My Projects</h2>
          
          {myProjects.length === 0 ? (
            <div className="border border-slate-200 border-dashed rounded-3xl h-48 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <span className="text-[11px] font-bold uppercase tracking-widest">No Assigned Projects</span>
            </div>
          ) : (
            <div className="border border-slate-100 shadow-sm rounded-3xl bg-white overflow-hidden">
              {myProjects.map((project, index) => {
                const isCompleted = project.status === 'Completed';
                return (
                  <div key={project.id} onClick={() => navigate('/projects')} className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 cursor-pointer hover:bg-blue-50/50 transition-colors group ${index !== myProjects.length - 1 ? 'border-b border-slate-50' : ''}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`h-2 w-2 rounded-full shadow-sm ${isCompleted ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-blue-600 shadow-blue-600/50'}`}></span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isCompleted ? 'text-emerald-600' : 'text-blue-600'}`}>{project.status}</span>
                      </div>
                      <h3 className={`font-bold text-[16px] tracking-tight group-hover:text-blue-900 transition-colors ${isCompleted ? 'text-slate-500' : 'text-slate-900'}`}>{project.name}</h3>
                    </div>
                    
                    <div className="flex items-center gap-6 sm:text-right">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tasks</p>
                        <p className={`text-[14px] font-bold ${isCompleted ? 'text-slate-400' : 'text-slate-800'}`}>{tasks.filter(t => t.project_id === project.id && t.is_completed).length} / {tasks.filter(t => t.project_id === project.id).length}</p>
                      </div>
                      {project.due_date && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Deadline</p>
                          <p className="text-[14px] font-bold text-rose-500">{new Date(project.due_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</p>
                        </div>
                      )}
                      <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                        <ArrowRight className="h-4 w-4 text-blue-900" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Financial Status</h2>
          <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white p-8 rounded-3xl min-h-[180px] flex flex-col justify-between shadow-xl shadow-blue-900/10 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
            {lastSalary ? (
              <>
                <div className="relative z-10">
                  <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest mb-2">Latest Payout</p>
                  <div className="inline-flex items-center gap-1.5 text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-md shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Disbursed</span>
                  </div>
                </div>
                <div className="relative z-10 mt-6">
                   <p className="text-4xl font-semibold tracking-tight text-white">₹{lastSalary.amount.toLocaleString()}</p>
                   <p className="text-[10px] text-blue-300 font-medium uppercase tracking-wider mt-2">Paid on: {new Date(lastSalary.payment_date).toLocaleDateString()}</p>
                </div>
              </>
            ) : (
              <>
                <div className="relative z-10">
                  <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest mb-2">Next Payout</p>
                  <div className="inline-flex items-center gap-2 text-amber-300 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-md">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Processing</span>
                  </div>
                </div>
                <div className="relative z-10 mt-6">
                   <p className="text-[13px] text-blue-200 font-medium">Ledger unavailable.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}