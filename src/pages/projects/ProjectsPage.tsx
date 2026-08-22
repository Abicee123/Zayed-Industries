import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, FolderKanban, CheckCircle2, AlertCircle, X, Check, User, Trash2, Wallet, Star, ChevronDown, Clock, Download, Loader2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";
import { supabase } from "../../supabase";

const STATUS_OPTIONS = ['Planning', 'In Progress', 'Review', 'Completed'];

export default function ProjectsPage() {
  const { role, employeeId, activeWorkspace, companyId } = useAuthStore();
  const store = useDataStore();
  const { projects, tasks, reports, employees, companies, customers, salaryPayments, projectAllocations, fetchAllData } = store;

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCompanyId, setFilterCompanyId] = useState<string>("all");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"details" | "progress" | "finance">("details");
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({ 
    name: "", description: "", priority: "Medium", status: "Planning", expected_amount: 0, 
    approval_date: today, due_date: "", company_id: "", customer_id: "", internal_company_id: "", assignee_ids: [] as number[] 
  });
  const [customerType, setCustomerType] = useState<"existing" | "new" | "in_house">("existing");
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState<number | "">("");
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);

  const [myReportText, setMyReportText] = useState("");
  const [isPrintingPayslip, setIsPrintingPayslip] = useState(false);

  const [allocationsForm, setAllocationsForm] = useState<{[empId: number]: {allocated: number, incentive: number}}>({});
  const [paymentForm, setPaymentForm] = useState({ employee_id: "", amount: 0, payment_type: "Advance", notes: "" });

  const currentCompanyId = role === 'admin' ? (activeWorkspace || "") : companyId;

  const visibleProjects = projects.filter(p => {
    if (!p.name) return false;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "All" || p.status === filterStatus;
    const isAssigned = role !== 'user' || (p.assignee_ids || []).includes(employeeId);
    
    if (role === 'admin' && !activeWorkspace) {
      const matchesCompany = filterCompanyId === "all" || p.company_id?.toString() === filterCompanyId;
      return matchesSearch && matchesStatus && isAssigned && matchesCompany;
    }

    return matchesSearch && matchesStatus && isAssigned && p.company_id === currentCompanyId;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const availableCustomers = customers.filter(c => c.company_id === parseInt(formData.company_id));
  const availableEmployees = employees.filter(emp => emp.access_level === 'admin' || emp.company_id === parseInt(formData.company_id));

  const openNewProject = () => {
    setSelectedProject(null);
    setFormData({ name: "", description: "", priority: "Medium", status: "Planning", expected_amount: 0, approval_date: today, due_date: "", company_id: currentCompanyId?.toString() || "", customer_id: "", internal_company_id: "", assignee_ids: [] });
    setCustomerType("existing"); setNewCustomer({ name: "", phone: "" }); setPendingTasks([]); setNewTaskTitle(""); setNewTaskAssignee("");
    setAllocationsForm({});
    setModalTab("details");
    setIsModalOpen(true);
  };

  const openProjectDetails = (project: any) => {
    setSelectedProject(project);
    setFormData({
      name: project.name || "", description: project.description || "", priority: project.priority || "Medium", status: project.status || "Planning", 
      expected_amount: project.expected_amount || 0, approval_date: project.approval_date || today, due_date: project.due_date || "", 
      company_id: project.company_id?.toString() || "", customer_id: project.customer_id?.toString() || "", 
      internal_company_id: project.internal_company_id?.toString() || "", assignee_ids: project.assignee_ids || []
    });
    setCustomerType(project.internal_company_id ? "in_house" : project.customer_id ? "existing" : "in_house"); 
    setNewCustomer({ name: "", phone: "" }); setPendingTasks([]); setNewTaskTitle(""); setNewTaskAssignee("");
    
    const currentAlloc: any = {};
    project.assignee_ids?.forEach((id: number) => {
      const a = projectAllocations.find(pa => pa.project_id === project.id && pa.employee_id === id);
      currentAlloc[id] = { allocated: a?.allocated_amount || 0, incentive: a?.incentive_amount || 0 };
    });
    setAllocationsForm(currentAlloc);
    setModalTab("details");
    setIsModalOpen(true);
  };

  const handleSaveProject = async () => {
    if (!formData.name.trim()) return alert("Project name is required.");
    if (!formData.company_id) return alert("Please select a Company for this project.");
    
    let finalCustomerId: number | null = formData.customer_id ? parseInt(formData.customer_id) : null;
    let finalInternalId: number | null = null;

    setIsSaving(true);
    try {
      if (customerType === 'new') {
        if (!newCustomer.name.trim()) throw new Error("New Customer Name is required.");
        const { data: cData, error: cError } = await supabase.from('customers').insert([{ company_id: parseInt(formData.company_id), name: newCustomer.name, phone: newCustomer.phone }]).select().single();
        if (cError) throw cError;
        finalCustomerId = cData.id;
      } else if (customerType === 'in_house') { 
        finalCustomerId = null; 
        finalInternalId = formData.internal_company_id ? parseInt(formData.internal_company_id) : null;
      }

      const payload = { 
        ...formData, company_id: parseInt(formData.company_id), customer_id: finalCustomerId, internal_company_id: finalInternalId, 
        approval_date: formData.approval_date || null, due_date: formData.due_date || null 
      };
      
      if (!selectedProject) {
        const { data, error } = await supabase.from('projects').insert([payload]).select().single();
        if (error) throw new Error(`Project Error: ${error.message}`);
        
        if (payload.expected_amount >= 0) {
           const invPayload = {
             company_id: payload.company_id, 
             customer_id: finalCustomerId, 
             project_id: data.id,
             invoice_number: `INV-${Math.floor(10000 + Math.random() * 90000)}`,
             issue_date: today, 
             due_date: payload.due_date || today,
             subtotal: payload.expected_amount, 
             total_amount: payload.expected_amount, 
             status: 'Pending'
           };
           
           const { data: invData, error: invError } = await supabase.from('invoices').insert([invPayload]).select().single();
           if (invError) throw new Error(`Auto-Invoice Error: ${invError.message}`);
           
           if (invData) {
             const { error: itemError } = await supabase.from('invoice_items').insert([{
               invoice_id: invData.id,
               description: `Project: ${payload.name}`,
               quantity: 1,
               rate: payload.expected_amount,
               total: payload.expected_amount
             }]);
             if (itemError) throw new Error(`Invoice Line Item Error: ${itemError.message}`);
           }
        }

        if (pendingTasks.length > 0) {
          const tasksToInsert = pendingTasks.map(t => ({ project_id: data.id, title: t.title, assignee_id: t.assignee_id, is_completed: t.is_completed }));
          await supabase.from('project_tasks').insert(tasksToInsert);
        }

      } else {
        const { error } = await supabase.from('projects').update(payload).eq('id', selectedProject.id);
        if (error) throw new Error(`Project Update Error: ${error.message}`);
      }
      
      await fetchAllData();
      setIsModalOpen(false);
    } catch (error: any) { 
      alert(error.message); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleSaveAllocations = async () => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      for (const empId of Object.keys(allocationsForm)) {
        const alloc = allocationsForm[parseInt(empId)];
        await supabase.from('project_allocations').upsert({
          project_id: selectedProject.id, employee_id: parseInt(empId), allocated_amount: alloc.allocated, incentive_amount: alloc.incentive
        }, { onConflict: 'project_id, employee_id' });
      }
      alert("Allocations saved successfully.");
      await fetchAllData();
    } catch (error: any) { alert(error.message); } finally { setIsSaving(false); }
  };

  const handleRecordProjectPayment = async () => {
    if (!paymentForm.employee_id || paymentForm.amount <= 0) return alert("Select an employee and enter an amount.");
    setIsSaving(true);
    try {
      const { error } = await supabase.from('salary_payments').insert([{
        employee_id: parseInt(paymentForm.employee_id),
        company_id: selectedProject.company_id,
        project_id: selectedProject.id,
        amount: paymentForm.amount,
        payment_type: paymentForm.payment_type,
        payment_date: today,
        payment_month: today.substring(0, 7), 
        notes: paymentForm.notes
      }]);
      
      if (error) throw new Error(`Database Error: ${error.message}`);

      setPaymentForm({ employee_id: "", amount: 0, payment_type: "Advance", notes: "" });
      await fetchAllData();
    } catch (error: any) { 
      alert(error.message); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleDeleteProjectPayment = async (paymentId: number) => {
    if (!window.confirm("Remove this payment record?")) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('salary_payments').delete().eq('id', paymentId);
      if (error) throw new Error(`Delete Error: ${error.message}`);
      await fetchAllData();
    } catch (error: any) { alert(error.message); } finally { setIsSaving(false); }
  };

  const handleSaveMyReport = async () => {
    if (!selectedProject || !myReportText.trim()) return;
    const existingReport = reports.find(r => r.project_id === selectedProject.id && r.employee_id === employeeId);
    const timestamp = new Date().toLocaleString();
    const appendedText = existingReport?.report_text 
      ? `${existingReport.report_text}\n\n[${timestamp}]\n${myReportText}`
      : `[${timestamp}]\n${myReportText}`;

    await supabase.from('project_reports').upsert({ project_id: selectedProject.id, employee_id: employeeId, report_text: appendedText }, { onConflict: 'project_id, employee_id' });
    setMyReportText("");
    await fetchAllData();
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Delete "${selectedProject.name}"?`)) return;
    setIsSaving(true);
    await supabase.from('projects').delete().eq('id', selectedProject.id);
    await fetchAllData(); setIsModalOpen(false); setIsSaving(false);
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    if (selectedProject) {
      await supabase.from('project_tasks').insert([{ project_id: selectedProject.id, title: newTaskTitle, assignee_id: newTaskAssignee || null }]);
      await fetchAllData();
    } else { setPendingTasks([...pendingTasks, { title: newTaskTitle, assignee_id: newTaskAssignee || null, is_completed: false }]); }
    setNewTaskTitle(""); setNewTaskAssignee("");
  };

  const toggleTask = async (task: any, index?: number) => {
    if (selectedProject) {
      await supabase.from('project_tasks').update({ is_completed: !task.is_completed }).eq('id', task.id);
      await fetchAllData();
    } else if (index !== undefined) {
      const updated = [...pendingTasks]; updated[index].is_completed = !updated[index].is_completed; setPendingTasks(updated);
    }
  };

  const updateProjectStatus = async (project: any, newStatus: string) => {
    if (project.status === newStatus || project.pending_status === newStatus) return;
    if (role === 'user') {
      await supabase.from('projects').update({ pending_status: newStatus, status_requested_by: employeeId }).eq('id', project.id);
    } else {
      await supabase.from('projects').update({ status: newStatus, pending_status: null, status_requested_by: null }).eq('id', project.id);
    }
    await fetchAllData();
  };

  const handleApproval = async (project: any, approve: boolean) => {
    if (approve) {
      await supabase.from('projects').update({ status: project.pending_status, pending_status: null, status_requested_by: null }).eq('id', project.id);
    } else {
      await supabase.from('projects').update({ pending_status: null, status_requested_by: null }).eq('id', project.id);
    }
    await fetchAllData();
  };

  const handlePrintPayslip = () => {
    setIsPrintingPayslip(true);
    setTimeout(() => { window.print(); setIsPrintingPayslip(false); }, 100);
  };

  const getAvatar = (id: number) => employees.find(e => e.id === id);
  const displayTasks = selectedProject ? tasks.filter(t => t.project_id === selectedProject.id) : pendingTasks;

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Planning': return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'Review': return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
      case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
    }
  };

  const getDueDateStatus = (dateString: string) => {
    if (!dateString) return null;
    const due = new Date(dateString);
    const now = new Date(today);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'Overdue', style: 'text-rose-500 bg-rose-50 border-rose-200', icon: AlertCircle };
    if (diffDays <= 7) return { label: `Due in ${diffDays} days`, style: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock };
    return null;
  };

  const userAllocation = selectedProject ? projectAllocations.find(pa => pa.project_id === selectedProject.id && pa.employee_id === employeeId) : null;
  const userProjectPayments = selectedProject ? salaryPayments.filter(sp => sp.project_id === selectedProject.id && sp.employee_id === employeeId) : [];
  const userTotalEarned = userProjectPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const userTotalAllocated = (userAllocation?.allocated_amount || 0) + (userAllocation?.incentive_amount || 0);
  const userBalanceDue = Math.max(0, userTotalAllocated - userTotalEarned);

  return (
    <>
      <div className="max-w-[1200px] mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-700 pb-8 relative z-0 print:p-0 print:m-0">
        
        {/* Minimal Dotted Background Pattern */}
        <div className="absolute inset-0 pointer-events-none z-[-1] overflow-hidden print:hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTQ4LCAxNjMsIDE4NCwgMC4wOCkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]" />
        </div>

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 print:hidden">
          <div>
            <p className="text-[9px] sm:text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1.5 sm:mb-2 bg-blue-50 inline-block px-3 py-1 rounded-full">Workflows & Tasks</p>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-1 sm:mt-2">Projects.</h1>
          </div>
          {(role === 'admin' || role === 'head') && (
            <button onClick={openNewProject} className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-lg shadow-blue-900/20 hover:shadow-xl hover:-translate-y-0.5 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-[13px] font-bold transition-all flex items-center shrink-0">
              <Plus className="h-4 w-4 mr-1.5 sm:mr-2" /> New Project
            </button>
          )}
        </div>

        {/* FILTERS */}
        <div className="bg-white p-2 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-2 print:hidden">
          <div className="relative flex-1">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-slate-400" />
            <input type="text" placeholder="Search projects by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 sm:h-11 pl-9 sm:pl-11 pr-4 rounded-lg sm:rounded-xl border-none text-[13px] sm:text-sm font-medium outline-none bg-transparent focus:ring-0 placeholder:text-slate-400" />
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

          <div className="sm:w-48 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-2">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full h-10 sm:h-11 rounded-lg sm:rounded-xl bg-slate-50 border-none px-3 sm:px-4 text-[12px] sm:text-sm font-bold text-slate-700 outline-none cursor-pointer appearance-none"
               style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '14px' }}
            >
               <option value="All">All Statuses</option>
               {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>

        {/* PROJECTS GRID */}
        <div className="space-y-4 print:hidden">
          {visibleProjects.length === 0 ? (
             <div className="h-48 sm:h-64 border border-slate-200 border-dashed rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                <FolderKanban className="h-8 w-8 sm:h-10 sm:w-10 mb-2 sm:mb-3 text-slate-300" />
                <p className="text-[11px] sm:text-sm font-bold uppercase tracking-wider">No Projects Found</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
              {visibleProjects.map(project => {
                const projectTasks = tasks.filter(t => t.project_id === project.id);
                const completedTasks = projectTasks.filter(t => t.is_completed).length;
                const totalTasks = projectTasks.length;
                const progressPct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
                const radius = 18; const circumference = 2 * Math.PI * radius; const progressOffset = circumference - (progressPct / 100) * circumference;
                
                const dueStatus = project.status !== 'Completed' ? getDueDateStatus(project.due_date) : null;

                return (
                  <div key={project.id} className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col relative overflow-hidden group">
                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${project.priority === 'High' ? 'bg-rose-500' : project.priority === 'Medium' ? 'bg-amber-500' : 'bg-slate-300'}`} />

                    {dueStatus && (
                      <div className={`ml-1.5 px-3 sm:px-4 py-1.5 sm:py-2 border-b flex items-center justify-center gap-1.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${dueStatus.style}`}>
                        <dueStatus.icon className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {dueStatus.label}
                      </div>
                    )}

                    {project.pending_status && (
                      <div className="bg-amber-50/80 ml-1.5 px-4 sm:px-5 py-2.5 sm:py-3 border-b border-amber-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-amber-800 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider">
                          <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 shrink-0" /> <span className="truncate">Requested: {project.pending_status}</span>
                        </div>
                        {(role === 'admin' || role === 'head') && (
                           <div className="flex gap-1.5 sm:gap-2 shrink-0">
                             <button onClick={() => handleApproval(project, true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[8px] sm:text-[10px] uppercase tracking-wider font-bold px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg transition-all shadow-sm">Approve</button>
                             <button onClick={() => handleApproval(project, false)} className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[8px] sm:text-[10px] uppercase tracking-wider font-bold px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg transition-colors">Reject</button>
                           </div>
                        )}
                      </div>
                    )}

                    {/* COMPACT MOBILE HORIZONTAL LAYOUT */}
                    <div className="ml-1.5 p-4 sm:p-7 flex flex-col gap-4 sm:gap-6">
                      
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 onClick={() => openProjectDetails(project)} className="text-[15px] sm:text-lg font-bold text-slate-900 tracking-tight cursor-pointer hover:text-blue-900 transition-colors inline-block truncate w-full">{project.name}</h3>
                          <p className="text-[9px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 sm:mt-1 truncate w-full">
                            {companies.find(c => c.id === project.company_id)?.name || 'Network'} 
                            {project.customer_id && ` • ${customers.find(c => c.id === project.customer_id)?.name}`}
                            {project.internal_company_id && ` • Internal`}
                          </p>
                        </div>
                        
                        <div className="shrink-0 w-28 sm:w-32">
                          <select value={project.status || 'Planning'} onChange={(e) => updateProjectStatus(project, e.target.value)} disabled={role === 'user' && !!project.pending_status} className={`w-full h-8 sm:h-9 rounded-lg sm:rounded-xl px-2 sm:px-3.5 pr-6 sm:pr-8 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider cursor-pointer outline-none appearance-none border transition-all ${getStatusStyle(project.status || 'Planning')}`}>
                             {STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className="text-slate-900 bg-white">{opt}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-row items-center justify-between pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="flex items-center gap-3 sm:gap-4">
                           <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center shrink-0">
                             <svg className="h-10 w-10 sm:h-12 sm:w-12 transform -rotate-90">
                               <circle cx="50%" cy="50%" r="18" stroke="currentColor" strokeWidth="3.5" fill="transparent" className="text-slate-100" />
                               <circle cx="50%" cy="50%" r="18" stroke="currentColor" strokeWidth="3.5" fill="transparent" strokeDasharray={circumference} strokeDashoffset={progressOffset} strokeLinecap="round" className={`${progressPct === 100 ? 'text-emerald-500' : 'text-blue-900'} transition-all duration-1000 ease-out`} />
                             </svg>
                             <div className="absolute inset-0 flex items-center justify-center text-[9px] sm:text-[11px] font-bold text-slate-800">{progressPct}%</div>
                           </div>
                           <div className="hidden sm:block">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tasks</p>
                             <p className="text-sm font-bold text-slate-800">{completedTasks} / {totalTasks}</p>
                           </div>
                           <div className="flex -space-x-2 pl-2 border-l border-slate-100 sm:border-none sm:pl-0">
                             {(project.assignee_ids || []).slice(0, 4).map((id: number) => {
                               const emp = getAvatar(id);
                               return (
                                 <div key={id} className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-slate-600 overflow-hidden shadow-sm" title={emp?.name}>
                                   {emp?.profile_image_url ? <img src={emp.profile_image_url} alt="Profile" className="h-full w-full object-cover" /> : (emp?.name || 'U').charAt(0).toUpperCase()}
                                 </div>
                               )
                             })}
                             {(project.assignee_ids || []).length > 4 && <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-slate-600 shadow-sm">+{(project.assignee_ids || []).length - 4}</div>}
                             {(project.assignee_ids || []).length === 0 && <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 pl-2">Unassigned</span>}
                           </div>
                        </div>

                        {(role === 'admin' || role === 'head') && (
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Value</span>
                            <span className="text-[12px] sm:text-sm font-black text-emerald-600">₹{(project.expected_amount || 0).toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* --- PRINTABLE PAYSLIP --- */}
        {isPrintingPayslip && selectedProject && role === 'user' && (
          <div className="absolute inset-0 bg-white z-[100] p-10 print:block hidden">
            <div className="text-center mb-10 pb-6 border-b border-slate-200">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Project Payment Remittance</h1>
              <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">{selectedProject.name}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-10 mb-10 text-sm">
               <div>
                 <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-1">Prepared For</p>
                 <p className="font-bold text-slate-900 text-lg">{getAvatar(employeeId)?.name}</p>
                 <p className="text-slate-600 font-medium">{getAvatar(employeeId)?.role}</p>
               </div>
               <div className="text-right">
                 <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-1">Date Issued</p>
                 <p className="font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
               </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden mb-10">
               <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between font-bold text-slate-800 text-xs uppercase tracking-widest">
                  <span>Compensation Breakdown</span>
                  <span>Amount</span>
               </div>
               <div className="px-6 py-5 flex justify-between border-b border-slate-100">
                  <span className="font-medium text-slate-700">Project Allocation</span>
                  <span className="font-bold">₹{(userAllocation?.allocated_amount || 0).toLocaleString()}</span>
               </div>
               <div className="px-6 py-5 flex justify-between border-b border-slate-100">
                  <span className="font-medium text-slate-700">Performance Incentive</span>
                  <span className="font-bold text-emerald-600">+ ₹{(userAllocation?.incentive_amount || 0).toLocaleString()}</span>
               </div>
               <div className="px-6 py-5 bg-slate-50 flex justify-between">
                  <span className="font-bold text-slate-900 text-lg">Total Earnings</span>
                  <span className="font-black text-slate-900 text-lg">₹{userTotalAllocated.toLocaleString()}</span>
               </div>
            </div>

            <div className="mb-10">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Payment History</h3>
               {userProjectPayments.length === 0 ? <p className="text-sm italic text-slate-500">No payments disbursed yet.</p> : (
                 <div className="space-y-2">
                   {userProjectPayments.map(p => (
                     <div key={p.id} className="flex justify-between items-center border-b border-slate-100 pb-2 text-sm">
                        <span className="text-slate-600">{new Date(p.payment_date).toLocaleDateString()} - {p.payment_type}</span>
                        <span className="font-bold text-slate-800">₹{parseFloat(p.amount).toLocaleString()}</span>
                     </div>
                   ))}
                 </div>
               )}
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-200">
               <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Balance Due</p>
                  <p className="text-2xl font-black text-slate-900">₹{userBalanceDue.toLocaleString()}</p>
               </div>
            </div>
          </div>
        )}

        {/* --- MAIN PROJECT MODAL (NATIVE OS WINDOW ARCHITECTURE) --- */}
        <AnimatePresence>
          {isModalOpen && !isPrintingPayslip && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 z-[100] flex flex-col items-center justify-center max-sm:px-4 max-sm:pt-20 max-sm:pb-[110px] sm:p-4 bg-slate-900/40 backdrop-blur-sm print:hidden"
            >
              <motion.div 
                initial={{ opacity: 0, y: 40, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 40, scale: 0.95 }} 
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-full sm:h-[760px] sm:max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 mt-auto sm:mt-0"
              >
                
                <div className="px-5 sm:px-8 pt-5 sm:pt-7 border-b border-slate-100 bg-[#FAFCFF] shrink-0">
                  <div className="flex items-center justify-between mb-4 sm:mb-5">
                    <div className="pr-4">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 sm:px-2.5 py-1 rounded-full">Workspace</span>
                      <h3 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight mt-1.5 truncate">{selectedProject ? selectedProject.name : 'Create New Project'}</h3>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="h-8 w-8 sm:h-9 sm:w-9 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-colors shrink-0"><X className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>
                  </div>
                  
                  <div className="flex gap-4 sm:gap-8 overflow-x-auto max-sm:[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <button onClick={() => setModalTab('details')} className={`pb-2.5 sm:pb-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${modalTab === 'details' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>1. Details & Tasks</button>
                    <button onClick={() => setModalTab('progress')} disabled={!selectedProject} className={`pb-2.5 sm:pb-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${!selectedProject ? 'opacity-30 cursor-not-allowed' : modalTab === 'progress' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>2. Project Timeline</button>
                    <button onClick={() => setModalTab('finance')} disabled={!selectedProject} className={`pb-2.5 sm:pb-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${!selectedProject ? 'opacity-30 cursor-not-allowed' : modalTab === 'finance' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>3. Budget & Allocations</button>
                  </div>
                </div>

                {/* TAB 1: DETAILS */}
                {modalTab === 'details' && (
                  <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-8 flex flex-col lg:flex-row gap-6 sm:gap-10 max-sm:[&::-webkit-scrollbar]:hidden max-sm:[-ms-overflow-style:none] max-sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:w-1.5 sm:[&::-webkit-scrollbar-thumb]:bg-slate-200 sm:[&::-webkit-scrollbar-thumb]:rounded-full">
                    <div className="flex-1 space-y-5 sm:space-y-6">
                      
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                          <div>
                             <h4 className="text-[12px] sm:text-[13px] font-bold text-slate-800 uppercase tracking-wider">Client Details</h4>
                             <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 font-medium">Link project to a customer or internal node.</p>
                          </div>
                          <div className="flex bg-white rounded-lg sm:rounded-xl border border-slate-200 p-1 shadow-sm w-full sm:w-auto">
                            <button type="button" onClick={() => setCustomerType('existing')} className={`flex-1 sm:flex-none whitespace-nowrap px-3 sm:px-4 py-1.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all ${customerType === 'existing' ? 'bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Existing</button>
                            <button type="button" onClick={() => setCustomerType('new')} className={`flex-1 sm:flex-none whitespace-nowrap px-3 sm:px-4 py-1.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all ${customerType === 'new' ? 'bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>New</button>
                            <button type="button" onClick={() => setCustomerType('in_house')} className={`flex-1 sm:flex-none whitespace-nowrap px-3 sm:px-4 py-1.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all ${customerType === 'in_house' ? 'bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>In-House</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                          <div>
                            <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Owning Subsidiary</label>
                            <select value={formData.company_id} onChange={(e) => setFormData({...formData, company_id: e.target.value, customer_id: "", internal_company_id: "", assignee_ids: []})} disabled={role !== 'admin' || activeWorkspace !== null} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-[12px] sm:text-[13px] font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm cursor-pointer disabled:bg-slate-100 disabled:text-slate-400">
                              <option value="" disabled>Select Company...</option>
                              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                          
                          <div>
                            {customerType === 'existing' && (
                              <><label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Customer / Client *</label>
                              <select value={formData.customer_id} onChange={(e) => setFormData({...formData, customer_id: e.target.value, internal_company_id: ""})} disabled={role === 'user' || !formData.company_id} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-[12px] sm:text-[13px] font-medium outline-none focus:border-blue-500 shadow-sm disabled:bg-slate-100 disabled:text-slate-400">
                                <option value="">-- Select Client --</option>
                                {availableCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select></>
                            )}
                            {customerType === 'new' && (
                              <><label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">New Client *</label>
                              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <input type="text" placeholder="Client Name *" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} disabled={role === 'user'} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-[12px] sm:text-[13px] font-medium outline-none focus:border-blue-500 shadow-sm disabled:bg-slate-100" />
                                <input type="text" placeholder="Phone (Optional)" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} disabled={role === 'user'} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-[12px] sm:text-[13px] font-medium outline-none focus:border-blue-500 shadow-sm disabled:bg-slate-100" />
                              </div></>
                            )}
                            {customerType === 'in_house' && (
                              <><label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Internal Target *</label>
                              <select value={formData.internal_company_id} onChange={(e) => setFormData({...formData, internal_company_id: e.target.value, customer_id: ""})} disabled={role === 'user'} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 bg-blue-50/50 px-3 sm:px-4 text-[12px] sm:text-[13px] font-bold text-blue-900 outline-none focus:border-blue-500 shadow-sm disabled:bg-slate-100 disabled:text-slate-400">
                                <option value="">-- Select Own Company --</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select></>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-5">
                        <div className="md:col-span-3">
                          <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1 whitespace-nowrap truncate">Project Name</label>
                          <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} disabled={role === 'user'} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-[12px] sm:text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm disabled:bg-slate-50" />
                        </div>
                        <div>
                          <label className="text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1 whitespace-nowrap truncate">Expected Value (₹)</label>
                          <input type="number" value={formData.expected_amount} onChange={(e) => setFormData({...formData, expected_amount: parseFloat(e.target.value) || 0})} disabled={role === 'user'} placeholder="For Auto-Invoice" className="w-full h-10 sm:h-12 rounded-xl border border-emerald-200 bg-emerald-50 px-3 sm:px-4 text-[12px] sm:text-sm font-bold text-emerald-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200" />
                        </div>
                      </div>

                      <div><label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} disabled={role === 'user'} className="w-full h-20 sm:h-24 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 text-[12px] sm:text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm resize-none disabled:bg-slate-50" /></div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                        <div><label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Priority</label><select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} disabled={role === 'user'} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-[12px] sm:text-sm font-medium outline-none shadow-sm cursor-pointer disabled:bg-slate-50"><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select></div>
                        <div><label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Approval Date</label><input type="date" value={formData.approval_date} onChange={(e) => setFormData({...formData, approval_date: e.target.value})} disabled={role === 'user'} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-[12px] sm:text-sm font-medium outline-none shadow-sm disabled:bg-slate-50" /></div>
                        <div><label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Due Date</label><input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} disabled={role === 'user'} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-[12px] sm:text-sm font-medium outline-none shadow-sm disabled:bg-slate-50" /></div>
                      </div>

                      {(role === 'admin' || role === 'head') && (
                        <div className="pt-2">
                          <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 sm:mb-3 px-1">Assign Team Members</label>
                          <div className="flex flex-wrap gap-2 sm:gap-2.5">
                            {availableEmployees.map(emp => {
                              const isSelected = formData.assignee_ids.includes(emp.id);
                              return (
                                <button key={emp.id} onClick={() => { if (isSelected) setFormData({...formData, assignee_ids: formData.assignee_ids.filter(id => id !== emp.id)}); else setFormData({...formData, assignee_ids: [...formData.assignee_ids, emp.id]}); }} className={`flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs font-bold transition-all shadow-sm ${isSelected ? 'bg-gradient-to-r from-blue-900 to-indigo-800 text-white border-transparent' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'}`}>{emp.profile_image_url ? <img src={emp.profile_image_url} alt="" className="h-4 w-4 sm:h-5 sm:w-5 rounded-full object-cover shadow-sm" /> : <User className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />} {emp.name}</button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* TASKS PANEL */}
                    <div className="lg:w-[380px] shrink-0 flex flex-col lg:border-l lg:border-t-0 border-t border-slate-100 lg:pl-8 pt-6 lg:pt-0">
                      <h3 className="text-[13px] sm:text-sm font-bold text-slate-900 mb-4 sm:mb-5 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500"/> Action Items</h3>
                      <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 pr-2 max-h-[300px] lg:max-h-[500px] max-sm:[&::-webkit-scrollbar]:hidden max-sm:[-ms-overflow-style:none] max-sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:w-1.5 sm:[&::-webkit-scrollbar-thumb]:bg-slate-200 sm:[&::-webkit-scrollbar-thumb]:rounded-full">
                        {displayTasks.length === 0 ? (
                          <div className="h-32 sm:h-40 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl sm:rounded-3xl border border-dashed border-slate-200"><p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">No tasks added</p></div>
                        ) : (
                          displayTasks.map((task, index) => (
                            <div key={task.id || index} onClick={() => toggleTask(task, index)} className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${task.is_completed ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 hover:border-blue-200 shadow-sm'}`}>
                              <div className={`mt-0.5 h-4 w-4 sm:h-5 sm:w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${task.is_completed ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>{task.is_completed && <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />}</div>
                              <div className="flex-1 min-w-0"><p className={`text-[12px] sm:text-[13px] font-bold leading-relaxed break-words ${task.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.title}</p>{task.assignee_id && <p className="text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-1 sm:mt-1.5 truncate">{getAvatar(task.assignee_id)?.name}</p>}</div>
                            </div>
                          ))
                        )}
                      </div>
                      {(role === 'admin' || role === 'head') && (
                        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-100 space-y-2 sm:space-y-3">
                           <input type="text" placeholder="New task title..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTask()} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 px-3 sm:px-4 text-[12px] sm:text-[13px] font-medium outline-none focus:border-blue-500 shadow-sm" />
                           <div className="flex gap-2">
                             <select value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(parseInt(e.target.value) || "")} className="flex-1 h-10 sm:h-12 rounded-xl border border-slate-200 px-2 sm:px-3 text-[11px] sm:text-[13px] font-medium outline-none bg-white shadow-sm cursor-pointer"><option value="">Anyone</option>{(formData.assignee_ids || []).map(id => <option key={id} value={id}>{getAvatar(id)?.name || 'Unknown'}</option>)}</select>
                             <button onClick={handleAddTask} className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl flex items-center justify-center font-bold shadow-md hover:shadow-lg transition-all"><Plus className="h-4 w-4 sm:h-5 sm:w-5" /></button>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: REPORTS TIMELINE */}
                {modalTab === 'progress' && (
                  <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-8 flex flex-col items-center max-sm:[&::-webkit-scrollbar]:hidden max-sm:[-ms-overflow-style:none] max-sm:[scrollbar-width:none]">
                    <div className="w-full max-w-3xl flex flex-col space-y-5 sm:space-y-6">
                       <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-3 sm:pb-4">
                         <h3 className="text-[14px] sm:text-base font-bold text-slate-900 uppercase tracking-wider">Project Timeline</h3>
                         <Star className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400 fill-amber-400" />
                       </div>
                       
                       {role === 'user' ? (
                         <div className="flex flex-col bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm h-full min-h-[400px]">
                           
                           <div className="flex-1 overflow-y-auto mb-5 sm:mb-6 sm:pr-4 space-y-3 sm:space-y-4 max-sm:[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:[&::-webkit-scrollbar]:w-1.5 sm:[&::-webkit-scrollbar-thumb]:bg-slate-200 sm:[&::-webkit-scrollbar-thumb]:rounded-full">
                             <h4 className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest sticky top-0 bg-white pb-2 border-b border-slate-100 mb-3 sm:mb-4 z-10">Previous Updates</h4>
                             {reports.find(r => r.project_id === selectedProject?.id && r.employee_id === employeeId)?.report_text ? (
                               <pre className="text-[12px] sm:text-[13px] text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
                                 {reports.find(r => r.project_id === selectedProject?.id && r.employee_id === employeeId)?.report_text}
                               </pre>
                             ) : (
                               <p className="text-[12px] sm:text-sm italic text-slate-400">No updates submitted yet.</p>
                             )}
                           </div>

                           <div className="border-t border-slate-100 pt-5 sm:pt-6">
                             <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 sm:mb-3">Add New Log Entry</p>
                             <textarea value={myReportText} onChange={e => setMyReportText(e.target.value)} placeholder="Type your latest progress update here..." className="w-full h-20 sm:h-24 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-[12px] sm:text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none mb-3 sm:mb-4 shadow-sm" />
                             <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
                               <div className="flex items-center gap-2 text-amber-500 font-bold text-[12px] sm:text-sm bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200"><Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-500" /> Grade: {reports.find(r => r.project_id === selectedProject?.id && r.employee_id === employeeId)?.rating || '--'} / 10</div>
                               <button onClick={handleSaveMyReport} className="w-full sm:w-auto bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl h-10 sm:h-11 px-6 sm:px-8 text-[12px] sm:text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">Append Update</button>
                             </div>
                           </div>
                         </div>
                       ) : (
                         <div className="space-y-4 sm:space-y-5">
                           {(formData.assignee_ids || []).length === 0 && <p className="text-[12px] sm:text-sm text-center text-slate-400 italic py-8 sm:py-10">No team members assigned.</p>}
                           {(formData.assignee_ids || []).map(empId => {
                             const emp = getAvatar(empId);
                             const empReport = reports.find(r => r.project_id === selectedProject?.id && r.employee_id === empId);
                             return (
                               <div key={empId} className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm">
                                 <div className="flex justify-between items-center mb-3 sm:mb-4 border-b border-slate-50 pb-3 sm:pb-4">
                                   <div className="flex items-center gap-3 sm:gap-4"><div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] sm:text-[11px] font-bold text-slate-600 overflow-hidden">{emp?.profile_image_url ? <img src={emp.profile_image_url} alt="" className="h-full w-full object-cover" /> : (emp?.name || 'U').charAt(0).toUpperCase()}</div><p className="text-[14px] sm:text-base font-bold text-slate-900">{emp?.name}</p></div>
                                 </div>
                                 <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 min-h-[80px] max-h-[300px] overflow-y-auto">
                                   {empReport?.report_text ? <pre className="text-[12px] sm:text-[13px] text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">{empReport.report_text}</pre> : <p className="text-[12px] sm:text-sm text-slate-400 italic">No timeline entries.</p>}
                                 </div>
                               </div>
                             )
                           })}
                         </div>
                       )}
                    </div>
                  </div>
                )}

                {/* TAB 3: FINANCIALS */}
                {modalTab === 'finance' && (
                  <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-8 flex flex-col items-center max-sm:[&::-webkit-scrollbar]:hidden max-sm:[-ms-overflow-style:none] max-sm:[scrollbar-width:none]">
                    
                    {role === 'user' ? (
                       <div className="w-full max-w-2xl bg-white border border-slate-100 rounded-3xl p-6 sm:p-10 shadow-sm flex flex-col items-center">
                          <Wallet className="h-12 w-12 sm:h-16 sm:w-16 text-emerald-500 mb-4 sm:mb-6" />
                          <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2 text-center">My Financial Ledger</h2>
                          <p className="text-[12px] sm:text-sm font-medium text-slate-500 mb-6 sm:mb-10 text-center">Your compensation breakdown and payment history for {selectedProject.name}.</p>
                          
                          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                             <div className="bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center">
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Earned</p>
                                <p className="text-xl sm:text-2xl font-black text-emerald-600">₹{userTotalAllocated.toLocaleString()}</p>
                             </div>
                             <div className="bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center">
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Payments Rec'd</p>
                                <p className="text-xl sm:text-2xl font-black text-slate-800">₹{userTotalEarned.toLocaleString()}</p>
                             </div>
                             <div className="bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center">
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Balance Due</p>
                                <p className="text-xl sm:text-2xl font-black text-rose-500">₹{userBalanceDue.toLocaleString()}</p>
                             </div>
                          </div>

                          <button onClick={handlePrintPayslip} disabled={isPrintingPayslip} className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl h-12 sm:h-14 px-6 sm:px-10 text-[12px] sm:text-sm font-bold shadow-xl shadow-blue-900/20 hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center gap-2">
                             <Download className="h-4 w-4 sm:h-5 sm:w-5" /> Download PDF Payslip
                          </button>
                       </div>
                    ) : (
                       <div className="w-full max-w-5xl space-y-6 sm:space-y-8">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
                            <div>
                              <h3 className="text-[16px] sm:text-xl font-bold text-slate-900">Project Compensation & Payouts</h3>
                              <p className="text-[11px] sm:text-sm font-medium text-slate-500 mt-0.5 sm:mt-1">Assign funds and issue payments from this project's revenue.</p>
                            </div>
                            <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500 opacity-50 shrink-0" />
                          </div>

                          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl sm:rounded-3xl overflow-hidden">
                             {/* Mobile Scrollable Table Wrapper */}
                             <div className="overflow-x-auto max-sm:[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                               <div className="min-w-[700px]">
                                 <div className="grid grid-cols-12 gap-4 bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    <div className="col-span-3">Team Member</div>
                                    <div className="col-span-2">Allocated (₹)</div>
                                    <div className="col-span-2">Bonus (₹)</div>
                                    <div className="col-span-2 text-emerald-600">Paid (₹)</div>
                                    <div className="col-span-3 text-right">Balance Due (₹)</div>
                                 </div>
                                 
                                 {(formData.assignee_ids || []).length === 0 && <p className="text-[12px] sm:text-sm text-center text-slate-400 italic py-6 sm:py-8">No team members assigned.</p>}
                                 
                                 <div className="divide-y divide-slate-50">
                                    {(formData.assignee_ids || []).map(empId => {
                                       const emp = getAvatar(empId);
                                       const alloc = allocationsForm[empId] || {allocated: 0, incentive: 0};
                                       
                                       const empPaid = salaryPayments.filter(sp => sp.project_id === selectedProject.id && sp.employee_id === empId).reduce((sum, sp) => sum + parseFloat(sp.amount || 0), 0);
                                       
                                       const lineTotal = alloc.allocated + alloc.incentive;
                                       const empBalance = lineTotal - empPaid;

                                       return (
                                         <div key={empId} className="grid grid-cols-12 gap-4 items-center px-4 sm:px-6 py-3 sm:py-4 hover:bg-blue-50/30 transition-colors">
                                            <div className="col-span-3 flex items-center gap-2 sm:gap-3">
                                              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-100 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-slate-600 overflow-hidden shadow-sm shrink-0">{emp?.profile_image_url ? <img src={emp.profile_image_url} alt="" className="h-full w-full object-cover" /> : (emp?.name || 'U').charAt(0).toUpperCase()}</div>
                                              <span className="text-[12px] sm:text-sm font-bold text-slate-900 truncate">{emp?.name}</span>
                                            </div>
                                            <div className="col-span-2">
                                               <input type="number" value={alloc.allocated} onChange={e => setAllocationsForm({...allocationsForm, [empId]: {...alloc, allocated: parseFloat(e.target.value)||0}})} className="w-full h-9 sm:h-10 border border-slate-200 rounded-lg sm:rounded-xl px-2 sm:px-3 font-bold text-[12px] sm:text-sm outline-none focus:border-blue-500 transition-all" />
                                            </div>
                                            <div className="col-span-2">
                                               <input type="number" value={alloc.incentive} onChange={e => setAllocationsForm({...allocationsForm, [empId]: {...alloc, incentive: parseFloat(e.target.value)||0}})} className="w-full h-9 sm:h-10 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg sm:rounded-xl px-2 sm:px-3 font-bold text-[12px] sm:text-sm outline-none focus:border-emerald-500 transition-all" />
                                            </div>
                                            <div className="col-span-2 text-[12px] sm:text-sm font-bold text-emerald-600">
                                               ₹{empPaid.toLocaleString()}
                                            </div>
                                            <div className="col-span-3 text-right text-[14px] sm:text-base font-black text-slate-900">
                                               ₹{empBalance.toLocaleString()}
                                            </div>
                                         </div>
                                       )
                                    })}
                                 </div>
                               </div>
                             </div>
                             <div className="bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 flex justify-end">
                                <button onClick={handleSaveAllocations} disabled={isSaving} className="bg-white border border-slate-200 text-slate-800 hover:text-blue-600 hover:border-blue-200 rounded-lg sm:rounded-xl h-9 sm:h-10 px-4 sm:px-6 text-[11px] sm:text-xs font-bold shadow-sm transition-all">Save Allocations</button>
                             </div>
                          </div>

                          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl sm:rounded-3xl p-5 sm:p-8">
                             <h4 className="text-[12px] sm:text-sm font-bold text-emerald-800 uppercase tracking-widest mb-4 sm:mb-6">Issue Payout / Advance</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
                                <div className="lg:col-span-1">
                                  <label className="text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase block mb-1.5 px-1">Employee</label>
                                  <select value={paymentForm.employee_id} onChange={e => setPaymentForm({...paymentForm, employee_id: e.target.value})} className="w-full h-10 sm:h-11 rounded-xl border border-emerald-200 bg-white px-3 text-[12px] sm:text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 shadow-sm cursor-pointer"><option value="">-- Select --</option>{(formData.assignee_ids || []).map(id => <option key={id} value={id}>{getAvatar(id)?.name}</option>)}</select>
                                </div>
                                <div className="lg:col-span-1">
                                  <label className="text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase block mb-1.5 px-1">Amount (₹)</label>
                                  <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value)||0})} className="w-full h-10 sm:h-11 rounded-xl border border-emerald-200 bg-white px-3 text-[12px] sm:text-sm font-black text-emerald-700 outline-none focus:border-emerald-500 shadow-sm" />
                                </div>
                                <div className="lg:col-span-1">
                                  <label className="text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase block mb-1.5 px-1">Type</label>
                                  <select value={paymentForm.payment_type} onChange={e => setPaymentForm({...paymentForm, payment_type: e.target.value})} className="w-full h-10 sm:h-11 rounded-xl border border-emerald-200 bg-white px-3 text-[12px] sm:text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 shadow-sm cursor-pointer"><option>Advance</option><option>Final Payout</option><option>Incentive / Bonus</option></select>
                                </div>
                                <div className="lg:col-span-2">
                                  <label className="text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase block mb-1.5 px-1">Notes (Optional)</label>
                                  <div className="flex gap-2">
                                    <input type="text" placeholder="Ref or details..." value={paymentForm.notes} onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})} className="flex-1 h-10 sm:h-11 rounded-xl border border-emerald-200 bg-white px-3 text-[12px] sm:text-sm font-medium outline-none focus:border-emerald-500 shadow-sm" />
                                    <button onClick={handleRecordProjectPayment} disabled={isSaving} className="h-10 sm:h-11 px-4 sm:px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[11px] sm:text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all shrink-0">Transfer</button>
                                  </div>
                                </div>
                             </div>

                             <div className="mt-6 sm:mt-8 border-t border-emerald-100 pt-6 sm:pt-8">
                               <h4 className="text-[12px] sm:text-sm font-bold text-emerald-800 uppercase tracking-widest mb-4 sm:mb-6">Recorded Payouts History</h4>
                               
                                {/* Mobile Scrollable List for Payouts */}
                                <div className="overflow-x-auto max-sm:[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                  <div className="min-w-[500px] space-y-2 sm:space-y-3">
                                     {salaryPayments.filter(sp => sp.project_id === selectedProject.id).length === 0 ? (
                                       <p className="text-[12px] sm:text-sm italic text-emerald-600/70">No payments recorded for this project.</p>
                                     ) : salaryPayments.filter(sp => sp.project_id === selectedProject.id).map(p => (
                                       <div key={p.id} className="flex justify-between items-center bg-white p-3 sm:p-4 rounded-xl border border-emerald-100 shadow-sm">
                                          <div className="flex items-center gap-2 sm:gap-3">
                                             <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" /></div>
                                             <div>
                                               <p className="text-[12px] sm:text-sm font-bold text-slate-900">{getAvatar(p.employee_id)?.name} <span className="text-slate-400 font-medium ml-1">({p.payment_type})</span></p>
                                               <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{new Date(p.payment_date).toLocaleDateString()} {p.notes && `• Ref: ${p.notes}`}</p>
                                             </div>
                                          </div>
                                          <div className="flex items-center gap-3 sm:gap-4">
                                            <p className="text-[14px] sm:text-base font-bold text-emerald-600">₹{parseFloat(p.amount).toLocaleString()}</p>
                                            <button onClick={() => handleDeleteProjectPayment(p.id)} className="sm:opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:text-rose-600 bg-rose-50 p-1.5 rounded-lg shrink-0"><Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>
                                          </div>
                                       </div>
                                     ))}
                                  </div>
                                </div>
                             </div>
                          </div>
                       </div>
                    )}
                  </div>
                )}

                <div className="p-4 sm:p-6 border-t border-slate-100 bg-[#FAFCFF] flex justify-end items-center gap-2 sm:gap-4 shrink-0 mt-auto">
                  {selectedProject && (role === 'admin' || role === 'head') && modalTab === 'details' && (
                    <button onClick={handleDeleteProject} disabled={isSaving} className="border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 rounded-xl h-10 sm:h-12 px-3 sm:px-5 flex items-center justify-center shadow-sm mr-auto transition-colors shrink-0"><Trash2 className="h-4 w-4" /></button>
                  )}
                  <button onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 bg-white h-10 sm:h-12 px-4 sm:px-8 font-bold text-[12px] sm:text-sm text-slate-600 hover:bg-slate-50 shadow-sm transition-colors flex-1 sm:flex-none">Close</button>
                  {(role === 'admin' || role === 'head') && modalTab === 'details' && (
                    <button onClick={handleSaveProject} disabled={isSaving} className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl h-10 sm:h-12 px-6 sm:px-10 font-bold text-[12px] sm:text-sm shadow-md shadow-blue-900/20 hover:shadow-lg hover:-translate-y-0.5 transition-all flex-1 sm:flex-none flex items-center justify-center">
                      {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save Details"}
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}