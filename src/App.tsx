import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, NavView } from './components/Sidebar';
import { Header } from './components/Header';
import { OnboardingBanner } from './components/OnboardingBanner';
import { NewLeadModal } from './components/NewLeadModal';
import { CsvImportModal } from './components/CsvImportModal';
import { LeadDrawer } from './components/LeadDrawer';

import { DashboardView } from './views/DashboardView';
import { LeadsView } from './views/LeadsView';
import { PipelineView } from './views/PipelineView';
import { LeadIntelligenceView } from './views/LeadIntelligenceView';
import { OutreachStudioView } from './views/OutreachStudioView';
import { ResponseIntelligenceView } from './views/ResponseIntelligenceView';
import { TasksView } from './views/TasksView';
import { SuppressionView } from './views/SuppressionView';
import { IntegrationsView } from './views/IntegrationsView';
import { AuditView } from './views/AuditView';
import { AuthView } from './views/AuthView';

import { api } from './api/client';
import { DashboardMetrics, IntegrationStatus, Lead } from './types';

function MainApplication() {
  const { user, workspace, loading } = useAuth();

  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Modals state
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [leadForDraft, setLeadForDraft] = useState<Lead | null>(null);

  // App metrics & integrations for onboarding tracking
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);

  useEffect(() => {
    if (user) {
      loadSystemStatus();
    }
  }, [user, currentView]);

  const loadSystemStatus = async () => {
    try {
      const [mRes, iRes] = await Promise.all([
        api.getDashboardMetrics(),
        api.getIntegrationsStatus(),
      ]);
      setMetrics(mRes.metrics);
      setIntegrations(iRes);
    } catch (err) {
      // ignore
    }
  };

  const handleOpenDraftForLead = (lead: Lead) => {
    setActiveLeadId(null);
    setLeadForDraft(lead);
    setCurrentView('outreach');
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white space-y-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 animate-pulse flex items-center justify-center">
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 2L2 19.5L12 16.5L22 19.5L12 2Z" />
          </svg>
        </div>
        <p className="text-xs text-slate-400 font-mono">Initializing DealPilot Autopilot...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="h-screen flex bg-slate-950/5 text-slate-900 overflow-hidden font-sans relative">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={view => setCurrentView(view)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Viewport with Refined Ambient Background Blurs */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-slate-50/60 bg-glass-canvas">
        {/* Subtle Ambient Background Blurs (optical depth beneath frosted glass cards) */}
        <div className="pointer-events-none absolute -top-24 left-1/4 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-indigo-500/12 via-indigo-400/8 to-transparent blur-[90px]" />
        <div className="pointer-events-none absolute top-1/3 -right-24 w-[520px] h-[520px] rounded-full bg-gradient-to-bl from-sky-400/12 via-cyan-400/6 to-transparent blur-[100px]" />
        <div className="pointer-events-none absolute bottom-8 left-1/3 w-[560px] h-[560px] rounded-full bg-gradient-to-tr from-violet-400/10 via-purple-300/5 to-transparent blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-20 right-16 w-[420px] h-[420px] rounded-full bg-gradient-to-tl from-emerald-400/10 via-teal-400/6 to-transparent blur-[90px]" />

        {/* Subtle Micro-dot Grid Layer */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />

        {/* Top Header */}
        <Header
          currentView={currentView}
          onOpenNewLead={() => setIsNewLeadOpen(true)}
          searchQuery={globalSearch}
          onSearchChange={q => setGlobalSearch(q)}
        />

        {/* Guided Onboarding Banner */}
        {metrics && (
          <OnboardingBanner
            metrics={metrics}
            integrations={integrations}
            onNavigate={view => setCurrentView(view)}
            onOpenNewLead={() => setIsNewLeadOpen(true)}
          />
        )}

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto relative z-10">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={view => setCurrentView(view)}
              onOpenNewLead={() => setIsNewLeadOpen(true)}
            />
          )}

          {currentView === 'leads' && (
            <LeadsView
              onOpenNewLead={() => setIsNewLeadOpen(true)}
              onOpenCsvImport={() => setIsCsvImportOpen(true)}
              onSelectLead={id => setActiveLeadId(id)}
              searchFilter={globalSearch}
            />
          )}

          {currentView === 'pipeline' && (
            <PipelineView
              onOpenNewLead={() => setIsNewLeadOpen(true)}
              onSelectLead={id => setActiveLeadId(id)}
            />
          )}

          {currentView === 'scoring' && (
            <LeadIntelligenceView
              onSelectLead={id => setActiveLeadId(id)}
              onOpenDraftForLead={handleOpenDraftForLead}
            />
          )}

          {currentView === 'outreach' && (
            <OutreachStudioView
              initialLead={leadForDraft}
              onClearInitialLead={() => setLeadForDraft(null)}
            />
          )}

          {currentView === 'replies' && <ResponseIntelligenceView />}

          {currentView === 'tasks' && <TasksView />}

          {currentView === 'suppression' && <SuppressionView />}

          {currentView === 'integrations' && <IntegrationsView />}

          {currentView === 'audit' && <AuditView />}
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <NewLeadModal
        isOpen={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        onLeadCreated={newLead => {
          loadSystemStatus();
          setActiveLeadId(newLead.id);
        }}
      />

      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        onImportComplete={() => {
          loadSystemStatus();
        }}
      />

      <LeadDrawer
        leadId={activeLeadId}
        onClose={() => setActiveLeadId(null)}
        onLeadUpdated={() => {
          loadSystemStatus();
        }}
        onOpenDraftForLead={handleOpenDraftForLead}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApplication />
    </AuthProvider>
  );
}
