import { useState, useRef, useEffect } from "react";
import { Save, Lock, User, Shield, CheckCircle2, Trash2, Edit3, ImagePlus, Eye, EyeOff, XCircle, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";
import { supabase } from "../../supabase";

// --- NATIVE IMAGE COMPRESSION ENGINE ---
const compressImage = async (file: File, maxWidth = 400, quality = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg', lastModified: Date.now() }));
          } else {
            reject(new Error('Compression failed'));
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function SettingsPage() {
  const { user, employeeId, role } = useAuthStore();
  const { employees, fetchAllData } = useDataStore();
  
  const [saveStatus, setSaveStatus] = useState<"idle" | "compressing" | "uploading" | "saving">("idle");
  const [isSuccess, setIsSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const currentEmployee = employees.find(e => e.id === employeeId);
  const [formData, setFormData] = useState({ name: "", newPassword: "" });

  useEffect(() => {
    if (currentEmployee) {
      setFormData(prev => ({ ...prev, name: currentEmployee.name || "" }));
      setImagePreview(currentEmployee.profile_image_url || null);
      setRemoveImage(false);
    }
  }, [currentEmployee]);

  // Real-time Password Validation
  const reqLength = formData.newPassword.length >= 6;
  const reqUpper = /[A-Z]/.test(formData.newPassword);
  const reqNumber = /[0-9]/.test(formData.newPassword);
  const reqSpecial = /[^A-Za-z0-9]/.test(formData.newPassword);
  const isPasswordValid = formData.newPassword.length === 0 || (reqLength && reqUpper && reqNumber && reqSpecial);

  // Smart "Dirty State" Detection
  const hasUnsavedChanges = 
    formData.name.trim() !== (currentEmployee?.name || "").trim() ||
    formData.newPassword.length > 0 ||
    imageFile !== null ||
    removeImage;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) { 
      setImageFile(e.target.files[0]); 
      setImagePreview(URL.createObjectURL(e.target.files[0])); 
      setRemoveImage(false); 
      setShowPhotoMenu(false);
    }
  };

  const handleRemovePhoto = () => { 
    setImageFile(null); 
    setImagePreview(null); 
    setRemoveImage(true); 
    setShowPhotoMenu(false);
  };

  // --- GARBAGE COLLECTION UTILITY ---
  const deleteOldAvatar = async (url: string | null) => {
    if (!url) return;
    try {
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      if (fileName) await supabase.storage.from('avatars').remove([fileName]);
    } catch (e) {
      console.warn("Could not delete old avatar.");
    }
  };

  const handleSaveSettings = async () => {
    if (!formData.name.trim()) return alert("Name cannot be empty.");
    if (!isPasswordValid) return alert("Please meet all password requirements.");
    
    setSaveStatus("saving"); 
    setIsSuccess(false);

    try {
      let avatarUrl = currentEmployee?.profile_image_url || null;

      // Clean up old image if changing or removing
      if (imageFile || removeImage) {
        if (currentEmployee?.profile_image_url) {
          await deleteOldAvatar(currentEmployee.profile_image_url);
        }
      }

      if (imageFile) {
        setSaveStatus("compressing");
        const compressedFile = await compressImage(imageFile, 400, 0.8);
        
        setSaveStatus("uploading");
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, compressedFile);
        if (!uploadError) { 
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName); 
          avatarUrl = data.publicUrl; 
        }
      } else if (removeImage) {
        avatarUrl = null;
      }

      setSaveStatus("saving");
      await supabase.from('employees').update({ name: formData.name, profile_image_url: avatarUrl }).eq('id', employeeId);

      if (formData.newPassword) {
        await supabase.auth.updateUser({ password: formData.newPassword });
        setFormData(prev => ({ ...prev, newPassword: "" }));
      }

      await fetchAllData(); 
      setImageFile(null);
      setRemoveImage(false);
      
      setSaveStatus("idle");
      setIsSuccess(true); 
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error: any) { alert(`Error updating: ${error.message}`); setSaveStatus("idle"); }
  };

  return (
    // CRITICAL FIX: Removed max-sm:pb-[110px] so the page tightly hugs the content without double-padding!
    <div className="max-w-4xl mx-auto space-y-5 sm:space-y-8 animate-in fade-in duration-700 pb-8 relative z-0">
      
      {/* Minimal Dotted Background Pattern */}
      <div className="absolute inset-0 pointer-events-none z-[-1] overflow-hidden print:hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTQ4LCAxNjMsIDE4NCwgMC4wOCkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]" />
      </div>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-6">
        <div>
          <p className="text-[9px] sm:text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1.5 sm:mb-2 bg-blue-50 inline-block px-2.5 sm:px-3 py-1 rounded-full">User Profile</p>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-1 sm:mt-2">Settings.</h1>
        </div>
      </div>

      <motion.div layout className="bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row relative">
        
        {/* Left Side: Photo & Role */}
        <motion.div layout="position" className="sm:w-64 sm:rounded-l-[2rem] bg-gradient-to-b from-blue-50/50 to-slate-50/50 border-b sm:border-b-0 sm:border-r border-slate-100 p-5 sm:p-8 flex flex-col items-center text-center shrink-0">
          
          {/* AVATAR UPLOAD SECTION */}
          <div className="relative mb-3 sm:mb-6">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
            
            <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-full bg-white border-[3px] border-white shadow-md flex items-center justify-center text-slate-300 overflow-hidden relative ring-4 ring-blue-50">
              {imagePreview ? <img src={imagePreview} alt="Profile" className="h-full w-full object-cover" /> : <User className="h-8 w-8 sm:h-12 sm:w-12 opacity-50" />}
            </div>
            
            <button 
              onClick={() => setShowPhotoMenu(!showPhotoMenu)} 
              className="absolute bottom-0 right-0 h-7 w-7 sm:h-9 sm:w-9 bg-blue-600 border-2 border-white rounded-full flex items-center justify-center text-white hover:bg-blue-700 shadow-md transition-all active:scale-95 z-10"
            >
              <Edit3 className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showPhotoMenu && (
                <>
                  <div className="fixed inset-0 z-[10]" onClick={() => setShowPhotoMenu(false)}></div>
                  <motion.div 
                    initial={{ opacity: 0, y: 5, scale: 0.95 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    exit={{ opacity: 0, y: 5, scale: 0.95 }} 
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-44 sm:w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[20] py-1"
                  >
                    <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2 px-4 py-2.5 sm:py-3 text-[12px] sm:text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                      <ImagePlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Upload Photo
                    </button>
                    {imagePreview && (
                      <button onClick={handleRemovePhoto} className="w-full flex items-center gap-2 px-4 py-2.5 sm:py-3 text-[12px] sm:text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-50">
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Remove Photo
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          <h3 className="font-bold text-slate-900 text-[14px] sm:text-[16px] truncate w-full">{currentEmployee?.name || 'Unnamed User'}</h3>
          <p className="text-[10px] sm:text-[12px] font-medium text-slate-500 mt-0.5 truncate w-full">{user?.email}</p>
          
          <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-slate-200/60 w-full flex justify-center">
            <span className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest bg-white text-blue-700 border border-blue-100 shadow-sm">
              <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5" /> {role === 'head' ? 'Company Head' : role}
            </span>
          </div>
        </motion.div>

        <motion.div layout="position" className="flex-1 flex flex-col">
          <div className="p-4 sm:p-8 space-y-6">
            
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-[12px] sm:text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Personal Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1 sm:space-y-1.5">
                  <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3 sm:px-4 text-[12px] sm:text-sm font-bold outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" />
                </div>
                <div className="space-y-1 sm:space-y-1.5">
                  <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                  <input type="email" value={user?.email || ""} disabled className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 px-3 sm:px-4 text-[12px] sm:text-sm font-medium outline-none cursor-not-allowed shadow-sm" />
                  <p className="text-[9px] sm:text-[10px] text-slate-400 ml-1 mt-1 font-medium">Contact system admin to modify login credentials.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
              <h3 className="text-[12px] sm:text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Account Security</h3>
              <div className="space-y-1 sm:space-y-1.5">
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Change Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={formData.newPassword} 
                    onChange={(e) => setFormData({...formData, newPassword: e.target.value})} 
                    placeholder="Enter new password to change..." 
                    className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 bg-slate-50/50 pl-9 sm:pl-10 pr-10 sm:pr-12 text-[12px] sm:text-sm font-medium outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm [&::-ms-reveal]:hidden [&::-ms-clear]:hidden" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  </button>
                </div>

                {/* Animated Password Checklist */}
                <AnimatePresence>
                  {formData.newPassword.length > 0 && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 sm:p-4 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className={`flex items-center gap-2 text-[10px] sm:text-[11px] font-bold transition-colors ${reqLength ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {reqLength ? <Check className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5 opacity-50" />} At least 6 characters
                        </div>
                        <div className={`flex items-center gap-2 text-[10px] sm:text-[11px] font-bold transition-colors ${reqUpper ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {reqUpper ? <Check className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5 opacity-50" />} One uppercase letter
                        </div>
                        <div className={`flex items-center gap-2 text-[10px] sm:text-[11px] font-bold transition-colors ${reqNumber ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {reqNumber ? <Check className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5 opacity-50" />} One number
                        </div>
                        <div className={`flex items-center gap-2 text-[10px] sm:text-[11px] font-bold transition-colors ${reqSpecial ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {reqSpecial ? <Check className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5 opacity-50" />} One special character
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* SMART ACTION BAR: Replaces yellow text with an animated sweeping shine on the button */}
          <AnimatePresence>
            {hasUnsavedChanges && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }} 
                exit={{ opacity: 0, height: 0 }} 
                className="bg-[#FAFCFF] border-t border-slate-100 max-sm:rounded-b-[1.5rem] sm:rounded-br-[2rem] sm:rounded-bl-none overflow-hidden shrink-0"
              >
                <div className="p-4 sm:p-6 flex justify-end">
                  <button 
                    onClick={handleSaveSettings} 
                    disabled={saveStatus !== "idle" || !isPasswordValid} 
                    className="relative overflow-hidden w-full sm:w-auto bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl h-11 sm:h-12 px-8 sm:px-10 text-[13px] sm:text-sm font-bold shadow-lg shadow-blue-900/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center group"
                  >
                    {/* The Sweeping "Shine" Animation */}
                    {saveStatus === "idle" && isPasswordValid && (
                      <motion.div 
                        animate={{ left: ['-100%', '200%'] }} 
                        transition={{ repeat: Infinity, duration: 2.5, ease: "linear", repeatDelay: 1.5 }} 
                        className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 z-0 pointer-events-none" 
                      />
                    )}
                    
                    <span className="relative z-10 flex items-center">
                      {saveStatus === "compressing" && <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Compressing...</>}
                      {saveStatus === "uploading" && <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>}
                      {saveStatus === "saving" && <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>}
                      {saveStatus === "idle" && <>Save Changes <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1.5 sm:ml-2" /></>}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* SUCCESS MESSAGE */}
          <AnimatePresence>
            {isSuccess && !hasUnsavedChanges && (
              <motion.div 
                 initial={{ opacity: 0, height: 0 }} 
                 animate={{ opacity: 1, height: 'auto' }} 
                 exit={{ opacity: 0, height: 0 }} 
                 className="overflow-hidden"
              >
                <div className="p-4 sm:p-6 flex justify-center">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-lg">
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Profile Updated Successfully
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </motion.div>
    </div>
  );
}