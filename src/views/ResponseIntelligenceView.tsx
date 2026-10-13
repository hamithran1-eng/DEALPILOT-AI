import React, { useState, useEffect } from 'react';
import {
  MessageSquareReply,
  ShieldBan,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Check,
  Send,
  Loader2,
  Calendar,
  XCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { Lead, ReplyClassification, ReplyCategory } from '../types';

export const ResponseIntelligenceView: React.FC = () => {
  const [replies, setReplies] = useState<ReplyClassification[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Inbound Reply Test Simulator state
  const [simLeadId, setSimLeadId] = useState<string>('');
  const [simText, setSimText] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [repliesRes, leadsRes] = await Promise.all([
        api.getReplies(),
        api.getLeads(),
      ]);
      setReplies(repliesRes.replies);
      setLeads(leadsRes.leads);
      if (leadsRes.leads.length > 0 && !simLeadId) {
        setSimLeadId(leadsRes.leads[0].id);
      }
    } catch (err) {
      console.error('Failed to load response intelligence data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessInboundReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simLeadId || !simText.trim()) {
      setErrorMsg('Please select a lead and supply inbound email text.');
      return;
    }

    setProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const lead = leads.find(l => l.id === simLeadId);

    try {
      const res = await api.processReply({
        lead_id: simLeadId,
        reply_text: simText.trim(),
        sender_email: lead?.email,
      });

      setReplies(prev => [res.reply, ...prev]);
      setSimText('');
      setSuccessMsg(`Reply classified as: ${res.reply.category.toUpperCase()} (Confidence: ${Math.round(res.reply.confidence * 100)}%)`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process reply.');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkReviewed = async (id: string) => {
    try {
      const res = await api.reviewReply(id);
      setReplies(prev => prev.map(r => (r.id === id ? res.reply : r)));
    } catch (err) {
      console.error('Failed to review reply:', err);
    }
  };

  const getCategoryBadge = (category: ReplyCategory) => {
    const map: Record<ReplyCategory, { label: string; bg: string; text: string }> = {
      interested: { label: 'Interested', bg: 'bg-emerald-50', text: 'text-emerald-700' },
      meeting_request: { label: 'Meeting Request', bg: 'bg-teal-50', text: 'text-teal-700' },
      question: { label: 'Question', bg: 'bg-sky-50', text: 'text-sky-700' },
      objection: { label: 'Objection', bg: 'bg-amber-50', text: 'text-amber-700' },
      follow_up_later: { label: 'Follow Up Later', bg: 'bg-purple-50', text: 'text-purple-700' },
      not_interested: { label: 'Not Interested', bg: 'bg-slate-100', text: 'text-slate-600' },
      out_of_office: { label: 'Out of Office', bg: 'bg-slate-100', text: 'text-slate-500' },
      unsubscribe: { label: 'Unsubscribe (Suppressed)', bg: 'bg-rose-50', text: 'text-rose-700' },
      unknown: { label: 'Unknown Intent', bg: 'bg-slate-100', text: 'text-slate-600' },
    };
    const c = map[category] || map.unknown;
    return (
      <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded border ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Response Intelligence</h1>
        <p className="text-xs text-slate-500 mt-1">
          Automated inbound classification, intent parsing, meeting detection, and suppression triggers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Inbound Reply Receiver & Simulator (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-900">Process Inbound Email Reply</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Simulate or paste an incoming prospect response. Evaluated via Gemini response classification.
            </p>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleProcessInboundReply} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Sender / Associated Lead <span className="text-rose-500">*</span>
              </label>
              {leads.length === 0 ? (
                <p className="text-xs text-slate-400">No leads available in CRM.</p>
              ) : (
                <select
                  value={simLeadId}
                  onChange={e => setSimLeadId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.first_name} {l.last_name} ({l.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-medium text-slate-700">
                  Inbound Email Message Body <span className="text-rose-500">*</span>
                </label>
              </div>
              <textarea
                rows={5}
                required
                value={simText}
                onChange={e => setSimText(e.target.value)}
                placeholder="Paste inbound prospect email reply..."
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Quick response test buttons */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 block font-medium">Quick Test Scenarios:</span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setSimText(
                      'Hi, thanks for reaching out. Let\'s connect next Tuesday at 3:00 PM IST to review the INR 5L proposal. Please send a calendar invitation.'
                    )
                  }
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-700"
                >
                  Meeting Request
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSimText('We currently have a vendor contract active until Q4. Please check back with us in November.')
                  }
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-700"
                >
                  Follow-up Later
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSimText('Please unsubscribe me immediately and remove my email from your contact list.')
                  }
                  className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded"
                >
                  Unsubscribe (Trigger Suppression)
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={processing || !simLeadId || !simText.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-2xs disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Classifying Intent with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analyze & Ingest Reply</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Inbound Replies Feed (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-900">
              Inbound Classifications Feed ({replies.length})
            </h3>
            <span className="text-[11px] text-slate-400">Processed Responses</span>
          </div>

          {replies.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-400 space-y-2">
              <MessageSquareReply className="w-8 h-8 text-slate-300 mx-auto" />
              <p>No replies ingested yet. Process an incoming message using the form to test AI classification.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[640px] overflow-y-auto">
              {replies.map(reply => {
                const lead = leads.find(l => l.id === reply.lead_id);
                return (
                  <div
                    key={reply.id}
                    className="p-4.5 glass-card rounded-2xl space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-xs">
                            {lead ? `${lead.first_name} ${lead.last_name}` : reply.sender_email}
                          </span>
                          {getCategoryBadge(reply.category)}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Confidence: {Math.round(reply.confidence * 100)}% · {new Date(reply.created_at).toLocaleString()}
                        </span>
                      </div>

                      {!reply.human_reviewed && (
                        <button
                          onClick={() => handleMarkReviewed(reply.id)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/80 rounded transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark Reviewed</span>
                        </button>
                      )}
                    </div>

                    <div className="p-3 glass-input rounded-xl text-xs font-mono text-slate-800 text-[11px]">
                      "{reply.inbound_text}"
                    </div>

                    <div className="text-xs space-y-1 pt-1">
                      <p className="text-slate-600">
                        <span className="font-semibold text-slate-800">Reasoning:</span> {reply.explanation}
                      </p>
                      <p className="text-indigo-700 font-medium">
                        <span className="font-semibold text-slate-800">Action:</span> {reply.recommended_action}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
