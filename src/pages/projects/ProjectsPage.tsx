import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MoreHorizontal, Calendar, MessageSquare, Paperclip, Search, Filter, ArrowUpDown, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useDataStore, type Project } from "../../store/dataStore";
import { useNavigate } from "react-router-dom"; // <-- Added for navigation

const ProjectCard = ({ project }: { project: Project }) => {
  const navigate = useNavigate(); // <-- Allows us to click and navigate

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={() => navigate(`/projects/${project.id}`)} // <-- Navigate to the deep-dive page!
      className="group cursor-pointer rounded-xl border border-white/60 bg-white/60 p-4 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 hover:shadow-md"
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${project.color}`}>
          {project.tag}
        </span>
        <button className="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-slate-700">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      
      <h4 className="font-semibold text-slate-800 mb-4">{project.title}</h4>
      
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {project.dueDate}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {project.comments}
          </div>
          <div className="flex items-center gap-1">
            <Paperclip className="h-3.5 w-3.5" />
            {project.attachments}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function ProjectsPage() {
  const { projects, addProject } = useDataStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskTag, setNewTaskTag] = useState("3D Visualization");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const filteredProjects = projects.filter(project => 
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const boardData = {
    todo: filteredProjects.filter(p => p.status === "todo"),
    inProgress: filteredProjects.filter(p => p.status === "inProgress"),
    completed: filteredProjects.filter(p => p.status === "completed"),
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    addProject({
      title: newTaskTitle,
      tag: newTaskTag,
      startDate: startDate || new Date().toLocaleDateString(),
      dueDate: dueDate || "TBD",
      attachments: 0,
      comments: 0,
      color: "bg-indigo-100 text-indigo-700 ring-indigo-600/20",
      status: "todo"
    });

    setNewTaskTitle(""); setStartDate(""); setDueDate("");
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Projects Board</h2>
          <p className="text-slate-500 mt-1">Manage your active pipelines and click a card for details.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-md">
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/40 p-3 rounded-xl border border-white/60 shadow-sm backdrop-blur-md">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search projects by name or tag..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg border-none bg-white/60 py-2 pl-9 pr-4 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400" />
        </div>
        <div className="flex w-full sm:w-auto items-center gap-3">
          <Button variant="outline" className="flex-1 sm:flex-none gap-2 bg-white/50 border-white/60 hover:bg-white/80"><Filter className="h-4 w-4" /> Filter</Button>
          <Button variant="outline" className="flex-1 sm:flex-none gap-2 bg-white/50 border-white/60 hover:bg-white/80"><ArrowUpDown className="h-4 w-4" /> Sort</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 pb-4">
        <div className="flex flex-col gap-4 rounded-2xl bg-slate-100/50 p-4 border border-white/40">
          <div className="flex items-center justify-between px-1 mb-2">
            <h3 className="font-semibold text-slate-700">To Do</h3>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600 shadow-sm">{boardData.todo.length}</span>
          </div>
          <AnimatePresence>
            {boardData.todo.map((project) => <ProjectCard key={project.id} project={project} />)}
          </AnimatePresence>
          <button onClick={() => setIsModalOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:bg-slate-200/50 hover:text-slate-700">
            <Plus className="h-4 w-4" /> Add Task
          </button>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl bg-slate-100/50 p-4 border border-white/40">
          <div className="flex items-center justify-between px-1 mb-2">
            <h3 className="font-semibold text-slate-700">In Progress</h3>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600 shadow-sm">{boardData.inProgress.length}</span>
          </div>
          <AnimatePresence>
            {boardData.inProgress.map((project) => <ProjectCard key={project.id} project={project} />)}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl bg-slate-100/50 p-4 border border-white/40">
          <div className="flex items-center justify-between px-1 mb-2">
            <h3 className="font-semibold text-slate-700">Completed</h3>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600 shadow-sm">{boardData.completed.length}</span>
          </div>
          <AnimatePresence>
            {boardData.completed.map((project) => <ProjectCard key={project.id} project={project} />)}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-800">Create New Task</h3>
                <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 shadow-sm ring-1 ring-black/5"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Task Title</label>
                  <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="e.g., Exterior Facade Render" className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400" autoFocus />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Category Tag</label>
                  <select value={newTaskTag} onChange={(e) => setNewTaskTag(e.target.value)} className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400 appearance-none">
                    <option value="3D Visualization">3D Visualization</option>
                    <option value="Client Presentation">Client Presentation</option>
                    <option value="Development">Development</option>
                    <option value="Interior Design">Interior Design</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Start Date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Due Date</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-xl border-none bg-white/60 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-400" />
                  </div>
                </div>
                <div className="mt-8 flex gap-3 pt-4 border-t border-white/50">
                  <Button type="button" onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1 bg-white/50 border-white/60">Cancel</Button>
                  <Button type="submit" disabled={!newTaskTitle.trim()} className="flex-1 bg-slate-900 text-white shadow-md">Create Task</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}