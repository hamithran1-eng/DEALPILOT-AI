import React, { useState, useEffect } from 'react';
import {
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Edit3,
  Check,
  ShieldBan,
  Loader2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api/client';
import { Lead, OutreachDraft, OutreachTemplate, OutreachMessage, IntegrationStatus } from '../types';
import { formatINR } from '../lib/currency';

interface OutreachStudioViewProps {
  initialLead?: Lead | null;
  onClearInitialLead?: () => void;
}

export const OutreachStudioView: React.FC<OutreachStudioViewProps> = ({
  initialLead,
  onClearInitialLead,
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<OutreachTemplate[]>([]);
  const [drafts, setDrafts] = useState<OutreachDraft[]>([]);
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);

  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialLead?.id || '');
  const [instructions, setInstructions] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Active draft editor
  const [activeDraft, setActiveDraft] = useState<OutreachDraft | null>(null);
  const [editSubject, setEditSubject] = useState<string>('');
  const [editBody, setEditBody] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'generator' | 'drafts' | 'sent' | 'templates'>('generator');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (initialLead) {
      setSelectedLeadId(initialLead.id);
      setActiveTab('generator');
    }
  }, [initialLead]);

  const loadAllData = async () => {
    try {
      const [leadsRes, tmplRes, draftsRes, msgRes, intRes] = await Promise.all([
        api.getLeads(),
        api.getTemplates(),
        api.getDrafts(),
        api.getSentMessages(),
        api.getIntegrationsStatus(),
      ]);

      setLeads(leadsRes.leads);
      setTemplates(tmplRes.templates);
      setDrafts(draftsRes.drafts);
      setMessages(msgRes.messages);
      setIntegrations(intRes);

      if (leadsRes.leads.length > 0 && !selectedLeadId) {
        setSelectedLeadId(leadsRes.leads[0].id);
      }
    } catch (err) {
      console.error('Failed to load outreach studio data:', err);
    }
  };

  const handleGenerateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId) {
      setError('Please select a target prospect lead.');
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    const tmpl = templates.find(t => t.id === selectedTemplateId);

    try {
      const res = await api.generateDraft({
        lead_id: selectedLeadId,
        instructions: instructions.trim() || undefined,
        template_subject: tmpl?.subject_template,
        template_body: tmpl?.body_template,
      });

      setDrafts(prev => [res.draft, ...prev]);
      setActiveDraft(res.draft);
      setEditSubject(res.draft.subject);
      setEditBody(res.draft.body);
      setSuccess('AI Draft created. Grounded copy stored in Review Queue (strictly un-sent).');
      setActiveTab('drafts');
    } catch (err: any) {
      setError(err.message || 'AI Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectDraftForEdit = (d: OutreachDraft) => {
    setActiveDraft(d);
    setEditSubject(d.subject);
    setEditBody(d.body);
  };

  const handleSaveDraftChanges = async () => {
    if (!activeDraft) return;
    try {
      const res = await api.updateDraft(activeDraft.id, {
        subject: editSubject,
        body: editBody,
      });
      setActiveDraft(res.draft);
      setDrafts(prev => prev.map(d => (d.id === activeDraft.id ? res.draft : d)));
      setSuccess('Draft revisions saved.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleApproveDraft = async (draftId: string) => {
    try {
      const res = await api.approveDraft(draftId);
      setDrafts(prev => prev.map(d => (d.id === draftId ? res.draft : d)));
      if (activeDraft?.id === draftId) {
        setActiveDraft(res.draft);
      }
      setSuccess('Draft approved. Dispatch unlocked.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSendDraft = async (draft: OutreachDraft) => {
    setSendingId(draft.id);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.sendDraft(draft.id);
      setSuccess(`Message successfully sent! Provider ID: ${res.messageId}`);
      // Refresh drafts and messages
      const [draftsRes, msgRes] = await Promise.all([api.getDrafts(), api.getSentMessages()]);
      setDrafts(draftsRes.drafts);
      setMessages(msgRes.messages);
      if (activeDraft?.id === draft.id) {
        setActiveDraft(draftsRes.drafts.find(d => d.id === draft.id) || null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingId(null);
    }
  };

  const targetLead = leads.find(l => l.id === selectedLeadId);
  const emailConnected = integrations?.email.status === 'connected';

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Outreach Studio</h1>
          <p className="text-xs text-slate-500 mt-1">
            Grounded AI drafting with mandatory human review and approved real-email delivery.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'generator'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Draft Generator
          </button>
          <button
            onClick={() => setActiveTab('drafts')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'drafts'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Review Queue ({drafts.filter(d => d.status !== 'sent').length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'sent'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sent Ledger ({messages.length})
          </button>
        </div>
      </div>

      {/* Provider Status Callout */}
      {!emailConnected && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Email Provider Configuration Required for Live Dispatch</span>
            <span>
              {integrations?.email.message || 'Configure your Resend API key and verified sender address in Integrations to enable real email sending.'}
              {' '}You can draft and approve messages now; actual dispatch will be safely gated until credentials are active.
            </span>
          </div>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* TAB 1: DRAFT GENERATOR */}
      {activeTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Parameters (5 cols) */}
          <div className="lg:col-span-5 glass-panel rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-semibold text-slate-900">Configure AI Outreach Draft</h3>

            <form onSubmit={handleGenerateDraft} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Target Prospect Lead <span className="text-rose-500">*</span>
                </label>
                {leads.length === 0 ? (
                  <p className="text-xs text-slate-400">No leads in CRM. Please add a lead first.</p>
                ) : (
                  <select
                    value={selectedLeadId}
                    onChange={e => setSelectedLeadId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.first_name} {l.last_name} ({l.company_name || 'No firm'}) - Fit {l.score}/100
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {targetLead && (
                <div className="p-3.5 glass-card rounded-xl text-xs space-y-1">
                  <span className="font-semibold text-slate-800 block">Prospect Attributes Grounded:</span>
                  <p className="text-[11px] text-slate-600">
                    Role: {targetLead.job_title || 'Unspecified'} | Domain: {targetLead.company_domain || '—'}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Deal Value: {targetLead.deal_value ? formatINR(targetLead.deal_value) : 'strategic'} | Stage: {targetLead.stage}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Structural Template Baseline (Optional)
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Let Gemini generate full structure --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Custom Strategic Angle or Focus (Optional)
                </label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  placeholder="e.g. Focus on reducing sales friction. Ask for 10 min feedback call next Thursday."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={generating || !selectedLeadId}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-2xs disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Gemini Drafting Grounded Copy...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate AI Draft (Save to Review)</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Active Draft Editor (7 cols) */}
          <div className="lg:col-span-7 glass-panel rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-semibold text-slate-900">
                {activeDraft ? 'Draft Preview & Inline Editor' : 'Draft Preview'}
              </h3>
              {activeDraft && (
                <span
                  className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded ${
                    activeDraft.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  Status: {activeDraft.status}
                </span>
              )}
            </div>

            {!activeDraft ? (
              <div className="py-20 text-center text-xs text-slate-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-300" />
                <p>Generate a new draft or select one from the Review Queue to edit.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={e => setEditSubject(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Email Body Copy
                  </label>
                  <textarea
                    rows={10}
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono leading-relaxed border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={handleSaveDraftChanges}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    Save Changes
                  </button>

                  <div className="flex items-center gap-2">
                    {activeDraft.status !== 'approved' && (
                      <button
                        onClick={() => handleApproveDraft(activeDraft.id)}
                        className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Explicitly Approve Draft</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleSendDraft(activeDraft)}
                      disabled={activeDraft.status !== 'approved' || sendingId === activeDraft.id}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                    >
                      {sendingId === activeDraft.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Dispatch Email</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REVIEW QUEUE */}
      {activeTab === 'drafts' && (
        <div className="glass-panel rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100/80 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-900">
              Unsent Drafts Requiring Explicit Human Approval
            </h3>
            <span className="text-[11px] text-slate-500">{drafts.length} total drafts</span>
          </div>

          {drafts.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No pending drafts. Use Draft Generator to craft personalized outreach.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {drafts.map(draft => {
                const associatedLead = leads.find(l => l.id === draft.lead_id);
                return (
                  <div key={draft.id} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{draft.subject}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.2 rounded uppercase ${
                            draft.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : draft.status === 'sent'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {draft.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Recipient: {associatedLead ? `${associatedLead.first_name} ${associatedLead.last_name} (${associatedLead.email})` : 'Lead'}
                        {draft.approved_by ? ` · Approved by ${draft.approved_by}` : ''}
                      </p>
                      <p className="text-xs text-slate-700 line-clamp-2 mt-1 font-mono text-[11px]">
                        {draft.body}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          handleSelectDraftForEdit(draft);
                          setActiveTab('generator');
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50"
                      >
                        Edit
                      </button>

                      {draft.status !== 'approved' && draft.status !== 'sent' && (
                        <button
                          onClick={() => handleApproveDraft(draft.id)}
                          className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
                        >
                          Approve
                        </button>
                      )}

                      {draft.status === 'approved' && (
                        <button
                          onClick={() => handleSendDraft(draft)}
                          disabled={sendingId === draft.id}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 shadow-2xs"
                        >
                          {sendingId === draft.id && <Loader2 className="w-3 h-3 animate-spin" />}
                          <span>Dispatch</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SENT LEDGER */}
      {activeTab === 'sent' && (
        <div className="glass-panel rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100/80 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-900">
              Verified Outbound Delivery Log ({messages.length})
            </h3>
            <span className="text-[11px] text-slate-400">Strictly provider-confirmed dispatch records</span>
          </div>

          {messages.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No outbound messages dispatched yet. Only messages sent after explicit approval appear here.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                  <th className="py-2.5 px-4">Recipient</th>
                  <th className="py-2.5 px-4">Subject</th>
                  <th className="py-2.5 px-4">Provider ID</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Sent Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messages.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-medium text-slate-900">{m.to_email}</td>
                    <td className="py-3 px-4 text-slate-700">{m.subject}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-xs">
                      {m.provider_message_id || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500">
                      {new Date(m.sent_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
