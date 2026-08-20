import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, CheckCircle2, MessageSquare, Send, Paperclip, Activity } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useDataStore } from "../../store/dataStore";

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects } = useDataStore();
  
  const project = projects.find(p => p.id === Number(id));

  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState([
    { id: 1, author: "Sarah Jenkins", initial: "S", role: "Lead Architect", time: "2 hours ago", text: "I've uploaded the initial 3D models for review. Let me know if the lighting feels right." },
    { id: 2, author: "Admin User", initial: "A", role: "Founder", time: "1 hour ago", text: "Looking good. Make sure to emphasize the natural stone textures on the driveway." }
  ]);

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
    
    setComments([...comments, {
      id: Date.now(),
      author: "Admin User",
      initial: "A",
      role: "Founder",
      time: "Just now",
      text: newComment
    }]);
    setNewComment("");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-full flex flex-col">
      {/* Header & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/projects")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/50 text-slate-500 hover:bg-white hover:text-slate-900 transition-all shadow-sm ring-1 ring-black/5"
          >
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
          <Button variant="outline" className="bg-white/50 border-white/60">Edit</Button>
          <Button className="bg-slate-900 text-white hover:bg-slate-800 shadow-md">Complete Project</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 pb-4">
        
        {/* Left Column: Details & Discussion */}
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
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {project.startDate}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Due Date</p>
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {project.dueDate}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Attachments</p>
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <Paperclip className="h-4 w-4 text-slate-400" />
                  {project.attachments} Files
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-white/60 bg-white/50 p-6 shadow-sm backdrop-blur-md flex flex-col flex-1 min-h-[400px]">
            <h3 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-slate-400" />
              Team Discussion
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600 font-bold shadow-sm">
                    {comment.initial}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-slate-800">{comment.author}</span>
                      <span className="text-xs text-slate-500">{comment.role}</span>
                      <span className="text-xs text-slate-400 ml-2">{comment.time}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 bg-white/60 p-3 rounded-xl rounded-tl-none border border-white/80 shadow-sm">
                      {comment.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendComment} className="mt-4 flex gap-3 border-t border-white/50 pt-4">
              <input 
                type="text" 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Type a message or update..." 
                className="flex-1 rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400 transition-all"
              />
              <Button type="submit" disabled={!newComment.trim()} className="bg-slate-900 text-white hover:bg-slate-800 px-6 h-auto shrink-0 shadow-md">
                <Send className="h-4 w-4 mr-2 hidden sm:block" /> Send
              </Button>
            </form>
          </motion.div>
        </div>

        {/* Right Column: Timeline */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-white/60 bg-white/50 p-6 shadow-sm backdrop-blur-md h-fit">
          <h3 className="font-semibold text-slate-800 mb-6">Activity Timeline</h3>
          <div className="space-y-6 relative border-l-2 border-slate-200 ml-3 pl-6">
            <div className="relative">
              <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-slate-900 ring-4 ring-white/50" />
              <p className="text-sm font-semibold text-slate-800">Project Initialized</p>
              <p className="text-xs text-slate-500 mt-0.5">{project.startDate} by Admin User</p>
            </div>
            <div className="relative">
              <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-indigo-500 ring-4 ring-white/50" />
              <p className="text-sm font-semibold text-slate-800">Brief Uploaded</p>
              <p className="text-xs text-slate-500 mt-0.5">Specifications added to files</p>
            </div>
            <div className="relative">
              <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-slate-300 ring-4 ring-white/50" />
              <p className="text-sm font-semibold text-slate-800">Awaiting Submissions</p>
              <p className="text-xs text-slate-500 mt-0.5">Team notified</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}