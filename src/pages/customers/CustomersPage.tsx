import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Search, Plus, X, Building2, Phone, Briefcase, FileText, Trash2, UserSquare2, AlertCircle, Edit3, ImagePlus, Loader2, CheckCircle2, GraduationCap, BookOpen, User, Download, Printer, MapPin, Mail, Award, TrendingUp, CreditCard } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";
import { supabase } from "../../supabase";

// --- NATIVE IMAGE COMPRESSION ENGINE ---
const compressImage = async (file: File, maxWidth = 400, quality = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg', lastModified: Date.now() }));
          } else {
            reject(new Error('Compression failed'));
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function CustomersPage() {
  const navigate = useNavigate();
  const { role, activeWorkspace, companyId } = useAuthStore();
  const { customers, companies, projects, invoices, fetchAllData } = useDataStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState<string>("all");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  // NEW TABS: "overview" (Dashboard style), "ledger" (Finance), "settings" (Edit Form)
  const [modalTab, setModalTab] = useState<"overview" | "ledger" | "settings">("overview");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  
  const [saveStatus, setSaveStatus] = useState<"idle" | "compressing" | "uploading" | "saving">("idle");
  const [isSuccess, setIsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const currentCompanyId = role === 'admin' ? (activeWorkspace || "") : companyId;
  const currentCompany = companies.find((c: any) => c.id?.toString() === currentCompanyId?.toString());
  
  // --- DYNAMIC ACCESS & TERMINOLOGY CHECKS ---
  const canViewFinance = role === 'admin' || (role === 'head' && currentCompany?.allow_head_finance !== false);
  const isAcademy = currentCompany?.business_type === 'academy' || currentCompany?.business_type?.includes('education');

  // --- PDF REPORT STATES ---
  const [isReportConfigOpen, setIsReportConfigOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [reportConfig, setReportConfig] = useState({
    courseId: "all",
    showPhone: true,
    showEmail: true,
    showAddress: false,
    showCourse: true,
    showFinancials: canViewFinance
  });

  const [formData, setFormData] = useState({
    company_id: currentCompanyId?.toString() || "", 
    name: "", 
    contact_person: "", 
    email: "", 
    phone: "", 
    address: ""
  });

  const hasUnsavedChanges = 
    formData.name.trim() !== (selectedCustomer?.name || "").trim() ||
    formData.contact_person.trim() !== (selectedCustomer?.contact_person || "").trim() ||
    formData.email.trim() !== (selectedCustomer?.email || "").trim() ||
    formData.phone.trim() !== (selectedCustomer?.phone || "").trim() ||
    formData.address.trim() !== (selectedCustomer?.address || "").trim() ||
    formData.company_id !== (selectedCustomer?.company_id?.toString() || (currentCompanyId?.toString() || "")) ||
    imageFile !== null ||
    removeImage;

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
    setImageFile(null); setImagePreview(null); setRemoveImage(false); 
    setModalTab("settings"); // Default to settings for new entry
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
    setImageFile(null); setImagePreview(customer.profile_image_url || null); setRemoveImage(false); 
    setModalTab("overview");
    setIsModalOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) { 
      setImageFile(e.target.files[0]); 
      setImagePreview(URL.createObjectURL(e.target.files[0])); 
      setRemoveImage(false); 
    }
  };

  const handleRemovePhoto = () => { 
    setImageFile(null); 
    setImagePreview(null); 
    setRemoveImage(true); 
  };

  const deleteOldAvatar = async (url: string | null) => {
    if (!url) return;
    try {
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      if (fileName) await supabase.storage.from('avatars').remove([fileName]);
    } catch (e) {
      console.warn("Could not delete old image.");
    }
  };

  const handleSaveCustomer = async () => {
    if (!formData.name.trim()) return alert(isAcademy ? "Student Name is required." : "Company/Client Name is required.");
    if (role === 'admin' && !activeWorkspace && !formData.company_id) return alert("Please select a network subsidiary.");

    setSaveStatus("saving");
    setIsSuccess(false);

    try {
      let avatarUrl = selectedCustomer?.profile_image_url || null;

      if (imageFile || removeImage) {
        if (selectedCustomer?.profile_image_url) {
          await deleteOldAvatar(selectedCustomer.profile_image_url);
        }
      }

      if (imageFile) {
        setSaveStatus("compressing");
        const compressedFile = await compressImage(imageFile, 400, 0.8);
        
        setSaveStatus("uploading");
        const fileName = `client_${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, compressedFile);
        if (!uploadError) { 
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName); 
          avatarUrl = data.publicUrl; 
        }
      } else if (removeImage) {
        avatarUrl = null;
      }

      setSaveStatus("saving");
      const payload = {
        company_id: parseInt(formData.company_id),
        name: formData.name,
        contact_person: formData.contact_person,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        profile_image_url: avatarUrl
      };

      if (!selectedCustomer) {
        const { error } = await supabase.from('customers').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customers').update(payload).eq('id', selectedCustomer.id);
        if (error) throw error;
      }
      
      await fetchAllData();
      
      setImageFile(null);
      setRemoveImage(false);
      
      setSaveStatus("idle");
      setIsSuccess(true); 
      setTimeout(() => setIsSuccess(false), 3000);
      
      if (!selectedCustomer) setIsModalOpen(false); 

    } catch (error: any) { 
      alert(error.message); 
      setSaveStatus("idle");
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedCustomer.name}? This cannot be undone.`)) return;
    
    setSaveStatus("saving");
    try {
      if (selectedCustomer.profile_image_url) {
        await deleteOldAvatar(selectedCustomer.profile_image_url);
      }
      const { error } = await supabase.from('customers').delete().eq('id', selectedCustomer.id);
      if (error) throw error;
      await fetchAllData();
      setIsModalOpen(false);
    } catch (error: any) { 
      alert(isAcademy ? `Error deleting student: ${error.message}` : `Error deleting client: ${error.message}`); 
    } finally { 
      setSaveStatus("idle"); 
    }
  };

  const handleProjectClick = (projectId: number) => {
    setIsModalOpen(false);
    navigate('/projects', { state: { openProjectId: projectId } });
  };

  const getClientFinancials = (clientId: number) => {
    const clientInvoices = invoices.filter(i => i.customer_id === clientId);
    const totalBilled = clientInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    const totalPaid = clientInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount_paid || 0), 0);
    const totalPending = Math.max(0, totalBilled - totalPaid);
    return { totalBilled, totalPaid, totalPending, invoiceCount: clientInvoices.length };
  };

  const displayImage = imagePreview || (!removeImage && selectedCustomer?.profile_image_url ? selectedCustomer.profile_image_url : null);

  // --- PDF GENERATION LOGIC ---
  const handlePrintPDF = () => {
    setIsReportConfigOpen(false);
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setIsPrinting(false), 500);
    }, 500);
  };

  const printFilteredCustomers = visibleCustomers.filter(client => {
    if (reportConfig.courseId === "all") return true;
    const isEnrolled = projects.some(p => p.id.toString() === reportConfig.courseId && p.customer_id === client.id) ||
                       invoices.some(i => i.project_id?.toString() === reportConfig.courseId && i.customer_id === client.id);
    return isEnrolled;
  });

  const getPrintFinancials = (clientId: number) => {
    let clientInvoices = invoices.filter(i => i.customer_id === clientId);
    if (reportConfig.courseId !== 'all') {
      clientInvoices = clientInvoices.filter(i => i.project_id?.toString() === reportConfig.courseId);
    }
    const billed = clientInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    const paid = clientInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount_paid || 0), 0);
    return { billed, paid, due: Math.max(0, billed - paid) };
  };

  // --- MODAL DATA CALCS ---
  const activeModalFinancials = selectedCustomer ? getClientFinancials(selectedCustomer.id) : { totalBilled: 0, totalPaid: 0, totalPending: 0 };
  const linkedProjectIds = selectedCustomer ? Array.from(new Set([
    ...projects.filter(p => p.customer_id === selectedCustomer.id).map(p => p.id),
    ...invoices.filter(i => i.customer_id === selectedCustomer.id && i.project_id).map(i => i.project_id)
  ])) : [];
  const modalProjects = projects.filter(p => linkedProjectIds.includes(p.id));

  return (
    <>
      <div className="max-w-[1200px] mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-700 pb-8 relative z-0 print:hidden">
        
        <div className="absolute inset-0 pointer-events-none z-[-1] overflow-hidden print:hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTQ4LCAxNjMsIDE4NCwgMC4wOCkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
          <div>
            <p className="text-[9px] sm:text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1.5 sm:mb-2 bg-blue-50 inline-block px-3 py-1 rounded-full">{isAcademy ? 'Student Management' : 'Client Management'}</p>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-1 sm:mt-2">{isAcademy ? 'Students.' : 'Customers.'}</h1>
          </div>
          
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <button onClick={() => setIsReportConfigOpen(true)} className="bg-white text-slate-700 border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-[13px] font-bold transition-all flex items-center shrink-0">
              <Download className="h-4 w-4 mr-1.5 sm:mr-2" /> PDF Report
            </button>
            {(role === 'admin' || role === 'head') && (
              <button onClick={openNewCustomer} className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-lg shadow-blue-900/20 hover:shadow-xl hover:-translate-y-0.5 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-[13px] font-bold transition-all flex items-center shrink-0">
                <Plus className="h-4 w-4 mr-1.5 sm:mr-2" /> {isAcademy ? 'Register Student' : 'Add Client'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white p-2 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-slate-400" />
            <input type="text" placeholder={isAcademy ? "Search students..." : "Search clients..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 sm:h-11 pl-9 sm:pl-11 pr-4 rounded-lg sm:rounded-xl border-none text-[13px] sm:text-sm font-medium outline-none bg-transparent focus:ring-0 placeholder:text-slate-400" />
          </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {visibleCustomers.length === 0 ? (
            <div className="col-span-full h-48 sm:h-64 border border-slate-200 border-dashed rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              {isAcademy ? <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10 mb-2 sm:mb-3 text-slate-300" /> : <UserSquare2 className="h-8 w-8 sm:h-10 sm:w-10 mb-2 sm:mb-3 text-slate-300" />}
              <p className="text-[11px] sm:text-sm font-bold uppercase tracking-wider">{isAcademy ? 'No Students Found' : 'No Clients Found'}</p>
            </div>
          ) : (
            visibleCustomers.map(client => {
              const financials = getClientFinancials(client.id);
              
              const clientProjectIds = new Set([
                ...projects.filter(p => p.customer_id === client.id).map(p => p.id),
                ...invoices.filter(i => i.customer_id === client.id && i.project_id).map(i => i.project_id)
              ]);
              const customerProjects = projects.filter(p => clientProjectIds.has(p.id));
              const latestProject = customerProjects.sort((a,b)=>new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
              
              return (
                <motion.div key={client.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={() => openCustomerDossier(client)} className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col relative overflow-hidden group cursor-pointer">
                  {canViewFinance && financials.totalPending > 0 && (
                    <div className="absolute top-3 right-3 sm:top-5 sm:right-5 z-10">
                      <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg flex items-center gap-1 shadow-sm">
                        <AlertCircle className="h-2 w-2 sm:h-3 sm:w-3"/> Due
                      </span>
                    </div>
                  )}

                  <div className="p-4 sm:p-6 pb-4 sm:pb-5 border-b border-slate-50 flex flex-row sm:flex-col items-center sm:items-start text-left relative">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 shrink-0 mr-3 sm:mr-0 sm:mb-4 rounded-[1rem] sm:rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                       {client.profile_image_url ? (
                         <img src={client.profile_image_url} alt="" className="h-full w-full object-cover" />
                       ) : (
                         isAcademy ? <GraduationCap className="h-5 w-5 sm:h-7 sm:w-7" /> : <Building2 className="h-5 w-5 sm:h-7 sm:w-7" />
                       )}
                    </div>
                    
                    <div className="flex-1 min-w-0 w-full flex flex-col items-start">
                      <h3 className="text-[14px] sm:text-[18px] font-bold text-slate-900 tracking-tight group-hover:text-blue-900 transition-colors truncate w-full pr-10 sm:pr-0">{client.name}</h3>
                      
                      {isAcademy && latestProject && (
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-max mt-1.5 truncate max-w-full">
                          Enrolled: {latestProject.name}
                        </span>
                      )}

                      <div className="space-y-0.5 sm:space-y-1.5 mt-1.5 sm:mt-2 w-full">
                        <p className="text-[10px] sm:text-[12px] font-medium text-slate-600 flex items-center gap-1.5 sm:gap-2 truncate"><User className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400 shrink-0" /> <span className="truncate">{client.contact_person || (isAcademy ? 'No Guardian Listed' : 'No Primary Contact')}</span></p>
                        {client.phone && <p className="text-[10px] sm:text-[12px] font-medium text-slate-600 flex items-center gap-1.5 sm:gap-2 truncate"><Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400 shrink-0" /> <span className="truncate">{client.phone}</span></p>}
                        {role === 'admin' && !activeWorkspace && (
                           <p className="text-[8px] sm:text-[10px] font-bold text-blue-600/80 uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-slate-50 truncate"><Building2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" /> <span className="truncate">{companies.find(c => c.id === client.company_id)?.name}</span></p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FAFCFF] p-3 sm:p-5 flex items-center justify-between mt-auto">
                     <div>
                       <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{isAcademy ? 'Total Courses' : 'Total Projects'}</p>
                       <p className="text-[12px] sm:text-sm font-bold text-slate-800 flex items-center gap-1 sm:gap-1.5">
                         {isAcademy ? <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500" /> : <Briefcase className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500" />} 
                         {customerProjects.length}
                       </p>
                     </div>
                     {canViewFinance && (
                       <div className="text-right">
                         <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{isAcademy ? 'Total Tuition' : 'Total Billed'}</p>
                         <p className="text-[14px] sm:text-lg font-black text-emerald-600 tracking-tight">₹{financials.totalBilled.toLocaleString()}</p>
                       </div>
                     )}
                  </div>
                </motion.div>
              )
            })
          )}
        </div>

        {/* --- DYNAMIC ID/PROFILE MODAL --- */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }} 
                onClick={(e) => e.stopPropagation()}
                className="bg-[#F8FAFC] sm:rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[100dvh] sm:h-[800px] sm:max-h-[90svh] flex flex-col overflow-hidden relative"
              >
                
                {/* Hero Banner Area */}
                <div className={`h-32 sm:h-48 w-full shrink-0 relative overflow-hidden ${isAcademy ? 'bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800' : 'bg-gradient-to-r from-slate-800 via-slate-900 to-black'}`}>
                   {/* Background Pattern */}
                   <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wOCkiLz48L3N2Zz4=')] opacity-50 mix-blend-overlay"></div>
                   <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 sm:top-6 sm:right-6 h-10 w-10 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white transition-all shadow-sm z-20"><X className="h-5 w-5" /></button>
                </div>

                {/* Overlapping Profile Info */}
                <div className="px-6 sm:px-10 flex flex-col sm:flex-row gap-4 sm:gap-6 relative -mt-16 sm:-mt-20 mb-6 shrink-0 pointer-events-none">
                   {/* Avatar */}
                   <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-[2rem] border-4 border-[#F8FAFC] bg-white shadow-xl flex items-center justify-center relative overflow-hidden pointer-events-auto shrink-0 group">
                      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                      {displayImage ? (
                         <img src={displayImage} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                         isAcademy ? <GraduationCap className="h-12 w-12 text-slate-300" /> : <Building2 className="h-12 w-12 text-slate-300" />
                      )}
                      
                      <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                         <ImagePlus className="h-8 w-8 text-white" />
                      </div>
                      
                      {displayImage && (
                        <button onClick={handleRemovePhoto} className="absolute bottom-2 right-2 h-8 w-8 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-md hover:bg-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                           <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                   </div>

                   {/* Quick Info & Actions */}
                   <div className="pt-2 sm:pt-24 flex-1 flex flex-col sm:flex-row justify-between items-start gap-4 pointer-events-auto">
                      <div>
                         <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
                           {formData.name || (isAcademy ? "New Student" : "New Client")}
                         </h2>
                         {formData.email && <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5 mb-1"><Mail className="h-3.5 w-3.5"/> {formData.email}</p>}
                         {formData.phone && <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5"/> {formData.phone}</p>}
                      </div>
                      <div className="flex gap-2">
                        {modalTab !== 'settings' && (
                           <button onClick={() => setModalTab('settings')} className="bg-white border border-slate-200 text-slate-700 shadow-sm hover:shadow-md px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center">
                             <Edit3 className="h-4 w-4 mr-2 text-blue-500"/> Edit Profile
                           </button>
                        )}
                        {(role === 'admin' || role === 'head') && selectedCustomer && (
                           <button onClick={handleDeleteCustomer} disabled={saveStatus !== "idle"} className="bg-rose-50 border border-rose-100 text-rose-600 shadow-sm hover:shadow-md px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center">
                             <Trash2 className="h-4 w-4 sm:mr-2"/> <span className="hidden sm:inline">Delete</span>
                           </button>
                        )}
                      </div>
                   </div>
                </div>

                {/* Custom Segmented Control */}
                {selectedCustomer && (
                  <div className="px-6 sm:px-10 shrink-0 mb-2 overflow-x-auto max-sm:[&::-webkit-scrollbar]:hidden">
                     <div className="flex bg-slate-200/50 p-1.5 rounded-[1rem] w-max">
                        <button onClick={() => setModalTab('overview')} className={`px-5 py-2 rounded-xl text-[12px] font-bold transition-all ${modalTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Dashboard</button>
                        {canViewFinance && <button onClick={() => setModalTab('ledger')} className={`px-5 py-2 rounded-xl text-[12px] font-bold transition-all ${modalTab === 'ledger' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Financial Ledger</button>}
                        <button onClick={() => setModalTab('settings')} className={`px-5 py-2 rounded-xl text-[12px] font-bold transition-all ${modalTab === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Settings</button>
                     </div>
                  </div>
                )}

                {/* SCROLLABLE CONTENT BODY */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-6 sm:px-10 py-6 max-sm:[&::-webkit-scrollbar]:hidden">
                  
                  {/* TAB 1: OVERVIEW (Replaces "Profile" view and "Projects" tab) */}
                  {modalTab === 'overview' && selectedCustomer && (
                     <div className="space-y-6 sm:space-y-8 animate-in fade-in">
                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                           <div className="bg-white rounded-3xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between min-h-[120px]">
                              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-2"><BookOpen className="h-5 w-5" /></div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{isAcademy ? 'Enrolled Courses' : 'Active Projects'}</p>
                              <p className="text-2xl font-black text-slate-800">{modalProjects.length}</p>
                           </div>
                           {canViewFinance && (
                             <>
                               <div className="bg-white rounded-3xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between min-h-[120px]">
                                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-2"><TrendingUp className="h-5 w-5" /></div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{isAcademy ? 'Total Tuition Billed' : 'Total Value'}</p>
                                  <p className="text-2xl font-black text-slate-800">₹{activeModalFinancials.totalBilled.toLocaleString()}</p>
                               </div>
                               <div className="bg-white rounded-3xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between min-h-[120px]">
                                  <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mb-2"><AlertCircle className="h-5 w-5" /></div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{isAcademy ? 'Pending Dues' : 'Outstanding Balance'}</p>
                                  <p className={`text-2xl font-black ${activeModalFinancials.totalPending > 0 ? 'text-rose-500' : 'text-slate-800'}`}>₹{activeModalFinancials.totalPending.toLocaleString()}</p>
                               </div>
                             </>
                           )}
                        </div>

                        {/* Split Layout: Projects List & ID Card */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                           
                           {/* Main: Project/Course List */}
                           <div className="lg:col-span-2 space-y-4">
                              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">{isAcademy ? 'Academic Record' : 'Project Portfolio'}</h3>
                              {modalProjects.length === 0 ? (
                                <div className="border border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-400 italic bg-slate-50/50">
                                   {isAcademy ? 'No course enrollments found for this student.' : 'No projects associated with this client.'}
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {modalProjects.map(proj => (
                                     <div key={proj.id} onClick={() => handleProjectClick(proj.id)} className="bg-white rounded-[1.5rem] p-5 shadow-[0_2px_10px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col sm:flex-row gap-4 sm:items-center justify-between cursor-pointer hover:border-indigo-200 transition-all group">
                                        <div className="flex items-start gap-4">
                                           <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${proj.status === 'Completed' || proj.status === 'Graduated' ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                              {isAcademy ? <Award className="h-6 w-6" /> : <Briefcase className="h-6 w-6" />}
                                           </div>
                                           <div>
                                              <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{proj.name}</h4>
                                              <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5 pr-4">{proj.description || 'No description available'}</p>
                                              <div className="flex items-center gap-3 mt-2">
                                                 <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${proj.status === 'Completed' || proj.status === 'Graduated' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>{proj.status}</span>
                                                 {proj.due_date && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{new Date(proj.due_date).toLocaleDateString()}</span>}
                                              </div>
                                           </div>
                                        </div>
                                        {canViewFinance && (
                                           <div className="text-left sm:text-right shrink-0 border-t sm:border-none border-slate-50 pt-3 sm:pt-0 mt-2 sm:mt-0">
                                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{isAcademy ? 'Tuition Fee' : 'Value'}</p>
                                              <p className="text-lg font-black text-slate-800">₹{(proj.expected_amount || 0).toLocaleString()}</p>
                                           </div>
                                        )}
                                     </div>
                                  ))}
                                </div>
                              )}
                           </div>

                           {/* Side: ID Card / Contact Info */}
                           <div className="space-y-4">
                              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Contact Information</h3>
                              <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
                                 <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none"><User className="h-32 w-32" /></div>
                                 <div className="relative z-10 space-y-6">
                                    <div>
                                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{isAcademy ? 'Parent / Guardian' : 'Primary Contact'}</p>
                                       <p className="text-base font-bold">{formData.contact_person || 'Not Provided'}</p>
                                    </div>
                                    <div>
                                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Direct Email</p>
                                       <p className="text-sm font-medium">{formData.email || 'Not Provided'}</p>
                                    </div>
                                    <div>
                                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Direct Phone</p>
                                       <p className="text-sm font-medium">{formData.phone || 'Not Provided'}</p>
                                    </div>
                                    <div>
                                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{isAcademy ? 'Residential Address' : 'Registered Address'}</p>
                                       <p className="text-sm font-medium leading-relaxed">{formData.address || 'Not Provided'}</p>
                                    </div>
                                 </div>
                              </div>
                           </div>

                        </div>
                     </div>
                  )}

                  {/* TAB 2: FINANCIAL LEDGER */}
                  {modalTab === 'ledger' && selectedCustomer && canViewFinance && (
                     <div className="space-y-6 animate-in fade-in">
                        <div className="bg-white rounded-[2rem] shadow-[0_2px_10px_rgb(0,0,0,0.03)] border border-slate-100 overflow-hidden">
                           <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2"><CreditCard className="h-5 w-5 text-indigo-500" /> {isAcademy ? 'Fee & Payment Ledger' : 'Invoicing Ledger'}</h3>
                           </div>
                           
                           {invoices.filter(i => i.customer_id === selectedCustomer.id).length === 0 ? (
                             <div className="p-10 text-center text-slate-400 italic">No financial records found.</div>
                           ) : (
                             <div className="overflow-x-auto max-sm:[&::-webkit-scrollbar]:hidden">
                               <div className="min-w-[600px]">
                                 <div className="grid grid-cols-12 gap-4 bg-slate-50/50 px-6 py-4 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    <div className="col-span-3">{isAcademy ? 'Ref No.' : 'Invoice No.'}</div>
                                    <div className="col-span-3">{isAcademy ? 'Course' : 'Project'}</div>
                                    <div className="col-span-2">Status</div>
                                    <div className="col-span-2 text-right">{isAcademy ? 'Tuition (₹)' : 'Billed (₹)'}</div>
                                    <div className="col-span-2 text-right">Paid (₹)</div>
                                 </div>
                                 <div className="divide-y divide-slate-50">
                                   {invoices.filter(i => i.customer_id === selectedCustomer.id).sort((a,b)=>new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(inv => (
                                     <div key={inv.id} className="grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-slate-50/50 transition-colors">
                                       <div className="col-span-3">
                                         <p className="font-bold text-slate-900 text-[13px] truncate">{inv.invoice_number}</p>
                                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">{isAcademy ? 'Deadline:' : 'Due:'} {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</p>
                                       </div>
                                       <div className="col-span-3 text-[12px] font-medium text-slate-600 truncate pr-2">
                                         {inv.project_id ? projects.find(p=>p.id===inv.project_id)?.name : 'General / Standalone'}
                                       </div>
                                       <div className="col-span-2">
                                         <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'Partially Paid' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</span>
                                       </div>
                                       <div className="col-span-2 text-right font-black text-slate-800 text-[14px]">
                                         ₹{parseFloat(inv.total_amount || 0).toLocaleString()}
                                       </div>
                                       <div className="col-span-2 text-right font-bold text-emerald-600 text-[14px]">
                                         ₹{parseFloat(inv.amount_paid || 0).toLocaleString()}
                                       </div>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             </div>
                           )}
                        </div>
                     </div>
                  )}

                  {/* TAB 3: SETTINGS (Edit Form) */}
                  {modalTab === 'settings' && (
                     <div className="space-y-6 animate-in fade-in max-w-3xl mx-auto w-full">
                        {role === 'admin' && !activeWorkspace && (
                          <div className="p-5 rounded-2xl bg-white shadow-sm border border-slate-100">
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-3 px-1">Owning Subsidiary</label>
                            <select value={formData.company_id} onChange={(e) => setFormData({...formData, company_id: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none cursor-pointer">
                              <option value="" disabled>-- Assign to Company --</option>
                              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        )}
                        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">{isAcademy ? 'Student Full Name *' : 'Company / Entity Name *'}</label>
                            <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">{isAcademy ? 'Parent / Guardian Name' : 'Primary Contact'}</label>
                              <input type="text" placeholder="John Doe" value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">{isAcademy ? 'Student / Guardian Email' : 'Contact Email'}</label>
                              <input type="email" placeholder="contact@email.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Phone Number</label>
                              <input type="text" placeholder="+1 234 567 8900" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">{isAcademy ? 'Residential Address' : 'Registered Address'}</label>
                              <textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full h-24 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none" placeholder="123 Example Street..." />
                            </div>
                          </div>
                        </div>

                        {/* Save Action Block (Only visible in Settings tab) */}
                        <div className="flex justify-end pt-4">
                           <AnimatePresence>
                             {hasUnsavedChanges && (
                               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="w-full sm:w-auto">
                                 <button onClick={handleSaveCustomer} disabled={saveStatus !== "idle"} className="relative overflow-hidden w-full sm:w-auto bg-blue-600 text-white rounded-xl h-12 px-10 text-sm font-bold shadow-lg shadow-blue-600/30 hover:shadow-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center">
                                   {saveStatus === "compressing" && <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Compressing...</>}
                                   {saveStatus === "uploading" && <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>}
                                   {saveStatus === "saving" && <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>}
                                   {saveStatus === "idle" && "Save Changes"}
                                 </button>
                               </motion.div>
                             )}
                           </AnimatePresence>
                        </div>
                     </div>
                  )}

                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- PDF REPORT CONFIGURATION MODAL --- */}
        <AnimatePresence>
          {isReportConfigOpen && (
            <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center max-sm:px-4 max-sm:pt-20 max-sm:pb-[110px] sm:p-4 bg-slate-900/40 backdrop-blur-sm print:hidden">
              <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden border border-slate-100">
                <div className="px-6 py-5 border-b border-slate-100 bg-[#FAFCFF] flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Export {isAcademy ? 'Student Roster' : 'Client List'}</h3>
                  <button onClick={() => setIsReportConfigOpen(false)} className="h-8 w-8 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm"><X className="h-4 w-4" /></button>
                </div>
                
                <div className="p-6 space-y-4">
                   <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Filter by {isAcademy ? 'Course/Batch' : 'Project'}</label>
                     <select value={reportConfig.courseId} onChange={e => setReportConfig({...reportConfig, courseId: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium outline-none focus:border-blue-500 cursor-pointer">
                        <option value="all">All {isAcademy ? 'Students' : 'Clients'}</option>
                        {projects.filter(p => p.company_id === currentCompanyId).map(p => (
                          <option key={p.id} value={p.id.toString()}>{p.name}</option>
                        ))}
                     </select>
                   </div>
                   
                   <div className="pt-2">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Columns to Include</p>
                     <div className="space-y-3">
                       <label className="flex items-center gap-3 cursor-pointer">
                         <input type="checkbox" checked={reportConfig.showPhone} onChange={e => setReportConfig({...reportConfig, showPhone: e.target.checked})} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                         <span className="text-sm font-bold text-slate-700">Phone Number</span>
                       </label>
                       <label className="flex items-center gap-3 cursor-pointer">
                         <input type="checkbox" checked={reportConfig.showEmail} onChange={e => setReportConfig({...reportConfig, showEmail: e.target.checked})} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                         <span className="text-sm font-bold text-slate-700">Email Address</span>
                       </label>
                       <label className="flex items-center gap-3 cursor-pointer">
                         <input type="checkbox" checked={reportConfig.showAddress} onChange={e => setReportConfig({...reportConfig, showAddress: e.target.checked})} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                         <span className="text-sm font-bold text-slate-700">Residential Address</span>
                       </label>
                       <label className="flex items-center gap-3 cursor-pointer">
                         <input type="checkbox" checked={reportConfig.showCourse} onChange={e => setReportConfig({...reportConfig, showCourse: e.target.checked})} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                         <span className="text-sm font-bold text-slate-700">{isAcademy ? 'Enrolled Courses' : 'Linked Projects'}</span>
                       </label>
                       {canViewFinance && (
                         <label className="flex items-center gap-3 cursor-pointer">
                           <input type="checkbox" checked={reportConfig.showFinancials} onChange={e => setReportConfig({...reportConfig, showFinancials: e.target.checked})} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                           <span className="text-sm font-bold text-slate-700">Financials (Billed / Paid / Due)</span>
                         </label>
                       )}
                     </div>
                   </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-[#FAFCFF] flex justify-end gap-3 shrink-0">
                   <button onClick={() => setIsReportConfigOpen(false)} className="rounded-xl border border-slate-200 bg-white h-11 px-6 font-bold text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                   <button onClick={handlePrintPDF} className="bg-blue-600 text-white rounded-xl h-11 px-6 font-bold text-sm shadow-md hover:bg-blue-700 transition-all flex items-center gap-2">
                     <Printer className="h-4 w-4" /> Generate PDF
                   </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- PRINT PORTAL (VISIBLE ONLY WHEN PRINTING) --- */}
        {isPrinting && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[999999] bg-white print:block print:relative print:w-full print:h-auto overflow-visible p-12 font-sans text-slate-900 print:p-0 print:m-0" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            {/* Header */}
            <div className="flex justify-between items-start pb-6 border-b-2 border-slate-900 mb-6">
               <div className="flex items-center gap-4">
                  {currentCompany?.logo_url ? <img src={currentCompany.logo_url} className="h-16 max-w-[140px] object-contain" /> : <Building2 className="h-10 w-10 text-blue-900" />}
                  <div>
                     <h2 className="text-2xl font-black tracking-tight">{currentCompany?.name || 'Enterprise'}</h2>
                     <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                       {reportConfig.courseId !== 'all' 
                          ? `${projects.find(p => p.id.toString() === reportConfig.courseId)?.name} Roster`
                          : (isAcademy ? 'Global Student Roster' : 'Global Client Roster')}
                     </p>
                  </div>
               </div>
               <div className="text-right">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">REPORT</h1>
                  <p className="text-xs text-slate-500 mt-1">Date: {new Date().toLocaleDateString()}</p>
               </div>
            </div>

            {/* Table */}
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-slate-900 uppercase tracking-widest">
                  <th className="py-2 pr-2 font-bold">{isAcademy ? 'Student' : 'Client'}</th>
                  {reportConfig.showPhone && <th className="py-2 px-2 font-bold">Phone</th>}
                  {reportConfig.showEmail && <th className="py-2 px-2 font-bold">Email</th>}
                  {reportConfig.showAddress && <th className="py-2 px-2 font-bold w-48">Address</th>}
                  {reportConfig.showCourse && <th className="py-2 px-2 font-bold">{isAcademy ? 'Course/Project' : 'Linked Projects'}</th>}
                  {reportConfig.showFinancials && canViewFinance && (
                    <>
                      <th className="py-2 px-2 font-bold text-right">Billed</th>
                      <th className="py-2 px-2 font-bold text-right">Paid</th>
                      <th className="py-2 pl-2 font-bold text-right">Due</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {printFilteredCustomers.map(client => {
                    let clientFinancials = { billed: 0, paid: 0, due: 0 };
                    let displayCourses = '';

                    // Find linked courses/projects for this row
                    const linkedProjectIds = Array.from(new Set([
                      ...projects.filter(p => p.customer_id === client.id).map(p => p.id),
                      ...invoices.filter(i => i.customer_id === client.id && i.project_id).map(i => i.project_id)
                    ]));
                    
                    if (reportConfig.courseId !== 'all') {
                       displayCourses = projects.find(p => p.id.toString() === reportConfig.courseId)?.name || '';
                    } else {
                       displayCourses = projects.filter(p => linkedProjectIds.includes(p.id)).map(p => p.name).join(', ') || '-';
                    }

                    // Calculate financials
                    if (reportConfig.showFinancials && canViewFinance) {
                       clientFinancials = getPrintFinancials(client.id);
                    }

                    return (
                      <tr key={client.id} className="print:break-inside-avoid">
                        <td className="py-2.5 pr-2 align-top">
                          <p className="font-bold text-slate-900 text-xs">{client.name}</p>
                          {client.contact_person && <p className="text-[9px] text-slate-500 mt-0.5">{client.contact_person}</p>}
                        </td>
                        {reportConfig.showPhone && <td className="py-2.5 px-2 align-top font-medium">{client.phone || '-'}</td>}
                        {reportConfig.showEmail && <td className="py-2.5 px-2 align-top font-medium">{client.email || '-'}</td>}
                        {reportConfig.showAddress && <td className="py-2.5 px-2 align-top text-slate-600 truncate max-w-xs">{client.address || '-'}</td>}
                        {reportConfig.showCourse && <td className="py-2.5 px-2 align-top text-slate-600 font-medium">{displayCourses}</td>}
                        {reportConfig.showFinancials && canViewFinance && (
                          <>
                            <td className="py-2.5 px-2 align-top text-right font-bold text-slate-800">₹{clientFinancials.billed.toLocaleString()}</td>
                            <td className="py-2.5 px-2 align-top text-right font-bold text-emerald-600">₹{clientFinancials.paid.toLocaleString()}</td>
                            <td className={`py-2.5 pl-2 align-top text-right font-black ${clientFinancials.due > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              ₹{clientFinancials.due.toLocaleString()}
                            </td>
                          </>
                        )}
                      </tr>
                    )
                 })}
              </tbody>
            </table>
          </div>,
          document.body
        )}

      </div>
    </>
  );
}