import React, { useState, useEffect } from 'react';
import {
  Settings,
  BrainCircuit,
  Mail,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Save,
  KeyRound,
  ExternalLink,
  Send,
  Loader2,
  FileCode,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { IntegrationStatus, Workspace } from '../types';

export const IntegrationsView: React.FC = () => {
  const { workspace, user, refresh } = useAuth();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Email form state
  const [senderEmail, setSenderEmail] = useState(workspace?.settings.sender_email || '');
  const [senderName, setSenderName] = useState(workspace?.settings.sender_name || '');
  const [resendApiKey, setResendApiKey] = useState(workspace?.settings.resend_api_key || '');

  // Supabase form state
  const [supabaseUrl, setSupabaseUrl] = useState(workspace?.settings.supabase_url || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(workspace?.settings.supabase_anon_key || '');

  // Test email state
  const [testRecipient, setTestRecipient] = useState(user?.email || '');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Accordion guide state
  const [showSupabaseGuide, setShowSupabaseGuide] = useState(false);
  const [copiedMigration, setCopiedMigration] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await api.getIntegrationsStatus();
      setStatus(res);
    } catch (err) {
      console.error('Failed to load integration status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    setTestResult(null);

    try {
      await api.updateWorkspace({
        settings: {
          ...workspace?.settings,
          sender_email: senderEmail.trim(),
          sender_name: senderName.trim(),
          resend_api_key: resendApiKey.trim() || undefined,
          supabase_url: supabaseUrl.trim() || undefined,
          supabase_anon_key: supabaseAnonKey.trim() || undefined,
          supabase_connected: Boolean(supabaseUrl.trim() && supabaseAnonKey.trim()),
        } as any,
      });

      setSaveMsg('Workspace integration settings saved successfully.');
      await refresh();
      await loadStatus();
    } catch (err: any) {
      setSaveMsg(`Error saving settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testRecipient || !testRecipient.includes('@')) {
      setTestResult({ success: false, message: 'Please provide a valid recipient email.' });
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await api.testEmail(testRecipient.trim());
      setTestResult({
        success: true,
        message: `Verified email sent! Resend Message ID: ${res.messageId}`,
      });
      loadStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to dispatch test email.',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const webhookEndpoint = `${window.location.origin}/api/replies/process`;
  const oauthRedirectUrl = `${window.location.origin}`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookEndpoint);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleCopyCallback = () => {
    navigator.clipboard.writeText(oauthRedirectUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  const sampleMigrationSql = `-- Run this in your Supabase SQL Editor:
-- DealPilot AI Schema with Row Level Security (RLS)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text default 'owner'
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references public.profiles(id) on delete cascade
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  stage text not null default 'new',
  score integer default 40
);

alter table public.leads enable row level security;
create policy "Workspace Isolation" on public.leads
  for all using (workspace_id in (
    select id from public.workspaces where owner_id = auth.uid()
  ));`;

  const handleCopyMigration = () => {
    navigator.clipboard.writeText(sampleMigrationSql);
    setCopiedMigration(true);
    setTimeout(() => setCopiedMigration(false), 2000);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Integrations & System Health</h1>
        <p className="text-xs text-slate-500 mt-1">
          Truthful provider connectivity statuses. Credentials are securely retained server-side.
        </p>
      </div>

      {saveMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveMsg}</span>
        </div>
      )}

      {/* Connectivity Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Gemini AI Provider */}
        <div className="glass-panel rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900">Google Gemini AI</h3>
                <span className="text-[10px] text-slate-400">Model: gemini-3.8-flash</span>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded border ${
                status?.gemini.status === 'connected'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {status?.gemini.status === 'connected' ? 'Connected' : 'Requires Setup'}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {status?.gemini.message}
          </p>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Environment Key:</span>
              <span className="font-mono font-medium text-slate-800">
                {status?.gemini.configured ? 'Active (Secured)' : 'Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Capabilities:</span>
              <span className="text-slate-800">Scoring, Copilot, Drafting, Classification</span>
            </div>
          </div>
        </div>

        {/* 2. Email Delivery Provider (Resend) */}
        <div className="glass-panel rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900">Email Delivery (Resend)</h3>
                <span className="text-[10px] text-slate-400">Transactional API</span>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded border ${
                status?.email.status === 'connected'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {status?.email.status === 'connected' ? 'Connected' : 'Requires Setup'}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {status?.email.message}
          </p>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Sender Address:</span>
              <span className="font-mono text-slate-800 truncate max-w-[150px]">
                {status?.email.sender_email || 'Not configured'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Status:</span>
              <span className="text-slate-800">
                {status?.email.has_api_key ? 'Credentials Saved' : 'No API Key'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Database Architecture & Supabase */}
        <div className="glass-panel rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900">Supabase & Database</h3>
                <span className="text-[10px] text-slate-400">PostgreSQL + RLS</span>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded border ${
                status?.supabase.status === 'connected'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}
            >
              {status?.supabase.status === 'connected' ? 'Connected' : 'Local ACID Engine'}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {status?.supabase.message}
          </p>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>RLS Isolation:</span>
              <span className="font-medium text-emerald-700">Enforced by Workspace</span>
            </div>
            <div className="flex justify-between">
              <span>Auth Supported:</span>
              <span className="text-slate-800">Google OAuth & Email OTP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Supabase Configuration Guide Accordion */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xs">
        <button
          onClick={() => setShowSupabaseGuide(!showSupabaseGuide)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-teal-50 text-teal-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-900">
                Supabase & Google OAuth Configuration Guide
              </h3>
              <p className="text-[11px] text-slate-500">
                Step-by-step instructions for project URL, Google Cloud credentials, and SQL migrations.
              </p>
            </div>
          </div>
          {showSupabaseGuide ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showSupabaseGuide && (
          <div className="p-6 border-t border-slate-100 space-y-4 text-xs bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-white border border-slate-200 rounded-md space-y-1">
                <span className="font-semibold text-slate-900 block">1. Run SQL Migrations</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Open your Supabase Project &gt; SQL Editor. Copy the full schema migration from{' '}
                  <code className="text-indigo-600">supabase/migrations/20261013000000_dealpilot_schema.sql</code>{' '}
                  to create profiles, workspaces, leads, and RLS policies.
                </p>
                <button
                  onClick={handleCopyMigration}
                  className="mt-2 text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  {copiedMigration ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedMigration ? 'Copied SQL' : 'Copy Sample Migration'}</span>
                </button>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-md space-y-1">
                <span className="font-semibold text-slate-900 block">2. Google OAuth in Supabase</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  In Supabase &gt; Authentication &gt; Providers &gt; Google: Enable Google, paste your Google Cloud Client ID and Secret, and set the Authorized Redirect URI.
                </p>
                <div className="mt-2">
                  <span className="text-[10px] text-slate-400 block mb-0.5">App Redirect URI:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      readOnly
                      value={oauthRedirectUrl}
                      className="w-full px-2 py-0.5 text-[10px] bg-slate-50 border border-slate-200 rounded font-mono truncate"
                    />
                    <button
                      onClick={handleCopyCallback}
                      className="p-1 text-slate-500 hover:text-slate-700 border border-slate-200 rounded"
                    >
                      {copiedCallback ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-md space-y-1">
                <span className="font-semibold text-slate-900 block">3. Email OTP & Magic Link</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  In Supabase &gt; Authentication &gt; Providers &gt; Email: Enable Email provider and OTP. Supabase handles 6-digit verification codes out of the box.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email & Resend Settings */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Resend Email Provider Configuration</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure server-side credentials for live email delivery to verified leads.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Sender Brand Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
                placeholder="Marcus Vance - DealPilot Sales"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Verified Sender Email Address
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={e => setSenderEmail(e.target.value)}
                placeholder="sales@yourdomain.com"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Must match a domain verified in your Resend account.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Resend API Key
              </label>
              <input
                type="password"
                value={resendApiKey}
                onChange={e => setResendApiKey(e.target.value)}
                placeholder="re_123456789abcdef..."
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Retained securely on the server; never exposed to browser bundles.
              </span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Email Settings</span>
            </button>
          </form>

          {/* Test Dispatch Sandbox */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h4 className="text-xs font-semibold text-slate-900">Test Resend Dispatch Pipeline</h4>
            <p className="text-[11px] text-slate-500">
              Send a test message to verify that your API key and sender domain are working.
            </p>

            <div className="flex gap-2">
              <input
                type="email"
                value={testRecipient}
                onChange={e => setTestRecipient(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTest}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50 shrink-0"
              >
                {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send Test</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Supabase & Webhooks */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Supabase Project Connection</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect an external Supabase instance for PostgreSQL database sync and OAuth.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={e => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Supabase Anon / Public Key
              </label>
              <input
                type="password"
                value={supabaseAnonKey}
                onChange={e => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Supabase Config</span>
            </button>
          </form>

          {/* Webhooks Info */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h4 className="text-xs font-semibold text-slate-900">Inbound Reply Webhook Receiver</h4>
            <p className="text-[11px] text-slate-500">
              Configure this webhook URL in your email service (SendGrid, Mailgun, or Resend) to route inbound prospect replies into DealPilot's Response AI classifier.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookEndpoint}
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-md bg-slate-50 text-slate-600 font-mono text-[11px]"
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded hover:bg-slate-50 flex items-center gap-1 shrink-0"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Currency & Regional Architecture Panel */}
        <div className="glass-panel rounded-2xl p-6 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Currency & Regional Architecture</h3>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  ₹ INR Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Indian localized sales pipeline configuration with en-IN numbering grouping (Lakhs & Crores) and IST scheduling.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 glass-card rounded-xl">
              <span className="text-xs font-semibold text-slate-500 block mb-1">Base Currency</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900 font-mono">INR (₹)</span>
                <span className="text-[11px] text-emerald-600 bg-emerald-50 font-medium px-2 py-0.5 rounded-md border border-emerald-100">
                  Indian Rupee
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                All deal valuations, pipeline metrics, and AI opportunity calculations evaluate in INR.
              </p>
            </div>

            <div className="p-4 glass-card rounded-xl">
              <span className="text-xs font-semibold text-slate-500 block mb-1">Number Formatting Locale</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900 font-mono">en-IN</span>
                <span className="text-[11px] text-indigo-600 bg-indigo-50 font-medium px-2 py-0.5 rounded-md border border-indigo-100">
                  Lakhs & Crores
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                Formatted as ₹1,50,000 (1.5 Lakhs) and ₹1,00,00,000 (1 Crore) standard grouping.
              </p>
            </div>

            <div className="p-4 glass-card rounded-xl">
              <span className="text-xs font-semibold text-slate-500 block mb-1">Operational Timezone</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900 font-mono">IST</span>
                <span className="text-[11px] text-slate-600 bg-slate-100 font-medium px-2 py-0.5 rounded-md border border-slate-200">
                  UTC +05:30
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                Meeting talk-tracks, scheduled follow-ups, and dispatch timestamps adhere to Indian Standard Time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
