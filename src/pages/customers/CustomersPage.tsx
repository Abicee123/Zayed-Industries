import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Filter, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useDataStore, type Customer } from "../../store/dataStore";

export default function CustomersPage() {
  const { customers, addCustomer } = useDataStore();
  
  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form States
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [status, setStatus] = useState<Customer["status"]>("Onboarding");

  // Live Filter
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactName.trim()) return;

    addCustomer({
      name: companyName,
      contact: contactName,
      status: status
    });

    // Reset and close
    setCompanyName("");
    setContactName("");
    setStatus("Onboarding");
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Customer Relations</h2>
          <p className="text-slate-500 mt-1">Track enterprise clients and lifetime value.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-md"
        >
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 overflow-hidden rounded-2xl border border-white/60 bg-white/50 shadow-sm backdrop-blur-md flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-white/50 p-5">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by company or contact..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border-none bg-white/60 py-2 pl-9 pr-4 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400 transition-all" 
            />
          </div>
          <Button variant="outline" className="bg-white/50 border-white/60 hover:bg-white/80 hidden sm:flex"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase text-slate-400 bg-white/40 border-b border-white/50 sticky top-0">
              <tr>
                <th className="px-6 py-4 font-medium">Company Name</th>
                <th className="px-6 py-4 font-medium">Primary Contact</th>
                <th className="px-6 py-4 font-medium">Projects</th>
                <th className="px-6 py-4 font-medium">Total Spent</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/50">
              <AnimatePresence>
                {filteredCustomers.map((c) => (
                  <motion.tr 
                    key={c.id} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-white/60 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-800">{c.name}</td>
                    <td className="px-6 py-4">{c.contact}</td>
                    <td className="px-6 py-4">{c.projects}</td>
                    <td className="px-6 py-4 font-medium">{c.spent}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                        c.status === 'Active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 
                        c.status === 'Onboarding' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : 
                        'bg-slate-100 text-slate-700 ring-slate-600/20'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          
          {filteredCustomers.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              No clients found matching "{searchQuery}"
            </div>
          )}
        </div>
      </motion.div>

      {/* Add Client Modal */}
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
                <h3 className="text-xl font-semibold text-slate-800">Add New Client</h3>
                <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 transition-colors shadow-sm ring-1 ring-black/5">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddClient} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Company Name</label>
                  <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g., Acme Corp" className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-slate-400" autoFocus />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Primary Contact</label>
                  <input type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g., Jane Smith" className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-slate-400" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Initial Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Customer["status"])}
                    className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-slate-400 appearance-none"
                  >
                    <option value="Onboarding">Onboarding</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="mt-8 flex gap-3 pt-4 border-t border-white/50">
                  <Button type="button" onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1 bg-white/50 border-white/60 hover:bg-white/80">Cancel</Button>
                  <Button type="submit" disabled={!companyName.trim() || !contactName.trim()} className="flex-1 bg-slate-900 text-white hover:bg-slate-800 shadow-md disabled:opacity-50">Save Client</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}