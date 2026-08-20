import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Download, Printer, X, CheckCircle2, Building2, UserSquare2, Trash2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";
import { supabase } from "../../supabase";

const STATUS_OPTIONS = ['Pending', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'];

export default function InvoicesPage() {
  const { role, activeWorkspace, companyId } = useAuthStore();
  const { invoices, invoiceItems, invoicePayments, projects, customers, companies, fetchAllData } = useDataStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState<string>("all"); // NEW: Global Admin Filter
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentCompanyId = role === 'admin' ? (activeWorkspace || "") : companyId;
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    company_id: currentCompanyId?.toString() || "", customer_id: "", project_id: "",
    invoice_number: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    issue_date: today, due_date: "", tax_rate: 0, discount_amount: 0, amount_paid: 0, status: "Pending"
  });

  const [lineItems, setLineItems] = useState([{ description: "", quantity: 1, rate: 0 }]);
  
  // Payment Ledger State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: 0, payment_date: today, payment_method: "Bank Transfer", reference_note: "" });

  const visibleInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase());
    if (role === 'admin' && !activeWorkspace) {
      const matchesCompany = filterCompanyId === "all" || inv.company_id.toString() === filterCompanyId;
      return matchesSearch && matchesCompany;
    }
    return matchesSearch && inv.company_id === currentCompanyId;
  });

  const availableCustomers = customers.filter(c => c.company_id === parseInt(formData.company_id));
  const availableProjects = projects.filter(p => p.company_id === parseInt(formData.company_id) && p.customer_id === parseInt(formData.customer_id));
  
  const currentInvoicePayments = selectedInvoice ? invoicePayments.filter(p => p.invoice_id === selectedInvoice.id) : [];

  // Core Math
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const taxAmount = (subtotal * formData.tax_rate) / 100;
  const grandTotal = (subtotal + taxAmount) - formData.discount_amount;
  const totalPaid = currentInvoicePayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const balanceDue = Math.max(0, grandTotal - totalPaid);

  const issuingCompany = companies.find(c => c.id === parseInt(formData.company_id));
  const selectedCustomer = customers.find(c => c.id === parseInt(formData.customer_id));
  const linkedProject = projects.find(p => p.id === parseInt(formData.project_id));

  const openNewInvoice = () => {
    setSelectedInvoice(null);
    setFormData({
      company_id: currentCompanyId?.toString() || "", customer_id: "", project_id: "",
      invoice_number: `INV-${Math.floor(10000 + Math.random() * 90000)}`,
      issue_date: today, due_date: "", tax_rate: 0, discount_amount: 0, status: "Pending"
    });
    setLineItems([{ description: "", quantity: 1, rate: 0 }]);
    setShowPaymentForm(false);
    setIsModalOpen(true);
  };

  const openViewInvoice = (inv: any) => {
    setSelectedInvoice(inv);
    setFormData({
      company_id: inv.company_id.toString(), customer_id: inv.customer_id?.toString() || "", project_id: inv.project_id?.toString() || "",
      invoice_number: inv.invoice_number, issue_date: inv.issue_date, due_date: inv.due_date,
      tax_rate: inv.tax_rate, discount_amount: inv.discount_amount, status: inv.status
    });
    const items = invoiceItems.filter(item => item.invoice_id === inv.id);
    setLineItems(items.length > 0 ? items : [{ description: "", quantity: 1, rate: 0 }]);
    setShowPaymentForm(false);
    setIsModalOpen(true);
  };

  const handleSaveInvoice = async () => {
    if (!formData.company_id) return alert("Select a company.");
    if (!formData.customer_id) return alert("Select a customer.");
    if (!formData.due_date) return alert("Select a due date.");
    if (lineItems.some(i => !i.description.trim())) return alert("All line items must have a description.");

    setIsSaving(true);
    try {
      let computedStatus = formData.status;
      if (totalPaid >= grandTotal && grandTotal > 0) computedStatus = 'Paid';
      else if (totalPaid > 0 && totalPaid < grandTotal) computedStatus = 'Partially Paid';

      const payload = {
        company_id: parseInt(formData.company_id), customer_id: parseInt(formData.customer_id),
        project_id: formData.project_id ? parseInt(formData.project_id) : null,
        invoice_number: formData.invoice_number, issue_date: formData.issue_date, due_date: formData.due_date,
        subtotal, tax_rate: formData.tax_rate, discount_amount: formData.discount_amount, 
        total_amount: grandTotal, amount_paid: totalPaid, status: computedStatus
      };

      let newInvoiceId = selectedInvoice?.id;

      if (!selectedInvoice) {
        const { data, error } = await supabase.from('invoices').insert([payload]).select().single();
        if (error) throw error;
        newInvoiceId = data.id;
      } else {
        const { error } = await supabase.from('invoices').update(payload).eq('id', selectedInvoice.id);
        if (error) throw error;
        await supabase.from('invoice_items').delete().eq('invoice_id', selectedInvoice.id);
      }

      const itemsToInsert = lineItems.map(item => ({
        invoice_id: newInvoiceId, description: item.description, quantity: item.quantity, rate: item.rate, total: item.quantity * item.rate
      }));
      await supabase.from('invoice_items').insert(itemsToInsert);

      await fetchAllData();
      setIsModalOpen(false);
    } catch (error: any) { alert(`Error saving invoice: ${error.message}`); } finally { setIsSaving(false); }
  };

  const handleRecordPayment = async () => {
    if (newPayment.amount <= 0) return alert("Enter a valid amount");
    if (!selectedInvoice) return alert("Please save the invoice first before recording payments.");
    
    setIsSaving(true);
    try {
      const { error: paymentError } = await supabase.from('invoice_payments').insert([{
        invoice_id: selectedInvoice.id,
        company_id: parseInt(formData.company_id),
        amount: newPayment.amount,
        payment_date: newPayment.payment_date,
        payment_method: newPayment.payment_method,
        reference_note: newPayment.reference_note
      }]);
      if (paymentError) throw paymentError;

      const newTotalPaid = totalPaid + newPayment.amount;
      let newStatus = formData.status;
      if (newTotalPaid >= grandTotal) newStatus = 'Paid';
      else if (newTotalPaid > 0) newStatus = 'Partially Paid';

      await supabase.from('invoices').update({ amount_paid: newTotalPaid, status: newStatus }).eq('id', selectedInvoice.id);

      await fetchAllData();
      setShowPaymentForm(false);
      setNewPayment({ amount: 0, payment_date: today, payment_method: "Bank Transfer", reference_note: "" });
      setFormData(prev => ({...prev, status: newStatus})); 
    } catch (error: any) { alert(`Error recording payment: ${error.message}`); } finally { setIsSaving(false); }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!window.confirm("Remove this payment record?")) return;
    setIsSaving(true);
    try {
      await supabase.from('invoice_payments').delete().eq('id', paymentId);
      
      const paymentToRemove = currentInvoicePayments.find(p => p.id === paymentId);
      const newTotalPaid = totalPaid - (paymentToRemove ? paymentToRemove.amount : 0);
      let newStatus = formData.status;
      if (newTotalPaid <= 0) newStatus = 'Pending';
      else if (newTotalPaid < grandTotal) newStatus = 'Partially Paid';
      
      await supabase.from('invoices').update({ amount_paid: newTotalPaid, status: newStatus }).eq('id', selectedInvoice.id);
      
      await fetchAllData();
      setFormData(prev => ({...prev, status: newStatus}));
    } catch (error: any) { alert(error.message); } finally { setIsSaving(false); }
  };

  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;
    if (!window.confirm(`Delete invoice ${selectedInvoice.invoice_number}?`)) return;
    await supabase.from('invoices').delete().eq('id', selectedInvoice.id);
    await fetchAllData();
    setIsModalOpen(false);
  };

  const handlePrint = () => window.print();

  const exportCSV = () => {
    const headers = ["Invoice Number", "Company", "Customer", "Issue Date", "Due Date", "Total Amount", "Amount Paid", "Status"];
    const rows = visibleInvoices.map(inv => [
      inv.invoice_number,
      companies.find(c => c.id === inv.company_id)?.name || 'Unknown',
      customers.find(c => c.id === inv.customer_id)?.name || 'Unknown',
      inv.issue_date, inv.due_date, inv.total_amount, inv.amount_paid || 0, inv.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Invoices_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDynamicStatus = (inv: any) => {
    if (inv.status === 'Paid') return 'Paid';
    if (inv.status === 'Cancelled') return 'Cancelled';
    if (new Date(inv.due_date) < new Date(today) && inv.status !== 'Paid') return 'Overdue';
    if (inv.amount_paid > 0 && inv.amount_paid < inv.total_amount) return 'Partially Paid';
    return inv.status;
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Paid': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'Partially Paid': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'Overdue': return 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm';
      case 'Pending': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'Cancelled': return 'bg-slate-50 text-slate-500 border-slate-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-700 pb-8 print:p-0 print:m-0">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 print:hidden">
        <div>
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-2 bg-blue-50 inline-block px-3 py-1 rounded-full">Billing & Ledger</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mt-2">Invoices.</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="bg-white border border-slate-200 text-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 px-5 py-3.5 rounded-2xl text-[13px] font-bold transition-all flex items-center shrink-0">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </button>
          <button onClick={openNewInvoice} className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white shadow-lg shadow-blue-900/20 hover:shadow-xl hover:-translate-y-0.5 px-6 py-3.5 rounded-2xl text-[13px] font-bold transition-all flex items-center shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Create Invoice
          </button>
        </div>
      </div>

      {/* ENHANCED SEARCH & FILTER BAR */}
      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm print:hidden flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search invoices by number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-11 pl-11 pr-4 rounded-xl border-none text-sm font-medium outline-none bg-transparent focus:ring-0 placeholder:text-slate-400" />
        </div>
        
        {role === 'admin' && !activeWorkspace && (
          <div className="sm:w-64 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-2">
            <select 
              value={filterCompanyId} 
              onChange={(e) => setFilterCompanyId(e.target.value)} 
              className="w-full h-11 rounded-xl bg-slate-50 border-none px-4 text-sm font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors focus:ring-4 focus:ring-blue-500/10 appearance-none"
              style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
            >
              <option value="all">Global (All Subsidiaries)</option>
              {companies.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
        {visibleInvoices.length === 0 && <div className="col-span-full h-48 border border-slate-200 border-dashed rounded-3xl flex items-center justify-center text-slate-400 bg-slate-50/50"><p className="text-[11px] font-bold uppercase tracking-widest">No invoices found</p></div>}
        {visibleInvoices.map(inv => {
          const status = getDynamicStatus(inv);
          return (
            <motion.div key={inv.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={() => openViewInvoice(inv)} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col relative overflow-hidden group cursor-pointer p-6">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[14px] font-black text-slate-900">{inv.invoice_number}</span>
                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${getStatusStyle(status)}`}>{status}</span>
              </div>
              <div className="space-y-1.5 mb-6">
                <p className="text-[12px] font-medium text-slate-600 flex items-center gap-2"><UserSquare2 className="h-3.5 w-3.5 text-slate-400" /> {customers.find(c => c.id === inv.customer_id)?.name || 'Unknown Client'}</p>
                {inv.project_id && <p className="text-[12px] font-medium text-slate-600 flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-slate-400" /> {projects.find(p => p.id === inv.project_id)?.name}</p>}
              </div>
              <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-end">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Due Date</p>
                  <p className={`text-[12px] font-bold ${status === 'Overdue' ? 'text-rose-500' : 'text-slate-800'}`}>{new Date(inv.due_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                  <p className="text-xl font-bold text-slate-900 tracking-tight">₹{inv.total_amount.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm print:relative print:inset-auto print:p-0 print:bg-transparent">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 print:shadow-none print:border-none print:rounded-none print:max-h-none print:h-auto print:overflow-visible">
              
              <div className="px-8 pt-7 border-b border-slate-100 bg-[#FAFCFF] shrink-0 print:hidden">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Ledger Document</span>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-1.5">{selectedInvoice ? `Invoice ${formData.invoice_number}` : 'Generate Invoice'}</h3>
                  </div>
                  <div className="flex gap-3">
                    {selectedInvoice && <button onClick={handlePrint} className="h-10 w-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 shadow-sm transition-colors"><Printer className="h-4 w-4" /></button>}
                    <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 shadow-sm transition-colors"><X className="h-5 w-5" /></button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 lg:p-12 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full bg-white print:p-6 print:overflow-visible print:h-auto">
                
                <div className="flex justify-between items-start mb-12 print:mb-6">
                  <div>
                    {issuingCompany?.logo_url ? (
                       <img src={issuingCompany.logo_url} alt="Logo" className="h-16 w-auto object-contain mb-5 print:mb-2 print:h-12" />
                    ) : (
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800 flex items-center justify-center text-white text-[20px] font-black tracking-tighter mb-4 shadow-sm print:h-10 print:w-10 print:text-sm print:rounded-lg print:mb-2">
                        {issuingCompany?.name ? issuingCompany.name.charAt(0) : 'Z'}
                      </div>
                    )}
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight print:text-lg">{issuingCompany?.name || 'Zayd Industries'}</h2>
                  </div>
                  <div className="text-right">
                    <h1 className="text-4xl font-light tracking-tight text-slate-300 uppercase print:text-2xl">Invoice</h1>
                    <div className="mt-5 space-y-1.5 print:mt-2 print:space-y-0.5">
                      <p className="text-sm text-slate-800 font-bold print:text-xs"><span className="text-slate-400 font-medium mr-2">No:</span> {formData.invoice_number}</p>
                      <p className="text-sm text-slate-800 font-bold flex items-center justify-end print:text-xs">
                        <span className="text-slate-400 font-medium mr-2">Date:</span> 
                        <input type="date" value={formData.issue_date} onChange={e=>setFormData({...formData, issue_date: e.target.value})} className="border-none bg-transparent outline-none cursor-pointer text-right w-32 print:hidden" />
                        <span className="hidden print:inline">{formData.issue_date ? new Date(formData.issue_date).toLocaleDateString() : ''}</span>
                      </p>
                      <p className="text-sm text-slate-800 font-bold flex items-center justify-end print:text-xs">
                        <span className="text-slate-400 font-medium mr-2">Due:</span> 
                        <input type="date" value={formData.due_date} onChange={e=>setFormData({...formData, due_date: e.target.value})} className="border-none bg-transparent outline-none cursor-pointer text-rose-500 text-right w-32 print:hidden" />
                        <span className="hidden print:inline text-rose-500">{formData.due_date ? new Date(formData.due_date).toLocaleDateString() : 'N/A'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 p-6 bg-slate-50 rounded-3xl border border-slate-100 print:bg-transparent print:border-none print:p-0 print:mb-6 print:gap-4">
                  {role === 'admin' && !activeWorkspace && (
                    <div className="print:hidden">
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Issuing Subsidiary</p>
                      <select value={formData.company_id} onChange={(e) => setFormData({...formData, company_id: e.target.value, customer_id: "", project_id: ""})} className="w-full bg-transparent text-lg font-bold text-slate-900 outline-none cursor-pointer border-b border-slate-200 pb-1">
                        <option value="" disabled>-- Select Company --</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className={`${role === 'admin' && !activeWorkspace ? '' : 'md:col-span-1'} print:col-span-2`}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 print:text-[8px] print:mb-1">Billed To <span className="text-rose-500 print:hidden">*</span></p>
                    <select value={formData.customer_id} onChange={(e) => setFormData({...formData, customer_id: e.target.value, project_id: ""})} disabled={!formData.company_id && (role === 'admin' && !activeWorkspace)} className="w-full bg-transparent text-lg font-bold text-slate-900 outline-none cursor-pointer border-b border-slate-200 pb-1 disabled:opacity-50 print:hidden">
                       <option value="">-- Select Client --</option>
                       {availableCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="hidden print:block text-slate-800">
                       <h3 className="text-sm font-bold">{selectedCustomer?.name || "Client Name"}</h3>
                       {selectedCustomer?.phone && <p className="text-xs mt-0.5 font-medium">{selectedCustomer.phone}</p>}
                       <p className="text-xs mt-1 text-slate-500 leading-relaxed max-w-xs">{selectedCustomer?.address || "Address details pending update..."}</p>
                    </div>
                  </div>

                  <div className={`${role === 'admin' && !activeWorkspace ? '' : 'md:col-span-2'} print:col-span-1 print:text-right`}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 print:text-[8px] print:mb-1">Linked Project <span className="print:hidden">(Optional)</span></p>
                    <select value={formData.project_id} onChange={(e) => setFormData({...formData, project_id: e.target.value})} disabled={!formData.customer_id} className="w-full bg-transparent text-lg font-bold text-blue-800 outline-none cursor-pointer border-b border-slate-200 pb-1 disabled:opacity-50 print:hidden">
                       <option value="">-- Standalone Invoice --</option>
                       {availableProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="hidden print:block text-slate-800">
                       <h3 className="text-sm font-bold text-blue-800">{linkedProject?.name || "Standalone Services"}</h3>
                    </div>
                  </div>
                </div>

                <div className="mb-10 print:mb-4">
                  <div className="grid grid-cols-12 gap-4 pb-3 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 print:pb-1 print:text-[8px] print:gap-2">
                    <div className="col-span-6">Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Rate</div>
                    <div className="col-span-2 text-right">Amount</div>
                  </div>
                  <div className="space-y-2 mt-3 print:mt-2 print:space-y-0 text-slate-800">
                    {lineItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-4 items-center group print:break-inside-avoid print:py-1 print:gap-2">
                        <div className="col-span-6 relative">
                          <input type="text" placeholder="Item description..." value={item.description} onChange={e => {const newItems=[...lineItems]; newItems[index].description = e.target.value; setLineItems(newItems)}} className="w-full h-11 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 outline-none text-[14px] font-medium transition-all px-2 print:hidden" />
                          <span className="hidden print:block text-xs font-bold pl-2">{item.description || "-"}</span>
                          {index > 0 && <button onClick={() => setLineItems(lineItems.filter((_, i) => i !== index))} className="absolute -left-6 top-3 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                        <div className="col-span-2">
                           <input type="number" value={item.quantity} onChange={e => {const newItems=[...lineItems]; newItems[index].quantity = parseFloat(e.target.value)||0; setLineItems(newItems)}} className="w-full h-11 bg-transparent text-center border-b border-transparent hover:border-slate-200 focus:border-blue-500 outline-none text-[14px] font-bold transition-all print:hidden" />
                           <span className="hidden print:block text-xs font-medium text-center">{item.quantity}</span>
                        </div>
                        <div className="col-span-2">
                           <input type="number" value={item.rate} onChange={e => {const newItems=[...lineItems]; newItems[index].rate = parseFloat(e.target.value)||0; setLineItems(newItems)}} className="w-full h-11 bg-transparent text-right border-b border-transparent hover:border-slate-200 focus:border-blue-500 outline-none text-[14px] font-bold transition-all print:hidden" />
                           <span className="hidden print:block text-xs font-medium text-right">₹{item.rate.toLocaleString()}</span>
                        </div>
                        <div className="col-span-2 text-right px-2 font-bold text-[14px] print:text-xs">₹{(item.quantity * item.rate).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setLineItems([...lineItems, {description: "", quantity: 1, rate: 0}])} className="mt-4 text-[11px] font-bold text-blue-600 uppercase tracking-widest hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors print:hidden flex items-center"><Plus className="h-3.5 w-3.5 mr-1" /> Add Item</button>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-6 print:pt-4 print:break-inside-avoid">
                  <div className="w-full max-w-sm space-y-4 print:space-y-1.5">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-600 px-4 print:px-2 print:text-xs"><span className="uppercase tracking-widest text-[10px] print:text-[8px]">Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between items-center text-sm font-bold text-slate-600 px-4 print:px-2 print:text-xs">
                       <span className="uppercase tracking-widest text-[10px] print:text-[8px] flex items-center gap-2">
                         Tax Rate (%) 
                         <input type="number" value={formData.tax_rate} onChange={e => setFormData({...formData, tax_rate: parseFloat(e.target.value)||0})} className="w-16 bg-slate-50 border border-slate-200 rounded p-1 text-center outline-none print:hidden" />
                         <span className="hidden print:inline text-slate-800">{formData.tax_rate}%</span>
                       </span>
                       <span>₹{taxAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-slate-600 px-4 print:px-2 print:text-xs">
                       <span className="uppercase tracking-widest text-[10px] print:text-[8px] flex items-center gap-2">
                         Discount (₹) 
                         <input type="number" value={formData.discount_amount} onChange={e => setFormData({...formData, discount_amount: parseFloat(e.target.value)||0})} className="w-24 bg-slate-50 border border-slate-200 rounded p-1 text-center outline-none text-rose-500 print:hidden" />
                         <span className="hidden print:inline text-rose-500">₹{formData.discount_amount.toLocaleString()}</span>
                       </span>
                       <span className="text-rose-500">- ₹{formData.discount_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-slate-600 px-4 pt-4 border-t border-slate-100 print:px-2 print:pt-2 print:text-xs">
                       <span className="uppercase tracking-widest text-[10px] print:text-[8px] text-slate-800">Grand Total</span>
                       <span className="text-slate-900">₹{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {selectedInvoice && (
                  <div className="mt-12 border-t border-slate-100 pt-8 print:mt-6 print:pt-4 print:break-inside-avoid">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 print:text-[8px] print:mb-2">Transaction Ledger</h3>
                    
                    <div className="space-y-3 print:space-y-1">
                      {currentInvoicePayments.length === 0 ? (
                        <p className="text-sm text-slate-400 italic print:text-xs">No payments recorded.</p>
                      ) : (
                        currentInvoicePayments.map(payment => (
                          <div key={payment.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-transparent print:border-none print:p-0 print:border-b print:border-slate-50 print:pb-1">
                            <div className="flex items-center gap-3 print:gap-2">
                               <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center print:hidden"><CheckCircle2 className="h-4 w-4" /></div>
                               <div>
                                 <p className="text-sm font-bold text-slate-900 print:text-xs">{payment.payment_method}</p>
                                 <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 print:text-[8px]">{new Date(payment.payment_date).toLocaleDateString()} {payment.reference_note && `• Ref: ${payment.reference_note}`}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className="text-base font-bold text-emerald-600 print:text-xs">₹{parseFloat(payment.amount).toLocaleString()}</p>
                              <button onClick={() => handleDeletePayment(payment.id)} className="text-rose-400 hover:text-rose-600 print:hidden"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className={`flex justify-between items-center text-2xl font-black text-slate-900 bg-slate-50 p-6 rounded-3xl mt-6 border border-slate-100 print:bg-transparent print:border-none print:px-2 print:py-2 print:mt-4 print:text-lg ${balanceDue <= 0 ? 'print:hidden' : ''}`}>
                       <span className="uppercase tracking-widest text-[12px] print:text-[10px] text-slate-400">Balance Due</span>
                       <span>₹{balanceDue.toLocaleString()}</span>
                    </div>

                    {!showPaymentForm ? (
                      <button onClick={() => setShowPaymentForm(true)} className="mt-5 text-[11px] font-bold text-emerald-600 uppercase tracking-widest hover:bg-emerald-50 px-4 py-2 rounded-lg transition-colors print:hidden flex items-center"><Plus className="h-3.5 w-3.5 mr-1" /> Record New Payment</button>
                    ) : (
                      <div className="mt-5 p-5 bg-white border border-emerald-100 rounded-2xl shadow-sm print:hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                           <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Amount (₹)</label><input type="number" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})} className="w-full h-10 border border-slate-200 rounded-lg px-3 outline-none focus:border-emerald-500 font-bold" /></div>
                           <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Date</label><input type="date" value={newPayment.payment_date} onChange={e => setNewPayment({...newPayment, payment_date: e.target.value})} className="w-full h-10 border border-slate-200 rounded-lg px-3 outline-none focus:border-emerald-500 font-medium text-sm" /></div>
                           <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Method</label><select value={newPayment.payment_method} onChange={e => setNewPayment({...newPayment, payment_method: e.target.value})} className="w-full h-10 border border-slate-200 rounded-lg px-3 outline-none focus:border-emerald-500 font-medium text-sm"><option>Bank Transfer</option><option>Cash</option><option>Credit Card</option><option>UPI / Online</option></select></div>
                           <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Reference (Opt)</label><input type="text" value={newPayment.reference_note} onChange={e => setNewPayment({...newPayment, reference_note: e.target.value})} placeholder="Txn ID..." className="w-full h-10 border border-slate-200 rounded-lg px-3 outline-none focus:border-emerald-500 font-medium text-sm" /></div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => setShowPaymentForm(false)} className="h-9 px-4 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg border border-slate-200">Cancel</button>
                           <button onClick={handleRecordPayment} disabled={isSaving} className="h-9 px-6 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm">Submit Payment</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {!selectedInvoice && (
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-12 text-center print:hidden border-t border-slate-100 pt-8">Save this invoice to begin recording ledger transactions.</p>
                )}

                <div className="hidden print:block mt-10 pt-4 border-t border-slate-200 text-center">
                  <p className="text-sm font-bold text-slate-800 tracking-tight">Thank you for your business!</p>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">If you have any questions regarding this invoice, please contact us.</p>
                </div>

              </div>

              <div className="p-6 border-t border-slate-100 bg-[#FAFCFF] flex justify-between items-center shrink-0 print:hidden">
                {selectedInvoice ? (
                  <div className="flex gap-3">
                    <button onClick={handleDeleteInvoice} className="border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 rounded-xl h-12 px-5 flex items-center justify-center shadow-sm transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ) : <div></div>}
                
                <div className="flex gap-3">
                  <button onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 bg-white h-12 px-8 font-bold text-sm text-slate-600 hover:bg-slate-50 shadow-sm transition-colors">Cancel</button>
                  <button onClick={handleSaveInvoice} disabled={isSaving} className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl h-12 px-10 font-bold text-sm shadow-md shadow-blue-900/20 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    {isSaving ? "Saving..." : "Save Invoice"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}