import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, TrendingUp, Wallet, Building2, Plus, X, Receipt, CheckCircle2, UserSquare2, FileText, ArrowDownLeft, ArrowUpRight, Users } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";
import { supabase } from "../../supabase";

export default function FinancePage() {
  const { role, activeWorkspace, companyId } = useAuthStore();
  
  const { projects, invoices, salaryPayments, expenses, companies, employees, customers, fetchAllData } = useDataStore();

  const [activeTab, setActiveTab] = useState<"projects" | "expenses">("projects");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState<string>("all"); 
  
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedProjectDetails, setSelectedProjectDetails] = useState<any>(null); 
  const [isSaving, setIsSaving] = useState(false);
  
  const currentCompanyId = role === 'admin' ? (activeWorkspace || "") : companyId;
  const today = new Date().toISOString().split('T')[0];

  const [expenseForm, setExpenseForm] = useState({
    company_id: currentCompanyId?.toString() || "", project_id: "", category: "Software", description: "", amount: 0, expense_date: today
  });

  const getFilteredData = (dataArray: any[]) => {
    if (role === 'admin' && !activeWorkspace) {
      if (filterCompanyId === "all") return dataArray;
      return dataArray.filter(item => item.company_id?.toString() === filterCompanyId);
    }
    return dataArray.filter(item => item.company_id === currentCompanyId);
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
        category: expenseForm.category, description: expenseForm.description, amount: expenseForm.amount, expense_date: expenseForm.expense_date
      }]);
      await fetchAllData(); setIsExpenseModalOpen(false);
      setExpenseForm({ company_id: currentCompanyId?.toString() || "", project_id: "", category: "Software", description: "", amount: 0, expense_date: today });
    } catch (error: any) { alert(error.message); } finally { setIsSaving(false); }
  };

  const visibleProjects = globalProjects.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const sortedExpenses = [...globalExpenses].sort((a,b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());

  const getProjectClientInfo = (proj: any) => {
    if (proj.customer_id) return { name: customers.find(c => c.id === proj.customer_id)?.name || 'Unknown', type: 'External Client' };
    if (proj.internal_company_id) return { name: companies.find(c => c.id === proj.internal_company_id)?.name || 'Unknown', type: 'Internal Subsidiary Transfer' };
    return { name: 'Unassigned', type: 'No Client' };
  };

  const getAvatar = (id: number) => employees.find(e => e.id === id);

  return (
    <>
      <div className="max-w-[1200px] mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-700 pb-8 relative z-0">
        
        {/* Minimal Dotted Background Pattern */}
        <div className="absolute inset-0 pointer-events-none z-[-1] overflow-hidden print:hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTQ4LCAxNjMsIDE4NCwgMC4wOCkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]" />
        </div>

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
          <div>
            <p className="text-[9px] sm:text-[11px] font-bold text-emerald-600 uppercase tracking-[0.2em] mb-1.5 sm:mb-2 bg-emerald-50 inline-block px-2.5 sm:px-3 py-1 rounded-full">Overview</p>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-1 sm:mt-2">Finance.</h1>
          </div>
          
          {role === 'admin' && !activeWorkspace && (
            <div className="sm:w-72 shrink-0">
              <select
                value={filterCompanyId}
                onChange={(e) => setFilterCompanyId(e.target.value)}
                className="w-full h-10 sm:h-12 rounded-xl sm:rounded-2xl bg-white border border-slate-200 px-3 sm:px-4 text-[12px] sm:text-sm font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-50 transition-colors shadow-sm focus:ring-4 focus:ring-emerald-500/10 appearance-none"
                style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '14px' }}
              >
                <option value="all">All Companies</option>
                {companies.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* 2x2 GRID ON MOBILE, 4x1 ON DESKTOP */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between transition-all">
             <div className="h-8 w-8 sm:h-10 sm:w-10 bg-emerald-50 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4"><TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" /></div>
             <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1 truncate">Total Income</p>
             <p className="text-lg sm:text-2xl font-black text-slate-900 truncate">₹{totalMoneyIn.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between transition-all">
             <div className="h-8 w-8 sm:h-10 sm:w-10 bg-blue-50 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4"><Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" /></div>
             <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1 truncate">Total Payroll</p>
             <p className="text-lg sm:text-2xl font-black text-slate-900 truncate">₹{totalEmployeePayouts.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between transition-all">
             <div className="h-8 w-8 sm:h-10 sm:w-10 bg-amber-50 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4"><Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" /></div>
             <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1 truncate">Other Expenses</p>
             <p className="text-lg sm:text-2xl font-black text-slate-900 truncate">₹{totalOverhead.toLocaleString()}</p>
          </div>
          <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col justify-between transition-all ${netProfit >= 0 ? 'bg-slate-900 border-slate-800' : 'bg-rose-50 border-rose-200'}`}>
             <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 ${netProfit >= 0 ? 'bg-white/10' : 'bg-rose-100'}`}><Building2 className={`h-4 w-4 sm:h-5 sm:w-5 ${netProfit >= 0 ? 'text-white' : 'text-rose-600'}`} /></div>
             <p className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mb-0.5 sm:mb-1 truncate ${netProfit >= 0 ? 'text-slate-300' : 'text-rose-500'}`}>Net Profit</p>
             <p className={`text-lg sm:text-2xl font-black truncate ${netProfit >= 0 ? 'text-white' : 'text-rose-600'}`}>₹{netProfit.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex gap-3 sm:gap-4 border-b border-slate-200 overflow-x-auto max-sm:[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
           <button onClick={() => setActiveTab('projects')} className={`pb-2.5 sm:pb-3 text-[12px] sm:text-sm font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${activeTab === 'projects' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Project Finances</button>
           <button onClick={() => setActiveTab('expenses')} className={`pb-2.5 sm:pb-3 text-[12px] sm:text-sm font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${activeTab === 'expenses' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Other Expenses</button>
        </div>

        {activeTab === 'projects' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white p-2 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm flex">
              <div className="relative flex-1">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-slate-400" />
                <input type="text" placeholder="Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 sm:h-11 pl-9 sm:pl-11 pr-4 rounded-lg sm:rounded-xl border-none text-[13px] sm:text-sm font-medium outline-none bg-transparent focus:ring-0 placeholder:text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {visibleProjects.length === 0 ? (
                 <div className="col-span-full h-32 sm:h-40 border border-slate-200 border-dashed rounded-2xl sm:rounded-3xl flex items-center justify-center text-slate-400 bg-slate-50/50"><p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">No Projects Found</p></div>
              ) : visibleProjects.map(project => {
                const pInvoices = globalInvoices.filter(i => i.project_id === project.id);
                const pPayments = globalPayments.filter(p => p.project_id === project.id);
                const pExpenses = globalExpenses.filter(e => e.project_id === project.id);

                const pMoneyIn = pInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount_paid || 0), 0);
                const pMoneyOut = pPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) + pExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                const pProfit = pMoneyIn - pMoneyOut;
                const clientInfo = getProjectClientInfo(project);

                return (
                  <div 
                    key={project.id} 
                    onClick={() => setSelectedProjectDetails(project)}
                    className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group cursor-pointer"
                  >
                     <div className="flex justify-between items-start mb-4 sm:mb-6 border-b border-slate-50 pb-3 sm:pb-4">
                       <div className="min-w-0 pr-2">
                         <h3 className="text-[14px] sm:text-[15px] font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">{project.name}</h3>
                         <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">
                           {companies.find(c => c.id === project.company_id)?.name} • {clientInfo.name}
                         </p>
                       </div>
                       <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[8px] sm:text-[9px] font-bold uppercase tracking-widest transition-colors shrink-0 ${pProfit >= 0 ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-100'}`}>
                         {pProfit >= 0 ? 'Profit' : 'Deficit'}
                       </span>
                     </div>

                     <div className="flex justify-between items-center gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1 truncate">Income</p>
                          <p className="text-[13px] sm:text-lg font-black text-slate-700 truncate">₹{pMoneyIn.toLocaleString()}</p>
                        </div>
                        <div className="flex-1 min-w-0 border-l border-slate-100 pl-2 sm:pl-4">
                          <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1 truncate">Expenses</p>
                          <p className="text-[13px] sm:text-lg font-black text-slate-700 truncate">₹{pMoneyOut.toLocaleString()}</p>
                        </div>
                        <div className={`flex-1 min-w-0 border-l border-slate-100 pl-2 sm:pl-4 ${pProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mb-0.5 sm:mb-1 opacity-70 truncate">Profit</p>
                          <p className="text-[14px] sm:text-xl font-black truncate">₹{pProfit.toLocaleString()}</p>
                        </div>
                     </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-4 sm:space-y-6">
             <div className="flex justify-end">
                <button onClick={() => setIsExpenseModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 shadow-sm hover:shadow-md hover:border-emerald-200 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" /> Add Expense
                </button>
             </div>
             
             <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden">
               <div className="overflow-x-auto max-sm:[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                 <table className="w-full text-left text-xs sm:text-sm min-w-[500px]">
                   <thead className="bg-slate-50 border-b border-slate-100">
                     <tr>
                       <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold text-slate-400 uppercase tracking-widest text-[9px] sm:text-[10px] whitespace-nowrap">Date & Details</th>
                       <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold text-slate-400 uppercase tracking-widest text-[9px] sm:text-[10px] whitespace-nowrap">Category</th>
                       <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold text-slate-400 uppercase tracking-widest text-[9px] sm:text-[10px] whitespace-nowrap">Project</th>
                       <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold text-slate-400 uppercase tracking-widest text-[9px] sm:text-[10px] text-right whitespace-nowrap">Amount</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {sortedExpenses.length === 0 ? (
                       <tr><td colSpan={4} className="px-4 sm:px-6 py-8 sm:py-10 text-center text-slate-400 italic">No expenses recorded.</td></tr>
                     ) : sortedExpenses.map(exp => (
                       <tr key={exp.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            <p className="font-bold text-[12px] sm:text-[14px] text-slate-800 truncate">{exp.description}</p>
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 sm:mt-1 truncate">{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : ''}</p>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            <span className="bg-slate-100 text-slate-600 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">{exp.category}</span>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-[11px] sm:text-xs font-medium text-slate-600 truncate max-w-[150px]">
                            {exp.project_id ? projects.find(p=>p.id===exp.project_id)?.name : <span className="italic text-slate-400">Other</span>}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-black text-slate-900 text-[13px] sm:text-base whitespace-nowrap">
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

        {/* --- PROJECT FINANCIAL DETAILS MODAL --- */}
        <AnimatePresence>
          {selectedProjectDetails && (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center max-sm:px-4 max-sm:pt-20 max-sm:pb-[110px] sm:p-4 bg-slate-900/40 backdrop-blur-sm print:hidden">
              <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }} className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-full sm:max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 mt-auto sm:mt-0">
                
                <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-slate-100 bg-[#FAFCFF] shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">Financial Details</span>
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-2 sm:mt-3 truncate pr-4">{selectedProjectDetails.name}</h3>
                    </div>
                    <button onClick={() => setSelectedProjectDetails(null)} className="h-8 w-8 sm:h-10 sm:w-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-colors shrink-0"><X className="h-4 w-4 sm:h-5 sm:w-5" /></button>
                  </div>
                  
                  {(() => {
                    const clientInfo = getProjectClientInfo(selectedProjectDetails);
                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-[11px] sm:text-sm text-slate-500 font-medium mt-1">
                        <div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" /> <span className="truncate">{companies.find(c => c.id === selectedProjectDetails.company_id)?.name || 'Network'}</span></div>
                        <span className="hidden sm:inline text-slate-300">|</span>
                        <div className="flex items-center gap-1.5"><UserSquare2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" /> <span className="truncate">Client: <strong className="text-slate-700">{clientInfo.name}</strong> <span className="text-[8px] sm:text-[10px] uppercase tracking-widest bg-slate-100 px-1.5 sm:px-2 py-0.5 rounded ml-1">{clientInfo.type}</span></span></div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-8 bg-white space-y-6 sm:space-y-8 max-sm:[&::-webkit-scrollbar]:hidden max-sm:[-ms-overflow-style:none] max-sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:w-1.5 sm:[&::-webkit-scrollbar-thumb]:bg-slate-200 sm:[&::-webkit-scrollbar-thumb]:rounded-full">
                  
                  {(() => {
                    const pInvoices = globalInvoices.filter(i => i.project_id === selectedProjectDetails.id);
                    const pPayments = globalPayments.filter(p => p.project_id === selectedProjectDetails.id);
                    const pExpenses = globalExpenses.filter(e => e.project_id === selectedProjectDetails.id);

                    const pExpected = parseFloat(selectedProjectDetails.expected_amount || 0);
                    const pMoneyIn = pInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount_paid || 0), 0);
                    const pPayrollOut = pPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                    const pMiscOut = pExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                    const pTotalOut = pPayrollOut + pMiscOut;
                    const pProfit = pMoneyIn - pTotalOut;

                    return (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                          <div className="bg-slate-50 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-100 text-center">
                            <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">Expected Revenue</p>
                            <p className="text-[15px] sm:text-xl font-black text-slate-700 truncate">₹{pExpected.toLocaleString()}</p>
                          </div>
                          <div className="bg-emerald-50 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-emerald-100 text-center">
                            <p className="text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 flex items-center justify-center gap-1 truncate"><ArrowDownLeft className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0"/> Income</p>
                            <p className="text-[15px] sm:text-xl font-black text-emerald-700 truncate">₹{pMoneyIn.toLocaleString()}</p>
                          </div>
                          <div className="bg-amber-50 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-amber-100 text-center">
                            <p className="text-[8px] sm:text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1 flex items-center justify-center gap-1 truncate"><ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0"/> Total Costs</p>
                            <p className="text-[15px] sm:text-xl font-black text-amber-700 truncate">₹{pTotalOut.toLocaleString()}</p>
                          </div>
                          <div className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border text-center ${pProfit >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100'}`}>
                            <p className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mb-1 truncate ${pProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>Profit</p>
                            <p className={`text-[15px] sm:text-xl font-black truncate ${pProfit >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>₹{pProfit.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                          <div className="space-y-3 sm:space-y-4">
                            <h4 className="text-[12px] sm:text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" /> Invoices
                            </h4>
                            {pInvoices.length === 0 ? (
                              <p className="text-[12px] sm:text-sm italic text-slate-400">No invoices generated for this project.</p>
                            ) : (
                              <div className="overflow-x-auto max-sm:[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                <div className="space-y-2 sm:space-y-3 min-w-[300px]">
                                  {pInvoices.map(inv => (
                                    <div key={inv.id} className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm">
                                      <div className="flex justify-between items-start mb-2">
                                        <p className="font-bold text-slate-900 text-[12px] sm:text-sm">{inv.invoice_number}</p>
                                        <span className={`px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'Partially Paid' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</span>
                                      </div>
                                      <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mb-2 sm:mb-3">Issued: {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : 'N/A'} • Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</p>
                                      <div className="flex justify-between items-end border-t border-slate-50 pt-2">
                                        <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                          Total: ₹{parseFloat(inv.total_amount || 0).toLocaleString()}
                                        </div>
                                        <div className="text-[11px] sm:text-xs font-black text-emerald-600">
                                          Paid: ₹{parseFloat(inv.amount_paid || 0).toLocaleString()}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-5 sm:space-y-6">
                            <div className="space-y-3 sm:space-y-4">
                              <h4 className="text-[12px] sm:text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" /> Project Payroll
                              </h4>
                              {pPayments.length === 0 ? (
                                <p className="text-[12px] sm:text-sm italic text-slate-400">No employee payments recorded yet.</p>
                              ) : (
                                <div className="space-y-2 sm:space-y-3">
                                  {pPayments.map(p => {
                                    const emp = employees.find(e => e.id === p.employee_id);
                                    const initial = String(emp?.name || 'U').charAt(0).toUpperCase();
                                    
                                    return (
                                      <div key={p.id} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 sm:p-3 flex justify-between items-center">
                                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
                                          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-slate-600 shadow-sm overflow-hidden shrink-0">
                                            {emp?.profile_image_url ? (
                                              <img src={emp.profile_image_url} className="h-full w-full object-cover" />
                                            ) : (
                                              initial
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-[11px] sm:text-[13px] font-bold text-slate-800 truncate">{emp?.name || 'Unknown'}</p>
                                            <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                                              {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : 'Unknown'} • {p.payment_type || 'Standard'}
                                            </p>
                                          </div>
                                        </div>
                                        <p className="text-sm font-black text-slate-700 shrink-0">₹{parseFloat(p.amount || 0).toLocaleString()}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <div className="space-y-3 sm:space-y-4">
                              <h4 className="text-[12px] sm:text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" /> Other Expenses
                              </h4>
                              {pExpenses.length === 0 ? (
                                <p className="text-[12px] sm:text-sm italic text-slate-400">No other expenses recorded.</p>
                              ) : (
                                <div className="space-y-2 sm:space-y-3">
                                  {pExpenses.map(e => (
                                    <div key={e.id} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 sm:p-3 flex justify-between items-center">
                                      <div className="min-w-0 pr-2">
                                        <p className="text-[11px] sm:text-[13px] font-bold text-slate-800 truncate">{e.description || 'General Expense'}</p>
                                        <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                                          {e.expense_date ? new Date(e.expense_date).toLocaleDateString() : 'Unknown'} • {e.category || 'Other'}
                                        </p>
                                      </div>
                                      <p className="text-[12px] sm:text-sm font-black text-slate-700 shrink-0">₹{parseFloat(e.amount || 0).toLocaleString()}</p>
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
        </AnimatePresence>

        {/* --- ADD EXPENSE MODAL --- */}
        <AnimatePresence>
          {isExpenseModalOpen && (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center max-sm:px-4 max-sm:pt-20 max-sm:pb-[110px] sm:p-4 bg-slate-900/40 backdrop-blur-sm print:hidden">
              {/* CRITICAL FIX: Locked modal to standard h-full sm:h-[700px] sm:max-h-[85svh] */}
              <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }} className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-lg h-full sm:h-[700px] sm:max-h-[85svh] flex flex-col overflow-hidden border border-slate-100 mt-auto sm:mt-0">
                <div className="px-5 sm:px-8 pt-5 sm:pt-7 border-b border-slate-100 bg-[#FAFCFF] shrink-0">
                  <div className="flex items-center justify-between mb-4 sm:mb-5">
                    <div>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 sm:px-2.5 py-1 rounded-full">New Expense</span>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-1.5">Add Expense</h3>
                    </div>
                    <button onClick={() => setIsExpenseModalOpen(false)} className="h-8 w-8 sm:h-9 sm:w-9 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-colors"><X className="h-3.5 w-3.5 sm:h-4 w-4" /></button>
                  </div>
                </div>
                
                {/* CRITICAL FIX: Added flex-col to scroll wrapper, wrapped inputs in justify-center */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-8 flex flex-col max-sm:[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                   <div className="flex-1 flex flex-col justify-center space-y-4 sm:space-y-5 pb-2">
                     {role === 'admin' && !activeWorkspace && (
                       <div><label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Company</label><select value={expenseForm.company_id} onChange={e=>setExpenseForm({...expenseForm, company_id: e.target.value, project_id: ""})} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 px-3 sm:px-4 text-[12px] sm:text-sm font-bold outline-none cursor-pointer"><option value="">-- Select --</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                     )}
                     <div><label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Description *</label><input type="text" value={expenseForm.description} onChange={e=>setExpenseForm({...expenseForm, description: e.target.value})} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 px-3 sm:px-4 text-[12px] sm:text-sm font-medium outline-none focus:border-emerald-500 shadow-sm" placeholder="E.g., Server Hosting, Travel..." /></div>
                     
                     <div className="grid grid-cols-2 gap-3 sm:gap-4">
                       <div><label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Amount (₹) *</label><input type="number" value={expenseForm.amount} onChange={e=>setExpenseForm({...expenseForm, amount: parseFloat(e.target.value)||0})} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 px-3 sm:px-4 text-[12px] sm:text-sm font-black text-slate-800 outline-none focus:border-emerald-500 shadow-sm" /></div>
                       <div><label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Date</label><input type="date" value={expenseForm.expense_date} onChange={e=>setExpenseForm({...expenseForm, expense_date: e.target.value})} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 px-3 sm:px-4 text-[12px] sm:text-sm font-medium outline-none shadow-sm" /></div>
                     </div>

                     <div className="grid grid-cols-2 gap-3 sm:gap-4">
                       <div><label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1">Category</label><select value={expenseForm.category} onChange={e=>setExpenseForm({...expenseForm, category: e.target.value})} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 px-3 sm:px-4 text-[12px] sm:text-sm font-medium outline-none cursor-pointer shadow-sm"><option>Software</option><option>Office/Rent</option><option>Marketing</option><option>Travel</option><option>Materials</option><option>Other</option></select></div>
                       <div><label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 sm:mb-2 px-1 truncate">Link Project (Optional)</label><select value={expenseForm.project_id} onChange={e=>setExpenseForm({...expenseForm, project_id: e.target.value})} disabled={!expenseForm.company_id} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 px-3 sm:px-4 text-[12px] sm:text-sm font-medium outline-none cursor-pointer shadow-sm disabled:opacity-50"><option value="">-- General --</option>{globalProjects.filter(p=>p.company_id.toString()===expenseForm.company_id).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                     </div>
                   </div>
                </div>

                <div className="p-4 sm:p-6 border-t border-slate-100 bg-[#FAFCFF] flex justify-end gap-2 sm:gap-3 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
                   <button onClick={() => setIsExpenseModalOpen(false)} className="rounded-xl border border-slate-200 bg-white h-10 sm:h-11 px-4 sm:px-6 font-bold text-[12px] sm:text-sm text-slate-600 hover:bg-slate-50 shadow-sm transition-colors flex-1 sm:flex-none">Cancel</button>
                   <button onClick={handleSaveExpense} disabled={isSaving} className="bg-slate-900 text-white rounded-xl h-10 sm:h-11 px-6 sm:px-8 font-bold text-[12px] sm:text-sm shadow-md hover:shadow-lg transition-all flex-1 sm:flex-none">{isSaving ? "Saving..." : "Add Expense"}</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}