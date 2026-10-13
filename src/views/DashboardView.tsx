import React, { useEffect, useState } from 'react';
import {
  Users,
  Target,
  Send,
  MessageSquareReply,
  CalendarCheck,
  TrendingUp,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { api } from '../api/client';
import { DashboardMetrics } from '../types';
import { NavView } from '../components/Sidebar';
import { formatINR, formatCompactINR } from '../lib/currency';

interface DashboardViewProps {
  onNavigate: (view: NavView) => void;
  onOpenNewLead: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenNewLead,
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const res = await api.getDashboardMetrics();
      setMetrics(res.metrics);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 bg-slate-200/50 backdrop-blur-md rounded-lg w-48 animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 glass-card rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const isEmptyWorkspace = metrics.totalLeads === 0;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Sales Command Center
            </h1>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50/80 text-indigo-700 border border-indigo-200/60 backdrop-blur-md">
              INR (₹) Base
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline analytics calculated strictly from verified database records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('pipeline')}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 glass-card rounded-lg hover:border-indigo-300 transition-all shadow-xs"
          >
            Open Pipeline Kanban
          </button>
          <button
            onClick={onOpenNewLead}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-indigo-600/90 hover:bg-indigo-600 rounded-lg backdrop-blur-md transition-all shadow-sm hover:shadow-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Real Lead</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row 1 (Glassmorphic) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="p-5.5 glass-card rounded-2xl transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2.5">
            <span className="text-xs font-medium">Total Database Leads</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100/80 flex items-center justify-center text-slate-500">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {metrics.totalLeads}
            </span>
            <span className="text-[11px] text-slate-500">
              ({metrics.newLeads} new)
            </span>
          </div>
        </div>

        {/* Opportunity Pipeline Value (INR) */}
        <div className="p-5.5 glass-card rounded-2xl transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2.5">
            <span className="text-xs font-medium">Pipeline Value (INR)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold font-mono text-xs">
              ₹
            </div>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {formatINR(metrics.pipelineValue)}
            </span>
            {metrics.wonValue > 0 && (
              <span className="text-[11px] text-emerald-600 font-mono font-medium">
                ({formatINR(metrics.wonValue)} won)
              </span>
            )}
          </div>
        </div>

        {/* Approved Messages Sent */}
        <div className="p-5.5 glass-card rounded-2xl transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2.5">
            <span className="text-xs font-medium">Outreach Dispatched</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Send className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {metrics.sentMessages}
            </span>
            <span className="text-[11px] text-slate-500">
              ({metrics.totalDrafts} drafts)
            </span>
          </div>
        </div>

        {/* Inbound Replies & Engagement */}
        <div className="p-5.5 glass-card rounded-2xl transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2.5">
            <span className="text-xs font-medium">Inbound Replies</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <MessageSquareReply className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {metrics.totalReplies}
            </span>
            <span className="text-[11px] text-teal-600 font-mono font-medium">
              {metrics.replyRate}% reply rate
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Row 2 (Meetings, Conversions, Workload) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Meetings Booked */}
        <div className="p-5.5 glass-card rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">Meetings Booked (IST)</span>
            <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
              {metrics.meetingScheduled}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Strictly verified stage meetings
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50/80 text-indigo-600 flex items-center justify-center border border-indigo-100/60 shadow-xs">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Win Rate */}
        <div className="p-5.5 glass-card rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">Closed Won Conversion</span>
            <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
              {metrics.winRate}%
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {metrics.wonLeads} deals won of {metrics.totalLeads} total leads
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50/80 text-emerald-600 flex items-center justify-center border border-emerald-100/60 shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Task Cadence / Follow-ups Due */}
        <div className="p-5.5 glass-card rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">Follow-ups Due Today</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                {metrics.tasksDueToday}
              </span>
              {metrics.tasksOverdue > 0 && (
                <span className="text-xs font-semibold text-rose-600 font-mono">
                  ({metrics.tasksOverdue} overdue)
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {metrics.pendingTasksCount} total pending tasks
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50/80 text-amber-600 flex items-center justify-center border border-amber-100/60 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Empty State Banner (Strict No-Demo Policy) */}
      {isEmptyWorkspace ? (
        <div className="glass-panel border-dashed border-slate-300/80 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-white/80 border border-slate-200/80 text-slate-400 flex items-center justify-center mx-auto shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            Fresh Indian Workspace Active (Zero Fake Records)
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            All pipeline figures are tracked in Indian Rupees (₹). DealPilot never generates simulated leads or fake charts.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={onOpenNewLead}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Your First Lead (₹)</span>
            </button>
            <button
              onClick={() => onNavigate('leads')}
              className="px-4 py-2 text-xs font-medium text-slate-700 glass-card rounded-lg hover:border-slate-300 transition-colors"
            >
              Import CSV File
            </button>
          </div>
        </div>
      ) : (
        /* Visualizations Grid (Glassmorphic) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline Stage Distribution */}
          <div className="p-6 glass-panel rounded-2xl shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-900">Pipeline Stage Distribution</h3>
                <p className="text-[11px] text-slate-400">Total volume of active leads per lifecycle stage</p>
              </div>
              <button
                onClick={() => onNavigate('pipeline')}
                className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <span>View Kanban</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.stageDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.6)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: '#E2E8F0' }}
                  />
                  <Bar dataKey="count" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lead Creation Velocity Trend */}
          <div className="p-6 glass-panel rounded-2xl shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-900">Lead Ingestion Velocity</h3>
                <p className="text-[11px] text-slate-400">Chronological additions to database</p>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {metrics.leadTrends.length} active data points
              </span>
            </div>

            <div className="h-64 w-full">
              {metrics.leadTrends.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Data will plot automatically as leads are added across dates.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.leadTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.6)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      itemStyle={{ color: '#E2E8F0' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#0D9488"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#0D9488' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
