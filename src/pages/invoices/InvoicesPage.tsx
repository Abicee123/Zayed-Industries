import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Download, FileText, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useDataStore, type Invoice } from "../../store/dataStore";

export default function InvoicesPage() {
  const { invoices, addInvoice, customers } = useDataStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form States
  const [client, setClient] = useState(customers[0]?.name || "");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<Invoice["status"]>("Pending");

  // Dynamic Billing Calculations
  const parseAmount = (amountStr: string) => Number(amountStr.replace(/[^0-9.-]+/g, ""));
  const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);

  const collected = invoices.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + parseAmount(curr.amount), 0);
  const outstanding = invoices.filter(i => i.status !== 'Paid').reduce((acc, curr) => acc + parseAmount(curr.amount), 0);
  const totalBilled = collected + outstanding;

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount.trim()) return;

    // Formatting the input to look like currency if the user just types a number
    const formattedAmount = amount.startsWith("$") ? amount : `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    addInvoice({
      client,
      amount: formattedAmount,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status
    });

    setAmount("");
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 relative h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Invoice Management</h2>
          <p className="text-slate-500 mt-1">Generate and track client billing.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-md"
        >
          <Plus className="h-4 w-4" /> Create Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Invoice List */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {invoices.map((inv) => (
              <motion.div 
                layout
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                key={inv.id} 
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/60 bg-white/50 p-5 shadow-sm backdrop-blur-md hover:bg-white/80 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-black/5 shadow-sm">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{inv.client}</h4>
                    <p className="text-sm text-slate-500">{inv.id} • {inv.date}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                  <span className="font-bold text-slate-800">{inv.amount}</span>
                  <span className={`w-24 shrink-0 text-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                    inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 
                    inv.status === 'Pending' ? 'bg-orange-50 text-orange-700 ring-orange-600/20' : 
                    inv.status === 'Overdue' ? 'bg-rose-50 text-rose-700 ring-rose-600/20' :
                    'bg-blue-50 text-blue-700 ring-blue-600/20'
                  }`}>
                    {inv.status}
                  </span>
                  <button className="text-slate-400 hover:text-slate-700 hidden sm:block"><Download className="h-5 w-5" /></button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Dynamic Quick Summary Card */}
        <motion.div 
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl border border-white/60 bg-white/50 p-6 shadow-sm backdrop-blur-md h-fit sticky top-6"
        >
          <h3 className="font-semibold text-slate-800 mb-6">Billing Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Collected</span>
              <span className="font-medium text-emerald-600">{formatCurrency(collected)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Outstanding</span>
              <span className="font-medium text-orange-600">{formatCurrency(outstanding)}</span>
            </div>
            <div className="pt-4 border-t border-white/50 flex justify-between">
              <span className="font-semibold text-slate-800">Total Billed</span>
              <span className="font-bold text-slate-900">{formatCurrency(totalBilled)}</span>
            </div>
          </div>
          <Button className="w-full mt-6 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 shadow-sm transition-colors">
            Send Reminders
          </Button>
        </motion.div>
      </div>

      {/* Create Invoice Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-6 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-800">Create Invoice</h3>
                <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 transition-colors shadow-sm ring-1 ring-black/5">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Select Client</label>
                  <select 
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-slate-400 appearance-none"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Invoice Amount</label>
                  <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 5000" className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-slate-400" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Invoice["status"])}
                    className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-slate-400 appearance-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Processing">Processing</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>

                <div className="mt-8 flex gap-3 pt-4 border-t border-white/50">
                  <Button type="button" onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1 bg-white/50 border-white/60 hover:bg-white/80">Cancel</Button>
                  <Button type="submit" disabled={!amount} className="flex-1 bg-slate-900 text-white hover:bg-slate-800 shadow-md disabled:opacity-50">Generate</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}