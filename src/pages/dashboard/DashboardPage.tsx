import { motion } from "framer-motion";
import { DollarSign, Users, Briefcase, Activity, Download } from "lucide-react";
import { Button } from "../../components/ui/button";
import StatCard from "../../components/dashboard/StatCard";
import { useDataStore } from "../../store/dataStore";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function DashboardPage() {
  const { invoices, employees, projects, customers } = useDataStore();

  const parseAmount = (amountStr: string) => Number(amountStr.replace(/[^0-9.-]+/g, ""));
  const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);

  const totalRevenue = invoices
    .filter(i => i.status === 'Paid')
    .reduce((acc, curr) => acc + parseAmount(curr.amount), 0);

  const stats = [
    { title: "Revenue", value: formatCurrency(totalRevenue), trend: "+14.5%", trendUp: true, icon: DollarSign },
    { title: "Employees", value: employees.length.toString(), trend: "+1", trendUp: true, icon: Users },
    { title: "Projects", value: projects.length.toString(), trend: "+2", trendUp: true, icon: Briefcase },
    { title: "Customers", value: customers.length.toString(), trend: "+1", trendUp: true, icon: Activity }
  ];

  // FIXED: Changed proj.date to proj.dueDate
  const recentActivity = [
    ...invoices.slice(0, 2).map(inv => ({
      id: inv.id,
      action: `Invoice Generated - ${inv.amount}`,
      user: inv.client,
      time: inv.date,
      status: inv.status,
      statusColor: inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-blue-50 text-blue-700 ring-blue-600/20'
    })),
    ...projects.slice(0, 3).map(proj => ({
      id: proj.id.toString(),
      action: `Project: ${proj.title}`,
      user: "System",
      time: proj.dueDate, // <-- The error was here! Now using dueDate.
      status: proj.status === 'completed' ? 'Completed' : 'Active',
      statusColor: proj.status === 'completed' ? 'bg-slate-100 text-slate-700 ring-slate-600/20' : 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'
    }))
  ];

  // NEW: Report Generation Logic (Creates and downloads a CSV file)
  const handleGenerateReport = () => {
    // 1. Create CSV headers and rows
    const headers = "Type,ID,Name/Title,Status,Value/Role\n";
    
    const projectRows = projects.map(p => `Project,${p.id},"${p.title}",${p.status},${p.tag}`).join("\n");
    const employeeRows = employees.map(e => `Employee,${e.id},"${e.name}",Active,${e.role}`).join("\n");
    const invoiceRows = invoices.map(i => `Invoice,${i.id},"${i.client}",${i.status},"${i.amount}"`).join("\n");
    
    const csvContent = headers + projectRows + "\n" + employeeRows + "\n" + invoiceRows;

    // 2. Create a blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Radix_Business_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="text-slate-500 mt-1">Here is an overview of your operations today.</p>
        </div>
        <Button onClick={handleGenerateReport} className="gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all">
          <Download className="h-4 w-4" />
          Generate Report
        </Button>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} variants={item} />
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="overflow-hidden rounded-2xl border border-white/60 bg-white/50 shadow-sm backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/50 p-6">
          <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
          <Button variant="outline" className="text-sm bg-white/50 border-white/60 hover:bg-white/80">
            View All
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase text-slate-400 bg-white/40 border-b border-white/50">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">Action</th>
                <th className="px-6 py-4 font-medium tracking-wider">Target / User</th>
                <th className="px-6 py-4 font-medium tracking-wider">Time (Due/Created)</th>
                <th className="px-6 py-4 font-medium tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/50">
              {recentActivity.map((activity, idx) => (
                <tr key={idx} className="transition-colors duration-200 hover:bg-white/60 group">
                  <td className="px-6 py-4 font-medium text-slate-800">{activity.action}</td>
                  <td className="px-6 py-4">{activity.user}</td>
                  <td className="px-6 py-4">{activity.time}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${activity.statusColor}`}>
                      {activity.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}