import { useState } from "react";
import { motion } from "framer-motion";
import { User, Building, Bell, Shield, Save, LogOut } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuthStore } from "../../store/authStore";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  
  // Bring in the logout function
  const logout = useAuthStore((state) => state.logout);

  const tabs = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "company", label: "Company Details", icon: Building },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-slate-800">Settings</h2>
        <p className="text-slate-500 mt-1">Manage your account preferences and company details.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Settings Sidebar */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-6">
          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive 
                      ? "bg-white/60 text-slate-900 shadow-sm ring-1 ring-black/5 backdrop-blur-md" 
                      : "text-slate-500 hover:bg-white/40 hover:text-slate-900"
                  }`}
                >
                  <tab.icon className={`h-5 w-5 ${isActive ? "text-slate-900" : "text-slate-400"}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* New Logout Button injected into Settings */}
          <div className="pt-6 border-t border-white/50">
            <Button 
              onClick={() => logout()} 
              variant="outline"
              className="w-full flex items-center justify-start gap-3 bg-white/40 border-white/60 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all px-4 py-6 rounded-xl shadow-sm"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sign Out</span>
            </Button>
          </div>
        </aside>

        {/* Settings Content Area */}
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 rounded-2xl border border-white/60 bg-white/50 p-6 md:p-8 shadow-sm backdrop-blur-md"
        >
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="border-b border-white/50 pb-5">
                <h3 className="text-lg font-semibold text-slate-800">Profile Information</h3>
                <p className="text-sm text-slate-500 mt-1">Update your personal details and public profile.</p>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900 text-2xl font-bold text-white shadow-md">
                  Z
                </div>
                <Button variant="outline" className="bg-white/50 border-white/60 hover:bg-white/80">
                  Change Avatar
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Full Name</label>
                  <input 
                    type="text" 
                    defaultValue="Admin User"
                    className="w-full rounded-xl border-none bg-white/60 px-4 py-2.5 text-sm outline-none ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email Address</label>
                  <input 
                    type="email" 
                    defaultValue="admin@zaydindustries.com"
                    className="w-full rounded-xl border-none bg-white/60 px-4 py-2.5 text-sm outline-none ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Role / Title</label>
                  <input 
                    type="text" 
                    defaultValue="Founder & CEO"
                    className="w-full rounded-xl border-none bg-white/60 px-4 py-2.5 text-sm outline-none ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab !== "profile" && (
            <div className="flex h-64 items-center justify-center text-slate-400">
              {tabs.find(t => t.id === activeTab)?.label} settings will go here.
            </div>
          )}

          <div className="mt-8 flex justify-end border-t border-white/50 pt-6">
            <Button className="gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}