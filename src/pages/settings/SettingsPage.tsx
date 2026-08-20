import { motion } from "framer-motion";
import { UserCircle, Shield, Bell, Key, LogOut, Building2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuthStore } from "../../store/authStore";

export default function SettingsPage() {
  // We pull the real user, role, and the new signOut function from your Auth Store
  const { user, role, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    // Once signOut finishes, the Gatekeeper in AppRouter will instantly kick you back to the login screen!
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto h-full flex flex-col pb-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">System Settings</h2>
          <p className="text-slate-500 mt-1">Manage your account and preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        
        {/* Left Column: Navigation/Tabs (Scales for mobile) */}
        <div className="md:col-span-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white font-medium shadow-md transition-all">
            <UserCircle className="h-5 w-5" /> Account Profile
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-white/60 hover:text-slate-900 font-medium transition-all">
            <Building2 className="h-5 w-5" /> Company Preferences
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-white/60 hover:text-slate-900 font-medium transition-all">
            <Bell className="h-5 w-5" /> Notifications
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-white/60 hover:text-slate-900 font-medium transition-all">
            <Shield className="h-5 w-5" /> Security
          </button>
        </div>

        {/* Right Column: Settings Content */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Profile Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/60 bg-white/50 p-6 shadow-sm backdrop-blur-md">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Profile Information</h3>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
              <div className="h-20 w-20 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-500 shadow-inner">
                <UserCircle className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-semibold text-slate-800">
                  {user?.email ? user.email.split('@')[0].toUpperCase() : "System User"}
                </p>
                <p className="text-slate-500">{user?.email || "No email provided"}</p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold uppercase tracking-wider mt-2">
                  <Key className="h-3 w-3" />
                  {role || "User"} Access
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-200/60 pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Email Address</label>
                  <input type="email" disabled value={user?.email || ""} className="w-full h-11 rounded-xl border-none bg-white/60 px-4 text-sm text-slate-500 outline-none ring-1 ring-slate-200 opacity-70 cursor-not-allowed" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Role Level</label>
                  <input type="text" disabled value={role ? role.toUpperCase() : ""} className="w-full h-11 rounded-xl border-none bg-white/60 px-4 text-sm text-slate-500 outline-none ring-1 ring-slate-200 opacity-70 cursor-not-allowed" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Danger Zone */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-rose-100 bg-rose-50/50 p-6 shadow-sm backdrop-blur-md">
            <h3 className="text-lg font-semibold text-rose-800 mb-2">Session Management</h3>
            <p className="text-sm text-rose-600/80 mb-6">Securely log out of the Zayd Industries Operating System. You will need to re-enter your credentials to access the system again.</p>
            
            <Button 
              onClick={handleSignOut}
              className="w-full sm:w-auto bg-rose-600 text-white hover:bg-rose-700 shadow-md flex items-center justify-center gap-2 h-11 px-6 rounded-xl"
            >
              <LogOut className="h-4 w-4" />
              Sign Out of System
            </Button>
          </motion.div>

        </div>
      </div>
    </div>
  );
}