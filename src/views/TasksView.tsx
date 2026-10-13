import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  AlertTriangle,
  Calendar,
  Trash2,
  CheckCircle2,
  User,
} from 'lucide-react';
import { api } from '../api/client';
import { Task, Lead } from '../types';

export const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // New task modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [leadId, setLeadId] = useState('');

  useEffect(() => {
    loadTasksAndLeads();
  }, []);

  const loadTasksAndLeads = async () => {
    setLoading(true);
    try {
      const [tasksRes, leadsRes] = await Promise.all([api.getTasks(), api.getLeads()]);
      setTasks(tasksRes.tasks);
      setLeads(leadsRes.leads);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (taskId: string) => {
    try {
      const res = await api.toggleTask(taskId);
      setTasks(prev => prev.map(t => (t.id === taskId ? res.task : t)));
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    try {
      const res = await api.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate,
        priority,
        lead_id: leadId || undefined,
      });

      setTasks(prev => [res.task, ...prev]);
      setShowModal(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      setLeadId('');
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const dueTodayTasks = pendingTasks.filter(t => t.due_date.startsWith(todayStr));
  const overdueTasks = pendingTasks.filter(
    t => new Date(t.due_date) < now && !t.due_date.startsWith(todayStr)
  );
  const upcomingTasks = pendingTasks.filter(
    t => new Date(t.due_date) > now && !t.due_date.startsWith(todayStr)
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Follow-up Task Center</h1>
          <p className="text-xs text-slate-500 mt-1">
            Prioritized sales cadences and scheduled touchpoints linked to verified leads.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Summary Stat Strips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4.5 glass-card rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Due Today</span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">
              {dueTodayTasks.length}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4.5 glass-card rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Overdue Action Items</span>
            <span className="text-xl font-bold text-rose-600 font-mono mt-0.5 block">
              {overdueTasks.length}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4.5 glass-card rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Completed Follow-ups</span>
            <span className="text-xl font-bold text-emerald-600 font-mono mt-0.5 block">
              {completedTasks.length}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Tasks Table / Lists */}
      <div className="glass-panel rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <CheckSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <p>No follow-up tasks scheduled. Create task reminders to maintain cadence.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {tasks.map(task => {
              const lead = leads.find(l => l.id === task.lead_id);
              const isOverdue =
                task.status === 'pending' &&
                new Date(task.due_date) < now &&
                !task.due_date.startsWith(todayStr);

              return (
                <div
                  key={task.id}
                  className={`p-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors ${
                    task.status === 'completed' ? 'bg-slate-50/40 opacity-70' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={() => handleToggle(task.id)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                    />

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold text-slate-900 ${
                            task.status === 'completed' ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {task.title}
                        </span>

                        <span
                          className={`px-1.5 py-0.2 text-[10px] font-semibold uppercase rounded ${
                            task.priority === 'urgent'
                              ? 'bg-rose-50 text-rose-700'
                              : task.priority === 'high'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {task.priority}
                        </span>

                        {isOverdue && (
                          <span className="px-1.5 py-0.2 text-[10px] font-semibold uppercase rounded bg-rose-50 text-rose-700 border border-rose-200">
                            Overdue
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{task.description}</p>
                      )}

                      {lead && (
                        <span className="text-[11px] text-indigo-600 font-medium block mt-1">
                          Linked: {lead.first_name} {lead.last_name} ({lead.company_name || 'Prospect'})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-slate-500">
                    <span className="text-[11px] font-mono">
                      Due: {task.due_date.split('T')[0]}
                    </span>

                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-modal rounded-2xl border border-white/80 w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Schedule Follow-up Task</h3>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Call VP to discuss technical proposal"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Due Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Link to Prospect
                  </label>
                  <select
                    value={leadId}
                    onChange={e => setLeadId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white truncate"
                  >
                    <option value="">-- None --</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.first_name} {l.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Specific talking points or prep notes..."
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
