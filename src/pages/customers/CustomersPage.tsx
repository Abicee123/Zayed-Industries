import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Search, Plus, X, Building2, Phone, Briefcase, FileText, Trash2, UserSquare2, AlertCircle, Edit3, ImagePlus, Loader2, CheckCircle2, GraduationCap, BookOpen, User, Download, Printer } from "lucide-react";
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
  const [modalTab, setModalTab] = useState<"profile" | "projects" | "finance">("profile");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  
  const [saveStatus, setSaveStatus] = useState<"idle" | "compressing" | "uploading" | "saving">("idle");
  const [isSuccess, setIsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);

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
    setImageFile(null); setImagePreview(null); setRemoveImage(false); setShowPhotoMenu(false);
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
    setImageFile(null); setImagePreview(customer.profile_image_url || null); setRemoveImage(false); setShowPhotoMenu(false);
    setModalTab("profile");
    setIsModalOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) { 
      setImageFile(e.target.files[0]); 
      setImagePreview(URL.createObjectURL(e.target.files[0])); 
      setRemoveImage(false); 
      setShowPhotoMenu(false);
    }
  };

  const handleRemovePhoto = () => { 
    setImageFile(null); 
    setImagePreview(null); 
    setRemoveImage(true); 
    setShowPhotoMenu(false);
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
    
    // Check if the client is enrolled in the specifically selected course/project
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
              
              // Calculate total projects by finding direct links AND links via invoices (enrollments)
              const clientProjectIds = new Set([
                ...projects.filter(p => p.customer_id === client.id).map(p => p.id),
                ...invoices.filter(i => i.customer_id === client.id && i.project_id).map(i => i.project_id)
              ]);
              const customerProjects = projects.filter(p => clientProjectIds.has(p.id));
              
              // Get latest enrolled course/project
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

        <AnimatePresence>
          {isModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 z-[100] flex flex-col items-center justify-center max-sm:px-4 max-sm:pt-20 max-sm:pb-[110px] sm:p-4 bg-slate-900/40 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ opacity: 0, y: 40, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 40, scale: 0.95 }} 
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-4xl h-full sm:h-[700px] sm:max-h-[85svh] flex flex-col overflow-hidden border border-slate-100 mt-auto sm:mt-0"
              >
                
                <div className="px-5 sm:px-8 pt-5 sm:pt-7 border-b border-slate-100 bg-[#FAFCFF] shrink-0">
                  <div className="flex items-center justify-between mb-4 sm:mb-5">
                    <div className="pr-4">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 sm:px-2.5 py-1 rounded-full">{isAcademy ? 'Student Profile' : 'Client Profile'}</span>
                      <h3 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight mt-1.5 truncate">{selectedCustomer ? selectedCustomer.name : (isAcademy ? 'Register New Student' : 'Register New Client')}</h3>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="h-8 w-8 sm:h-9 sm:w-9 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-colors shrink-0"><X className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>
                  </div>
                  
                  <div className="flex gap-4 sm:gap-8 overflow-x-auto max-sm:[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <button onClick={() => setModalTab('profile')} className={`pb-2.5 sm:pb-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap outline-none ${modalTab === 'profile' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>1. Profile & Details</button>
                    <button onClick={() => setModalTab('projects')} disabled={!selectedCustomer} className={`pb-2.5 sm:pb-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap outline-none ${!selectedCustomer ? 'opacity-30 cursor-not-allowed' : modalTab === 'projects' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>2. {isAcademy ? 'Academic Record' : 'Project History'}</button>
                    {canViewFinance && (
                      <button onClick={() => setModalTab('finance')} disabled={!selectedCustomer} className={`pb-2.5 sm:pb-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap outline-none ${!selectedCustomer ? 'opacity-30 cursor-not-allowed' : modalTab === 'finance' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>3. {isAcademy ? 'Tuition Ledger' : 'Billing & Payouts'}</button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-8 bg-white flex flex-col max-sm:[&::-webkit-scrollbar]:hidden max-sm:[-ms-overflow-style:none] max-sm:[scrollbar-width:none]">
                  
                  {/* TAB 1: PROFILE */}
                  {modalTab === 'profile' && (
                    <div className="flex-1 flex flex-col justify-center w-full max-w-3xl mx-auto">
                      <div className="space-y-5 sm:space-y-6 flex flex-col md:flex-row gap-6 sm:gap-8">
                        <div className="shrink-0 flex flex-col items-center">
                          <div className="relative mb-2">
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-[1.5rem] bg-slate-50 border-[3px] border-white shadow-md flex items-center justify-center text-slate-300 overflow-hidden relative ring-4 ring-slate-50">
                              {displayImage ? <img src={displayImage} alt="Client" className="h-full w-full object-cover" /> : (isAcademy ? <GraduationCap className="h-10 w-10 sm:h-12 sm:w-12 opacity-50" /> : <Building2 className="h-10 w-10 sm:h-12 sm:w-12 opacity-50" />)}
                            </div>
                            <button onClick={() => setShowPhotoMenu(!showPhotoMenu)} className="absolute -bottom-2 -right-2 h-8 w-8 sm:h-10 sm:w-10 bg-blue-600 border-2 border-white rounded-full flex items-center justify-center text-white hover:bg-blue-700 shadow-md transition-all active:scale-95 z-10">
                              <Edit3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                            <AnimatePresence>
                              {showPhotoMenu && (
                                <>
                                  <div className="fixed inset-0 z-[10]" onClick={() => setShowPhotoMenu(false)}></div>
                                  <motion.div initial={{ opacity: 0, y: 5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-44 sm:w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[20] py-1">
                                    <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2 px-4 py-2.5 sm:py-3 text-[12px] sm:text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                      <ImagePlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Upload Image
                                    </button>
                                    {displayImage && (
                                      <button onClick={handleRemovePhoto} className="w-full flex items-center gap-2 px-4 py-2.5 sm:py-3 text-[12px] sm:text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-50">
                                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Remove Image
                                      </button>
                                    )}
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        <div className="flex-1 space-y-5 sm:space-y-6">
                          {role === 'admin' && !activeWorkspace && (
                            <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100">
                              <label className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-2 sm:mb-3 px-1">Owning Subsidiary</label>
                              <select value={formData.company_id} onChange={(e) => setFormData({...formData, company_id: e.target.value})} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-[12px] sm:text-sm font-bold outline-none cursor-pointer">
                                <option value="" disabled>-- Assign to Company --</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            </div>
                          )}
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-5">
                            <h4 className="text-[12px] sm:text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 sm:pb-3 mb-3 sm:mb-4 flex items-center gap-2">
                              {isAcademy ? <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400"/> : <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400"/>} 
                              {isAcademy ? 'Student Details' : 'Company Details'}
                            </h4>
                            <div>
                              <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">{isAcademy ? 'Student Full Name *' : 'Company / Entity Name *'}</label>
                              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 px-3 sm:px-4 text-[12px] sm:text-sm font-bold outline-none focus:border-blue-500 shadow-sm" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                              <div>
                                <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">{isAcademy ? 'Parent / Guardian Name' : 'Primary Contact'}</label>
                                <input type="text" placeholder="John Doe" value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 px-3 sm:px-4 text-[12px] sm:text-sm font-medium outline-none focus:border-blue-500 shadow-sm" />
                              </div>
                              <div>
                                <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">{isAcademy ? 'Student / Guardian Email' : 'Contact Email'}</label>
                                <input type="email" placeholder="contact@email.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 px-3 sm:px-4 text-[12px] sm:text-sm font-medium outline-none focus:border-blue-500 shadow-sm" />
                              </div>
                              <div>
                                <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Phone Number</label>
                                <input type="text" placeholder="+1 234 567 8900" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 px-3 sm:px-4 text-[12px] sm:text-sm font-medium outline-none focus:border-blue-500 shadow-sm" />
                              </div>
                              <div className="md:col-span-2">
                                <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">{isAcademy ? 'Residential Address' : 'Registered Address'}</label>
                                <textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full h-20 sm:h-24 rounded-xl border border-slate-200 p-3 sm:p-4 text-[12px] sm:text-sm font-medium outline-none focus:border-blue-500 shadow-sm resize-none" placeholder="123 Example Street..." />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PROJECTS/COURSES HISTORY - CLICKS REDIRECT */}
                  {modalTab === 'projects' && selectedCustomer && (
                    <div className="flex-1 flex flex-col space-y-5 sm:space-y-6 py-2">
                      {(() => {
                         // 1. Find direct projects and invoice-linked projects
                         const linkedProjectIds = Array.from(new Set([
                           ...projects.filter(p => p.customer_id === selectedCustomer.id).map(p => p.id),
                           ...invoices.filter(i => i.customer_id === selectedCustomer.id && i.project_id).map(i => i.project_id)
                         ]));
                         const customerProjects = projects.filter(p => linkedProjectIds.includes(p.id));

                         if (customerProjects.length === 0) {
                           return <p className="text-[12px] sm:text-sm text-slate-400 italic text-center py-10">{isAcademy ? 'No courses linked to this student yet.' : 'No projects linked to this client yet.'}</p>;
                         }

                         return (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                             {customerProjects.map(proj => (
                               <div 
                                 key={proj.id} 
                                 onClick={() => handleProjectClick(proj.id)} 
                                 className="bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:bg-blue-50/50 hover:border-blue-200 transition-all cursor-pointer flex flex-col group relative"
                               >
                                  {/* Quick "Open" hint icon on hover */}
                                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isAcademy ? <BookOpen className="h-4 w-4 text-blue-500" /> : <Briefcase className="h-4 w-4 text-blue-500" />}
                                  </div>

                                  <div className="flex justify-between items-start mb-2 sm:mb-3">
                                    <p className="font-bold text-slate-900 text-[13px] sm:text-[15px] pr-8 group-hover:text-blue-700 transition-colors">{proj.name}</p>
                                  </div>
                                  <span className={`w-max px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-widest shrink-0 mb-2 ${proj.status === 'Completed' || proj.status === 'Graduated' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{proj.status}</span>
                                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed mb-3 sm:mb-4 flex-1">{proj.description || 'No description provided.'}</p>
                                  
                                  <div className="flex justify-between items-end border-t border-slate-200 pt-2.5 sm:pt-3">
                                    {canViewFinance ? (
                                      <div>
                                        <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{isAcademy ? 'Tuition Fee' : 'Expected Value'}</p>
                                        <p className="text-[12px] sm:text-sm font-black text-slate-800">₹{(proj.expected_amount || 0).toLocaleString()}</p>
                                      </div>
                                    ) : <div></div>}
                                    
                                    <div className="text-right">
                                      <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{isAcademy ? 'Completion Date' : 'Due Date'}</p>
                                      <p className="text-[11px] sm:text-xs font-bold text-slate-600">{proj.due_date ? new Date(proj.due_date).toLocaleDateString() : 'Unscheduled'}</p>
                                    </div>
                                  </div>
                               </div>
                             ))}
                           </div>
                         );
                      })()}
                    </div>
                  )}

                  {/* TAB 3: BILLING & PAYMENTS (ADMIN/HEAD ONLY) */}
                  {modalTab === 'finance' && selectedCustomer && canViewFinance && (
                    <div className="flex-1 flex flex-col space-y-6 sm:space-y-8 py-2">
                      {(() => {
                        const financials = getClientFinancials(selectedCustomer.id);
                        return (
                          <div className="grid grid-cols-3 gap-2 sm:gap-4">
                            <div className="bg-slate-50 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-100 text-center">
                              <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{isAcademy ? 'Total Tuition' : 'Total Billed'}</p>
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
                        <h4 className="text-[12px] sm:text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3 sm:mb-4 flex items-center gap-2"><FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500"/> {isAcademy ? 'Fee & Payment Ledger' : 'Invoicing Ledger'}</h4>
                        
                        {invoices.filter(i => i.customer_id === selectedCustomer.id).length === 0 ? (
                          <p className="text-[12px] sm:text-sm text-slate-400 italic text-center py-6 sm:py-10">No records issued to this {isAcademy ? 'student' : 'client'}.</p>
                        ) : (
                          <div className="bg-white border border-slate-100 shadow-sm rounded-xl sm:rounded-3xl overflow-hidden">
                             <div className="overflow-x-auto max-sm:[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                               <div className="min-w-[600px]">
                                 <div className="grid grid-cols-12 gap-4 bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    <div className="col-span-3">{isAcademy ? 'Ref No.' : 'Invoice No.'}</div>
                                    <div className="col-span-3">{isAcademy ? 'Course' : 'Project'}</div>
                                    <div className="col-span-2">Status</div>
                                    <div className="col-span-2 text-right">{isAcademy ? 'Tuition (₹)' : 'Billed (₹)'}</div>
                                    <div className="col-span-2 text-right">Paid (₹)</div>
                                 </div>
                                 <div className="divide-y divide-slate-50">
                                   {invoices.filter(i => i.customer_id === selectedCustomer.id).sort((a,b)=>new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(inv => (
                                     <div key={inv.id} className="grid grid-cols-12 gap-4 items-center px-4 sm:px-6 py-3 sm:py-4 hover:bg-slate-50/50 transition-colors">
                                       <div className="col-span-3">
                                         <p className="font-bold text-slate-900 text-[11px] sm:text-[13px] truncate">{inv.invoice_number}</p>
                                         <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 sm:mt-1 truncate">{isAcademy ? 'Deadline:' : 'Due:'} {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</p>
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

                <div className="border-t border-slate-100 bg-[#FAFCFF] flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 shrink-0 rounded-b-[2rem] sm:rounded-b-[2.5rem]">
                  {selectedCustomer && (role === 'admin' || role === 'head') && modalTab === 'profile' ? (
                    <div className="p-4 sm:p-6 w-full sm:w-auto">
                      <button onClick={handleDeleteCustomer} disabled={saveStatus !== "idle"} className="w-full sm:w-auto border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 rounded-xl h-10 sm:h-12 px-3 sm:px-5 flex items-center justify-center shadow-sm transition-colors shrink-0">
                        <Trash2 className="h-4 w-4" /> <span className="sm:hidden ml-2 font-bold text-xs">Delete {isAcademy ? 'Student' : 'Client'}</span>
                      </button>
                    </div>
                  ) : <div className="hidden sm:block p-4 sm:p-6"></div>}
                  
                  <div className="w-full sm:w-auto flex-1 flex justify-end">
                    <AnimatePresence>
                      {hasUnsavedChanges && modalTab === 'profile' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} 
                          className="w-full sm:w-auto flex p-4 sm:p-6"
                        >
                          <button 
                            onClick={handleSaveCustomer} 
                            disabled={saveStatus !== "idle"} 
                            className="relative overflow-hidden w-full sm:w-auto bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl h-10 sm:h-12 px-6 sm:px-10 text-[12px] sm:text-sm font-bold shadow-lg shadow-blue-900/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center group"
                          >
                            {saveStatus === "idle" && (
                              <motion.div animate={{ left: ['-100%', '200%'] }} transition={{ repeat: Infinity, duration: 2.5, ease: "linear", repeatDelay: 1.5 }} className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 z-0 pointer-events-none" />
                            )}
                            <span className="relative z-10 flex items-center">
                              {saveStatus === "compressing" && <><Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 animate-spin" /> Compressing...</>}
                              {saveStatus === "uploading" && <><Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 animate-spin" /> Uploading...</>}
                              {saveStatus === "saving" && <><Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 animate-spin" /> Saving...</>}
                              {saveStatus === "idle" && "Save Changes"}
                            </span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <AnimatePresence>
                      {isSuccess && !hasUnsavedChanges && modalTab === 'profile' && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-4 sm:p-6 flex items-center">
                          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-lg">
                            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Profile Updated
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

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