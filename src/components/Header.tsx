import React, { useState, useEffect } from 'react';
import { Search, Bell, Plus, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { NavView } from './Sidebar';
import { api } from '../api/client';
import { Notification } from '../types';

interface HeaderProps {
  currentView: NavView;
  onOpenNewLead: () => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
}

const VIEW_TITLES: Record<NavView, string> = {
  dashboard: 'Command Center',
  leads: 'Leads Directory & CRM',
  pipeline: 'Sales Pipeline Stages',
  scoring: 'AI Lead Intelligence',
  outreach: 'Outreach Studio',
  replies: 'Response Intelligence',
  tasks: 'Follow-up Tasks',
  suppression: 'Suppression Registry',
  integrations: 'Integrations & Credentials',
  audit: 'System Audit Ledger',
};

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onOpenNewLead,
  onSearchChange,
  searchQuery,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  useEffect(() => {
    loadNotifications();
  }, [currentView]);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
    } catch (err) {
      // ignore
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      // ignore
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-16 glass-header border-b border-white/80 px-6 flex items-center justify-between gap-6 shrink-0 relative z-20 shadow-xs">
      {/* Zone 1: Contextual Breadcrumb + INR Currency Indicator */}
      <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
        <span className="text-slate-400 font-semibold tracking-wide">DealPilot</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-bold tracking-tight">{VIEW_TITLES[currentView]}</span>

        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50/90 border border-indigo-200/70 backdrop-blur-md shadow-2xs ml-1">
          <span className="text-emerald-600 font-black">₹</span>
          <span>INR Mode</span>
        </span>
      </div>

      {/* Zone 2: Glass Global Search */}
      <div className="flex-1 max-w-md relative hidden sm:block">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search prospects, Indian enterprises, roles..."
          className="w-full pl-9 pr-8 py-1.5 text-xs glass-input rounded-xl focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Zone 3: Notification Menu & Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notifications Popover with Glassmorphism */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-600 hover:text-slate-900 glass-card rounded-xl transition-all relative"
            title="Activity Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2.5 w-84 glass-modal rounded-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                <span className="text-[11px] text-slate-400 font-mono">{unreadCount} unread</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100/70">
                {notifications.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-400">
                    No activity notifications yet.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id)}
                      className={`p-3 text-xs hover:bg-white/60 cursor-pointer transition-colors ${
                        !n.read ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {n.type === 'alert' ? (
                          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 leading-tight">{n.title}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button (Luminous Glass Gradient) */}
        <button
          onClick={onOpenNewLead}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 rounded-xl transition-all shadow-md shadow-indigo-500/25 border border-indigo-400/30 whitespace-nowrap shrink-0 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Lead (₹)</span>
        </button>
      </div>
    </header>
  );
};
