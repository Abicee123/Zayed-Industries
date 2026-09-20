import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, TrendingUp, Wallet, Building2, Plus, X, Receipt, CheckCircle2, UserSquare2, FileText, ArrowDownLeft, ArrowUpRight, Users, Download, BarChart3, Calendar, Filter, Clock } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";
import { supabase } from "../../supabase";

export default function FinancePage() {
  const { role, activeWorkspace, companyId } = useAuthStore();
  const { projects, invoices, salaryPayments, expenses, companies, employees, customers, fetchAllData } = useDataStore();

  const isAdmin = role === 'admin';
  const currentCompanyId = isAdmin ? (activeWorkspace || "") : companyId;
  const today = new Date().toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<"projects" | "expenses">("projects");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState<string>("all");
  const [expenseStatusFilter, setExpenseStatusFilter] = useState<string>("all");

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedProjectDetails, setSelectedProjectDetails] = useState<any>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Report Filters
  const [reportConfig, setReportConfig] = useState({
    companyId: filterCompanyId,
    startDate: '',
    endDate: today
  });

  const [expenseForm, setExpenseForm] = useState({
    company_id: currentCompanyId?.toString() || "", project_id: "", category: "Software", description: "", amount: 0, expense_date: today,
    status: "Completed", due_date: ""
  });

  const getFilteredData = (dataArray: any[]) => {
    let data = dataArray;
    if (isAdmin && !activeWorkspace) {
      if (filterCompanyId !== "all") data = data.filter(item => item.company_id?.toString() === filterCompanyId);
    } else {
      data = data.filter(item => item.company_id === currentCompanyId);
    }
    return data;
  };

  const globalInvoices = getFilteredData(invoices);
  const globalPayments = getFilteredData(salaryPayments);
  const globalExpenses = getFilteredData(expenses);
  const globalProjects = getFilteredData(projects);

  const totalMoneyIn = globalInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount_paid || 0), 0);
  const totalEmployeePayouts = globalPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const totalOverhead = globalExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const netProfit = totalMoneyIn - totalEmployeePayouts - totalOverhead;

  const handleSaveExpense = async () => {
    if (!expenseForm.company_id || expenseForm.amount <= 0 || !expenseForm.description) return alert("Fill required fields.");
    setIsSaving(true);
    try {
      await supabase.from('expenses').insert([{
        company_id: parseInt(expenseForm.company_id),
        project_id: expenseForm.project_id ? parseInt(expenseForm.project_id) : null,
        category: expenseForm.category, description: expenseForm.description, amount: expenseForm.amount, 
        expense_date: expenseForm.expense_date, status: expenseForm.status, due_date: expenseForm.due_date || null
      }]);
      await fetchAllData(); 
      setIsExpenseModalOpen(false);
      setExpenseForm({ company_id: currentCompanyId?.toString() || "", project_id: "", category: "Software", description: "", amount: 0, expense_date: today, status: "Completed", due_date: "" });
    } catch (error: any) { alert(error.message); } finally { setIsSaving(false); }
  };

  const visibleProjects = globalProjects.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  
  let visibleExpenses = [...globalExpenses]
    .sort((a,b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
    .filter(e => e.description?.toLowerCase().includes(searchQuery.toLowerCase()) || e.category?.toLowerCase().includes(searchQuery.toLowerCase()));
    
  if (expenseStatusFilter !== 'all') {
    visibleExpenses = visibleExpenses.filter(e => e.status?.toLowerCase() === expenseStatusFilter.toLowerCase());
  }

  const getProjectClientInfo = (proj: any) => {
    if (proj.customer_id) return { name: customers.find(c => c.id === proj.customer_id)?.name || 'Unknown', type: 'External Client' };
    if (proj.internal_company_id) return { name: companies.find(c => c.id === proj.internal_company_id)?.name || 'Unknown', type: 'Internal Subsidiary Transfer' };
    return { name: 'Unassigned', type: 'No Client' };
  };

  // --- REPORT GENERATION LOGIC ---
  const generateReportData = () => {
    let rInvoices = invoices;
    let rExpenses = expenses;
    let rPayments = salaryPayments;

    if (reportConfig.companyId !== 'all') {
      rInvoices = rInvoices.filter(i => i.company_id?.toString() === reportConfig.companyId);
      rExpenses = rExpenses.filter(e => e.company_id?.toString() === reportConfig.companyId);
      rPayments = rPayments.filter(p => p.company_id?.toString() === reportConfig.companyId);
    }

    if (reportConfig.startDate) {
      rInvoices = rInvoices.filter(i => new Date(i.issue_date) >= new Date(reportConfig.startDate));
      rExpenses = rExpenses.filter(e => new Date(e.expense_date) >= new Date(reportConfig.startDate));
      rPayments = rPayments.filter(p => new Date(p.payment_date) >= new Date(reportConfig.startDate));
    }
    if (reportConfig.endDate) {
      rInvoices = rInvoices.filter(i => new Date(i.issue_date) <= new Date(reportConfig.endDate));
      rExpenses = rExpenses.filter(e => new Date(e.expense_date) <= new Date(reportConfig.endDate));
      rPayments = rPayments.filter(p => new Date(p.payment_date) <= new Date(reportConfig.endDate));
    }

    const inc = rInvoices.reduce((acc, i) => acc + parseFloat(i.amount_paid || 0), 0);
    const exp = rExpenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0) + rPayments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
    
    // Grouping by Month for Chart
    const monthlyData: Record<string, { inc: number, exp: number }> = {};
    rInvoices.forEach(i => {
      const m = i.issue_date ? i.issue_date.substring(0, 7) : 'Unknown';
      if(!monthlyData[m]) monthlyData[m] = { inc: 0, exp: 0 };
      monthlyData[m].inc += parseFloat(i.amount_paid || 0);
    });
    rExpenses.forEach(e => {
      const m = e.expense_date ? e.expense_date.substring(0, 7) : 'Unknown';
      if(!monthlyData[m]) monthlyData[m] = { inc: 0, exp: 0 };
      monthlyData[m].exp += parseFloat(e.amount || 0);
    });
    rPayments.forEach(p => {
      const m = p.payment_date ? p.payment_date.substring(0, 7) : 'Unknown';
      if(!monthlyData[m]) monthlyData[m] = { inc: 0, exp: 0 };
      monthlyData[m].exp += parseFloat(p.amount || 0);
    });

    const chartData = Object.keys(monthlyData).sort().map(key => ({
      month: new Date(key + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      ...monthlyData[key]
    }));

    const maxChartVal = Math.max(...chartData.map(d => Math.max(d.inc, d.exp)), 1);

    return { inc, exp, prof: inc - exp, chartData, maxChartVal };
  };

  const reportStats = useMemo(() => generateReportData(), [reportConfig, isReportModalOpen]);

  return (
    <>
      <div className="max-w-[1200px] mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-700 pb-8 relative z-0 print:hidden">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
          <div>
            <p className="text-[9px] sm:text-[11px] font-bold text-emerald-600 uppercase tracking-[0.2em] mb-1.5 bg-emerald-50 inline-block px-2.5 py-1 rounded-full">Overview</p>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-1">Finance.</h1>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            {isAdmin && (
              <button onClick={() => setIsReportModalOpen(true)} className="h-10 sm:h-12 bg-indigo-600 text-white px-4 sm:px-5 rounded-xl sm:rounded-2xl text-[12px] sm:text-sm font-bold flex items-center shadow-sm hover:shadow-md transition-all">
                <Download className="h-4 w-4 mr-2" /> Financial Report
              </button>
            )}
            {isAdmin && !activeWorkspace && (
              <select
                value={filterCompanyId}
                onChange={(e) => setFilterCompanyId(e.target.value)}
                className="w-full sm:w-64 h-10 sm:h-12 rounded-xl sm:rounded-2xl bg-white border border-slate-200 px-3 sm:px-4 text-[12px] sm:text-sm font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-50 transition-colors shadow-sm appearance-none"
              >
                <option value="all">All Companies</option>
                {companies.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* TOP CARDS - Admin sees all, Head sees only expenses */}
        <div className={`grid gap-3 sm:gap-4 ${isAdmin ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 lg:grid-cols-2'}`}>
          {isAdmin && (
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
               <div className="h-8 w-8 sm:h-10 sm:w-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-3"><TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" /></div>
               <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 truncate">Total Income</p>
               <p className="text-lg sm:text-2xl font-black text-slate-900 truncate">₹{totalMoneyIn.toLocaleString()}</p>
            </div>
          )}
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
             <div className="h-8 w-8 sm:h-10 sm:w-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3"><Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" /></div>
             <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 truncate">Total Payroll</p>
             <p className="text-lg sm:text-2xl font-black text-slate-900 truncate">₹{totalEmployeePayouts.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
             <div className="h-8 w-8 sm:h-10 sm:w-10 bg-amber-50 rounded-lg flex items-center justify-center mb-3"><Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" /></div>
             <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 truncate">Other Expenses</p>
             <p className="text-lg sm:text-2xl font-black text-slate-900 truncate">₹{totalOverhead.toLocaleString()}</p>
          </div>
          {isAdmin && (
            <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col justify-between ${netProfit >= 0 ? 'bg-slate-900 border-slate-800' : 'bg-rose-50 border-rose-200'}`}>
               <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center mb-3 ${netProfit >= 0 ? 'bg-white/10' : 'bg-rose-100'}`}><Building2 className={`h-4 w-4 sm:h-5 sm:w-5 ${netProfit >= 0 ? 'text-white' : 'text-rose-600'}`} /></div>
               <p className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mb-0.5 truncate ${netProfit >= 0 ? 'text-slate-300' : 'text-rose-500'}`}>Net Profit</p>
               <p className={`text-lg sm:text-2xl font-black truncate ${netProfit >= 0 ? 'text-white' : 'text-rose-600'}`}>₹{netProfit.toLocaleString()}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 sm:gap-4 border-b border-slate-200 overflow-x-auto max-sm:[&::-webkit-scrollbar]:hidden">
           <button onClick={() => setActiveTab('projects')} className={`pb-2.5 sm:pb-3 text-[12px] sm:text-sm font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${activeTab === 'projects' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Project Finances</button>
           <button onClick={() => setActiveTab('expenses')} className={`pb-2.5 sm:pb-3 text-[12px] sm:text-sm font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${activeTab === 'expenses' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Other Expenses</button>
        </div>

        {/* GLOBALSEARCH BAR */}
        <div className="bg-white p-2 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm flex">
          <div className="relative flex-1">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-slate-400" />
            <input type="text" placeholder={activeTab === 'projects' ? "Search projects..." : "Search expenses by description or category..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 sm:h-11 pl-9 sm:pl-11 pr-4 rounded-lg sm:rounded-xl border-none text-[13px] sm:text-sm font-medium outline-none bg-transparent focus:ring-0 placeholder:text-slate-400" />
          </div>
        </div>

        {/* PROJECTS TAB */}
        {activeTab === 'projects' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {visibleProjects.length === 0 ? (
               <div className="col-span-full h-32 sm:h-40 border border-slate-200 border-dashed rounded-2xl flex items-center justify-center text-slate-400 bg-slate-50/50"><p className="text-[10px] font-bold uppercase tracking-widest">No Projects Found</p></div>
            ) : visibleProjects.map(project => {
              const pInvoices = globalInvoices.filter(i => i.project_id === project.id);
              const pPayments = globalPayments.filter(p => p.project_id === project.id);
              const pExpenses = globalExpenses.filter(e => e.project_id === project.id);

              const pMoneyIn = pInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount_paid || 0), 0);
              const pMoneyOut = pPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) + pExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
              const pProfit = pMoneyIn - pMoneyOut;
              const clientInfo = getProjectClientInfo(project);

              return (
                <div key={project.id} onClick={() => setSelectedProjectDetails(project)} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group cursor-pointer">
                   <div className="flex justify-between items-start mb-4 border-b border-slate-50 pb-3">
                     <div className="min-w-0 pr-2">
                       <h3 className="text-[14px] sm:text-[15px] font-bold text-slate-900 group-hover:text-emerald-700 truncate">{project.name}</h3>
                       <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">
                         {companies.find(c => c.id === project.company_id)?.name} • {clientInfo.name}
                       </p>
                     </div>
                     {isAdmin && (
                       <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-widest shrink-0 ${pProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                         {pProfit >= 0 ? 'Profit' : 'Deficit'}
                       </span>
                     )}
                   </div>

                   <div className="flex justify-between items-center gap-2">
                      {isAdmin && (
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 truncate">Income</p>
                          <p className="text-[13px] sm:text-lg font-black text-slate-700 truncate">₹{pMoneyIn.toLocaleString()}</p>
                        </div>
                      )}
                      <div className={`flex-1 min-w-0 ${isAdmin ? 'border-l border-slate-100 pl-2' : ''}`}>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 truncate">Expenses</p>
                        <p className="text-[13px] sm:text-lg font-black text-slate-700 truncate">₹{pMoneyOut.toLocaleString()}</p>
                      </div>
                      {isAdmin && (
                        <div className={`flex-1 min-w-0 border-l border-slate-100 pl-2 ${pProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5 opacity-70 truncate">Profit</p>
                          <p className="text-[14px] sm:text-xl font-black truncate">₹{pProfit.toLocaleString()}</p>
                        </div>
                      )}
                   </div>
                </div>
              )
            })}
          </div>
        )}

        {/* EXPENSES TAB */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
             <div className="flex flex-col sm:flex-row justify-between gap-3">
               <div className="flex items-center gap-2">
                 <Filter className="h-4 w-4 text-slate-400" />
                 <select value={expenseStatusFilter} onChange={(e) => setExpenseStatusFilter(e.target.value)} className="h-10 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-600 outline-none">
                   <option value="all">All Statuses</option>
                   <option value="completed">Completed</option>
                   <option value="pending">Pending</option>
                   <option value="due">Due</option>
                 </select>
               </div>
               <button onClick={() => setIsExpenseModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 shadow-sm hover:shadow-md px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center">
                 <Plus className="h-4 w-4 mr-1.5" /> Add Expense
               </button>
             </div>
             
             <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
               <div className="overflow-x-auto max-sm:[&::-webkit-scrollbar]:hidden">
                 <table className="w-full text-left text-xs sm:text-sm min-w-[600px]">
                   <thead className="bg-slate-50 border-b border-slate-100">
                     <tr>
                       <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-widest text-[9px] whitespace-nowrap">Date & Details</th>
                       <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-widest text-[9px] whitespace-nowrap">Category / Project</th>
                       <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-widest text-[9px] whitespace-nowrap">Status & Due</th>
                       <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-widest text-[9px] text-right whitespace-nowrap">Amount</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {visibleExpenses.length === 0 ? (
                       <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">No expenses match your filters.</td></tr>
                     ) : visibleExpenses.map(exp => (
                       <tr key={exp.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-bold text-[12px] sm:text-[14px] text-slate-800 truncate">{exp.description}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : ''}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider block w-max mb-1">{exp.category}</span>
                            <span className="text-[10px] text-slate-500 font-medium">{exp.project_id ? projects.find(p=>p.id===exp.project_id)?.name : 'General'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider 
                              ${exp.status?.toLowerCase() === 'completed' ? 'bg-emerald-100 text-emerald-700' 
                                : exp.status?.toLowerCase() === 'due' ? 'bg-rose-100 text-rose-700' 
                                : 'bg-amber-100 text-amber-700'}`}>
                              {exp.status || 'Completed'}
                            </span>
                            {exp.due_date && <p className="text-[9px] font-bold text-slate-400 mt-1 flex items-center gap-1"><Clock className="h-3 w-3"/> Due: {new Date(exp.due_date).toLocaleDateString()}</p>}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-900 text-[13px] sm:text-base">
                            ₹{parseFloat(exp.amount || 0).toLocaleString()}
                          </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          </div>
        )}
      </div>

      {/* PROJECT FINANCIAL DETAILS MODAL (PORTALED) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedProjectDetails && (
            <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm print:hidden">
              <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
                <div className="px-5 py-5 border-b border-slate-100 bg-[#FAFCFF] shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Financial Details</span>
                      <h3 className="text-xl font-bold text-slate-900 mt-2 truncate">{selectedProjectDetails.name}</h3>
                    </div>
                    <button onClick={() => setSelectedProjectDetails(null)} className="h-8 w-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm"><X className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 bg-white space-y-6">
                  {(() => {
                    const pInvoices = globalInvoices.filter(i => i.project_id === selectedProjectDetails.id);
                    const pPayments = globalPayments.filter(p => p.project_id === selectedProjectDetails.id);
                    const pExpenses = globalExpenses.filter(e => e.project_id === selectedProjectDetails.id);

                    const pExpected = parseFloat(selectedProjectDetails.expected_amount || 0);
                    const pMoneyIn = pInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount_paid || 0), 0);
                    const pTotalOut = pPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) + pExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                    const pProfit = pMoneyIn - pTotalOut;

                    return (
                      <>
                        <div className={`grid gap-3 sm:gap-4 ${isAdmin ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 max-w-sm'}`}>
                          {isAdmin && (
                            <>
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Expected Revenue</p>
                                <p className="text-[15px] font-black text-slate-700">₹{pExpected.toLocaleString()}</p>
                              </div>
                              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
                                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Income</p>
                                <p className="text-[15px] font-black text-emerald-700">₹{pMoneyIn.toLocaleString()}</p>
                              </div>
                            </>
                          )}
                          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-center">
                            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">Total Costs</p>
                            <p className="text-[15px] font-black text-amber-700">₹{pTotalOut.toLocaleString()}</p>
                          </div>
                          {isAdmin && (
                            <div className={`p-4 rounded-xl border text-center ${pProfit >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100'}`}>
                              <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${pProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>Profit</p>
                              <p className={`text-[15px] font-black ${pProfit >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>₹{pProfit.toLocaleString()}</p>
                            </div>
                          )}
                        </div>

                        <div className={`grid gap-6 ${isAdmin ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                          {isAdmin && (
                            <div className="space-y-3">
                              <h4 className="text-[12px] font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-500" /> Invoices</h4>
                              {pInvoices.length === 0 ? <p className="text-xs italic text-slate-400">No invoices generated.</p> : (
                                <div className="space-y-2">
                                  {pInvoices.map(inv => (
                                    <div key={inv.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                                      <div className="flex justify-between">
                                        <p className="font-bold text-slate-900 text-xs">{inv.invoice_number}</p>
                                        <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-700">{inv.status}</span>
                                      </div>
                                      <div className="flex justify-between items-end mt-2">
                                        <div className="text-[9px] font-bold text-slate-400">Total: ₹{parseFloat(inv.total_amount || 0).toLocaleString()}</div>
                                        <div className="text-xs font-black text-emerald-600">Paid: ₹{parseFloat(inv.amount_paid || 0).toLocaleString()}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="space-y-5">
                            <div className="space-y-3">
                              <h4 className="text-[12px] font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" /> Project Payroll</h4>
                              {pPayments.length === 0 ? <p className="text-xs italic text-slate-400">No employee payments recorded.</p> : (
                                <div className="space-y-2">
                                  {pPayments.map(p => {
                                    const emp = employees.find(e => e.id === p.employee_id);
                                    return (
                                      <div key={p.id} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex justify-between items-center">
                                        <div>
                                          <p className="text-xs font-bold text-slate-800">{emp?.name || 'Unknown'}</p>
                                          <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : ''}</p>
                                        </div>
                                        <p className="text-sm font-black text-slate-700">₹{parseFloat(p.amount || 0).toLocaleString()}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <div className="space-y-3">
                              <h4 className="text-[12px] font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2"><Receipt className="h-4 w-4 text-amber-500" /> Other Expenses</h4>
                              {pExpenses.length === 0 ? <p className="text-xs italic text-slate-400">No other expenses recorded.</p> : (
                                <div className="space-y-2">
                                  {pExpenses.map(e => (
                                    <div key={e.id} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex justify-between items-center">
                                      <div>
                                        <p className="text-xs font-bold text-slate-800">{e.description}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{e.expense_date ? new Date(e.expense_date).toLocaleDateString() : ''} • {e.category}</p>
                                      </div>
                                      <p className="text-sm font-black text-slate-700">₹{parseFloat(e.amount || 0).toLocaleString()}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ADD EXPENSE MODAL */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isExpenseModalOpen && (
            <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm print:hidden">
              <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-100">
                <div className="px-6 py-5 border-b border-slate-100 bg-[#FAFCFF] flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">New Expense</span>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight mt-1.5">Add Expense</h3>
                  </div>
                  <button onClick={() => setIsExpenseModalOpen(false)} className="h-8 w-8 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm"><X className="h-4 w-4" /></button>
                </div>
                
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                   {isAdmin && !activeWorkspace && (
                     <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Company</label>
                     <select value={expenseForm.company_id} onChange={e=>setExpenseForm({...expenseForm, company_id: e.target.value, project_id: ""})} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none"><option value="">-- Select --</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                   )}
                   <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Description *</label>
                   <input type="text" value={expenseForm.description} onChange={e=>setExpenseForm({...expenseForm, description: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium outline-none" placeholder="E.g., Server Hosting, Travel..." /></div>
                   
                   <div className="grid grid-cols-2 gap-4">
                     <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Amount (₹) *</label>
                     <input type="number" value={expenseForm.amount} onChange={e=>setExpenseForm({...expenseForm, amount: parseFloat(e.target.value)||0})} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-800 outline-none" /></div>
                     <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Date</label>
                     <input type="date" value={expenseForm.expense_date} onChange={e=>setExpenseForm({...expenseForm, expense_date: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium outline-none" /></div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Category</label>
                     <select value={expenseForm.category} onChange={e=>setExpenseForm({...expenseForm, category: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium outline-none"><option>Software</option><option>Office/Rent</option><option>Marketing</option><option>Travel</option><option>Materials</option><option>Other</option></select></div>
                     <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 truncate">Link Project</label>
                     <select value={expenseForm.project_id} onChange={e=>setExpenseForm({...expenseForm, project_id: e.target.value})} disabled={!expenseForm.company_id} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium outline-none disabled:opacity-50"><option value="">-- General --</option>{globalProjects.filter(p=>p.company_id.toString()===expenseForm.company_id).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Status</label>
                     <select value={expenseForm.status} onChange={e=>setExpenseForm({...expenseForm, status: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium outline-none"><option value="Completed">Completed</option><option value="Pending">Pending</option><option value="Due">Due</option></select></div>
                     <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Due Date (Optional)</label>
                     <input type="date" value={expenseForm.due_date} onChange={e=>setExpenseForm({...expenseForm, due_date: e.target.value})} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium outline-none" /></div>
                   </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-[#FAFCFF] flex justify-end gap-3 shrink-0">
                   <button onClick={() => setIsExpenseModalOpen(false)} className="rounded-xl border border-slate-200 bg-white h-11 px-6 font-bold text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                   <button onClick={handleSaveExpense} disabled={isSaving} className="bg-slate-900 text-white rounded-xl h-11 px-8 font-bold text-sm shadow-md hover:shadow-lg transition-all">{isSaving ? "Saving..." : "Add Expense"}</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* --- FINANCIAL REPORT GENERATOR MODAL & PRINT VIEW --- */}
      {isAdmin && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isReportModalOpen && (
            <div className="fixed inset-0 z-[10000] flex flex-col bg-slate-900/40 backdrop-blur-sm overflow-y-auto sm:p-4 print:p-0 print:bg-white print:block">
              <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} className="bg-white min-h-full sm:min-h-[90vh] w-full max-w-5xl mx-auto sm:rounded-2xl shadow-2xl flex flex-col relative print:shadow-none print:m-0 print:min-h-0 print:w-full">
                
                {/* Print Control Header - Hidden during print */}
                <div className="bg-slate-900 text-white p-4 sm:rounded-t-2xl flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 print:hidden">
                   <div className="flex items-center gap-3">
                     <BarChart3 className="h-5 w-5 text-indigo-400" />
                     <h2 className="text-lg font-bold">Report Builder</h2>
                   </div>
                   <div className="flex flex-wrap items-center gap-3">
                      <select value={reportConfig.companyId} onChange={e=>setReportConfig({...reportConfig, companyId: e.target.value})} className="bg-slate-800 text-white border border-slate-700 h-9 px-3 rounded-lg text-xs font-medium outline-none">
                        <option value="all">All Companies</option>
                        {!activeWorkspace && companies.map(c=><option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                      </select>
                      <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-2 h-9 border border-slate-700">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <input type="date" value={reportConfig.startDate} onChange={e=>setReportConfig({...reportConfig, startDate: e.target.value})} className="bg-transparent text-white text-xs outline-none w-28" />
                        <span className="text-slate-500">-</span>
                        <input type="date" value={reportConfig.endDate} onChange={e=>setReportConfig({...reportConfig, endDate: e.target.value})} className="bg-transparent text-white text-xs outline-none w-28" />
                      </div>
                      <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-500 text-white h-9 px-4 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center">
                        <Download className="h-3.5 w-3.5 mr-2"/> Save PDF
                      </button>
                      <button onClick={() => setIsReportModalOpen(false)} className="h-9 w-9 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center transition-colors"><X className="h-4 w-4" /></button>
                   </div>
                </div>

                {/* --- ACTUAL REPORT CONTENT --- */}
                <div className="p-8 sm:p-12 flex-1 bg-white">
                   <div className="text-center mb-10">
                     <h1 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">Financial Report</h1>
                     <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                       {reportConfig.companyId === 'all' ? 'All Companies Overview' : companies.find(c=>c.id.toString() === reportConfig.companyId)?.name}
                     </p>
                     <p className="text-xs text-slate-400 mt-2">
                       Period: {reportConfig.startDate ? new Date(reportConfig.startDate).toLocaleDateString() : 'Beginning'} to {reportConfig.endDate ? new Date(reportConfig.endDate).toLocaleDateString() : 'Present'}
                     </p>
                   </div>

                   <div className="grid grid-cols-3 gap-6 mb-12">
                     <div className="border-t-4 border-emerald-500 bg-slate-50 p-6 rounded-xl">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Income</p>
                       <p className="text-2xl font-black text-slate-900">₹{reportStats.inc.toLocaleString()}</p>
                     </div>
                     <div className="border-t-4 border-rose-500 bg-slate-50 p-6 rounded-xl">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Expenses</p>
                       <p className="text-2xl font-black text-slate-900">₹{reportStats.exp.toLocaleString()}</p>
                     </div>
                     <div className={`border-t-4 p-6 rounded-xl ${reportStats.prof >= 0 ? 'border-indigo-500 bg-indigo-50' : 'border-rose-500 bg-rose-50'}`}>
                       <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${reportStats.prof >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>Net Profit</p>
                       <p className={`text-2xl font-black ${reportStats.prof >= 0 ? 'text-indigo-900' : 'text-rose-900'}`}>₹{reportStats.prof.toLocaleString()}</p>
                     </div>
                   </div>

                   {/* BAR CHART */}
                   {reportStats.chartData.length > 0 && (
                     <div className="mb-12 border border-slate-100 rounded-2xl p-6 bg-white shadow-sm">
                       <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center"><TrendingUp className="h-4 w-4 mr-2 text-indigo-500"/> Monthly Cash Flow</h3>
                       <div className="h-64 flex items-end gap-2 sm:gap-4 relative pt-10 px-4 border-b border-slate-200">
                         {reportStats.chartData.map((data, idx) => {
                           const incHeight = Math.max((data.inc / reportStats.maxChartVal) * 100, 2);
                           const expHeight = Math.max((data.exp / reportStats.maxChartVal) * 100, 2);
                           return (
                             <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                               <div className="flex items-end justify-center w-full gap-1 sm:gap-2 h-full z-10 pb-2">
                                 {/* Income Bar */}
                                 <div style={{ height: `${incHeight}%` }} className="w-1/3 bg-emerald-400 rounded-t-sm relative transition-all">
                                   <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap print:opacity-100 print:text-[6px]">₹{(data.inc/1000).toFixed(0)}k</span>
                                 </div>
                                 {/* Expense Bar */}
                                 <div style={{ height: `${expHeight}%` }} className="w-1/3 bg-rose-400 rounded-t-sm relative transition-all">
                                   <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap print:opacity-100 print:text-[6px]">₹{(data.exp/1000).toFixed(0)}k</span>
                                 </div>
                               </div>
                               <span className="text-[10px] font-bold text-slate-400 mt-2 absolute -bottom-6 truncate w-full text-center">{data.month}</span>
                             </div>
                           )
                         })}
                       </div>
                       <div className="flex justify-center gap-6 mt-10 text-[10px] font-bold uppercase tracking-widest">
                         <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-400 rounded-sm"></div> Income</div>
                         <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-400 rounded-sm"></div> Expense</div>
                       </div>
                     </div>
                   )}

                   <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-16 pt-8 border-t border-slate-100">
                     Generated on {new Date().toLocaleString()}
                   </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </>
  );
}