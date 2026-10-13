import React, { useState, useEffect } from 'react';
import {
  Kanban,
  Plus,
  Sparkles,
  ChevronRight,
  MoreVertical,
  Building,
} from 'lucide-react';
import { api } from '../api/client';
import { Lead, PipelineStage } from '../types';
import { formatINR, formatCompactINR } from '../lib/currency';

interface PipelineViewProps {
  onOpenNewLead: () => void;
  onSelectLead: (leadId: string) => void;
}

const STAGES: Array<{ id: PipelineStage; label: string; color: string }> = [
  { id: 'new', label: 'New', color: 'border-slate-300' },
  { id: 'qualified', label: 'Qualified', color: 'border-sky-400' },
  { id: 'contacted', label: 'Contacted', color: 'border-indigo-400' },
  { id: 'engaged', label: 'Engaged', color: 'border-purple-400' },
  { id: 'meeting_scheduled', label: 'Meeting', color: 'border-teal-400' },
  { id: 'proposal', label: 'Proposal', color: 'border-amber-400' },
  { id: 'won', label: 'Won', color: 'border-emerald-400' },
  { id: 'lost', label: 'Lost', color: 'border-rose-400' },
];

export const PipelineView: React.FC<PipelineViewProps> = ({
  onOpenNewLead,
  onSelectLead,
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const res = await api.getLeads();
      setLeads(res.leads);
    } catch (err) {
      console.error('Failed to load pipeline leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageMove = async (leadId: string, newStage: PipelineStage) => {
    try {
      await api.updateLead(leadId, { stage: newStage });
      loadLeads();
    } catch (err) {
      console.error('Failed to move stage:', err);
    }
  };

  const getStageTotalValue = (stage: PipelineStage) => {
    return leads
      .filter(l => l.stage === stage)
      .reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales Pipeline Kanban</h1>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50/80 text-indigo-700 border border-indigo-200/60 backdrop-blur-md">
              INR (₹) Base
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visual stage progression backed by chronological audit logs and stage history.
          </p>
        </div>

        <button
          onClick={onOpenNewLead}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600/90 hover:bg-indigo-600 rounded-lg backdrop-blur-md transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Lead (₹)</span>
        </button>
      </div>

      {/* Kanban Board Columns Container (Glassmorphic) */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1280px] h-full items-start">
          {STAGES.map(stage => {
            const stageLeads = leads.filter(l => l.stage === stage.id);
            const totalValue = getStageTotalValue(stage.id);

            return (
              <div
                key={stage.id}
                className="w-72 glass-panel rounded-2xl flex flex-col max-h-full shrink-0 shadow-md border border-white/85"
              >
                {/* Column Header */}
                <div className={`p-3.5 border-t-3 ${stage.color} rounded-t-2xl bg-white/70 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between`}>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{stage.label}</span>
                      <span className="text-[10px] font-mono font-semibold text-slate-600 bg-slate-200/60 backdrop-blur-xs px-1.5 py-0.2 rounded-full">
                        {stageLeads.length}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-600 font-mono font-medium block mt-0.5">
                      {formatINR(totalValue)}
                    </span>
                  </div>
                </div>

                {/* Column Cards List */}
                <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                  {stageLeads.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-slate-400">
                      Empty stage
                    </div>
                  ) : (
                    stageLeads.map(lead => (
                      <div
                        key={lead.id}
                        onClick={() => onSelectLead(lead.id)}
                        className="p-3.5 glass-card rounded-xl cursor-pointer transition-all group"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                            {lead.first_name} {lead.last_name}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50/80 border border-indigo-200/60 px-1.5 py-0.2 rounded shrink-0">
                            {lead.score}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 mt-1 truncate">
                          {lead.company_name || 'Prospect Company'}
                        </p>

                        <div className="mt-2.5 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
                          <span className="font-mono font-semibold text-slate-800">
                            {lead.deal_value ? formatINR(lead.deal_value) : '₹—'}
                          </span>

                          <select
                            onClick={e => e.stopPropagation()}
                            value={lead.stage}
                            onChange={e => handleStageMove(lead.id, e.target.value as PipelineStage)}
                            className="text-[10px] bg-slate-50/90 border border-slate-200/80 rounded-md px-1.5 py-0.5 text-slate-700 cursor-pointer hover:border-indigo-300"
                          >
                            {STAGES.map(s => (
                              <option key={s.id} value={s.id}>
                                → {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
