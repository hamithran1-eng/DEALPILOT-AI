import React from 'react';
import {
  LayoutDashboard,
  Users,
  Kanban,
  BrainCircuit,
  Send,
  MessageSquareReply,
  CheckSquare,
  ShieldBan,
  Settings,
  History,
  LogOut,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavView =
  | 'dashboard'
  | 'leads'
  | 'pipeline'
  | 'scoring'
  | 'outreach'
  | 'replies'
  | 'tasks'
  | 'suppression'
  | 'integrations'
  | 'audit';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  collapsed,
  onToggleCollapse,
}) => {
  const { user, workspace, logout } = useAuth();

  const navItems: Array<{ id: NavView; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads CRM', icon: Users },
    { id: 'pipeline', label: 'Sales Pipeline', icon: Kanban },
    { id: 'scoring', label: 'AI Intelligence', icon: BrainCircuit },
    { id: 'outreach', label: 'Outreach Studio', icon: Send },
    { id: 'replies', label: 'Response AI', icon: MessageSquareReply },
    { id: 'tasks', label: 'Follow-up Tasks', icon: CheckSquare },
    { id: 'suppression', label: 'Suppression List', icon: ShieldBan },
    { id: 'integrations', label: 'Integrations', icon: Settings },
    { id: 'audit', label: 'Audit Ledger', icon: History },
  ];

  return (
    <aside
      className={`h-screen bg-slate-950/85 backdrop-blur-2xl text-slate-300 flex flex-col border-r border-white/10 transition-all duration-300 select-none shadow-2xl relative z-30 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0 bg-slate-950/40">
        <div
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 cursor-pointer overflow-hidden group"
        >
          {/* Brand Mark SVG with Glass Glow */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-all border border-white/20">
            <svg
              className="w-4.5 h-4.5 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2L2 19.5L12 16.5L22 19.5L12 2Z" />
            </svg>
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm tracking-tight leading-none">
                  DealPilot AI
                </span>
                <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1 rounded">
                  ₹ INR
                </span>
              </div>
              <span className="text-[11px] text-slate-400 truncate mt-1">
                {workspace?.name || 'Sales Pipeline'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links with Glass Hover and Active States */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 group ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600/90 via-indigo-600/80 to-indigo-500/70 text-white font-semibold shadow-lg shadow-indigo-600/25 border border-indigo-400/30 backdrop-blur-md'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Currency & Base Operational Indicator */}
      {!collapsed && (
        <div className="mx-3 mb-3 p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-[11px] text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Currency Base
            </span>
            <span className="font-mono font-bold text-white bg-slate-800/80 px-1.5 py-0.5 rounded border border-white/10">
              INR (₹)
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-white/5">
            <span>Timezone</span>
            <span className="font-mono text-slate-300">IST (UTC+05:30)</span>
          </div>
        </div>
      )}

      {/* Bottom Profile / Workspace / Logout */}
      <div className="p-3 border-t border-white/10 shrink-0 bg-slate-950/50">
        {!collapsed && user && (
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm border border-white/20">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate leading-none">{user.name}</p>
                <p className="text-[10px] text-slate-400 truncate mt-1">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          </button>

          {!collapsed && (
            <button
              onClick={logout}
              title="Sign out"
              className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
