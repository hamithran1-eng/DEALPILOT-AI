import React, { useState, useEffect } from 'react';
import { ShieldBan, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { SuppressionEntry } from '../types';

export const SuppressionView: React.FC = () => {
  const [list, setList] = useState<SuppressionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState<SuppressionEntry['reason']>('manual');
  const [showAdd, setShowAdd] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await api.getSuppressionList();
      setList(res.list);
    } catch (err) {
      console.error('Failed to load suppression list:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    try {
      await api.addSuppression(email.trim().toLowerCase(), reason);
      setEmail('');
      setShowAdd(false);
      setMsg(`Added ${email} to suppression list.`);
      loadList();
    } catch (err) {
      console.error('Failed to add suppression:', err);
    }
  };

  const handleRemove = async (id: string, suppressedEmail: string) => {
    if (!confirm(`Remove ${suppressedEmail} from suppression list?`)) return;
    try {
      await api.removeSuppression(id);
      setList(prev => prev.filter(s => s.id !== id));
      setMsg(`Removed ${suppressedEmail} from suppression list.`);
    } catch (err) {
      console.error('Failed to remove suppression:', err);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Suppression Registry</h1>
          <p className="text-xs text-slate-500 mt-1">
            Mandatory opt-out compliance. Any dispatch to these addresses is permanently blocked by the server.
          </p>
        </div>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Blocked Email</span>
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Add Entry Form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="p-4 glass-panel rounded-2xl shadow-xs space-y-3">
          <h3 className="text-xs font-semibold text-slate-900">Manually Suppress Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contact@prospect.com"
                className="w-full px-3 py-1.5 text-xs glass-input rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <select
                value={reason}
                onChange={e => setReason(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs glass-input rounded-xl bg-white/80"
              >
                <option value="manual">Manual Addition</option>
                <option value="unsubscribed">Unsubscribed</option>
                <option value="hard_bounce">Hard Bounce</option>
                <option value="complaint">Spam Complaint</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3.5 py-1.5 text-xs text-slate-600 glass-card rounded-xl hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs"
            >
              Add to Suppression
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="glass-panel rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading suppression list...</div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <ShieldBan className="w-8 h-8 text-slate-300 mx-auto" />
            <p>Suppression list is currently empty. Inbound unsubscribe replies are automatically enrolled here.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                <th className="py-2.5 px-4">Suppressed Address</th>
                <th className="py-2.5 px-4">Reason</th>
                <th className="py-2.5 px-4">Date Added</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono font-medium text-slate-900">{entry.email}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-rose-50 text-rose-700 border border-rose-200">
                      {entry.reason}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {new Date(entry.added_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleRemove(entry.id, entry.email)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Remove from suppression"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
