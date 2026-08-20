import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: React.ElementType;
  variants: any;
}

export default function StatCard({ title, value, trend, trendUp, icon: Icon, variants }: StatCardProps) {
  return (
    <motion.div 
      variants={variants} 
      className="group cursor-pointer rounded-2xl border border-white/60 bg-white/50 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 hover:shadow-lg"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 transition-colors group-hover:text-slate-700">
          {title}
        </span>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/60 shadow-sm ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-110 group-hover:bg-white">
          <Icon className="h-5 w-5 text-slate-600" />
        </div>
      </div>
      
      {/* Added flex-wrap and responsive text sizing to prevent overflow */}
      <div className="mt-4 flex flex-wrap items-baseline gap-2">
        <span className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-800 truncate">
          {value}
        </span>
        <span className={`text-sm font-medium whitespace-nowrap ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend}
        </span>
      </div>
    </motion.div>
  );
}