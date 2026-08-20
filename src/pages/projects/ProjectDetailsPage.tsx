import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Calendar, Clock, CheckCircle2, MessageSquare, Send, Paperclip, Activity, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useDataStore } from "../../store/dataStore";

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, moveProject, updateProject } = useDataStore();
  
  const project = projects.find(p => p.id === Number(id));

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTag, setEditTag] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  // Sync edit states when project loads
  useEffect(() => {
    if (project) {
      setEditTitle(project.title);
      setEditTag(project.tag);
      setEditStartDate(project.startDate);
      setEditDueDate(project.dueDate);
    }
  }, [project]);

  // Purged fake comments! Now it starts completely empty.
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Project Not Found</h2>
        <Button onClick={() => navigate("/projects")} className="bg-slate-900 text-white">Back to Projects</Button>
      </div>
    );
  }

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments([...comments, { id: Date.now(), author: "You", initial: "Y", role: "Current User", time: "Just now", text: newComment }]);
    setNewComment("");
  };

  const handleCompleteProject = async () => {
    await moveProject(project.id, "completed");
  };

  // Submit edits to Supabase
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProject(project.id, {
      title: editTitle,
      tag: editTag,
      startDate: editStartDate,
      dueDate: editDueDate
    });
    setIsEditModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-full flex flex-col relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/projects")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/50 text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm ring-1 ring-black/5">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-slate-800">{project.title}</h2>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${project.color}`}>
                {project.tag}
              </span>
            </div>
            <p className="text-slate-500 mt-1">Project ID: #{project.id}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsEditModalOpen(true)} variant="outline" className="bg-white/50 border-white/60 hover:bg-white/80">Edit Details</Button>
          <Button onClick={handleCompleteProject} disabled={project.status === 'completed'} className="bg-slate-900 text-white hover:bg-slate-800 shadow-md disabled:bg-slate-400">
            {project.status === 'completed' ? "Completed" : "Complete Project"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 pb-4">
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/60 bg-white/50 p-6 shadow-sm backdrop-blur-md">
            <h3 className="font-semibold text-slate-800 mb-6">Project Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Status</p>
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  {project.status === "todo" && <Clock className="h-4 w-4 text-orange-500" />}
                  {project.status === "inProgress" && <Activity className="h-4 w-4 text-blue-500" />}
                  {project.status === "completed" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  <span className="capitalize">{project.status.replace(/([A-Z])/g, ' $1').trim()}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Start Date</p>
                <div className="flex items-center gap-2 font-semibold text-slate-800"><Calendar className="h-4 w-4 text-slate-400" />{project.startDate}</div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Due Date</p>
                <div className="flex items-center gap-2 font-semibold text-slate-800"><Clock className="h-4 w-4 text-slate-400" />{project.dueDate}</div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Attachments</p>
                <div className="flex items-center gap-2 font-semibold text-slate-800"><Paperclip className="h-4 w-4 text-slate-400" />{project.attachments} Files</div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-white/60 bg-white/50 p-6 shadow-sm backdrop-blur-md flex flex-col flex-1 min-h-[400px]">
            <h3 className="font-semibold text-slate-800 mb-6 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-slate-400" />Team Discussion</h3>
            
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {comments.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400 text-sm italic">
                  No discussion yet. Start the conversation!
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600 font-bold shadow-sm">{comment.initial}</div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-slate-800">{comment.author}</span>
                        <span className="text-xs text-slate-500">{comment.role}</span>
                        <span className="text-xs text-slate-400 ml-2">{comment.time}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 bg-white/60 p-3 rounded-xl rounded-tl-none border border-white/80 shadow-sm">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <form onSubmit={handleSendComment} className="mt-4 flex gap-3 border-t border-white/50 pt-4">
              <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Type a message..." className="flex-1 rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400" />
              <Button type="submit" disabled={!newComment.trim()} className="bg-slate-900 text-white shadow-md"><Send className="h-4 w-4 mr-2 hidden sm:block" /> Send</Button>
            </form>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-white/60 bg-white/50 p-6 shadow-sm backdrop-blur-md h-fit">
          <h3 className="font-semibold text-slate-800 mb-6">Activity Timeline</h3>
          <div className="space-y-6 relative border-l-2 border-slate-200 ml-3 pl-6">
            <div className="relative">
              <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-slate-900 ring-4 ring-white/50" />
              <p className="text-sm font-semibold text-slate-800">Project Initialized</p>
              <p className="text-xs text-slate-500 mt-0.5">{project.startDate}</p>
            </div>
            {project.status === 'completed' && (
              <div className="relative">
                <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-white/50" />
                <p className="text-sm font-semibold text-slate-800">Project Completed</p>
                <p className="text-xs text-slate-500 mt-0.5">Marked done by user</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Edit Details Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-800">Edit Project</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 shadow-sm ring-1 ring-black/5"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Project Title</label>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Category Tag</label>
                  <select value={editTag} onChange={(e) => setEditTag(e.target.value)} className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400 appearance-none">
                    <option value="3D Visualization">3D Visualization</option>
                    <option value="Client Presentation">Client Presentation</option>
                    <option value="Development">Development</option>
                    <option value="Interior Design">Interior Design</option>
                    <option value="Architecture">Architecture</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Start Date</label>
                    <input type="text" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Due Date</label>
                    <input type="text" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400" />
                  </div>
                </div>
                <div className="mt-8 flex gap-3 pt-4 border-t border-white/50">
                  <Button type="button" onClick={() => setIsEditModalOpen(false)} variant="outline" className="flex-1 bg-white/50 border-white/60 hover:bg-white/80">Cancel</Button>
                  <Button type="submit" disabled={!editTitle.trim()} className="flex-1 bg-slate-900 text-white shadow-md">Save Changes</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}