import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Mail, Phone, Building2, Edit3, Trash2, X, Camera, Wallet, LayoutGrid, List, ShieldAlert, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";
import { supabase } from "../../supabase";

export default function EmployeesPage() {
  const { role, activeWorkspace, companyId } = useAuthStore();
  const { employees, companies, projectAllocations, salaryPayments, projects, fetchAllData } = useDataStore();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState<string>("all"); // NEW: Subsidiary Filter
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Ledger Modal State
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [ledgerEmployee, setLedgerEmployee] = useState<any>(null);
  
  // Direct Payment State
  const today = new Date().toISOString().split('T')[0];
  const [showEmpPaymentForm, setShowEmpPaymentForm] = useState(false);
  const [empPaymentForm, setEmpPaymentForm] = useState({ amount: 0, payment_type: "Advance", payment_date: today, notes: "", project_id: "" });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const currentCompanyId = role === 'admin' ? (activeWorkspace || "") : companyId;

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", role: "", access_level: "user", company_id: currentCompanyId?.toString() || "", password: ""
  });

  // Filter logic respecting the company dropdown for Master Admins
  const visibleEmployees = employees.filter(emp => {
    const matchesSearch = emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) || (emp.email && emp.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (role === 'admin' && !activeWorkspace) {
      const matchesCompany = filterCompanyId === "all" || emp.company_id?.toString() === filterCompanyId;
      return matchesSearch && matchesCompany;
    }
    
    return matchesSearch && (emp.company_id === currentCompanyId || emp.access_level === 'admin');
  }).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  // Math Helper for Project-Based Earnings
  const getFinancials = (empId: number) => {
    const allocs = projectAllocations.filter(a => a.employee_id === empId);
    const payments = salaryPayments.filter(p => p.employee_id === empId);
    
    const totalAllocated = allocs.reduce((sum, a) => sum + (parseFloat(a.allocated_amount || 0) + parseFloat(a.incentive_amount || 0)), 0);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const balanceDue = Math.max(0, totalAllocated - totalPaid);
    
    return { totalAllocated, totalPaid, balanceDue, allocs, payments };
  };

  const openNewEmployee = () => {
    setSelectedEmployee(null);
    setFormData({ name: "", email: "", phone: "", role: "", access_level: "user", company_id: currentCompanyId?.toString() || "", password: "" });
    setImageFile(null); setImagePreview(null); setRemoveImage(false);
    setIsModalOpen(true);
  };

  const openEditEmployee = (emp: any) => {
    setSelectedEmployee(emp);
    setFormData({
      name: emp.name || "", email: emp.email || "", phone: emp.phone || "", role: emp.role || "", 
      access_level: emp.access_level || "user", company_id: emp.company_id?.toString() || "", password: ""
    });
    setImageFile(null); setImagePreview(null); setRemoveImage(false);
    setIsModalOpen(true);
  };

  const openLedger = (emp: any) => {
    setLedgerEmployee(emp);
    setShowEmpPaymentForm(false);
    setEmpPaymentForm({ amount: 0, payment_type: "Advance", payment_date: today, notes: "", project_id: "" });
    setIsLedgerOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); setRemoveImage(false); }
  };

  const handleSaveEmployee = async () => {
    if (!formData.name.trim() || !formData.email.trim()) return alert("Name and Email are required.");
    if (!selectedEmployee && !formData.password.trim()) return alert("Initial password is required for new employees.");
    if (role === 'admin' && !activeWorkspace && !formData.company_id && formData.access_level !== 'admin') return alert("Please select a company.");

    setIsSaving(true);
    let finalImageUrl = selectedEmployee?.profile_image_url || null;
    if (removeImage) finalImageUrl = null;

    try {
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, imageFile);
        if (uploadError) throw new Error(`Image upload failed! ${uploadError.message}`);
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        finalImageUrl = data.publicUrl;
      }

      const payload: any = {
        name: formData.name, email: formData.email, phone: formData.phone, role: formData.role,
        access_level: formData.access_level, company_id: formData.company_id ? parseInt(formData.company_id) : null,
        profile_image_url: finalImageUrl
      };

      if (!selectedEmployee) {
        payload.password = formData.password; 
        const { error } = await supabase.from('employees').insert([payload]);
        if (error) throw error;
      } else {
        if (formData.password) payload.password = formData.password; 
        const { error } = await supabase.from('employees').update(payload).eq('id', selectedEmployee.id);
        if (error) throw error;
      }
      
      await fetchAllData();
      setIsModalOpen(false);
    } catch (error: any) { alert(error.message); } finally { setIsSaving(false); }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;
    if (!window.confirm(`Are you sure you want to remove ${selectedEmployee.name}?`)) return;
    setIsSaving(true);
    try {
      await supabase.from('employees').delete().eq('id', selectedEmployee.id);
      await fetchAllData(); setIsModalOpen(false);
    } catch (error: any) { alert(error.message); } finally { setIsSaving(false); }
  };

  const handleRecordEmployeePayment = async () => {
    if (empPaymentForm.amount <= 0) return alert("Enter a valid amount.");
    setIsSaving(true);
    try {
      const { error } = await supabase.from('salary_payments').insert([{
        employee_id: ledgerEmployee.id,
        company_id: ledgerEmployee.company_id || currentCompanyId, 
        project_id: empPaymentForm.project_id ? parseInt(empPaymentForm.project_id) : null,
        amount: empPaymentForm.amount,
        payment_type: empPaymentForm.payment_type,
        payment_date: empPaymentForm.payment_date,
        payment_month: empPaymentForm.payment_date.substring(0, 7),
        notes: empPaymentForm.notes
      }]);
      
      if (error) throw new Error(`Database Error: ${error.message}`);
      
      alert("Payment recorded successfully.");
      setEmpPaymentForm({ amount: 0, payment_type: "Advance", payment_date: today, notes: "", project_id: "" });
      setShowEmpPaymentForm(false);
      await fetchAllData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePaymentRecord = async (paymentId: number) => {
    if (!window.confirm("Remove this payment record permanently?")) return;
    try {
      const { error } = await supabase.from('salary_payments').delete().eq('id', paymentId);
      if (error) throw new Error(error.message);
      await fetchAllData();
    } catch (error: any) { alert(`Error deleting record: ${error.message}`); }
  };

  const displayImage = imagePreview || (!removeImage && selectedEmployee?.profile_image_url && selectedEmployee.profile_image_url.trim() !== "" ? selectedEmployee.profile_image_url : null);

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-700 pb-8 relative z-0">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-2 bg-blue-50 inline-block px-3 py-1 rounded-full">Workforce & HR</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mt-2">Personnel.</h1>
        </div>
        {(role === 'admin' || role === 'head') && (
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-2xl flex items-center border border-slate-100 shadow-sm">
              <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-50 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="h-4 w-4" /></button>
              <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-50 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><List className="h-4 w-4" /></button>
            </div>
            <button onClick={openNewEmployee} className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-lg shadow-blue-900/20 hover:shadow-xl hover:-translate-y-0.5 px-6 py-3.5 rounded-2xl text-[13px] font-bold transition-all flex items-center shrink-0">
              <Plus className="h-4 w-4 mr-2" /> Add Employee
            </button>
          </div>
        )}
      </div>

      {/* SEARCH AND SUBSIDIARY FILTER BAR */}
      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search personnel by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-11 pl-11 pr-4 rounded-xl border-none text-sm font-medium outline-none bg-transparent focus:ring-0 placeholder:text-slate-400" />
        </div>

        {/* Master Admin Subsidiary Filter */}
        {role === 'admin' && !activeWorkspace && (
          <div className="sm:w-64 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-2">
            <select
              value={filterCompanyId}
              onChange={(e) => setFilterCompanyId(e.target.value)}
              className="w-full h-11 rounded-xl bg-slate-50 border-none px-4 text-sm font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors focus:ring-4 focus:ring-blue-500/10 appearance-none"
              style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
            >
              <option value="all">Global (All Personnel)</option>
              {companies.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* --- GRID VIEW --- */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleEmployees.map(emp => {
            const { balanceDue } = getFinancials(emp.id);
            const isOwed = balanceDue > 0;
            
            return (
              <motion.div key={emp.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`bg-white rounded-3xl border shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden group ${isOwed ? 'border-amber-300 shadow-amber-100/50' : 'border-slate-100 hover:border-blue-200'}`}>
                
                <div className="absolute top-5 right-5">
                  {emp.access_level === 'admin' ? <span className="bg-slate-900 text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg flex items-center gap-1"><ShieldAlert className="h-3 w-3"/> Admin</span>
                  : emp.access_level === 'head' ? <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg">Director</span>
                  : <span className="bg-slate-50 text-slate-500 border border-slate-100 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg">Operator</span>}
                </div>

                <div className={`p-7 flex flex-col items-center text-center mt-4 border-b ${isOwed ? 'border-amber-50 bg-amber-50/10' : 'border-slate-50'}`}>
                  <div className={`h-20 w-20 rounded-full border-4 shadow-sm flex items-center justify-center text-2xl font-bold overflow-hidden mb-4 group-hover:scale-105 transition-transform ${isOwed ? 'border-amber-100 bg-amber-50 text-amber-500' : 'border-white bg-slate-50 text-slate-400'}`}>
                    {emp.profile_image_url && emp.profile_image_url.trim() !== "" ? <img src={emp.profile_image_url} alt="" className="h-full w-full object-cover" /> : (emp.name ? emp.name.charAt(0).toUpperCase() : 'U')}
                  </div>
                  <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">{emp.name}</h3>
                  <p className="text-[12px] font-medium text-slate-500 mt-1">{emp.role || 'Unassigned Role'}</p>
                  {role === 'admin' && !activeWorkspace && (
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3 flex items-center justify-center gap-1.5"><Building2 className="h-3 w-3" /> {companies.find(c => c.id === emp.company_id)?.name || 'Global'}</p>
                  )}
                </div>

                <div className="p-5 flex items-center justify-between bg-[#FAFCFF]">
                  <div>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${isOwed ? 'text-amber-500 flex items-center gap-1' : 'text-slate-400'}`}>
                      {isOwed && <AlertCircle className="h-3 w-3" />} Pending Payouts
                    </p>
                    <p className={`text-[15px] font-black ${isOwed ? 'text-amber-600' : 'text-slate-900'}`}>₹{balanceDue.toLocaleString()}</p>
                  </div>
                  {(role === 'admin' || role === 'head') && (
                    <div className="flex gap-2">
                      <button onClick={() => openLedger(emp)} className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-colors shadow-sm" title="View Financial Ledger"><Wallet className="h-4 w-4" /></button>
                      <button onClick={() => openEditEmployee(emp)} className="h-9 w-9 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm" title="Edit Data"><Edit3 className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* --- LIST VIEW --- */}
      {viewMode === 'list' && (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAFCFF] border-b border-slate-100">
                <tr>
                  <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Personnel Info</th>
                  <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Contact</th>
                  <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Access Level</th>
                  <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Balance Due</th>
                  {(role === 'admin' || role === 'head') && <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visibleEmployees.length === 0 ? (
                   <tr>
                     <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">No personnel found.</td>
                   </tr>
                ) : visibleEmployees.map((emp) => {
                  const { balanceDue } = getFinancials(emp.id);
                  const isOwed = balanceDue > 0;
                  
                  return (
                    <tr key={emp.id} className={`hover:bg-blue-50/30 transition-colors group ${isOwed ? 'bg-amber-50/10' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full border flex items-center justify-center text-[12px] font-bold overflow-hidden shadow-sm ${isOwed ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            {emp.profile_image_url && emp.profile_image_url.trim() !== "" ? <img src={emp.profile_image_url} alt="" className="h-full w-full object-cover" /> : (emp.name ? emp.name.charAt(0).toUpperCase() : 'U')}
                          </div>
                          <div>
                            <p className="font-bold text-[14px] text-slate-900 tracking-tight">{emp.name}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{emp.role || 'Unassigned Role'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[12px] text-slate-600 font-medium flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400"/> {emp.email}</p>
                        {emp.phone && <p className="text-[12px] text-slate-600 font-medium flex items-center gap-2 mt-1"><Phone className="h-3.5 w-3.5 text-slate-400"/> {emp.phone}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${emp.access_level === 'admin' ? 'bg-slate-900 text-white' : emp.access_level === 'head' ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                          {emp.access_level === 'head' ? 'Director' : emp.access_level === 'admin' ? 'Admin' : 'Operator'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                           <p className={`font-black text-[14px] ${isOwed ? 'text-amber-600' : 'text-slate-900'}`}>₹{balanceDue.toLocaleString()}</p>
                           {isOwed && <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-0.5 flex items-center gap-1"><AlertCircle className="h-3 w-3"/> Pending Payouts</p>}
                        </div>
                      </td>
                      {(role === 'admin' || role === 'head') && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openLedger(emp)} className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-100 transition-colors" title="View Financial Ledger"><Wallet className="h-4 w-4" /></button>
                            <button onClick={() => openEditEmployee(emp)} className="h-8 w-8 bg-white border border-slate-200 text-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-colors" title="Edit Data"><Edit3 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT MODAL --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
              
              <div className="px-8 pt-7 border-b border-slate-100 bg-[#FAFCFF] shrink-0">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">HR Record</span>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-1.5">{selectedEmployee ? 'Edit Personnel Data' : 'Register New Employee'}</h3>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="h-9 w-9 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-colors"><X className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 flex flex-col md:flex-row gap-10 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                <div className="md:w-64 flex flex-col items-center">
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                  <div className="relative group">
                    <div onClick={() => fileInputRef.current?.click()} className="h-40 w-40 rounded-full border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all overflow-hidden shadow-sm relative">
                      {displayImage ? <img src={displayImage} alt="Profile" className="h-full w-full object-cover" /> : <div className="flex flex-col items-center"><Camera className="h-6 w-6 mb-2 opacity-50" /><span className="text-[10px] font-bold uppercase tracking-widest">Photo</span></div>}
                    </div>
                    {displayImage && <button onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); setRemoveImage(true); }} className="absolute bottom-2 right-2 h-10 w-10 bg-white border border-slate-100 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50 shadow-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium text-center mt-5 px-4 leading-relaxed">Upload a clear, professional photo for the directory.</p>
                </div>

                <div className="flex-1 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Full Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-blue-500 shadow-sm" /></div>
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Email Address *</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none focus:border-blue-500 shadow-sm" /></div>
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Job Title</label><input type="text" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none focus:border-blue-500 shadow-sm" /></div>
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Contact Number</label><input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none focus:border-blue-500 shadow-sm" /></div>
                    
                    {role === 'admin' && !activeWorkspace && (
                      <div className="md:col-span-2 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-3 px-1">Network Assignment</label>
                        <select value={formData.company_id} onChange={(e) => setFormData({...formData, company_id: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none cursor-pointer">
                          <option value="">Global Administrator (No specific company)</option>
                          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}
                    
                    <div className="md:col-span-2 grid grid-cols-2 gap-5">
                      <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Access Level</label><select value={formData.access_level} onChange={(e) => setFormData({...formData, access_level: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none cursor-pointer"><option value="user">Operator (User)</option><option value="head">Director (Head)</option>{role === 'admin' && <option value="admin">Global Admin</option>}</select></div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">System Password {selectedEmployee ? '(Optional Edit)' : '*'}</label>
                        <input type="text" placeholder={selectedEmployee ? "Leave blank to keep current" : "Set initial password"} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none focus:border-blue-500 shadow-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-[#FAFCFF] flex justify-end items-center gap-4 shrink-0">
                {selectedEmployee && <button onClick={handleDeleteEmployee} disabled={isSaving} className="border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 rounded-xl h-12 px-5 shadow-sm mr-auto"><Trash2 className="h-4 w-4" /></button>}
                <button onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 bg-white h-12 px-8 font-bold text-sm text-slate-600 hover:bg-slate-50 shadow-sm">Cancel</button>
                <button onClick={handleSaveEmployee} disabled={isSaving} className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl h-12 px-10 font-bold text-sm shadow-md hover:shadow-lg transition-all">{isSaving ? "Processing..." : "Save Record"}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ENHANCED PERSONAL LEDGER MODAL WITH DIRECT PAYMENT FORM --- */}
      <AnimatePresence>
        {isLedgerOpen && ledgerEmployee && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-100">
              
              <div className="p-8 text-center bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 relative shrink-0">
                <button onClick={() => setIsLedgerOpen(false)} className="absolute top-6 right-6 h-8 w-8 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm"><X className="h-4 w-4" /></button>
                <div className="h-16 w-16 mx-auto bg-white rounded-full flex items-center justify-center mb-4 border border-slate-200 shadow-sm overflow-hidden text-xl font-bold text-slate-400">
                  {ledgerEmployee.profile_image_url ? <img src={ledgerEmployee.profile_image_url} className="h-full w-full object-cover"/> : (ledgerEmployee.name ? ledgerEmployee.name.charAt(0) : 'U')}
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">{ledgerEmployee.name}'s Ledger</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Financial History</p>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                {(() => {
                  const { totalAllocated, totalPaid, balanceDue, payments } = getFinancials(ledgerEmployee.id);
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                         <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-100">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lifetime Earned</p>
                            <p className="text-xl font-black text-slate-800">₹{totalAllocated.toLocaleString()}</p>
                         </div>
                         <div className="bg-emerald-50 rounded-2xl p-5 text-center border border-emerald-100">
                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Paid</p>
                            <p className="text-xl font-black text-emerald-700">₹{totalPaid.toLocaleString()}</p>
                         </div>
                         <div className={`rounded-2xl p-5 text-center border ${balanceDue > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                            <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${balanceDue > 0 ? 'text-amber-600' : 'text-slate-400'}`}>Balance Due</p>
                            <p className={`text-xl font-black ${balanceDue > 0 ? 'text-amber-600' : 'text-slate-400'}`}>₹{balanceDue.toLocaleString()}</p>
                         </div>
                      </div>

                      <div>
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Recent Transactions</h4>
                        <div className="space-y-3">
                           {payments.length === 0 ? <p className="text-sm italic text-slate-400 text-center py-4">No payments recorded yet.</p> : 
                            payments.sort((a,b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()).map(p => (
                              <div key={p.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 group">
                                 <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="h-4 w-4" /></div>
                                    <div>
                                      <p className="text-[13px] font-bold text-slate-900">{p.project_id ? projects.find(proj => proj.id === p.project_id)?.name : 'General / Misc Payment'}</p>
                                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : 'N/A'} • {p.payment_type} {p.notes && `• Ref: ${p.notes}`}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <p className="text-[15px] font-black text-emerald-600">+ ₹{parseFloat(p.amount || 0).toLocaleString()}</p>
                                    {(role === 'admin' || role === 'head') && (
                                       <button onClick={() => handleDeletePaymentRecord(p.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:text-rose-600 bg-rose-50 p-1.5 rounded-lg" title="Delete Payment">
                                          <Trash2 className="h-4 w-4" />
                                       </button>
                                    )}
                                 </div>
                              </div>
                           ))}
                        </div>
                      </div>

                      {/* --- Issue Payout Form Component --- */}
                      {(role === 'admin' || role === 'head') && (
                         <div className="mt-8 border-t border-slate-100 pt-8">
                            {!showEmpPaymentForm ? (
                               <button onClick={() => setShowEmpPaymentForm(true)} className="w-full bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 font-bold text-xs px-4 py-3 rounded-xl flex items-center justify-center transition-all">
                                  <Plus className="h-4 w-4 mr-1.5" /> Issue General Advance / Payout
                               </button>
                            ) : (
                               <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6">
                                  <h4 className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest mb-4">Record New Transaction</h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                                     <div>
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Amount (₹) *</label>
                                        <input type="number" value={empPaymentForm.amount} onChange={e=>setEmpPaymentForm({...empPaymentForm, amount: parseFloat(e.target.value)||0})} className="w-full h-11 border border-emerald-200 rounded-xl px-3 outline-none focus:border-emerald-500 font-black text-emerald-700 bg-white" />
                                     </div>
                                     <div>
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Date</label>
                                        <input type="date" value={empPaymentForm.payment_date} onChange={e=>setEmpPaymentForm({...empPaymentForm, payment_date: e.target.value})} className="w-full h-11 border border-emerald-200 rounded-xl px-3 outline-none focus:border-emerald-500 font-medium text-sm bg-white" />
                                     </div>
                                     <div>
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Type</label>
                                        <select value={empPaymentForm.payment_type} onChange={e=>setEmpPaymentForm({...empPaymentForm, payment_type: e.target.value})} className="w-full h-11 border border-emerald-200 rounded-xl px-3 outline-none focus:border-emerald-500 font-bold text-sm bg-white cursor-pointer"><option>Advance</option><option>Final Payout</option><option>Incentive / Bonus</option><option>General Reimbursement</option></select>
                                     </div>
                                     <div>
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Link Project (Optional)</label>
                                        <select value={empPaymentForm.project_id} onChange={e=>setEmpPaymentForm({...empPaymentForm, project_id: e.target.value})} className="w-full h-11 border border-emerald-200 rounded-xl px-3 outline-none focus:border-emerald-500 font-medium text-sm bg-white cursor-pointer"><option value="">-- General Payment --</option>{projects.filter(p=>p.company_id === ledgerEmployee.company_id || role === 'admin').map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
                                     </div>
                                     <div className="sm:col-span-2">
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Notes / Ref (Optional)</label>
                                        <input type="text" placeholder="Bank ref, details..." value={empPaymentForm.notes} onChange={e=>setEmpPaymentForm({...empPaymentForm, notes: e.target.value})} className="w-full h-11 border border-emerald-200 rounded-xl px-3 outline-none focus:border-emerald-500 font-medium text-sm bg-white" />
                                     </div>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                     <button onClick={() => setShowEmpPaymentForm(false)} className="h-10 px-5 text-xs font-bold text-slate-500 hover:bg-white rounded-xl border border-slate-200 transition-colors">Cancel</button>
                                     <button onClick={handleRecordEmployeePayment} disabled={isSaving} className="h-10 px-8 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-lg hover:-translate-y-0.5 rounded-xl shadow-md transition-all">{isSaving ? 'Processing...' : 'Authorize Payment'}</button>
                                  </div>
                               </div>
                            )}
                         </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}