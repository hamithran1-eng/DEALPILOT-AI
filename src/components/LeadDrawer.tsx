import React, { useState, useEffect } from 'react';
import {
  X,
  Building,
  Mail,
  Phone,
  Briefcase,
  Sparkles,
  RefreshCw,
  Send,
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { api } from '../api/client';
import { Lead, LeadStageHistory, OutreachDraft, Task, PipelineStage } from '../types';
import { formatINR, formatCompactINR } from '../lib/currency';

interface LeadDrawerProps {
  leadId: string | null;
  onClose: () => void;
  onLeadUpdated: () => void;
  onOpenDraftForLead: (lead: Lead) => void;
}

export const LeadDrawer: React.FC<LeadDrawerProps> = ({
  leadId,
  onClose,
  onLeadUpdated,
  onOpenDraftForLead,
}) => {
  const [lead, setLead] = useState<Lead | null>(null);
  const [history, setHistory] = useState<LeadStageHistory[]>([]);
  const [drafts, setDrafts] = useState<OutreachDraft[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [scoringLoading, setScoringLoading] = useState(false);

  // New Task form state
  const [showNewTask, setShowNewTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDate, setTaskDate] = useState('');

  useEffect(() => {
    if (leadId) {
      loadLeadDetails(leadId);
    } else {
      setLead(null);
    }
  }, [leadId]);

  const loadLeadDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await api.getLeadById(id);
      setLead(res.lead);
      setHistory(res.stageHistory || []);
      setDrafts(res.drafts || []);
      setTasks(res.tasks || []);
    } catch (err) {
      console.error('Failed to load lead details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (newStage: PipelineStage) => {
    if (!lead) return;
    try {
      const res = await api.updateLead(lead.id, { stage: newStage });
      setLead(res.lead);
      loadLeadDetails(lead.id);
      onLeadUpdated();
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  };

  const handleRunAiScore = async () => {
    if (!lead) return;
    setScoringLoading(true);
    try {
      const res = await api.scoreLead(lead.id);
      setLead(res.lead);
      onLeadUpdated();
    } catch (err) {
      console.error('Failed to score lead:', err);
    } finally {
      setScoringLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !taskTitle || !taskDate) return;
    try {
      await api.createTask({
        lead_id: lead.id,
        title: taskTitle,
        due_date: taskDate,
        priority: 'medium',
      });
      setTaskTitle('');
      setTaskDate('');
      setShowNewTask(false);
      loadLeadDetails(lead.id);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      await api.toggleTask(taskId);
      if (lead) loadLeadDetails(lead.id);
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  if (!leadId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-md flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl glass-modal h-full shadow-2xl flex flex-col border-l border-white/80 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/70 flex items-center justify-between shrink-0 bg-white/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-md shadow-indigo-500/20 border border-white/20">
              {lead?.first_name.charAt(0) || 'L'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  {lead ? `${lead.first_name} ${lead.last_name}` : 'Loading prospect...'}
                </h3>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  ₹ INR
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lead?.job_title ? `${lead.job_title} at ` : ''}
                {lead?.company_name || 'Prospect Record'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lead && (
              <button
                onClick={() => onOpenDraftForLead(lead)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 rounded-xl transition-all shadow-md shadow-indigo-500/20 border border-indigo-400/30"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Draft AI Outreach</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        {loading || !lead ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading prospect record...</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Quick Metrics Bar (Glassmorphic) */}
            <div className="grid grid-cols-4 gap-2.5 p-3.5 glass-card rounded-2xl">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider block">Stage</span>
                <select
                  value={lead.stage}
                  onChange={e => handleStageChange(e.target.value as PipelineStage)}
                  className="mt-0.5 text-xs font-bold text-slate-900 bg-transparent border-0 cursor-pointer focus:ring-0 p-0"
                >
                  <option value="new">New</option>
                  <option value="qualified">Qualified</option>
                  <option value="contacted">Contacted</option>
                  <option value="engaged">Engaged</option>
                  <option value="meeting_scheduled">Meeting Scheduled</option>
                  <option value="proposal">Proposal</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider block">Score</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm font-bold font-mono text-indigo-700">{lead.score}</span>
                  <span className="text-[10px] text-slate-400">/ 100</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider block">Deal Value</span>
                <span className="text-xs font-bold font-mono text-slate-900 mt-0.5 block tabular-nums">
                  {lead.deal_value ? formatINR(lead.deal_value) : '₹—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider block">Source</span>
                <span className="text-xs font-medium text-slate-700 mt-0.5 block truncate">
                  {lead.source || 'Direct'}
                </span>
              </div>
            </div>

            {/* Explainable AI Lead Intelligence Card (Glassmorphic) */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Explainable AI Lead Score</h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Model: {lead.scoring_model || 'Gemini 3.8 Flash Engine'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleRunAiScore}
                  disabled={scoringLoading}
                  className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/70 rounded-xl transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${scoringLoading ? 'animate-spin' : ''}`} />
                  <span>Re-evaluate</span>
                </button>
              </div>

              <div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {lead.score_explanation || 'Lead score calculated from decision authority, corporate domain validation, and INR opportunity value.'}
                </p>

                {/* Factors Breakdown */}
                {lead.score_factors && lead.score_factors.length > 0 && (
                  <div className="mt-3.5 space-y-2.5 pt-2.5 border-t border-slate-100/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Evaluation Weights & Signals
                    </span>
                    {lead.score_factors.map((f, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700">{f.name}</span>
                          <span className="font-mono text-slate-900 font-bold">{f.score}/100</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-600 to-sky-500 rounded-full transition-all"
                            style={{ width: `${f.score}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">{f.reasoning}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Profile Info Details */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-900">Contact & Enterprise Signals</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate font-mono">{lead.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono">{lead.phone || 'No phone recorded'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{lead.company_name || 'Generic Firm'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{lead.industry || 'B2B Services'}</span>
                </div>
              </div>

              {lead.notes && (
                <div className="pt-2 border-t border-slate-100/80">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Notes:</span>
                  <p className="text-xs text-slate-700 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    {lead.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Follow-up Tasks */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">Follow-up Tasks ({tasks.length})</h4>
                <button
                  onClick={() => setShowNewTask(!showNewTask)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Task</span>
                </button>
              </div>

              {showNewTask && (
                <form onSubmit={handleCreateTask} className="p-3 bg-indigo-50/50 rounded-xl space-y-2 border border-indigo-100">
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    placeholder="e.g. Call regarding INR 5L proposal"
                    className="w-full px-2.5 py-1.5 text-xs glass-input rounded-lg focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      required
                      value={taskDate}
                      onChange={e => setTaskDate(e.target.value)}
                      className="px-2.5 py-1 text-xs glass-input rounded-lg focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors ml-auto shadow-2xs"
                    >
                      Save Task
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {tasks.length === 0 ? (
                  <p className="text-[11px] text-slate-400">No scheduled tasks for this prospect.</p>
                ) : (
                  tasks.map(t => (
                    <div
                      key={t.id}
                      onClick={() => handleToggleTask(t.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        t.status === 'completed'
                          ? 'bg-slate-50/60 border-slate-100 text-slate-400 line-through'
                          : 'bg-white/80 border-slate-200/80 text-slate-800 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${
                            t.status === 'completed' ? 'text-emerald-500' : 'text-slate-300'
                          }`}
                        />
                        <span>{t.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {t.due_date.split('T')[0]}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Stage Transition Audit History */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-900">Stage Audit History</h4>
              <div className="space-y-2 border-l-2 border-slate-200 pl-3 ml-1 text-xs">
                {history.map(h => (
                  <div key={h.id} className="relative pb-1">
                    <span className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-indigo-600" />
                    <p className="font-semibold text-slate-800">
                      {h.from_stage} → <span className="text-indigo-600">{h.to_stage}</span>
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(h.created_at).toLocaleString()} IST
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
