import React, { useState, useEffect } from 'react';
import { History, Shield, Clock, Search } from 'lucide-react';
import { api } from '../api/client';
import { AuditLog } from '../types';

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs();
      setLogs(res.logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(l => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.entity_type.toLowerCase().includes(q) ||
      l.entity_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Audit Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-resistant audit trail recording mutations, stage changes, and outreach actions.
          </p>
        </div>

        <div className="relative max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter actions or entities..."
            className="pl-8 pr-3 py-1.5 text-xs glass-input rounded-xl focus:outline-none"
          />
        </div>
      </div>

      <div className="glass-panel rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading audit log...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <History className="w-8 h-8 text-slate-300 mx-auto" />
            <p>No audit events recorded yet.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Entity Type</th>
                <th className="py-2.5 px-4">Entity ID</th>
                <th className="py-2.5 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-600">
                    {log.entity_type}
                  </td>
                  <td className="py-3 px-4 text-slate-400 truncate max-w-xs">
                    {log.entity_id}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-500 truncate max-w-sm">
                    {log.details ? JSON.stringify(log.details) : '—'}
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
