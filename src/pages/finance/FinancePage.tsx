import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, TrendingUp, CreditCard, Download, Plus, Search, Filter } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useDataStore } from "../../store/dataStore";
import { Link } from "react-router-dom";

export default function FinancePage() {
  const { invoices } = useDataStore();
  const [searchQuery, setSearchQuery] = useState("");

  // Dynamic Calculations
  const parseAmount = (amountStr: string) => Number(amountStr.replace(/[^0-9.-]+/g, ""));
  const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + parseAmount(curr.amount), 0);
  const outstandingAmount = invoices.filter(i => i.status !== 'Paid').reduce((acc, curr) => acc + parseAmount(curr.amount), 0);

  const financeStats = [
    { title: "Total Revenue", value: formatCurrency(totalRevenue), trend: "+14.5%", trendUp: true, icon: DollarSign },
    { title: "Monthly Expenses", value: "$12,400.00", trend: "-2.4%", trendUp: false, icon: CreditCard }, // Mock static expense
    { title: "Outstanding", value: formatCurrency(outstandingAmount), trend: "+5.2%", trendUp: true, icon: TrendingUp }
  ];

  // Live Filter for Transactions Table
  const filteredTransactions = invoices.filter(inv => 
    inv.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Financial Overview</h2>
          <p className="text-slate-500 mt-1">Monitor your cash flow, expenses, and invoice statuses.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 bg-white/50 border-white/60 hover:bg-white/80">
            <Download className="h-4 w-4" />
            Export
          </Button>
          {/* Routes directly to Invoices page to create a new one */}
          <Link to="/invoices">
            <Button className="gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all">
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Finance Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {financeStats.map((stat, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group cursor-pointer rounded-2xl border border-white/60 bg-white/50 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500 transition-colors group-hover:text-slate-700">
                {stat.title}
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/60 shadow-sm ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-110 group-hover:bg-white">
                <stat.icon className="h-5 w-5 text-slate-600" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-slate-800">
                {stat.value}
              </span>
              <span className={`text-sm font-medium whitespace-nowrap ${stat.trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                {stat.trend}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Transactions Table Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="overflow-hidden rounded-2xl border border-white/60 bg-white/50 shadow-sm backdrop-blur-md flex flex-col"
      >
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-white/50 p-5 gap-4">
          <h3 className="text-lg font-semibold text-slate-800">Recent Transactions</h3>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search transactions..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border-none bg-white/60 py-2 pl-9 pr-4 text-sm outline-none ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <Button variant="outline" size="icon" className="bg-white/50 border-white/60 hover:bg-white/80 shrink-0">
              <Filter className="h-4 w-4 text-slate-600" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase text-slate-400 bg-white/40 border-b border-white/50">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">Invoice ID</th>
                <th className="px-6 py-4 font-medium tracking-wider">Client</th>
                <th className="px-6 py-4 font-medium tracking-wider">Date</th>
                <th className="px-6 py-4 font-medium tracking-wider">Amount</th>
                <th className="px-6 py-4 font-medium tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/50">
              <AnimatePresence>
                {filteredTransactions.map((tx) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={tx.id} 
                    className="transition-colors duration-200 hover:bg-white/60 group cursor-pointer"
                  >
                    <td className="px-6 py-4 font-medium text-slate-800 group-hover:text-black transition-colors">{tx.id}</td>
                    <td className="px-6 py-4">{tx.client}</td>
                    <td className="px-6 py-4">{tx.date}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{tx.amount}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                        tx.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 
                        tx.status === 'Pending' ? 'bg-orange-50 text-orange-700 ring-orange-600/20' : 
                        tx.status === 'Overdue' ? 'bg-rose-50 text-rose-700 ring-rose-600/20' :
                        'bg-blue-50 text-blue-700 ring-blue-600/20'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          
          {filteredTransactions.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              No transactions found matching "{searchQuery}"
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}