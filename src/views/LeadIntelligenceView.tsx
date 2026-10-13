import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Sparkles,
  RefreshCw,
  Send,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { api } from '../api/client';
import { Lead } from '../types';
import { formatINR } from '../lib/currency';

interface LeadIntelligenceViewProps {
  onSelectLead: (leadId: string) => void;
  onOpenDraftForLead: (lead: Lead) => void;
}

export const LeadIntelligenceView: React.FC<LeadIntelligenceViewProps> = ({
  onSelectLead,
  onOpenDraftForLead,
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [batchEvaluating, setBatchEvaluating] = useState(false);

  // Copilot assistant query
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotAnswer, setCopilotAnswer] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const res = await api.getLeads();
      setLeads(res.leads);
      if (res.leads.length > 0 && !selectedLead) {
        setSelectedLead(res.leads[0]);
      }
    } catch (err) {
      console.error('Failed to load leads for intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreLead = async (leadId: string) => {
    setEvaluatingId(leadId);
    try {
      const res = await api.scoreLead(leadId);
      setLeads(prev => prev.map(l => (l.id === leadId ? res.lead : l)));
      if (selectedLead?.id === leadId) {
        setSelectedLead(res.lead);
      }
    } catch (err) {
      console.error('Scoring error:', err);
    } finally {
      setEvaluatingId(null);
    }
  };

  const handleBatchEvaluate = async () => {
    setBatchEvaluating(true);
    for (const lead of leads) {
      try {
        const res = await api.scoreLead(lead.id);
        setLeads(prev => prev.map(l => (l.id === lead.id ? res.lead : l)));
      } catch (err) {
        // ignore
      }
    }
    setBatchEvaluating(false);
  };

  const handleAskCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotQuery.trim()) return;

    setCopilotLoading(true);
    setCopilotAnswer(null);
    try {
      const res = await api.copilotChat(copilotQuery, selectedLead?.id);
      setCopilotAnswer(res.answer);
    } catch (err: any) {
      setCopilotAnswer(`Error: ${err.message}`);
    } finally {
      setCopilotLoading(false);
    }
  };

  const highIntentLeads = [...leads].sort((a, b) => b.score - a.score);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">AI Lead Intelligence</h1>
          <p className="text-xs text-slate-500 mt-1">
            Explainable 0–100 qualification scoring with transparent authority and intent weights.
          </p>
        </div>

        <button
          onClick={handleBatchEvaluate}
          disabled={batchEvaluating || leads.length === 0}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-2xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${batchEvaluating ? 'animate-spin' : ''}`} />
          <span>{batchEvaluating ? 'Evaluating Leads...' : 'Run Batch AI Evaluation'}</span>
        </button>
      </div>

      {leads.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-lg">
          <BrainCircuit className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-900">No leads available for evaluation</h3>
          <p className="text-xs text-slate-500 mt-1">
            Create or import verified leads first. The AI intelligence engine scores real records.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Ranked Lead List (5 cols) */}
          <div className="lg:col-span-5 glass-panel rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-900">
                Ranked Intent Hierarchy ({highIntentLeads.length})
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Sorted by Fit Score</span>
            </div>

            <div className="space-y-2 max-h-[620px] overflow-y-auto">
              {highIntentLeads.map(lead => {
                const isSelected = selectedLead?.id === lead.id;
                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`p-3.5 rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'border border-indigo-400 bg-white/95 shadow-md -translate-y-0.5'
                        : 'glass-card'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900">
                          {lead.first_name} {lead.last_name}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          {lead.job_title || 'Unspecified'} · {lead.company_name || 'Prospect'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-sm font-bold font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                          {lead.score}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                      <span className="font-mono font-semibold text-slate-800">
                        {lead.deal_value ? formatINR(lead.deal_value) : '₹—'}
                      </span>
                      <span>{lead.scored_at ? `Scored ${lead.scored_at.split('T')[0]}` : 'Needs score'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Deep Explainable Breakdown & Copilot (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {selectedLead && (
              <>
                {/* Scoring Transparency Card */}
                <div className="glass-panel rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {selectedLead.first_name} {selectedLead.last_name}
                        </h3>
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                          Score: {selectedLead.score}/100
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedLead.job_title || 'Role'} · {selectedLead.company_name || 'Firm'} ({selectedLead.company_domain || 'no domain'})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleScoreLead(selectedLead.id)}
                        disabled={evaluatingId === selectedLead.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${evaluatingId === selectedLead.id ? 'animate-spin' : ''}`} />
                        <span>Re-evaluate</span>
                      </button>

                      <button
                        onClick={() => onOpenDraftForLead(selectedLead)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors shadow-2xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Draft Outreach</span>
                      </button>
                    </div>
                  </div>

                  {/* Narrative Explanation */}
                  <div className="p-4 glass-card rounded-xl text-xs text-slate-700 leading-relaxed">
                    <span className="font-semibold text-slate-900 block mb-0.5">Executive Fit Reasoning:</span>
                    {selectedLead.score_explanation || 'Evaluation pending. Click Re-evaluate to run Gemini AI analysis.'}
                  </div>

                  {/* Factor Breakdown Bars */}
                  {selectedLead.score_factors && selectedLead.score_factors.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <span className="text-xs font-semibold text-slate-900 block">
                        Explainable Factor Weights & Signals
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedLead.score_factors.map((factor, idx) => (
                          <div key={idx} className="p-3.5 glass-card rounded-xl text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800">{factor.name}</span>
                              <span className="font-mono font-bold text-slate-900">{factor.score}/100</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{ width: `${factor.score}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                              {factor.reasoning}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scoring Engine Metadata Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Engine: {selectedLead.scoring_model || 'Grounded Gemini 3.8 Flash'}</span>
                    <span>Last Evaluated: {selectedLead.scored_at ? new Date(selectedLead.scored_at).toLocaleString() : 'Never'}</span>
                  </div>
                </div>

                {/* Grounded AI Copilot Assistant */}
                <div className="glass-panel rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">DealPilot Sales Copilot</h4>
                      <p className="text-[11px] text-slate-400">
                        Ask strategic questions grounded strictly in this prospect's CRM data.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleAskCopilot} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={copilotQuery}
                        onChange={e => setCopilotQuery(e.target.value)}
                        placeholder="e.g. How to address objections for our INR 5 Lakh proposal in IST timezone?"
                        className="flex-1 px-3 py-1.5 text-xs glass-input rounded-xl focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={copilotLoading || !copilotQuery.trim()}
                        className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {copilotLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>Ask Copilot</span>
                      </button>
                    </div>
                  </form>

                  {/* Quick prompt buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'Summarize key value propositions',
                      'Draft meeting talk-track',
                      'Identify missing qualification signals',
                    ].map(p => (
                      <button
                        key={p}
                        onClick={() => {
                          setCopilotQuery(p);
                        }}
                        className="text-[10px] text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  {copilotAnswer && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 whitespace-pre-wrap leading-relaxed mt-2 animate-in fade-in">
                      <span className="font-semibold text-slate-900 block mb-1">Copilot Analysis:</span>
                      {copilotAnswer}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
