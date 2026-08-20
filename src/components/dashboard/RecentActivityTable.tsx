import { motion } from "framer-motion";
import { Button } from "../ui/button";

const recentActivity = [
  { id: 1, action: "New enterprise contract signed", user: "Sarah Jenkins", time: "2 hours ago", status: "Completed" },
  { id: 2, action: "Database migration to v4", user: "Engineering Team", time: "4 hours ago", status: "In Progress" },
  { id: 3, action: "Q3 Earnings report published", user: "Finance Dept", time: "1 day ago", status: "Completed" },
  { id: 4, action: "Security patch deployed", user: "System Admin", time: "2 days ago", status: "Completed" }
];

export default function RecentActivityTable() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      // 1. Applied glassmorphism container
      className="overflow-hidden rounded-2xl border border-white/60 bg-white/50 shadow-sm backdrop-blur-md"
    >
      <div className="flex items-center justify-between border-b border-white/50 p-6">
        <h3 className="text-lg font-semibold text-slate-800">Recent Activity</h3>
        <Button variant="outline" className="bg-white/50 backdrop-blur-sm border-white/60 hover:bg-white/80 transition-all">
          View All
        </Button>
      </div>
      <div className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase text-slate-400 bg-white/40 border-b border-white/50">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">Action</th>
                <th className="px-6 py-4 font-medium tracking-wider">User</th>
                <th className="px-6 py-4 font-medium tracking-wider">Time</th>
                <th className="px-6 py-4 font-medium tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/50">
              {recentActivity.map((activity) => (
                <tr key={activity.id} className="transition-colors duration-200 hover:bg-white/60 group cursor-default">
                  <td className="px-6 py-4 font-medium text-slate-800 group-hover:text-black transition-colors">{activity.action}</td>
                  <td className="px-6 py-4">{activity.user}</td>
                  <td className="px-6 py-4">{activity.time}</td>
                  <td className="px-6 py-4">
                    {/* Premium soft-ring badges */}
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                      activity.status === 'Completed' 
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' 
                        : 'bg-blue-50 text-blue-700 ring-blue-600/20'
                    }`}>
                      {activity.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}