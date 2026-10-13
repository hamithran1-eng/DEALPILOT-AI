import React, { useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, ArrowRight, Sparkles } from 'lucide-react';
import { NavView } from './Sidebar';
import { DashboardMetrics, IntegrationStatus } from '../types';

interface OnboardingBannerProps {
  metrics: DashboardMetrics;
  integrations: IntegrationStatus | null;
  onNavigate: (view: NavView) => void;
  onOpenNewLead: () => void;
}

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({
  metrics,
  integrations,
  onNavigate,
  onOpenNewLead,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Derive genuine completion from actual database records and verified settings
  const steps = [
    {
      id: 'account',
      title: 'Create Account',
      completed: true,
      actionLabel: null,
      onAction: null,
    },
    {
      id: 'workspace',
      title: 'Configure Workspace',
      completed: true,
      actionLabel: null,
      onAction: null,
    },
    {
      id: 'lead',
      title: 'Create or Import Real Lead (INR ₹)',
      completed: metrics.totalLeads > 0,
      actionLabel: 'Add Lead',
      onAction: () => onOpenNewLead(),
    },
    {
      id: 'ai',
      title: 'Verify AI Provider',
      completed: Boolean(integrations?.gemini.configured),
      actionLabel: 'Check AI Status',
      onAction: () => onNavigate('integrations'),
    },
    {
      id: 'email',
      title: 'Configure Email Provider',
      completed: Boolean(integrations?.email.status === 'connected'),
      actionLabel: 'Configure Email',
      onAction: () => onNavigate('integrations'),
    },
    {
      id: 'draft',
      title: 'Generate First AI Draft',
      completed: metrics.totalDrafts > 0,
      actionLabel: 'Draft Message',
      onAction: () => onNavigate('outreach'),
    },
    {
      id: 'send',
      title: 'Review, Approve & Dispatch',
      completed: metrics.sentMessages > 0,
      actionLabel: 'Review Queue',
      onAction: () => onNavigate('outreach'),
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // If all completed, hide the banner automatically
  if (completedCount === steps.length) {
    return null;
  }

  return (
    <div className="glass-panel border-b border-white/80 px-6 py-3.5 transition-all shadow-xs relative z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-900 leading-tight">
              DealPilot Activation Checklist
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {completedCount} of {steps.length} verified milestones complete ({progressPercent}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Visual Progress bar */}
          <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                step.completed
                  ? 'glass-card border-slate-200/60 text-slate-500 opacity-80'
                  : 'glass-card border-indigo-200/80 text-slate-900 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-1.5">
                {step.completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                )}
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 font-mono block">Step 0{idx + 1}</span>
                  <span className={`text-[11px] font-medium block truncate ${step.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {step.title}
                  </span>
                </div>
              </div>

              {!step.completed && step.actionLabel && (
                <button
                  onClick={step.onAction || undefined}
                  className="mt-2 text-[10px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 self-start pt-1"
                >
                  <span>{step.actionLabel}</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
