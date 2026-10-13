import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Upload,
  Download,
  Trash2,
  ChevronRight,
  Sparkles,
  Building,
  Mail,
} from 'lucide-react';
import { api } from '../api/client';
import { Lead, PipelineStage } from '../types';
import { formatINR } from '../lib/currency';

interface LeadsViewProps {
  onOpenNewLead: () => void;
  onOpenCsvImport: () => void;
  onSelectLead: (leadId: string) => void;
  searchFilter: string;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  onOpenNewLead,
  onOpenCsvImport,
  onSelectLead,
  searchFilter,
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState<string>('');

  useEffect(() => {
    loadLeads();
  }, [stageFilter, statusFilter]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const res = await api.getLeads({
        stage: stageFilter !== 'all' ? stageFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setLeads(res.leads);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const effectiveSearch = localSearch || searchFilter;
  const filteredLeads = leads.filter(l => {
    if (!effectiveSearch) return true;
    const q = effectiveSearch.toLowerCase();
    return (
      l.first_name.toLowerCase().includes(q) ||
      l.last_name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      (l.company_name && l.company_name.toLowerCase().includes(q)) ||
      (l.job_title && l.job_title.toLowerCase().includes(q))
    );
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredLeads.map(l => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkStageChange = async (newStage: PipelineStage) => {
    if (selectedIds.length === 0) return;
    try {
      await api.bulkUpdateStage(selectedIds, newStage);
      setSelectedIds([]);
      loadLeads();
    } catch (err) {
      console.error('Bulk stage change error:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Permanently delete ${selectedIds.length} selected lead(s)?`)) return;

    for (const id of selectedIds) {
      try {
        await api.deleteLead(id);
      } catch (err) {
        // ignore
      }
    }
    setSelectedIds([]);
    loadLeads();
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 75) return 'text-emerald-700 bg-emerald-50/80 border-emerald-200/80';
    if (score >= 50) return 'text-indigo-700 bg-indigo-50/80 border-indigo-200/80';
    return 'text-slate-600 bg-slate-100/80 border-slate-200/80';
  };

  const getStageBadge = (stage: PipelineStage) => {
    const map: Record<PipelineStage, { label: string; bg: string; text: string }> = {
      new: { label: 'New', bg: 'bg-slate-100/80', text: 'text-slate-700' },
      qualified: { label: 'Qualified', bg: 'bg-sky-50/80', text: 'text-sky-700' },
      contacted: { label: 'Contacted', bg: 'bg-indigo-50/80', text: 'text-indigo-700' },
      engaged: { label: 'Engaged', bg: 'bg-purple-50/80', text: 'text-purple-700' },
      meeting_scheduled: { label: 'Meeting', bg: 'bg-teal-50/80', text: 'text-teal-700' },
      proposal: { label: 'Proposal', bg: 'bg-amber-50/80', text: 'text-amber-700' },
      won: { label: 'Won', bg: 'bg-emerald-50/80', text: 'text-emerald-700' },
      lost: { label: 'Lost', bg: 'bg-rose-50/80', text: 'text-rose-700' },
    };
    const s = map[stage] || map.new;
    return (
      <span className={`px-2 py-0.5 text-[11px] font-medium rounded-md backdrop-blur-xs border border-black/5 ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Main Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leads Directory & CRM</h1>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50/80 text-indigo-700 border border-indigo-200/60 backdrop-blur-md">
              INR (₹)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Grounded prospect records with explainable qualification intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={api.getExportCsvUrl()}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 glass-card rounded-lg hover:border-slate-300 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={onOpenCsvImport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 glass-card rounded-lg hover:border-slate-300 transition-colors shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={onOpenNewLead}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600/90 hover:bg-indigo-600 rounded-lg backdrop-blur-md transition-all shadow-sm hover:shadow-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Filter & Bulk Actions Bar (Glassmorphic) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 glass-panel p-3.5 rounded-2xl">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="Search leads, companies, or cities..."
              className="w-full pl-8 pr-3 py-1.5 text-xs glass-input rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs glass-input rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="all">All Stages</option>
            <option value="new">New</option>
            <option value="qualified">Qualified</option>
            <option value="contacted">Contacted</option>
            <option value="engaged">Engaged</option>
            <option value="meeting_scheduled">Meeting Scheduled</option>
            <option value="proposal">Proposal</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs glass-input rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="nurturing">Nurturing</option>
            <option value="unresponsive">Unresponsive</option>
            <option value="disqualified">Disqualified</option>
          </select>
        </div>

        {/* Bulk Action Controls */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-indigo-50/90 backdrop-blur-md px-3 py-1 rounded-lg border border-indigo-200/80 text-xs">
            <span className="font-semibold text-indigo-900">{selectedIds.length} selected</span>
            <span className="text-slate-300">|</span>
            <select
              onChange={e => handleBulkStageChange(e.target.value as PipelineStage)}
              defaultValue=""
              className="bg-transparent text-indigo-700 text-xs font-medium cursor-pointer focus:outline-none"
            >
              <option value="" disabled>
                Move to Stage...
              </option>
              <option value="qualified">Qualified</option>
              <option value="contacted">Contacted</option>
              <option value="engaged">Engaged</option>
              <option value="meeting_scheduled">Meeting Scheduled</option>
              <option value="proposal">Proposal</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
            <span className="text-slate-300">|</span>
            <button
              onClick={handleBulkDelete}
              className="text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Leads Table (Glassmorphic) */}
      <div className="glass-panel rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading leads...</div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-white/80 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto shadow-2xs">
              <Building className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No leads found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {effectiveSearch || stageFilter !== 'all'
                ? 'No prospects match your current search or filters.'
                : 'Your CRM has no records yet. Add a lead manually with INR opportunity value or import a verified CSV.'}
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={onOpenNewLead}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs"
              >
                Create First Lead (₹)
              </button>
              <button
                onClick={onOpenCsvImport}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 glass-card rounded-lg hover:border-slate-300 transition-colors"
              >
                Import CSV
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/50 backdrop-blur-xs text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-8">
                    <input
                      type="checkbox"
                      checked={
                        filteredLeads.length > 0 &&
                        selectedIds.length === filteredLeads.length
                      }
                      onChange={handleSelectAll}
                      className="rounded text-indigo-600 focus:ring-0"
                    />
                  </th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Company & Domain</th>
                  <th className="py-3 px-4">Lifecycle Stage</th>
                  <th className="py-3 px-4 text-center">AI Fit Score</th>
                  <th className="py-3 px-4 text-right">Deal Value (INR)</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80 text-xs">
                {filteredLeads.map(lead => {
                  const isSelected = selectedIds.includes(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => onSelectLead(lead.id)}
                      className={`hover:bg-indigo-50/30 cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <td
                        className="py-3 px-4"
                        onClick={e => {
                          e.stopPropagation();
                          handleToggleSelect(lead.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">
                            {lead.first_name} {lead.last_name}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {lead.email}
                          </span>
                        </div>
                      </td>

                      {/* Company & Domain */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">
                            {lead.company_name || '—'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {lead.job_title || lead.industry || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Stage */}
                      <td className="py-3 px-4">{getStageBadge(lead.stage)}</td>

                      {/* AI Score */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-bold rounded-md border backdrop-blur-xs ${getScoreBadgeColor(
                            lead.score
                          )}`}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{lead.score}</span>
                        </span>
                      </td>

                      {/* Deal Value (INR format) */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {lead.deal_value ? formatINR(lead.deal_value) : '—'}
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 text-[11px] text-slate-500 font-mono">
                        {lead.created_at.split('T')[0]}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <ChevronRight className="w-4 h-4 text-slate-400 inline-block" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
