import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, FolderKanban, CheckCircle2, AlertCircle, X, Check, FileText, User, Trash2, Wallet, Star, ChevronDown } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";
import { Button } from "../../components/ui/button";
import { supabase } from "../../supabase";

const STATUS_OPTIONS = ['Planning', 'In Progress', 'Review', 'Completed'];

export default function ProjectsPage() {
  const { role, employeeId, activeWorkspace, companyId } = useAuthStore();
  
  const store = useDataStore();
  const projects = store.projects || [];
  const tasks = store.tasks || [];
  const reports = store.reports || []; 
  const employees = store.employees || [];
  const companies = store.companies || [];
  const customers = store.customers || [];
  const fetchAllData = store.fetchAllData;

  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"details" | "progress" | "finance">("details");
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({ name: "", description: "", priority: "Medium", status: "Planning", total_value: 0, advance_paid: 0, approval_date: today, due_date: "", company_id: "", customer_id: "", assignee_ids: [] as number[] });
  const [customerType, setCustomerType] = useState<"existing" | "new" | "in_house">("existing");
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState<number | "">("");
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);

  const [myReportText, setMyReportText] = useState("");

  const currentCompanyId = role === 'admin' ? (activeWorkspace || "") : companyId;

  const visibleProjects = projects.filter(p => {
    if (!p.name || p.name.trim() === "") return false;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isAssigned = role !== 'user' || (p.assignee_ids || []).includes(employeeId);
    return matchesSearch && isAssigned;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const availableCustomers = customers.filter(c => c.company_id === parseInt(formData.company_id));
  const availableEmployees = employees.filter(emp => emp.access_level === 'admin' || emp.company_id === parseInt(formData.company_id));

  const openNewProject = () => {
    setSelectedProject(null);
    setFormData({ name: "", description: "", priority: "Medium", status: "Planning", total_value: 0, advance_paid: 0, approval_date: today, due_date: "", company_id: currentCompanyId?.toString() || "", customer_id: "", assignee_ids: [] });
    setCustomerType("existing"); setNewCustomer({ name: "", phone: "" }); setPendingTasks([]); setNewTaskTitle(""); setNewTaskAssignee("");
    setModalTab("details");
    setIsModalOpen(true);
  };

  const openProjectDetails = (project: any) => {
    setSelectedProject(project);
    setFormData({
      name: project.name || "", description: project.description || "", priority: project.priority || "Medium", status: project.status || "Planning", total_value: project.total_value || 0,
      advance_paid: project.advance_paid || 0, approval_date: project.approval_date || today, due_date: project.due_date || "", company_id: project.company_id?.toString() || "", 
      customer_id: project.customer_id?.toString() || "", assignee_ids: project.assignee_ids || []
    });
    setCustomerType(project.customer_id ? "existing" : "in_house"); setNewCustomer({ name: "", phone: "" }); setPendingTasks([]); setNewTaskTitle(""); setNewTaskAssignee("");
    
    const myExistingReport = reports.find(r => r.project_id === project.id && r.employee_id === employeeId);
    setMyReportText(myExistingReport?.report_text || "");

    setModalTab("details");
    setIsModalOpen(true);
  };

  const handleSaveProject = async () => {
    if (!formData.name.trim()) return alert("Project name is required.");
    if (!formData.company_id) return alert("Please select a Company for this project.");
    
    let finalCustomerId: number | null = formData.customer_id ? parseInt(formData.customer_id) : null;
    if (customerType === 'existing' && !finalCustomerId) return alert("Please select an existing customer.");
    
    setIsSaving(true);
    try {
      if (customerType === 'new') {
        if (!newCustomer.name.trim()) { setIsSaving(false); return alert("New Customer Name is required."); }
        const { data: cData, error: cError } = await supabase.from('customers').insert([{ company_id: parseInt(formData.company_id), name: newCustomer.name, phone: newCustomer.phone }]).select().single();
        if (cError) throw cError;
        finalCustomerId = cData.id;
      } else if (customerType === 'in_house') { finalCustomerId = null; }

      const payload = { ...formData, company_id: parseInt(formData.company_id), customer_id: finalCustomerId, approval_date: formData.approval_date || null, due_date: formData.due_date || null };
      
      if (!selectedProject) {
        const { data, error } = await supabase.from('projects').insert([payload]).select().single();
        if (error) throw error;
        if (pendingTasks.length > 0) {
          const tasksToInsert = pendingTasks.map(t => ({ project_id: data.id, title: t.title, assignee_id: t.assignee_id, is_completed: t.is_completed }));
          await supabase.from('project_tasks').insert(tasksToInsert);
        }
      } else {
        await supabase.from('projects').update(payload).eq('id', selectedProject.id);
      }
      await fetchAllData();
      setIsModalOpen(false);
    } catch (error: any) { alert(`Error: ${error.message}`); } finally { setIsSaving(false); }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    if (!window.confirm(`Are you sure you want to delete "${selectedProject.name}"?`)) return;
    setIsSaving(true);
    try {
      await supabase.from('projects').delete().eq('id', selectedProject.id);
      await fetchAllData(); setIsModalOpen(false);
    } catch (error: any) { alert(`Error deleting project: ${error.message}`); } finally { setIsSaving(false); }
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

  const handleSaveMyReport = async () => {
    if (!selectedProject) return;
    await supabase.from('project_reports').upsert({ project_id: selectedProject.id, employee_id: employeeId, report_text: myReportText }, { onConflict: 'project_id, employee_id' });
    alert("Completion report submitted.");
    await fetchAllData();
  };

  const handleRateEmployee = async (empId: number, rating: number) => {
    if (!selectedProject) return;
    if (rating < 0 || rating > 10) return alert("Rating must be between 0 and 10.");
    await supabase.from('project_reports').upsert({ project_id: selectedProject.id, employee_id: empId, rating: rating }, { onConflict: 'project_id, employee_id' });
    await fetchAllData();
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

  const getAvatar = (id: number) => employees.find(e => e.id === id);
  const displayTasks = selectedProject ? tasks.filter(t => t.project_id === selectedProject.id) : pendingTasks;
  const balanceDue = formData.total_value - formData.advance_paid;

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Planning': return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'Review': return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
      case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-700 pb-8">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-2 bg-blue-50 inline-block px-3 py-1 rounded-full">Workflows & Tasks</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mt-2">Projects.</h1>
        </div>
        {(role === 'admin' || role === 'head') && (
          <button onClick={openNewProject} className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-lg shadow-blue-900/20 hover:shadow-xl hover:-translate-y-0.5 px-6 py-3 rounded-2xl text-[13px] font-bold transition-all flex items-center shrink-0">
            <Plus className="h-4 w-4 mr-2" /> New Project
          </button>
        )}
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search projects by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-11 pl-11 pr-4 rounded-xl border-none text-sm font-medium outline-none bg-transparent focus:ring-0 placeholder:text-slate-400" />
        </div>
      </div>

      {/* --- DOSSIER GRID --- */}
      <div className="space-y-4">
        {visibleProjects.length === 0 ? (
           <div className="h-64 border border-slate-200 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <FolderKanban className="h-10 w-10 mb-3 text-slate-300" />
              <p className="text-sm font-bold uppercase tracking-wider">No Projects Found</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {visibleProjects.map(project => {
              const projectTasks = tasks.filter(t => t.project_id === project.id);
              const completedTasks = projectTasks.filter(t => t.is_completed).length;
              const totalTasks = projectTasks.length;
              const progressPct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
              const radius = 18; const circumference = 2 * Math.PI * radius; const progressOffset = circumference - (progressPct / 100) * circumference;

              return (
                <div key={project.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${project.priority === 'High' ? 'bg-rose-500' : project.priority === 'Medium' ? 'bg-amber-500' : 'bg-slate-300'}`} />

                  {/* Pending Approval Banner */}
                  {project.pending_status && (
                    <div className="bg-amber-50/80 ml-1.5 px-5 py-3 border-b border-amber-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-800 text-[11px] font-bold uppercase tracking-wider">
                        <AlertCircle className="h-4 w-4 text-amber-600" /> Requested: Move to {project.pending_status}
                      </div>
                      {(role === 'admin' || role === 'head') && (
                         <div className="flex gap-2">
                           <button onClick={() => handleApproval(project, true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase tracking-wider font-bold px-3.5 py-1.5 rounded-lg transition-all shadow-sm">Approve</button>
                           <button onClick={() => handleApproval(project, false)} className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[10px] uppercase tracking-wider font-bold px-3.5 py-1.5 rounded-lg transition-colors">Reject</button>
                         </div>
                      )}
                    </div>
                  )}

                  <div className="ml-1.5 p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <h3 onClick={() => openProjectDetails(project)} className="text-lg font-bold text-slate-900 tracking-tight cursor-pointer hover:text-blue-900 transition-colors inline-block">{project.name}</h3>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1 mb-4 truncate">
                        {companies.find(c => c.id === project.company_id)?.name || 'Network'} {project.customer_id && `• ${customers.find(c => c.id === project.customer_id)?.name}`}
                      </p>
                      
                      <div className="flex -space-x-2">
                        {(project.assignee_ids || []).slice(0, 5).map((id: number) => {
                          const emp = getAvatar(id);
                          return (
                            <div key={id} className="h-8 w-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-600 overflow-hidden shadow-sm" title={emp?.name}>
                              {emp?.profile_image_url ? <img src={emp.profile_image_url} alt="Profile" className="h-full w-full object-cover" /> : (emp?.name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )
                        })}
                        {(project.assignee_ids || []).length > 5 && <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm">+{(project.assignee_ids || []).length - 5}</div>}
                        {(project.assignee_ids || []).length === 0 && <span className="text-[11px] font-semibold text-slate-400 pl-2">Unassigned</span>}
                      </div>
                    </div>

                    {/* Circular Telemetry */}
                    <div className="w-full md:w-auto flex items-center gap-4 md:border-l md:border-slate-100 md:pl-6">
                       <div className="relative h-12 w-12 flex items-center justify-center shrink-0">
                         <svg className="h-12 w-12 transform -rotate-90">
                           <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="3.5" fill="transparent" className="text-slate-100" />
                           <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="3.5" fill="transparent" strokeDasharray={circumference} strokeDashoffset={progressOffset} strokeLinecap="round" className={`${progressPct === 100 ? 'text-emerald-500' : 'text-blue-900'} transition-all duration-1000 ease-out`} />
                         </svg>
                         <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-slate-800">{progressPct}%</div>
                       </div>
                       <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tasks Done</p>
                         <p className="text-sm font-bold text-slate-800">{completedTasks} / {totalTasks}</p>
                       </div>
                    </div>

                    {/* Status Pill & Value */}
                    <div className="w-full md:w-44 flex flex-col gap-2.5 md:border-l md:border-slate-100 md:pl-6">
                       {(role === 'admin' || role === 'head') && (
                         <div className="flex justify-between items-center bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-100">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Value</span>
                           <span className="text-xs font-bold text-emerald-600">₹{project.total_value}</span>
                         </div>
                       )}

                       <div className="relative">
                         <select value={project.status || 'Planning'} onChange={(e) => updateProjectStatus(project, e.target.value)} disabled={role === 'user' && !!project.pending_status} className={`w-full h-9 rounded-xl px-3.5 pr-8 text-[11px] font-bold uppercase tracking-wider cursor-pointer outline-none appearance-none border transition-all ${getStatusStyle(project.status || 'Planning')}`}>
                            {STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className="text-slate-900 bg-white">{opt}</option>)}
                         </select>
                         <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-50 pointer-events-none" />
                       </div>
                       {role === 'user' && !project.pending_status && <p className="text-[9px] text-center text-slate-400 font-medium">Click to request move</p>}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- SOFT MULTI-TAB MODAL --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
              
              <div className="px-8 pt-7 border-b border-slate-100 bg-[#FAFCFF] shrink-0">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Workspace</span>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight mt-1.5">{selectedProject ? selectedProject.name : 'Create New Project'}</h3>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="h-9 w-9 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-colors"><X className="h-4 w-4" /></button>
                </div>
                
                <div className="flex gap-8">
                  <button onClick={() => setModalTab('details')} className={`pb-3 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 ${modalTab === 'details' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>1. Details & Tasks</button>
                  <button onClick={() => setModalTab('progress')} disabled={!selectedProject} className={`pb-3 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 ${!selectedProject ? 'opacity-30 cursor-not-allowed' : modalTab === 'progress' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>2. Reports & Ratings</button>
                  <button onClick={() => setModalTab('finance')} disabled={!selectedProject || role === 'user'} className={`pb-3 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 ${(!selectedProject || role === 'user') ? 'opacity-30 cursor-not-allowed hidden sm:block' : modalTab === 'finance' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>3. Financials</button>
                </div>
              </div>

              {/* TAB 1: DETAILS & TASKS */}
              {modalTab === 'details' && (
                <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-10 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                  
                  <div className="flex-1 space-y-6">
                    
                    {/* ENHANCED CLIENT ALLOCATION BLOCK */}
                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                           <h4 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">Client Configuration</h4>
                           <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Link this project to a subsidiary and customer.</p>
                        </div>
                        <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm w-full sm:w-auto">
                          <button type="button" onClick={() => setCustomerType('existing')} className={`flex-1 sm:flex-none whitespace-nowrap px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${customerType === 'existing' ? 'bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>Existing</button>
                          <button type="button" onClick={() => setCustomerType('new')} className={`flex-1 sm:flex-none whitespace-nowrap px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${customerType === 'new' ? 'bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>New</button>
                          <button type="button" onClick={() => setCustomerType('in_house')} className={`flex-1 sm:flex-none whitespace-nowrap px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${customerType === 'in_house' ? 'bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>In-House</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Subsidiary / Company</label>
                          <select value={formData.company_id} onChange={(e) => setFormData({...formData, company_id: e.target.value, customer_id: "", assignee_ids: []})} disabled={role !== 'admin' || activeWorkspace !== null} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 transition-all">
                            <option value="" disabled>Select Company...</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Customer / Client <span className="text-rose-500">*</span></label>
                          {customerType === 'existing' && (
                            <select value={formData.customer_id} onChange={(e) => setFormData({...formData, customer_id: e.target.value})} disabled={role === 'user' || !formData.company_id} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm disabled:bg-slate-100 disabled:text-slate-400 transition-all">
                              <option value="">-- Select Client --</option>
                              {availableCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          )}
                          {customerType === 'new' && (
                            <div className="grid grid-cols-2 gap-3">
                              <input type="text" placeholder="Client Name *" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} disabled={role === 'user' || !formData.company_id} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm disabled:bg-slate-100 transition-all" />
                              <input type="text" placeholder="Phone (Optional)" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} disabled={role === 'user' || !formData.company_id} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm disabled:bg-slate-100 transition-all" />
                            </div>
                          )}
                          {customerType === 'in_house' && (
                            <div className="w-full h-12 rounded-xl border border-slate-200 border-dashed bg-white/50 flex items-center justify-center">
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Internal Project (No Client)</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Project Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} disabled={role === 'user'} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm disabled:bg-slate-50" /></div>
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} disabled={role === 'user'} className="w-full h-24 rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm resize-none disabled:bg-slate-50" /></div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Priority</label><select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} disabled={role === 'user'} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none shadow-sm cursor-pointer focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all disabled:bg-slate-50"><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select></div>
                      <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Approval Date</label><input type="date" value={formData.approval_date} onChange={(e) => setFormData({...formData, approval_date: e.target.value})} disabled={role === 'user'} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all disabled:bg-slate-50" /></div>
                      <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Due Date</label><input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} disabled={role === 'user'} className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all disabled:bg-slate-50" /></div>
                    </div>

                    {(role === 'admin' || role === 'head') && (
                      <div className="pt-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3 px-1">Assign Team Members {!formData.company_id && <span className="text-amber-500 lowercase font-medium ml-1">(Select company first)</span>}</label>
                        <div className="flex flex-wrap gap-2.5">
                          {availableEmployees.map(emp => {
                            const isSelected = formData.assignee_ids.includes(emp.id);
                            return (
                              <button key={emp.id} onClick={() => { if (isSelected) setFormData({...formData, assignee_ids: formData.assignee_ids.filter(id => id !== emp.id)}); else setFormData({...formData, assignee_ids: [...formData.assignee_ids, emp.id]}); }} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${isSelected ? 'bg-gradient-to-r from-blue-900 to-indigo-800 text-white border-transparent' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'}`}>{emp.profile_image_url ? <img src={emp.profile_image_url} alt="" className="h-5 w-5 rounded-full object-cover shadow-sm" /> : <User className="h-4 w-4 text-slate-400" />} {emp.name}</button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Task Checklist */}
                  <div className="lg:w-[380px] shrink-0 flex flex-col lg:border-l lg:border-t-0 border-t border-slate-100 lg:pl-8 pt-6 lg:pt-0">
                    <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-500"/> Action Items</h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[350px] lg:max-h-[500px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                      {displayTasks.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                           <p className="text-[11px] font-bold uppercase tracking-wider">No tasks added</p>
                        </div>
                      ) : (
                        displayTasks.map((task, index) => (
                          <div key={task.id || index} onClick={() => toggleTask(task, index)} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${task.is_completed ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 hover:border-blue-200 shadow-sm'}`}>
                            <div className={`mt-0.5 h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${task.is_completed ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>{task.is_completed && <Check className="h-3.5 w-3.5 text-white" />}</div>
                            <div className="flex-1 min-w-0"><p className={`text-[13px] font-bold leading-relaxed break-words ${task.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.title}</p>{task.assignee_id && <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-1.5 truncate">{getAvatar(task.assignee_id)?.name}</p>}</div>
                          </div>
                        ))
                      )}
                    </div>

                    {(role === 'admin' || role === 'head') && (
                      <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                         <input type="text" placeholder="New task title..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTask()} className="w-full h-12 rounded-xl border border-slate-200 px-4 text-[13px] font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" />
                         <div className="flex gap-2">
                           <select value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(parseInt(e.target.value) || "")} className="flex-1 h-12 rounded-xl border border-slate-200 px-3 text-[13px] font-medium outline-none bg-white shadow-sm cursor-pointer"><option value="">Anyone</option>{(formData.assignee_ids || []).map(id => <option key={id} value={id}>{getAvatar(id)?.name || 'Unknown'}</option>)}</select>
                           <button onClick={handleAddTask} className="h-12 w-12 bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl flex items-center justify-center font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"><Plus className="h-5 w-5" /></button>
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: REPORTS & RATINGS */}
              {modalTab === 'progress' && (
                <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
                  <div className="w-full max-w-3xl flex flex-col space-y-6">
                     <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-4">
                       <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">Completion Reports & Ratings</h3>
                       <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
                     </div>
                     
                     {role === 'user' ? (
                       <div className="flex flex-col bg-white border border-slate-100 rounded-3xl p-8 shadow-sm min-h-[350px]">
                         <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">My Completion Report</p>
                         <textarea value={myReportText} onChange={e => setMyReportText(e.target.value)} placeholder="Summarize the work you completed..." className="flex-1 w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none mb-6" />
                         <div className="flex justify-between items-center pt-5 border-t border-slate-100">
                           <div className="flex items-center gap-2.5 text-amber-500 font-bold text-lg"><Star className="h-5 w-5 fill-amber-500" /> Grade: {reports.find(r => r.project_id === selectedProject?.id && r.employee_id === employeeId)?.rating || '--'} / 10</div>
                           <button onClick={handleSaveMyReport} className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl h-12 px-8 text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">Submit Report</button>
                         </div>
                       </div>
                     ) : (
                       <div className="space-y-5">
                         {(formData.assignee_ids || []).length === 0 && <p className="text-sm text-center text-slate-400 italic py-10">No team members assigned to this project.</p>}
                         {(formData.assignee_ids || []).map(empId => {
                           const emp = getAvatar(empId);
                           const empReport = reports.find(r => r.project_id === selectedProject?.id && r.employee_id === empId);
                           return (
                             <div key={empId} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                               <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-4">
                                 <div className="flex items-center gap-4"><div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600 overflow-hidden">{emp?.profile_image_url ? <img src={emp.profile_image_url} alt="" className="h-full w-full object-cover" /> : (emp?.name || 'U').charAt(0).toUpperCase()}</div><p className="text-base font-bold text-slate-900">{emp?.name}</p></div>
                                 <div className="flex items-center gap-3"><input type="number" min="0" max="10" placeholder="/10" defaultValue={empReport?.rating || ""} onBlur={(e) => handleRateEmployee(empId, parseInt(e.target.value))} className="w-16 h-10 border border-slate-200 rounded-xl text-sm font-bold text-center text-amber-600 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all" /><Star className="h-5 w-5 text-amber-400 fill-amber-400" /></div>
                               </div>
                               <div className="bg-slate-50 rounded-2xl p-5 min-h-[80px]">
                                 {empReport?.report_text ? <p className="text-sm text-slate-700 leading-relaxed">{empReport.report_text}</p> : <p className="text-sm text-slate-400 italic">No report submitted yet.</p>}
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
              {modalTab === 'finance' && (role === 'admin' || role === 'head') && (
                <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
                   <div className="w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
                     <div className="flex items-center justify-between mb-8 pb-5 border-b border-slate-50">
                       <h3 className="text-xl font-bold text-slate-900">Project Financials</h3>
                       <Wallet className="h-6 w-6 text-slate-400" />
                     </div>
                     <div className="space-y-6">
                       <div><label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Total Project Value (₹)</label><input type="number" value={formData.total_value} onChange={(e) => setFormData({...formData, total_value: parseFloat(e.target.value) || 0})} className="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-lg font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" /></div>
                       <div><label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Advance Paid (₹)</label><input type="number" value={formData.advance_paid} onChange={(e) => setFormData({...formData, advance_paid: parseFloat(e.target.value) || 0})} className="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-lg font-bold text-emerald-600 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all" /></div>
                       <div className="pt-6 border-t border-slate-100 flex justify-between items-center"><span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Balance Due:</span><span className="text-3xl font-bold text-rose-500 tracking-tight">₹{balanceDue}</span></div>
                     </div>
                   </div>
                </div>
              )}

              <div className="p-6 border-t border-slate-100 bg-[#FAFCFF] flex justify-end items-center gap-4 shrink-0">
                {selectedProject && (role === 'admin' || role === 'head') && modalTab === 'details' && (
                  <button onClick={handleDeleteProject} disabled={isSaving} className="border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 rounded-xl h-12 px-5 flex items-center justify-center shadow-sm mr-auto transition-colors"><Trash2 className="h-4 w-4" /></button>
                )}
                <button onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 bg-white h-12 px-8 font-bold text-sm text-slate-600 hover:bg-slate-50 shadow-sm transition-colors">Cancel</button>
                {(role === 'admin' || role === 'head') && (
                  <button onClick={handleSaveProject} disabled={isSaving} className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl h-12 px-10 font-bold text-sm shadow-md shadow-blue-900/20 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    {isSaving ? "Saving..." : "Save Workspace"}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}