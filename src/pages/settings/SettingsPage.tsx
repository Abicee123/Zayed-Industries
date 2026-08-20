import { useState, useRef, useEffect } from "react";
import { Camera, Save, Lock, User, Shield, CheckCircle2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";
import { supabase } from "../../supabase";
import { Button } from "../../components/ui/button";

export default function SettingsPage() {
  const { user, employeeId, role } = useAuthStore();
  const { employees, fetchAllData } = useDataStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  
  const currentEmployee = employees.find(e => e.id === employeeId);
  const [formData, setFormData] = useState({ name: "", newPassword: "" });

  useEffect(() => {
    if (currentEmployee) {
      setFormData(prev => ({ ...prev, name: currentEmployee.name || "" }));
      setImagePreview(currentEmployee.profile_image_url || null);
      setRemoveImage(false);
    }
  }, [currentEmployee]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) { setImageFile(e.target.files[0]); setImagePreview(URL.createObjectURL(e.target.files[0])); setRemoveImage(false); }
  };

  const handleRemovePhoto = () => { setImageFile(null); setImagePreview(null); setRemoveImage(true); };

  const handleSaveSettings = async () => {
    if (!formData.name.trim()) return alert("Name cannot be empty.");
    setIsLoading(true); setIsSuccess(false);

    try {
      let avatarUrl = currentEmployee?.profile_image_url || null;

      if (imageFile) {
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${imageFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, imageFile);
        if (!uploadError) { const { data } = supabase.storage.from('avatars').getPublicUrl(fileName); avatarUrl = data.publicUrl; }
      } else if (removeImage) {
        avatarUrl = null;
      }

      await supabase.from('employees').update({ name: formData.name, profile_image_url: avatarUrl }).eq('id', employeeId);

      if (formData.newPassword) {
        if (formData.newPassword.length < 6) { alert("Password must be at least 6 characters."); setIsLoading(false); return; }
        await supabase.auth.updateUser({ password: formData.newPassword });
        setFormData(prev => ({ ...prev, newPassword: "" }));
      }

      await fetchAllData(); setIsSuccess(true); setTimeout(() => setIsSuccess(false), 3000);
    } catch (error: any) { alert(`Error updating: ${error.message}`); } finally { setIsLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8 h-full">
      
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your public profile and security preferences.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Photo & Role */}
        <div className="md:w-64 bg-slate-50/50 border-r border-slate-100 p-8 flex flex-col items-center text-center">
          <div className="relative group mb-5">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
            <div onClick={() => fileInputRef.current?.click()} className="h-28 w-28 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 cursor-pointer overflow-hidden relative">
              {imagePreview ? <img src={imagePreview} alt="Profile" className="h-full w-full object-cover" /> : <User className="h-10 w-10 opacity-50" />}
              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-sm"><Camera className="h-6 w-6 text-white" /></div>
            </div>
            {imagePreview && (
              <button onClick={handleRemovePhoto} className="absolute -bottom-2 -right-2 h-8 w-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 shadow-sm transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <h3 className="font-bold text-slate-900 text-[15px] truncate w-full">{formData.name || 'Unnamed User'}</h3>
          <p className="text-xs text-slate-500 mt-1 truncate w-full">{user?.email}</p>
          
          <div className="mt-4 pt-4 border-t border-slate-200/60 w-full flex justify-center">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
              <Shield className="h-3 w-3 mr-1.5" /> {role === 'head' ? 'Company Head' : role}
            </span>
          </div>
        </div>

        {/* Right Side: Form Inputs */}
        <div className="flex-1 p-8 space-y-8">
          
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Personal Details</h3>
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                <input type="email" value={user?.email || ""} disabled className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 px-3 text-sm outline-none cursor-not-allowed" />
                <p className="text-[11px] text-slate-400 ml-1">Contact system admin to change email.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Security</h3>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input type="password" value={formData.newPassword} onChange={(e) => setFormData({...formData, newPassword: e.target.value})} placeholder="Leave blank to keep current password..." className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all" />
              </div>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between">
            <div>
              <AnimatePresence>
                {isSuccess && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-emerald-600 font-bold text-[11px] uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-md">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <Button onClick={handleSaveSettings} disabled={isLoading} className="bg-slate-900 text-white hover:bg-slate-800 rounded-lg h-10 px-6 text-sm font-bold shadow-sm transition-all">
              {isLoading ? "Saving..." : "Save Changes"} <Save className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}