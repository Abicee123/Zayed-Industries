import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Users, FolderKanban, Banknote, Plus, ArrowRight, Wallet, CheckCircle2, TrendingUp, Activity, Receipt, X, Camera, Globe, Trash2, Edit3, Phone, LogIn } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";
import { Button } from "../../components/ui/button";
import { supabase } from "../../supabase";

export default function DashboardPage() {
  const { role, user, activeWorkspace, setActiveWorkspace } = useAuthStore();
  const { companies, employees, projects, invoices, fetchAllData } = useDataStore();

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyModalMode, setCompanyModalMode] = useState<"view" | "edit" | "add">("view");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({ name: "", area: "", head_name: "", phone: "", website_url: "", logo_url: "" });

  const [activeSlide, setActiveSlide] = useState(0);
  const activities = [
    { text: "System baseline established.", time: "System Auth" },
    { text: "Global network synchronized and active.", time: "Data Store" },
    { text: "Security protocols running optimally.", time: "Security" }
  ];

  useEffect(() => {
    const interval = setInterval(() => { setActiveSlide((prev) => (prev + 1) % activities.length); }, 4000);
    return () => clearInterval(interval);
  }, [activities.length]);

  const openAddCompany = () => {
    setCompanyModalMode("add"); setSelectedCompany(null); setLogoFile(null); setLogoPreview(null);
    setCompanyFormData({ name: "", area: "", head_name: "", phone: "", website_url: "", logo_url: "" });
    setIsCompanyModalOpen(true);
  };

  const openViewCompany = (company: any) => { setCompanyModalMode("view"); setSelectedCompany(company); setIsCompanyModalOpen(true); };

  const openEditCompany = () => {
    setCompanyModalMode("edit"); setLogoFile(null); setLogoPreview(null);
    setCompanyFormData({ name: selectedCompany.name || "", area: selectedCompany.area || "", head_name: selectedCompany.head_name || "", phone: selectedCompany.phone || "", website_url: selectedCompany.website_url || "", logo_url: selectedCompany.logo_url || "" });
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) { setLogoFile(e.target.files[0]); setLogoPreview(URL.createObjectURL(e.target.files[0])); }
  };

  const handleSaveCompany = async () => {
    if (!companyFormData.name) return alert("Company Name is required.");
    setIsSaving(true);
    let finalLogoUrl = selectedCompany?.logo_url || null;

    try {
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, logoFile);
        if (!uploadError) { const { data } = supabase.storage.from('logos').getPublicUrl(fileName); finalLogoUrl = data.publicUrl; } 
        else { alert(`Logo Upload Error: ${uploadError.message}`); setIsSaving(false); return; }
      }

      const payload = { name: companyFormData.name, area: companyFormData.area, head_name: companyFormData.head_name, phone: companyFormData.phone, website_url: companyFormData.website_url, logo_url: finalLogoUrl };
      if (companyModalMode === 'add') {
        const { error } = await supabase.from('companies').insert([payload]); if (error) throw error;
      } else {
        const { error } = await supabase.from('companies').update(payload).eq('id', selectedCompany.id); if (error) throw error;
      }
      await fetchAllData(); setIsCompanyModalOpen(false);
    } catch (error: any) { alert(`Database Error: ${error.message}`); } finally { setIsSaving(false); }
  };

  const handleDeleteCompany = async () => {
    if (!window.confirm(`Are you absolutely sure you want to delete ${selectedCompany.name}?`)) return;
    setIsSaving(true); await supabase.from('companies').delete().eq('id', selectedCompany.id); 
    await fetchAllData(); setIsCompanyModalOpen(false); setIsSaving(false);
  };

  // --- THE IMPERSONATION TRIGGER ---
  const handleEnterWorkspace = async () => {
    setActiveWorkspace(selectedCompany.id);
    await fetchAllData(); // Wipes memory cleanly and reloads specifically for this company
    setIsCompanyModalOpen(false);
  };

  // VIEW ROUTING LOGIC
  const isImpersonating = role === 'admin' && activeWorkspace !== null;
  const showHeadView = role === 'head' || isImpersonating;

  // ---------------------------------------------------------------------------
  // 1. THE GLOBAL ADMIN VIEW
  // ---------------------------------------------------------------------------
  if (role === 'admin' && !isImpersonating) {
    return (
      <div className="space-y-8 pb-8 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div><h1 className="text-2xl font-semibold text-slate-900 tracking-tight">System Overview</h1><p className="text-sm text-slate-500 mt-1">Zayed Industries</p></div>
          <div className="flex items-center gap-3"><Button onClick={openAddCompany} className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-10 px-4 text-sm shadow-sm flex items-center transition-all"><Plus className="h-4 w-4 mr-2" /> Add Subsidiary</Button></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[{ label: "Total Subsidiaries", value: companies.length || 0, icon: Building2 }, { label: "Global Workforce", value: employees.length || 0, icon: Users }, { label: "Active Projects", value: projects.length || 0, icon: FolderKanban }, { label: "Network Revenue", value: "₹0.00", icon: Banknote }].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="p-6 rounded-3xl bg-white border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:shadow-md hover:border-slate-300 transition-all">
              <div className="flex justify-between items-start mb-4"><div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-slate-900 group-hover:bg-slate-100 transition-colors"><stat.icon className="h-6 w-6" /></div></div>
              <div><p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p><p className="text-3xl font-semibold text-slate-900 tracking-tight">{stat.value}</p></div>
            </motion.div>
          ))}
        </div>

        <div className="flex-1 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Subsidiaries & Nodes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {companies.map((company, i) => (
              <motion.div key={company.id} onClick={() => openViewCompany(company)} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="p-6 rounded-3xl bg-white border border-slate-200/60 shadow-sm hover:border-slate-300 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between h-40">
                <div className="flex justify-between items-start">
                  <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-lg text-slate-400 overflow-hidden shadow-sm group-hover:shadow transition-all">
                    {company.logo_url ? <img src={company.logo_url} alt={company.name} className="h-full w-full object-contain p-1" /> : company.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"><ArrowRight className="h-4 w-4 text-slate-900" /></div>
                </div>
                <div><h3 className="font-semibold text-slate-900 text-lg truncate">{company.name}</h3><p className="text-sm text-slate-500 mt-0.5 truncate">{company.area || "Subsidiary"}</p></div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="w-full bg-slate-900 rounded-2xl p-4 overflow-hidden relative shadow-lg mt-auto">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0"><Activity className="h-4 w-4 text-emerald-400 animate-pulse" /></div>
            <div className="relative h-6 flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div key={activeSlide} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.5, ease: "easeInOut" }} className="absolute inset-0 flex items-center justify-between">
                  <p className="text-sm text-slate-300 font-medium truncate">{activities[activeSlide].text}</p><p className="text-xs text-slate-500 font-mono shrink-0 ml-4">{activities[activeSlide].time}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* COMPANY MODAL */}
        <AnimatePresence>
          {isCompanyModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/60">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-lg font-semibold text-slate-900">{companyModalMode === 'add' ? 'Add Subsidiary' : companyModalMode === 'edit' ? 'Edit Profile' : 'Company Profile'}</h3>
                  <button onClick={() => setIsCompanyModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-1 rounded-md hover:bg-slate-200/50"><X className="h-5 w-5" /></button>
                </div>
                <div className="p-6">
                  
                  {/* VIEW MODE WITH STATS & IMPERSONATION BUTTON */}
                  {companyModalMode === 'view' && selectedCompany && (
                    <div className="space-y-6">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="h-28 w-28 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shadow-sm mb-4 p-2">
                          {selectedCompany.logo_url ? <img src={selectedCompany.logo_url} alt="Logo" className="h-full w-full object-contain" /> : <Building2 className="h-10 w-10 text-slate-300" />}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">{selectedCompany.name}</h2>
                        <p className="text-slate-500">{selectedCompany.area || "Subsidiary Network"}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                          <Users className="h-5 w-5 text-indigo-400 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-slate-900">{employees.filter(e => e.company_id === selectedCompany.id).length}</p>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Employees</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                          <FolderKanban className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-slate-900">{projects.filter(p => p.company_id === selectedCompany.id).length}</p>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Projects</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-5 space-y-4 border border-slate-100">
                        <div className="flex justify-between items-center"><span className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Users className="h-4 w-4"/> Head</span><span className="text-sm font-semibold text-slate-900">{selectedCompany.head_name || "Unassigned"}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Phone className="h-4 w-4"/> Phone</span><span className="text-sm font-semibold text-slate-900">{selectedCompany.phone || "--"}</span></div>
                      </div>

                      <div className="flex gap-3">
                        {selectedCompany.website_url && <a href={selectedCompany.website_url.startsWith('http') ? selectedCompany.website_url : `https://${selectedCompany.website_url}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center h-12 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-sm hover:bg-slate-100 transition-colors"><Globe className="h-4 w-4 mr-2" /> Website</a>}
                        <Button onClick={openEditCompany} className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl h-12 font-medium shadow-none"><Edit3 className="h-4 w-4 mr-2" /> Edit Info</Button>
                      </div>

                      {/* THE ENTER WORKSPACE BUTTON */}
                      <Button onClick={handleEnterWorkspace} className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-14 font-bold text-base shadow-lg shadow-slate-900/20 group">
                        Enter Workspace <LogIn className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  )}

                  {/* EDIT & ADD MODE */}
                  {(companyModalMode === 'edit' || companyModalMode === 'add') && (
                    <div className="space-y-6">
                      <div className="flex flex-col items-center justify-center">
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoSelect} className="hidden" />
                        <div onClick={() => fileInputRef.current?.click()} className="relative group cursor-pointer">
                          <div className="h-24 w-24 rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 group-hover:border-slate-500 group-hover:bg-slate-100 transition-all overflow-hidden p-2">
                            {logoPreview || (selectedCompany?.logo_url) ? <img src={logoPreview || selectedCompany.logo_url} alt="Logo" className="h-full w-full object-contain" /> : <Camera className="h-8 w-8 mb-1 opacity-50" />}
                          </div>
                          <div className="absolute inset-0 bg-slate-900/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><span className="text-white text-xs font-medium">Upload</span></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-1.5"><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Company Name</label><input type="text" value={companyFormData.name} onChange={(e) => setCompanyFormData({...companyFormData, name: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" /></div>
                        <div className="col-span-2 space-y-1.5"><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Industry / Area</label><input type="text" value={companyFormData.area} onChange={(e) => setCompanyFormData({...companyFormData, area: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" /></div>
                        <div className="col-span-1 space-y-1.5"><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Head Name</label><input type="text" value={companyFormData.head_name} onChange={(e) => setCompanyFormData({...companyFormData, head_name: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" /></div>
                        <div className="col-span-1 space-y-1.5"><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Contact Phone</label><input type="text" value={companyFormData.phone} onChange={(e) => setCompanyFormData({...companyFormData, phone: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" /></div>
                        <div className="col-span-2 space-y-1.5"><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Website URL</label><input type="url" placeholder="https://" value={companyFormData.website_url} onChange={(e) => setCompanyFormData({...companyFormData, website_url: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" /></div>
                      </div>
                      <div className="flex gap-3 pt-4 border-t border-slate-100">
                        {companyModalMode === 'edit' && <Button variant="outline" onClick={handleDeleteCompany} disabled={isSaving} className="border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl h-11 px-4"><Trash2 className="h-4 w-4" /></Button>}
                        <Button variant="outline" onClick={() => setCompanyModalMode("view")} className="flex-1 rounded-xl h-11 font-medium">Cancel</Button>
                        <Button onClick={handleSaveCompany} disabled={isSaving} className="flex-1 bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-11 font-medium shadow-sm">{isSaving ? "Saving..." : "Save Company"}</Button>
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

  // ---------------------------------------------------------------------------
  // 2. THE HEAD VIEW (Also acts as the Impersonation View for Admins)
  // ---------------------------------------------------------------------------
  if (showHeadView) {
    const activeCompany = companies[0]; // Filtered by dataStore to length 1

    return (
      <div className="space-y-8 pb-8 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div><h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Welcome to {activeCompany?.name || 'Workspace'}</h1><p className="text-sm text-slate-500 mt-1">Here is the performance overview for this sector.</p></div>
          <div className="flex items-center gap-3"><Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-10 px-4 text-sm shadow-sm flex items-center transition-all"><Plus className="h-4 w-4 mr-2" /> New Project</Button></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[{ label: "Total Revenue", value: "₹0.00", icon: TrendingUp }, { label: "Active Projects", value: projects.length || 0, icon: FolderKanban }, { label: "Pending Invoices", value: invoices.length || 0, icon: Receipt }].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="p-6 rounded-3xl bg-white/60 backdrop-blur-md border border-white shadow-sm flex flex-col justify-between h-40 group hover:shadow-md transition-all">
              <div className="flex justify-between items-start"><p className="text-sm font-medium text-slate-500">{stat.label}</p><div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-slate-900 shadow-sm transition-colors"><stat.icon className="h-5 w-5" /></div></div>
              <div className="flex items-end justify-between"><p className="text-3xl font-semibold text-slate-900 tracking-tight">{stat.value}</p></div>
            </motion.div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-md border border-white shadow-sm flex flex-col items-center justify-center min-h-[300px] text-center">
            <TrendingUp className="h-10 w-10 text-slate-300 mb-4" /><h3 className="font-semibold text-slate-900">Revenue Trend</h3><p className="text-sm text-slate-500 mt-1 max-w-[250px]">Sufficient financial data is required to generate growth charts.</p>
          </div>
          <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-md border border-white shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6"><h3 className="font-semibold text-slate-900">Payroll Snapshot</h3><button className="text-sm text-slate-500 hover:text-slate-900 font-medium transition-colors">View All</button></div>
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300"><Wallet className="h-6 w-6" /></div>
              <div><p className="text-sm font-medium text-slate-900">No payroll data yet</p><p className="text-xs text-slate-500 mt-1">Process payments to generate records.</p></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. THE USER VIEW
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-8 pb-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Welcome back, {user?.email?.split('@')[0] || 'User'}</h1><p className="text-sm text-slate-500 mt-1">Here is your assigned workflow for today.</p></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">My Active Tasks</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/60 shadow-sm border-l-4 border-l-slate-200 border-dashed opacity-60 flex flex-col items-center justify-center min-h-[160px] text-center">
              <CheckCircle2 className="h-8 w-8 text-slate-300 mb-3" /><p className="text-sm font-medium text-slate-500">You have no pending tasks.</p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">My Compensation</h2>
          <div className="p-8 rounded-3xl bg-white border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-5 mb-8 pb-8 border-b border-slate-100">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm"><Wallet className="h-6 w-6" /></div>
              <div><p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Last Deposit</p><p className="text-2xl font-semibold text-slate-900 mt-1">--</p></div>
            </div>
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent History</p>
              <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-sm text-slate-500">No payment history available.</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}