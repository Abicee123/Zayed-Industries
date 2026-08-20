import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, MoreHorizontal, Plus, Search, X, Fingerprint, CalendarDays } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useDataStore } from "../../store/dataStore";

export default function EmployeesPage() {
  const { employees, addEmployee } = useDataStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form States (Now including Age, Phone, and Proof ID)
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("Architectural Designer");
  const [empEmail, setEmpEmail] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empAge, setEmpAge] = useState("");
  const [empProofId, setEmpProofId] = useState("");

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empEmail.trim()) return;

    addEmployee({
      name: empName,
      role: empRole,
      email: empEmail,
      phone: empPhone || "Not provided",
      age: empAge || "N/A",
      proofId: empProofId || "Pending Verification"
    });

    setEmpName(""); setEmpEmail(""); setEmpPhone(""); setEmpAge(""); setEmpProofId("");
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 relative h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Team Directory</h2>
          <p className="text-slate-500 mt-1">Manage your workforce, contacts, and verifications.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-md">
          <Plus className="h-4 w-4" /> Add Employee
        </Button>
      </div>

      <div className="flex bg-white/40 p-3 rounded-xl border border-white/60 shadow-sm backdrop-blur-md">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, role, or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border-none bg-white/60 py-2 pl-9 pr-4 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
        <AnimatePresence>
          {filteredEmployees.map((emp, i) => (
            <motion.div 
              layout key={emp.id}
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
              className="group rounded-2xl border border-white/60 bg-white/50 p-6 shadow-sm backdrop-blur-md hover:bg-white/80 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-xl font-bold text-slate-700 shadow-sm ring-1 ring-black/5">
                  {emp.initial}
                </div>
                <button className="text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-slate-800">{emp.name}</h3>
              <p className="text-sm font-medium text-slate-500 mb-6">{emp.role}</p>
              
              <div className="space-y-3 text-sm text-slate-600 border-t border-white/50 pt-4 mt-4">
                <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-slate-400" /> {emp.email}</div>
                <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-slate-400" /> {emp.phone}</div>
                <div className="flex items-center gap-3"><CalendarDays className="h-4 w-4 text-slate-400" /> Age: {emp.age}</div>
                <div className="flex items-center gap-3"><Fingerprint className="h-4 w-4 text-slate-400" /> ID: {emp.proofId}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/60 bg-white/80 p-6 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-800">Add New Employee</h3>
                <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 shadow-sm ring-1 ring-black/5">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-slate-700">Full Name</label>
                    <input type="text" required value={empName} onChange={(e) => setEmpName(e.target.value)} className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400" />
                  </div>
                  
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <label className="text-sm font-medium text-slate-700">Role</label>
                    <input type="text" required value={empRole} onChange={(e) => setEmpRole(e.target.value)} className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400" />
                  </div>

                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <label className="text-sm font-medium text-slate-700">Age</label>
                    <input type="number" value={empAge} onChange={(e) => setEmpAge(e.target.value)} placeholder="e.g., 28" className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400" />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-slate-700">Email Address</label>
                    <input type="email" required value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400" />
                  </div>

                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <label className="text-sm font-medium text-slate-700">Phone Number</label>
                    <input type="text" value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} placeholder="+1 (555)..." className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400" />
                  </div>

                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <label className="text-sm font-medium text-slate-700">Proof ID (Aadhaar / PAN)</label>
                    <input type="text" value={empProofId} onChange={(e) => setEmpProofId(e.target.value)} placeholder="[Aadhaar Redacted] or PAN" className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400" />
                  </div>
                </div>

                <div className="mt-8 flex gap-3 pt-4 border-t border-white/50">
                  <Button type="button" onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1 bg-white/50 border-white/60">Cancel</Button>
                  <Button type="submit" disabled={!empName.trim()} className="flex-1 bg-slate-900 text-white shadow-md">Add Team Member</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}