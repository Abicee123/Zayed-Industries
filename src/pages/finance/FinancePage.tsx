import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, TrendingUp, TrendingDown, Wallet, Building2, CreditCard, Plus, X, Receipt, CheckCircle2, UserSquare2, FileText, ArrowDownLeft, ArrowUpRight, Users } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";
import { supabase } from "../../supabase";

export default function FinancePage() {
  const { role, activeWorkspace, companyId } = useAuthStore();
  
  const { projects, invoices, salaryPayments, expenses, companies, employees, customers, fetchAllData } = useDataStore();

  const [activeTab, setActiveTab] = useState<"projects" | "expenses">("projects");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState<string>("all"); // NEW: Global Dashboard Filter
  
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedProjectDetails, setSelectedProjectDetails] = useState<any>(null); 
  const [isSaving, setIsSaving] = useState(false);
  
  const currentCompanyId = role === 'admin' ? (activeWorkspace || "") : companyId;
  const today = new Date().toISOString().split('T')[0];

  const [expenseForm, setExpenseForm] = useState({
    company_id: currentCompanyId?.toString() || "", project_id: "", category: "Software", description: "", amount: 0, expense_date: today
  });

  // NEW: Dynamic Filtering Logic that controls both Lists AND the top KPI Math
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

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-700 pb-8">
      
      {/* HEADER & GLOBAL FILTER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-2 bg-blue-50 inline-block px-3 py-1 rounded-full">Analytics</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mt-2">Master Ledger.</h1>
        </div>
        
        {/* NEW: Master Admin Global Financial Filter */}
        {role === 'admin' && !activeWorkspace && (
          <div className="sm:w-72 shrink-0">
            <select
              value={filterCompanyId}
              onChange={(e) => setFilterCompanyId(e.target.value)}
              className="w-full h-12 rounded-2xl bg-white border border-slate-200 px-4 text-sm font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-50 transition-colors shadow-sm focus:ring-4 focus:ring-blue-500/10 appearance-none"
              style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px' }}
            >
              <option value="all">Global Network (All Revenue)</option>
              {companies.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Global KPI Cards (Now fully dynamic based on filter) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between transition-all">
           <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-4"><TrendingUp className="h-5 w-5 text-emerald-600" /></div>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Received (Money In)</p>
           <p className="text-2xl font-black text-slate-900">₹{totalMoneyIn.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between transition-all">
           <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4"><Wallet className="h-5 w-5 text-blue-600" /></div>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Employee Payouts</p>
           <p className="text-2xl font-black text-slate-900">₹{totalEmployeePayouts.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between transition-all">
           <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center mb-4"><Receipt className="h-5 w-5 text-amber-600" /></div>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Overhead Expenses</p>
           <p className="text-2xl font-black text-slate-900">₹{totalOverhead.toLocaleString()}</p>
        </div>
        <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all ${netProfit >= 0 ? 'bg-gradient-to-br from-slate-900 to-blue-900 border-slate-800' : 'bg-rose-50 border-rose-200'}`}>
           <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-4 ${netProfit >= 0 ? 'bg-white/10' : 'bg-rose-100'}`}><Building2 className={`h-5 w-5 ${netProfit >= 0 ? 'text-white' : 'text-rose-600'}`} /></div>
           <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${netProfit >= 0 ? 'text-blue-200' : 'text-rose-500'}`}>True Net Profit</p>
           <p className={`text-2xl font-black ${netProfit >= 0 ? 'text-white' : 'text-rose-600'}`}>₹{netProfit.toLocaleString()}</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-4 border-b border-slate-200">
         <button onClick={() => setActiveTab('projects')} className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 ${activeTab === 'projects' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Project Profitability</button>
         <button onClick={() => setActiveTab('expenses')} className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 ${activeTab === 'expenses' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Miscellaneous Expenses</button>
      </div>

      {/* TAB: PROJECT PROFITABILITY GRID */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search projects by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-11 pl-11 pr-4 rounded-xl border-none text-sm font-medium outline-none bg-transparent focus:ring-0 placeholder:text-slate-400" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {visibleProjects.length === 0 ? (
               <div className="col-span-full h-40 border border-slate-200 border-dashed rounded-3xl flex items-center justify-center text-slate-400 bg-slate-50/50"><p className="text-[11px] font-bold uppercase tracking-widest">No Projects Found for this View</p></div>
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
                  className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
                >
                   <div className="flex justify-between items-start mb-6 border-b border-slate-50 pb-4">
                     <div>
                       <h3 className="text-[15px] font-bold text-slate-900 group-hover:text-blue-900 transition-colors">{project.name}</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                         {companies.find(c => c.id === project.company_id)?.name} • {clientInfo.name}
                       </p>
                     </div>
                     <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors ${pProfit >= 0 ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-100'}`}>
                       {pProfit >= 0 ? 'Profitable' : 'Deficit'}
                     </span>
                   </div>

                   <div className="flex justify-between items-center gap-4">
                      <div className="flex-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Money Received</p>
                        <p className="text-lg font-black text-slate-700">₹{pMoneyIn.toLocaleString()}</p>
                      </div>
                      <div className="flex-1 border-l border-slate-100 pl-4">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Costs (Payroll+Misc)</p>
                        <p className="text-lg font-black text-slate-700">₹{pMoneyOut.toLocaleString()}</p>
                      </div>
                      <div className={`flex-1 border-l border-slate-100 pl-4 ${pProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 opacity-70">Net Margin</p>
                        <p className="text-xl font-black">₹{pProfit.toLocaleString()}</p>
                      </div>
                   </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
           <div className="flex justify-end">
              <button onClick={() => setIsExpenseModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 shadow-sm hover:shadow-md hover:border-blue-200 px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center">
                <Plus className="h-4 w-4 mr-2" /> Log Expense
              </button>
           </div>
           
           <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
             <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 border-b border-slate-100">
                 <tr>
                   <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Date / Details</th>
                   <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Category</th>
                   <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Linked Project</th>
                   <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Amount</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {sortedExpenses.length === 0 ? (
                   <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">No expenses recorded.</td></tr>
                 ) : sortedExpenses.map(exp => (
                   <tr key={exp.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{exp.description}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : ''}</p>
                      </td>
                      <td className="px-6 py-4"><span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">{exp.category}</span></td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">{exp.project_id ? projects.find(p=>p.id===exp.project_id)?.name : <span className="italic text-slate-400">General Overhead</span>}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 text-base">₹{parseFloat(exp.amount || 0).toLocaleString()}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* --- PROJECT FINANCIAL DOSSIER MODAL --- */}
      <AnimatePresence>
        {selectedProjectDetails && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
              
              {/* Dossier Header */}
              <div className="px-8 py-6 border-b border-slate-100 bg-[#FAFCFF] shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">Financial Dossier</span>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight mt-3">{selectedProjectDetails.name}</h3>
                  </div>
                  <button onClick={() => setSelectedProjectDetails(null)} className="h-10 w-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-colors"><X className="h-5 w-5" /></button>
                </div>
                
                {(() => {
                  const clientInfo = getProjectClientInfo(selectedProjectDetails);
                  return (
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mt-1">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span>{companies.find(c => c.id === selectedProjectDetails.company_id)?.name || 'Network'}</span>
                      <span className="text-slate-300">|</span>
                      <UserSquare2 className="h-4 w-4 text-slate-400" />
                      <span>Billed To: <strong className="text-slate-700">{clientInfo.name}</strong> <span className="text-[10px] uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded ml-1">{clientInfo.type}</span></span>
                    </div>
                  );
                })()}
              </div>

              {/* Dossier Body */}
              <div className="flex-1 overflow-y-auto p-8 bg-white space-y-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                
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
                      {/* KPI ROW */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Expected Revenue</p>
                          <p className="text-xl font-black text-slate-700">₹{pExpected.toLocaleString()}</p>
                        </div>
                        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 text-center">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><ArrowDownLeft className="h-3 w-3"/> Money Received</p>
                          <p className="text-xl font-black text-emerald-700">₹{pMoneyIn.toLocaleString()}</p>
                        </div>
                        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 text-center">
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><ArrowUpRight className="h-3 w-3"/> Total Costs Out</p>
                          <p className="text-xl font-black text-amber-700">₹{pTotalOut.toLocaleString()}</p>
                        </div>
                        <div className={`p-5 rounded-2xl border text-center ${pProfit >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100'}`}>
                          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${pProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>Net Profit Margin</p>
                          <p className={`text-2xl font-black ${pProfit >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>₹{pProfit.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* THE LEDGERS */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* LEFT: REVENUE (INVOICES) */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-emerald-500" /> Billed Invoices
                          </h4>
                          {pInvoices.length === 0 ? (
                            <p className="text-sm italic text-slate-400">No invoices generated for this project.</p>
                          ) : (
                            <div className="space-y-3">
                              {pInvoices.map(inv => (
                                <div key={inv.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                  <div className="flex justify-between items-start mb-2">
                                    <p className="font-bold text-slate-900 text-sm">{inv.invoice_number}</p>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'Partially Paid' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-medium mb-3">Issued: {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : 'N/A'} • Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</p>
                                  <div className="flex justify-between items-end border-t border-slate-50 pt-2">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                      Total: ₹{parseFloat(inv.total_amount || 0).toLocaleString()}
                                    </div>
                                    <div className="text-xs font-black text-emerald-600">
                                      Paid: ₹{parseFloat(inv.amount_paid || 0).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* RIGHT: COSTS (PAYROLL & MISC) */}
                        <div className="space-y-6">
                          
                          {/* Payroll */}
                          <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                              <Users className="h-4 w-4 text-blue-500" /> Employee Payouts
                            </h4>
                            {pPayments.length === 0 ? (
                              <p className="text-sm italic text-slate-400">No employee payouts recorded yet.</p>
                            ) : (
                              <div className="space-y-3">
                                {pPayments.map(p => {
                                  const emp = employees.find(e => e.id === p.employee_id);
                                  const initial = String(emp?.name || 'U').charAt(0).toUpperCase();
                                  
                                  return (
                                    <div key={p.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center">
                                      <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm overflow-hidden">
                                          {emp?.profile_image_url ? (
                                            <img src={emp.profile_image_url} className="h-full w-full object-cover" />
                                          ) : (
                                            initial
                                          )}
                                        </div>
                                        <div>
                                          <p className="text-[13px] font-bold text-slate-800">{emp?.name || 'Unknown Employee'}</p>
                                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                            {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : 'Unknown Date'} • {p.payment_type || 'Standard'}
                                          </p>
                                        </div>
                                      </div>
                                      <p className="text-sm font-black text-slate-700">₹{parseFloat(p.amount || 0).toLocaleString()}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Expenses */}
                          <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-amber-500" /> Misc Expenses
                            </h4>
                            {pExpenses.length === 0 ? (
                              <p className="text-sm italic text-slate-400">No miscellaneous expenses recorded.</p>
                            ) : (
                              <div className="space-y-3">
                                {pExpenses.map(e => (
                                  <div key={e.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center">
                                    <div>
                                      <p className="text-[13px] font-bold text-slate-800">{e.description || 'General Expense'}</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                        {e.expense_date ? new Date(e.expense_date).toLocaleDateString() : 'Unknown'} • {e.category || 'Other'}
                                      </p>
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
      </AnimatePresence>

      {/* --- ADD EXPENSE MODAL --- */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
              <div className="px-8 pt-7 border-b border-slate-100 bg-[#FAFCFF] shrink-0">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">Ledger Entry</span>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-1.5">Log Expense</h3>
                  </div>
                  <button onClick={() => setIsExpenseModalOpen(false)} className="h-9 w-9 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-colors"><X className="h-4 w-4" /></button>
                </div>
              </div>
              
              <div className="p-8 space-y-5">
                 {role === 'admin' && !activeWorkspace && (
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Subsidiary</label><select value={expenseForm.company_id} onChange={e=>setExpenseForm({...expenseForm, company_id: e.target.value, project_id: ""})} className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none cursor-pointer"><option value="">-- Select --</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                 )}
                 <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Description *</label><input type="text" value={expenseForm.description} onChange={e=>setExpenseForm({...expenseForm, description: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none focus:border-blue-500 shadow-sm" placeholder="E.g., Server Hosting, Travel..." /></div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Amount (₹) *</label><input type="number" value={expenseForm.amount} onChange={e=>setExpenseForm({...expenseForm, amount: parseFloat(e.target.value)||0})} className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-800 outline-none focus:border-blue-500 shadow-sm" /></div>
                   <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Date</label><input type="date" value={expenseForm.expense_date} onChange={e=>setExpenseForm({...expenseForm, expense_date: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none shadow-sm" /></div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Category</label><select value={expenseForm.category} onChange={e=>setExpenseForm({...expenseForm, category: e.target.value})} className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none cursor-pointer shadow-sm"><option>Software</option><option>Office/Rent</option><option>Marketing</option><option>Travel</option><option>Materials</option><option>Other</option></select></div>
                   <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Link Project (Opt)</label><select value={expenseForm.project_id} onChange={e=>setExpenseForm({...expenseForm, project_id: e.target.value})} disabled={!expenseForm.company_id} className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none cursor-pointer shadow-sm disabled:opacity-50"><option value="">-- General Overhead --</option>{globalProjects.filter(p=>p.company_id.toString()===expenseForm.company_id).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                 </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-[#FAFCFF] flex justify-end gap-3 shrink-0">
                 <button onClick={() => setIsExpenseModalOpen(false)} className="rounded-xl border border-slate-200 bg-white h-11 px-6 font-bold text-sm text-slate-600 hover:bg-slate-50 shadow-sm transition-colors">Cancel</button>
                 <button onClick={handleSaveExpense} disabled={isSaving} className="bg-slate-900 text-white rounded-xl h-11 px-8 font-bold text-sm shadow-md hover:shadow-lg transition-all">{isSaving ? "Saving..." : "Log Expense"}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}