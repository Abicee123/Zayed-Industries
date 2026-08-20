import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Mail, Phone, Building2, Edit3, Trash2, X, Camera, Wallet, LayoutGrid, List, ShieldAlert } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";
import { supabase } from "../../supabase";

export default function EmployeesPage() {
  const { role, activeWorkspace, companyId } = useAuthStore();
  const { employees, companies, fetchAllData } = useDataStore();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [salaryAmount, setSalaryAmount] = useState<number>(0);
  const [isPaying, setIsPaying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false); // NEW STATE FOR DELETION

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", role: "", access_level: "user", company_id: "", salary: 0, password: ""
  });

  const currentCompanyId = role === 'admin' ? (activeWorkspace || "") : companyId;

  const visibleEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || (emp.email && emp.email.toLowerCase().includes(searchQuery.toLowerCase()));
    if (role === 'admin' && !activeWorkspace) return matchesSearch;
    return matchesSearch && (emp.company_id === currentCompanyId || emp.access_level === 'admin');
  }).sort((a, b) => a.name.localeCompare(b.name));

  const openNewEmployee = () => {
    setSelectedEmployee(null);
    setFormData({ name: "", email: "", phone: "", role: "", access_level: "user", company_id: currentCompanyId?.toString() || "", salary: 0, password: "password123" });
    setImageFile(null); 
    setImagePreview(null);
    setRemoveImage(false);
    setIsModalOpen(true);
  };

  const openEditEmployee = (emp: any) => {
    setSelectedEmployee(emp);
    setFormData({
      name: emp.name || "", email: emp.email || "", phone: emp.phone || "", role: emp.role || "", 
      access_level: emp.access_level || "user", company_id: emp.company_id?.toString() || "", salary: emp.salary || 0, password: ""
    });
    setImageFile(null); 
    setImagePreview(null);
    setRemoveImage(false);
    setIsModalOpen(true);
  };

  const openSalaryModal = (emp: any) => {
    setSelectedEmployee(emp);
    setSalaryAmount(emp.salary || 0);
    setIsSalaryModalOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setRemoveImage(false);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
  };

  const handleSaveEmployee = async () => {
    if (!formData.name.trim() || !formData.email.trim()) return alert("Name and Email are required.");
    if (role === 'admin' && !activeWorkspace && !formData.company_id && formData.access_level !== 'admin') {
      return alert("Please select a company for this employee.");
    }

    setIsSaving(true);
    let finalImageUrl = selectedEmployee?.profile_image_url || null;
    
    // Wipe the URL if the user explicitly removed the image
    if (removeImage) finalImageUrl = null;

    try {
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, imageFile);
        
        if (uploadError) {
          alert(`Image upload failed! Have you created a public storage bucket named 'avatars' in Supabase? Error: ${uploadError.message}`);
          setIsSaving(false);
          return;
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        finalImageUrl = data.publicUrl;
      }

      const payload = {
        name: formData.name, email: formData.email, phone: formData.phone, role: formData.role,
        access_level: formData.access_level, company_id: formData.company_id ? parseInt(formData.company_id) : null,
        salary: formData.salary, profile_image_url: finalImageUrl
      };

      if (!selectedEmployee) {
        const { error } = await supabase.from('employees').insert([{ ...payload, password: formData.password || 'password123' }]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('employees').update(payload).eq('id', selectedEmployee.id);
        if (error) throw error;
      }
      
      await fetchAllData();
      setIsModalOpen(false);
    } catch (error: any) { alert(`Error saving record: ${error.message}`); } finally { setIsSaving(false); }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;
    if (!window.confirm(`Are you absolutely sure you want to remove ${selectedEmployee.name} from the system?`)) return;
    setIsSaving(true);
    try {
      await supabase.from('employees').delete().eq('id', selectedEmployee.id);
      await fetchAllData();
      setIsModalOpen(false);
    } catch (error: any) { alert(`Error deleting: ${error.message}`); } finally { setIsSaving(false); }
  };

  const handleProcessSalary = async () => {
    if (!selectedEmployee || salaryAmount <= 0) return alert("Enter a valid amount.");
    setIsPaying(true);
    try {
      const { error } = await supabase.from('salary_payments').insert([{
        employee_id: selectedEmployee.id,
        company_id: selectedEmployee.company_id,
        amount: salaryAmount,
        payment_date: new Date().toISOString().split('T')[0]
      }]);
      if (error) throw error;
      await fetchAllData();
      alert(`Successfully processed ₹${salaryAmount.toLocaleString()} for ${selectedEmployee.name}.`);
      setIsSalaryModalOpen(false);
    } catch (error: any) { alert(`Error processing payroll: ${error.message}`); } finally { setIsPaying(false); }
  };

  // Safely display the image unless it was explicitly removed
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

      {/* SEARCH BAR */}
      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search personnel by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-11 pl-11 pr-4 rounded-xl border-none text-sm font-medium outline-none bg-transparent focus:ring-0 placeholder:text-slate-400" />
        </div>
      </div>

      {/* --- GRID VIEW --- */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleEmployees.length === 0 && <div className="col-span-full h-48 border border-slate-200 border-dashed rounded-3xl flex items-center justify-center text-slate-400 bg-slate-50/50"><p className="text-[11px] font-bold uppercase tracking-widest">No personnel found</p></div>}
          {visibleEmployees.map(emp => (
            <motion.div key={emp.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col relative overflow-hidden group">
              
              <div className="absolute top-5 right-5">
                {emp.access_level === 'admin' ? (
                  <span className="bg-slate-900 text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg flex items-center gap-1"><ShieldAlert className="h-3 w-3"/> Admin</span>
                ) : emp.access_level === 'head' ? (
                  <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg">Director</span>
                ) : (
                  <span className="bg-slate-50 text-slate-500 border border-slate-100 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg">Operator</span>
                )}
              </div>

              <div className="p-7 flex flex-col items-center text-center mt-4 border-b border-slate-50">
                <div className="h-20 w-20 rounded-full bg-slate-50 border-4 border-white shadow-sm flex items-center justify-center text-2xl font-bold text-slate-400 overflow-hidden mb-4 group-hover:scale-105 transition-transform">
                  {emp.profile_image_url && emp.profile_image_url.trim() !== "" ? <img src={emp.profile_image_url} alt="" className="h-full w-full object-cover" /> : emp.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">{emp.name}</h3>
                <p className="text-[12px] font-medium text-blue-600 mt-1">{emp.role || 'Unassigned Role'}</p>
                {role === 'admin' && !activeWorkspace && (
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3 flex items-center justify-center gap-1.5"><Building2 className="h-3 w-3" /> {companies.find(c => c.id === emp.company_id)?.name || 'Global'}</p>
                )}
              </div>

              <div className="p-5 flex items-center justify-between bg-[#FAFCFF]">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Base Salary</p>
                  <p className="text-[14px] font-bold text-slate-900">₹{(emp.salary || 0).toLocaleString()}</p>
                </div>
                {(role === 'admin' || role === 'head') && (
                  <div className="flex gap-2">
                    <button onClick={() => openSalaryModal(emp)} className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-700 transition-colors shadow-sm" title="Disburse Payroll"><Wallet className="h-4 w-4" /></button>
                    <button onClick={() => openEditEmployee(emp)} className="h-9 w-9 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm" title="Edit Data"><Edit3 className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
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
                  <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Salary</th>
                  {(role === 'admin' || role === 'head') && <th className="px-6 py-5 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visibleEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-[12px] font-bold text-slate-600 overflow-hidden shadow-sm">
                          {emp.profile_image_url && emp.profile_image_url.trim() !== "" ? <img src={emp.profile_image_url} alt="" className="h-full w-full object-cover" /> : emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[14px] text-slate-900 tracking-tight">{emp.name}</p>
                          <p className="text-[11px] text-blue-600 font-medium">{emp.role}</p>
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
                      <p className="font-bold text-[14px] text-slate-900">₹{(emp.salary || 0).toLocaleString()}</p>
                    </td>
                    {(role === 'admin' || role === 'head') && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openSalaryModal(emp)} className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-700 transition-colors" title="Disburse Payroll"><Wallet className="h-4 w-4" /></button>
                          <button onClick={() => openEditEmployee(emp)} className="h-8 w-8 bg-white border border-slate-200 text-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-colors" title="Edit Data"><Edit3 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT EMPLOYEE MODAL --- */}
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
                
                {/* Photo Upload Side */}
                <div className="md:w-64 flex flex-col items-center">
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                  <div className="relative group">
                    <div onClick={() => fileInputRef.current?.click()} className="h-40 w-40 rounded-full border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all overflow-hidden shadow-sm relative">
                      {displayImage ? (
                        <img src={displayImage} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center"><Camera className="h-6 w-6 mb-2 opacity-50" /><span className="text-[10px] font-bold uppercase tracking-widest">Photo</span></div>
                      )}
                    </div>
                    {/* TRASH ICON TO REMOVE PHOTO */}
                    {displayImage && (
                      <button 
                        onClick={handleRemoveImage}
                        className="absolute bottom-2 right-2 h-10 w-10 bg-white border border-slate-100 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:text-rose-600 shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                        title="Remove Photo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium text-center mt-5 px-4 leading-relaxed">Upload a clear, professional photo for the company directory.</p>
                </div>

                {/* Form Side */}
                <div className="flex-1 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Full Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" /></div>
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Email Address *</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" /></div>
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Job Title</label><input type="text" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" /></div>
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Contact Number</label><input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" /></div>
                    
                    {role === 'admin' && !activeWorkspace && (
                      <div className="md:col-span-2 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-3 px-1">Network Assignment</label>
                        <select value={formData.company_id} onChange={(e) => setFormData({...formData, company_id: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm cursor-pointer transition-all">
                          <option value="">Global Administrator (No specific company)</option>
                          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}
                    
                    <div className="md:col-span-2 grid grid-cols-2 gap-5">
                      <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Access Level</label><select value={formData.access_level} onChange={(e) => setFormData({...formData, access_level: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm cursor-pointer transition-all"><option value="user">Operator (User)</option><option value="head">Director (Head)</option>{role === 'admin' && <option value="admin">Global Admin</option>}</select></div>
                      <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Base Salary (₹)</label><input type="number" value={formData.salary} onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value) || 0})} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-emerald-600 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm" /></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-[#FAFCFF] flex justify-end items-center gap-4 shrink-0">
                {selectedEmployee && (
                  <button onClick={handleDeleteEmployee} disabled={isSaving} className="border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 rounded-xl h-12 px-5 flex items-center justify-center shadow-sm mr-auto transition-colors"><Trash2 className="h-4 w-4" /></button>
                )}
                <button onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 bg-white h-12 px-8 font-bold text-sm text-slate-600 hover:bg-slate-50 shadow-sm transition-colors">Cancel</button>
                <button onClick={handleSaveEmployee} disabled={isSaving} className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl h-12 px-10 font-bold text-sm shadow-md shadow-blue-900/20 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  {isSaving ? "Processing..." : "Save Record"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- SALARY DISBURSEMENT MODAL --- */}
      <AnimatePresence>
        {isSalaryModalOpen && selectedEmployee && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
              
              <div className="p-8 text-center bg-gradient-to-b from-[#FAFCFF] to-white border-b border-slate-100 relative">
                <button onClick={() => setIsSalaryModalOpen(false)} className="absolute top-6 right-6 h-8 w-8 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm"><X className="h-4 w-4" /></button>
                <div className="h-16 w-16 mx-auto bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100"><Wallet className="h-7 w-7 text-emerald-500" /></div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Process Payroll</h3>
                <p className="text-[13px] text-slate-500 mt-1">Disbursing funds to <strong className="text-slate-700">{selectedEmployee.name}</strong></p>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1 text-center">Amount to Disburse (₹)</label>
                  <input type="number" value={salaryAmount} onChange={(e) => setSalaryAmount(parseFloat(e.target.value) || 0)} className="w-full h-16 rounded-2xl border border-emerald-200 bg-emerald-50/30 px-6 text-3xl font-black text-center text-emerald-600 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all" />
                </div>
                <button onClick={handleProcessSalary} disabled={isPaying} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl h-14 font-bold text-[15px] shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  {isPaying ? "Authorizing Transfer..." : "Confirm Disbursement"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}