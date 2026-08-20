import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Plus, MoreHorizontal, Building2, Shield, UserCircle, 
  Mail, Briefcase, Camera, X, AlertTriangle, Trash2, Banknote, 
  CheckCircle2, Clock, CalendarDays, Receipt 
} from "lucide-react";
import { useDataStore } from "../../store/dataStore";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../../components/ui/button";
import { supabase, supabaseUrl, supabaseKey } from "../../supabase";
import { createClient } from "@supabase/supabase-js";

export default function EmployeesPage() {
  const { employees, companies, fetchAllData } = useDataStore();
  const { role } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<"directory" | "payroll">("directory");

  // Personnel UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // Form & Upload States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "", email: "", password: "", access_level: "user", company_id: "", department: "", salary: 0
  });

  // Payroll States
  const [selectedMonth, setSelectedMonth] = useState("August 2026");
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [payrollFormData, setPayrollFormData] = useState({ amountPaid: 0, paymentDate: "" });
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);

  useEffect(() => {
    if (activeTab === "payroll") {
      fetchPayrollRecords();
    }
  }, [activeTab, selectedMonth]);

  const fetchPayrollRecords = async () => {
    const { data } = await supabase.from('salary_payments').select('*').eq('payment_month', selectedMonth);
    setPayrollRecords(data || []);
  };

  if (role === 'user') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Shield className="h-12 w-12 text-rose-500 mb-4 opacity-50" />
        <h2 className="text-xl font-semibold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 mt-2">You do not have clearance to view the personnel directory.</p>
      </div>
    );
  }

  const filteredEmployees = employees.filter(emp => 
    emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCompanyName = (companyId: number) => {
    return companies.find(c => c.id === companyId)?.name || "Unknown";
  };

  // --- PERSONNEL MODAL FUNCTIONS ---
  const openAddModal = () => {
    setModalMode("add"); setSelectedEmployee(null); setImageFile(null); setImagePreview(null); setRemoveImage(false);
    setFormData({ name: "", email: "", password: "", access_level: "user", company_id: "", department: "", salary: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (employee: any) => {
    setModalMode("edit"); setSelectedEmployee(employee); setImageFile(null); setImagePreview(null); setRemoveImage(false);
    setFormData({ 
      name: employee.name || "", email: employee.email || "", password: "", 
      access_level: employee.access_level || "user", company_id: employee.company_id || "",
      department: employee.department || "", salary: employee.salary || 0
    });
    setIsModalOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]); setImagePreview(URL.createObjectURL(e.target.files[0])); setRemoveImage(false);
    }
  };

  const handleRemovePhoto = () => { setImageFile(null); setImagePreview(null); setRemoveImage(true); };

  const handleSave = async () => {
    if (!formData.email || !formData.name) return alert("Please fill in the Name and Email fields.");
    setIsSaving(true);
    let avatarUrl = selectedEmployee?.profile_image_url || null;

    try {
      if (imageFile) {
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${imageFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, imageFile);
        if (!uploadError) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
          avatarUrl = data.publicUrl;
        } else { alert(`Image Upload Error: ${uploadError.message}`); setIsSaving(false); return; }
      } else if (removeImage) avatarUrl = null;

      if (modalMode === 'add' && formData.password) {
        if (!supabaseUrl || !supabaseKey) return alert("CRITICAL ERROR: Cannot find Supabase Credentials.");
        const secondarySupabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
        const { error: authError } = await secondarySupabase.auth.signUp({ email: formData.email, password: formData.password });
        if (authError) { alert(`Authentication Error: ${authError.message}`); setIsSaving(false); return; }
      }

      const employeeData = {
        name: formData.name, email: formData.email, access_level: formData.access_level,
        company_id: formData.company_id ? parseInt(formData.company_id) : null,
        department: formData.department, salary: formData.salary, profile_image_url: avatarUrl
      };

      if (modalMode === 'add') {
        const { error: dbError } = await supabase.from('employees').insert([employeeData]);
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase.from('employees').update(employeeData).eq('id', selectedEmployee.id);
        if (dbError) throw dbError;
      }

      await fetchAllData(); setIsModalOpen(false);
    } catch (error: any) { alert(`System Error: ${error.message}`); } finally { setIsSaving(false); }
  };

  const triggerDelete = () => { setIsModalOpen(false); setIsDeleteModalOpen(true); };
  const confirmDelete = async () => {
    setIsSaving(true); await supabase.from('employees').delete().eq('id', selectedEmployee.id);
    await fetchAllData(); setIsDeleteModalOpen(false); setIsSaving(false);
  };

  // --- THE MATH & PAYROLL ENGINE ---
  const getPaidAmount = (employeeId: number) => {
    const records = payrollRecords.filter(r => r.employee_id === employeeId);
    return records.reduce((sum, record) => sum + Number(record.amount), 0);
  };

  const openPayrollModal = (employee: any) => {
    const totalPaid = getPaidAmount(employee.id);
    const remainingDue = (employee.salary || 0) - totalPaid;
    
    setSelectedEmployee(employee);
    setPayrollFormData({
      amountPaid: remainingDue > 0 ? remainingDue : 0,
      paymentDate: new Date().toISOString().split('T')[0] // Defaults to Today's Date
    });
    setIsPayrollModalOpen(true);
  };

  const executePayment = async () => {
    if (payrollFormData.amountPaid <= 0) return alert("Please enter a valid amount.");
    setIsProcessingPayroll(true);

    try {
      const amount = payrollFormData.amountPaid;
      const totalPaidAlready = getPaidAmount(selectedEmployee.id);
      const newTotal = totalPaidAlready + amount;
      const finalStatus = newTotal >= (selectedEmployee.salary || 0) ? 'Paid' : 'Partial';

      // 1. Log the customized paycheck
      const { error: payrollError } = await supabase.from('salary_payments').insert([{
        employee_id: selectedEmployee.id,
        company_id: selectedEmployee.company_id,
        amount: amount,
        payment_month: selectedMonth,
        payment_date: payrollFormData.paymentDate,
        status: finalStatus
      }]);
      if (payrollError) throw payrollError;

      // 2. Automatically generate a matching Expense Invoice
      const { error: invoiceError } = await supabase.from('invoices').insert([{
        company_id: selectedEmployee.company_id,
        amount: amount,
        status: 'Paid',
      }]);
      if (invoiceError) console.warn("Invoice log failed:", invoiceError.message);

      await fetchPayrollRecords();
      await fetchAllData();
      setIsPayrollModalOpen(false);
    } catch (error: any) {
      alert(`Payroll Error: ${error.message}`);
    } finally {
      setIsProcessingPayroll(false);
    }
  };

  return (
    <div className="space-y-6 pb-8 h-full flex flex-col relative">
      
      {/* HEADER & TABS */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Personnel Management</h1>
          <div className="flex gap-4 mt-4 border-b border-slate-200">
            <button onClick={() => setActiveTab('directory')} className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'directory' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
              Profile Directory
              {activeTab === 'directory' && <motion.div layoutId="activeTab" className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-slate-900" />}
            </button>
            <button onClick={() => setActiveTab('payroll')} className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'payroll' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
              Payroll & Compensation
              {activeTab === 'payroll' && <motion.div layoutId="activeTab" className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-slate-900" />}
            </button>
          </div>
        </div>
        {(role === 'admin' || role === 'head') && activeTab === 'directory' && (
          <Button onClick={openAddModal} className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-10 px-4 text-sm shadow-sm flex items-center gap-2 transition-all"><Plus className="h-4 w-4" /> Add Employee</Button>
        )}
      </div>

      {/* --- VIEW 1: DIRECTORY --- */}
      {activeTab === 'directory' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col gap-6">
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200/60 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search personnel by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-xl border-none text-sm outline-none bg-transparent focus:ring-0 placeholder:text-slate-400" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pb-4">
            {filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-white border border-slate-200/60 rounded-2xl shadow-sm text-center">
                <UserCircle className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No personnel found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredEmployees.map((employee, index) => (
                  <motion.div key={employee.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="bg-white rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 overflow-hidden relative group flex flex-col">
                    <button onClick={() => openEditModal(employee)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors z-10"><MoreHorizontal className="h-5 w-5" /></button>
                    <div className="flex flex-col items-center pt-8 pb-6 px-6 text-center">
                      <div className="h-24 w-24 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 font-bold text-2xl overflow-hidden border-4 border-white shadow-sm ring-1 ring-slate-100 mb-4">
                        {employee.profile_image_url ? <img src={employee.profile_image_url} alt={employee.name} className="h-full w-full object-cover" /> : (employee.name ? employee.name.charAt(0).toUpperCase() : <UserCircle className="h-10 w-10 opacity-50" />)}
                      </div>
                      <h3 className="font-semibold text-slate-900 text-lg truncate w-full">{employee.name || "Unnamed"}</h3>
                      <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1 truncate w-full justify-center"><Mail className="h-3.5 w-3.5 shrink-0" /> {employee.email}</p>
                    </div>
                    <div className="mt-auto bg-slate-50/50 border-t border-slate-100 p-5 space-y-3">
                      <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Access</span><span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold capitalize tracking-wide ${employee.access_level === 'admin' ? 'bg-indigo-100 text-indigo-700' : employee.access_level === 'head' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>{employee.access_level === 'head' ? 'Company Head' : employee.access_level}</span></div>
                      <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Node</span><div className="flex items-center gap-1.5 text-slate-700 text-sm font-medium"><Building2 className="h-3.5 w-3.5 text-slate-400" /><span className="truncate max-w-[120px]">{getCompanyName(employee.company_id)}</span></div></div>
                      <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Salary</span><div className="flex items-center gap-1.5 text-slate-700 text-sm font-medium"><Banknote className="h-3.5 w-3.5 text-slate-400" /><span className="truncate max-w-[120px]">₹{employee.salary || 0}</span></div></div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* --- VIEW 2: PAYROLL WINDOW --- */}
      {activeTab === 'payroll' && (
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col gap-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-slate-400" />
              <span className="font-semibold text-slate-700">Payment Cycle:</span>
            </div>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all cursor-pointer">
              <option value="July 2026">July 2026</option>
              <option value="August 2026">August 2026 (Current)</option>
              <option value="September 2026">September 2026</option>
            </select>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Subsidiary</th>
                    <th className="px-6 py-4">Base Salary</th>
                    <th className="px-6 py-4">Amount Due</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((employee, index) => {
                    const baseSalary = employee.salary || 0;
                    const totalPaid = getPaidAmount(employee.id);
                    const remainingDue = baseSalary - totalPaid;
                    const isFullyPaid = remainingDue <= 0 && baseSalary > 0;
                    const isPartial = totalPaid > 0 && remainingDue > 0;

                    return (
                      <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} key={employee.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                              {employee.profile_image_url ? <img src={employee.profile_image_url} alt="Profile" className="h-full w-full object-cover" /> : <UserCircle className="h-full w-full text-slate-400 opacity-50 p-1" />}
                            </div>
                            <span className="font-medium text-slate-900">{employee.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-700">{getCompanyName(employee.company_id)}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">₹{baseSalary}</td>
                        <td className="px-6 py-4 font-medium text-rose-600">₹{remainingDue > 0 ? remainingDue : 0}</td>
                        <td className="px-6 py-4">
                          {isFullyPaid ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Paid</span>
                          ) : isPartial ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700"><Receipt className="h-3.5 w-3.5" /> Partial</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700"><Clock className="h-3.5 w-3.5" /> Overdue</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            onClick={() => openPayrollModal(employee)} 
                            disabled={isFullyPaid || isProcessingPayroll}
                            variant={isFullyPaid ? "outline" : "default"}
                            className={`h-9 px-4 text-xs font-medium rounded-lg ${!isFullyPaid ? 'bg-slate-900 text-white hover:bg-slate-800' : 'opacity-50 cursor-not-allowed'}`}
                          >
                            {isFullyPaid ? 'Cleared' : 'Process Payment'}
                          </Button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* --- ADD/EDIT PERSONNEL MODAL --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/60">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-semibold text-slate-900">{modalMode === 'add' ? 'Add New Personnel' : 'Edit Personnel Profile'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-1 rounded-md hover:bg-slate-200/50"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex flex-col items-center justify-center">
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                  <div onClick={() => fileInputRef.current?.click()} className="relative group cursor-pointer">
                    <div className="h-24 w-24 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 group-hover:border-slate-500 group-hover:bg-slate-100 transition-all overflow-hidden">
                      {imagePreview || (selectedEmployee?.profile_image_url && !removeImage) ? <img src={imagePreview || selectedEmployee.profile_image_url} alt="Preview" className="h-full w-full object-cover" /> : <Camera className="h-8 w-8 mb-1 opacity-50" />}
                    </div>
                    <div className="absolute inset-0 bg-slate-900/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><span className="text-white text-xs font-medium">Upload</span></div>
                  </div>
                  {(imagePreview || (selectedEmployee?.profile_image_url && !removeImage)) && (
                    <button type="button" onClick={handleRemovePhoto} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors bg-rose-50 px-3 py-1.5 rounded-full"><Trash2 className="h-3.5 w-3.5" /> Remove Photo</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1 space-y-1.5"><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Full Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" /></div>
                  <div className="col-span-2 sm:col-span-1 space-y-1.5"><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Role Level</label><select value={formData.access_level} onChange={(e) => setFormData({...formData, access_level: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all"><option value="user">Employee (User)</option>{role === 'admin' && <option value="head">Company Head</option>}{role === 'admin' && <option value="admin">System Admin</option>}</select></div>
                  <div className="col-span-2 sm:col-span-1 space-y-1.5"><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Email Address</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" /></div>
                  <div className="col-span-2 sm:col-span-1 space-y-1.5"><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Subsidiary</label><select value={formData.company_id} onChange={(e) => setFormData({...formData, company_id: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all"><option value="" disabled>Select a company...</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div className="col-span-2 space-y-1.5 border-t border-slate-100 pt-2"><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Base Salary (₹)</label><input type="number" value={formData.salary} onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value) || 0})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" /></div>
                  {modalMode === 'add' && (<div className="col-span-2 space-y-1.5"><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">System Password</label><input type="text" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all" /></div>)}
                </div>
              </div>
              <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-slate-50/50">
                {modalMode === 'edit' && role === 'admin' ? <button onClick={triggerDelete} type="button" className="text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors">Delete Employee</button> : <div></div>}
                <div className="flex gap-3"><Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl h-10 px-4 text-sm font-medium">Cancel</Button><Button onClick={handleSave} disabled={isSaving} className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-10 px-6 text-sm font-medium shadow-sm">{isSaving ? "Processing..." : 'Save Changes'}</Button></div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- NEW: PROCESS PAYMENT MODAL (FIXED BUTTON WIDTHS) --- */}
      <AnimatePresence>
        {isPayrollModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200/60 p-6">
              
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Process Payment</h3>
                <button onClick={() => setIsPayrollModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X className="h-5 w-5" /></button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Employee</span>
                  <span className="font-semibold text-slate-900">{selectedEmployee?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Salary</span>
                  <span className="font-semibold text-slate-900">₹{selectedEmployee?.salary || 0}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Already Paid ({selectedMonth})</span>
                  <span className="font-semibold text-emerald-600">₹{getPaidAmount(selectedEmployee?.id)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Payment Date</label>
                  <input 
                    type="date" 
                    value={payrollFormData.paymentDate}
                    onChange={(e) => setPayrollFormData({...payrollFormData, paymentDate: e.target.value})}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Amount Paying Now (₹)</label>
                  <input 
                    type="number" 
                    value={payrollFormData.amountPaid}
                    onChange={(e) => setPayrollFormData({...payrollFormData, amountPaid: parseFloat(e.target.value) || 0})}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xl font-bold text-slate-900 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all"
                  />
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining Due After</span>
                  <span className="text-sm font-bold text-rose-600">
                    ₹{Math.max(0, (selectedEmployee?.salary || 0) - getPaidAmount(selectedEmployee?.id) - payrollFormData.amountPaid)}
                  </span>
                </div>
              </div>

              {/* FIXED: Changed to flex-1 so they perfectly split the space evenly */}
              <div className="flex gap-3 mt-8">
                <Button variant="outline" onClick={() => setIsPayrollModalOpen(false)} className="flex-1 rounded-xl h-11 font-medium">Cancel</Button>
                <Button onClick={executePayment} disabled={isProcessingPayroll} className="flex-1 bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-11 font-medium shadow-sm">
                  {isProcessingPayroll ? "Processing..." : "Confirm"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200/60 p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-rose-100 mb-6"><AlertTriangle className="h-8 w-8 text-rose-600" /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Personnel?</h3>
              <p className="text-slate-500 text-sm mb-8">Are you sure you want to permanently remove <span className="font-semibold text-slate-800">{selectedEmployee?.name}</span>?</p>
              <div className="flex flex-col gap-3"><Button onClick={confirmDelete} disabled={isSaving} className="w-full bg-rose-600 text-white hover:bg-rose-700 rounded-xl h-12 font-medium text-base shadow-sm">{isSaving ? "Deleting..." : "Yes, Delete Employee"}</Button><Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isSaving} className="w-full rounded-xl h-12 font-medium text-base">Cancel</Button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}