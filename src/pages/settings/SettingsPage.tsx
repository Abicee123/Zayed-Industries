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
    <div className="max-w-[1200px] mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-700 max-sm:pb-[110px] sm:pb-8 relative z-0">
      
      {/* Minimal Dotted Background Pattern */}
      <div className="absolute inset-0 pointer-events-none z-[-1] overflow-hidden print:hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTQ4LCAxNjMsIDE4NCwgMC4wOCkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]" />
      </div>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
        <div>
          <p className="text-[9px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1.5 sm:mb-2 bg-slate-100 inline-block px-2.5 sm:px-3 py-1 rounded-full">Preferences</p>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-1 sm:mt-2">Account Settings.</h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col sm:flex-row">
        
        {/* Left Side: Photo & Role */}
        <div className="sm:w-72 bg-slate-50 border-b sm:border-b-0 sm:border-r border-slate-100 p-6 sm:p-8 flex flex-col items-center text-center shrink-0">
          <div className="relative group mb-4 sm:mb-5">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
            <div onClick={() => fileInputRef.current?.click()} className="h-20 w-20 sm:h-28 sm:w-28 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 cursor-pointer overflow-hidden relative">
              {imagePreview ? <img src={imagePreview} alt="Profile" className="h-full w-full object-cover" /> : <User className="h-8 w-8 sm:h-10 sm:w-10 opacity-50" />}
              <div className="absolute inset-0 bg-slate-900/30 sm:opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-sm"><Camera className="h-5 w-5 sm:h-6 sm:w-6 text-white" /></div>
            </div>
            {imagePreview && (
              <button onClick={handleRemovePhoto} className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 h-7 w-7 sm:h-8 sm:w-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 shadow-sm transition-colors">
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}
          </div>
          
          <h3 className="font-bold text-slate-900 text-[14px] sm:text-[16px] truncate w-full">{formData.name || 'Unnamed User'}</h3>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate w-full">{user?.email}</p>
          
          <div className="mt-4 pt-4 border-t border-slate-200/60 w-full flex justify-center">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-white text-slate-600 border border-slate-200 shadow-sm">
              <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5" /> {role === 'head' ? 'Company Head' : role}
            </span>
          </div>
        </div>

        {/* Right Side: Form Inputs */}
        <div className="flex-1 p-5 sm:p-8 space-y-6 sm:space-y-8">
          
          <div className="space-y-4">
            <h3 className="text-[13px] sm:text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Personal Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3 sm:px-4 text-[13px] sm:text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                <input type="email" value={user?.email || ""} disabled className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 px-3 sm:px-4 text-[13px] sm:text-sm font-medium outline-none cursor-not-allowed shadow-sm" />
                <p className="text-[10px] sm:text-[11px] text-slate-400 ml-1 mt-1">Contact system admin to change email.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2 sm:pt-4">
            <h3 className="text-[13px] sm:text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Security</h3>
            <div className="space-y-1.5">
              <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="password" value={formData.newPassword} onChange={(e) => setFormData({...formData, newPassword: e.target.value})} placeholder="Leave blank to keep current password..." className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 sm:pr-4 text-[13px] sm:text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-sm" />
              </div>
            </div>
          </div>

          <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0 border-t border-slate-100">
            <div className="w-full sm:w-auto flex justify-center sm:justify-start">
              <AnimatePresence>
                {isSuccess && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Saved Successfully
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <Button onClick={handleSaveSettings} disabled={isLoading} className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-11 sm:h-12 px-6 sm:px-8 text-[13px] sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center">
              {isLoading ? "Saving..." : "Save Changes"} <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1.5 sm:ml-2" />
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}