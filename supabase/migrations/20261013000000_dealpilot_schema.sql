-- ==============================================================================
-- DEALPILOT AI — PRODUCTION SUPABASE POSTGRESQL SCHEMA WITH ROW LEVEL SECURITY
-- SYNESIS 2026 | Team CodeFusion
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Linked to Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text default 'owner' check (role in ('owner', 'admin', 'sales_rep')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. WORKSPACES (Multi-Tenant Org Isolation)
create table if not exists public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null,
  owner_id uuid references public.profiles(id) on delete cascade,
  currency text default 'USD',
  settings jsonb default '{"ai_scoring_auto": true, "ai_model": "gemini-3.8-flash", "email_provider": "resend", "sender_email": "", "sender_name": ""}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. WORKSPACE MEMBERS (Membership & Role-Based Access)
create table if not exists public.workspace_members (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz default now(),
  unique (workspace_id, user_id)
);

-- 4. LEADS (Core CRM Records)
create table if not exists public.leads (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  job_title text,
  company_name text,
  company_domain text,
  industry text,
  company_size text,
  deal_value numeric,
  stage text not null default 'new' check (stage in ('new', 'qualified', 'contacted', 'engaged', 'meeting_scheduled', 'proposal', 'won', 'lost')),
  status text not null default 'active' check (status in ('active', 'nurturing', 'unresponsive', 'disqualified')),
  source text default 'Manual Entry',
  score integer default 40 check (score between 0 and 100),
  score_explanation text,
  score_factors jsonb default '[]'::jsonb,
  scored_at timestamptz,
  scoring_model text,
  notes text,
  last_contacted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (workspace_id, email)
);

-- 5. LEAD STAGE HISTORY (Chronological Audit of Stage Transitions)
create table if not exists public.lead_stage_history (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_stage text not null,
  to_stage text not null,
  reason text,
  changed_by text not null default 'user',
  created_at timestamptz default now()
);

-- 6. OUTREACH TEMPLATES (Reusable Value Propositions)
create table if not exists public.outreach_templates (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  subject_template text not null,
  body_template text not null,
  category text not null check (category in ('cold_outreach', 'follow_up', 'breakup', 'meeting_request')),
  created_at timestamptz default now()
);

-- 7. OUTREACH DRAFTS (Grounded AI Copy Requiring Explicit Approval)
create table if not exists public.outreach_drafts (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  subject text not null,
  body text not null,
  ai_prompt_used text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'sent')),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 8. OUTREACH MESSAGES (Verified Provider Dispatch Records)
create table if not exists public.outreach_messages (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  draft_id uuid references public.outreach_drafts(id) on delete set null,
  to_email text not null,
  from_email text not null,
  subject text not null,
  body text not null,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null default 'sent' check (status in ('sent', 'delivered', 'bounced', 'failed')),
  error_message text,
  sent_at timestamptz default now()
);

-- 9. REPLY CLASSIFICATIONS (Inbound Intent & Sentiment Analysis)
create table if not exists public.reply_classifications (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  message_id text,
  inbound_text text not null,
  sender_email text not null,
  category text not null check (category in ('interested', 'meeting_request', 'question', 'objection', 'follow_up_later', 'not_interested', 'out_of_office', 'unsubscribe', 'unknown')),
  confidence numeric not null default 0.85,
  explanation text not null,
  recommended_action text not null,
  human_reviewed boolean default false,
  created_at timestamptz default now()
);

-- 10. TASKS (Daily Sales Cadence & Reminders)
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz not null,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- 11. SUPPRESSION LIST (Mandatory Opt-Out Safeguard)
create table if not exists public.suppression_list (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  reason text not null check (reason in ('unsubscribed', 'hard_bounce', 'complaint', 'manual')),
  added_at timestamptz default now(),
  unique (workspace_id, email)
);

-- 12. NOTIFICATIONS (Operational Alerts)
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'info' check (type in ('info', 'success', 'warning', 'alert')),
  read boolean default false,
  created_at timestamptz default now()
);

-- 13. AUDIT LOGS (Immutable Activity Ledger)
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb,
  created_at timestamptz default now()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
create index if not exists idx_leads_workspace on public.leads(workspace_id);
create index if not exists idx_leads_stage on public.leads(workspace_id, stage);
create index if not exists idx_leads_email on public.leads(workspace_id, email);
create index if not exists idx_tasks_due on public.tasks(workspace_id, due_date, status);
create index if not exists idx_suppression on public.suppression_list(workspace_id, email);
create index if not exists idx_drafts_workspace on public.outreach_drafts(workspace_id, status);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Helper function to check if current user is an authorized workspace member
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
  );
$$;

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.leads enable row level security;
alter table public.lead_stage_history enable row level security;
alter table public.outreach_templates enable row level security;
alter table public.outreach_drafts enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.reply_classifications enable row level security;
alter table public.tasks enable row level security;
alter table public.suppression_list enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- PROFILES Policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- WORKSPACES Policies
create policy "Members can view workspaces" on public.workspaces
  for select using (public.is_workspace_member(id));

create policy "Owners can update workspace" on public.workspaces
  for update using (owner_id = auth.uid());

-- WORKSPACE MEMBERS Policies
create policy "Members can view workspace membership" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

-- LEADS Policies (Strict Workspace Isolation)
create policy "Members can view leads" on public.leads
  for select using (public.is_workspace_member(workspace_id));

create policy "Members can insert leads" on public.leads
  for insert with check (public.is_workspace_member(workspace_id));

create policy "Members can update leads" on public.leads
  for update using (public.is_workspace_member(workspace_id));

create policy "Members can delete leads" on public.leads
  for delete using (public.is_workspace_member(workspace_id));

-- LEAD STAGE HISTORY Policies
create policy "Members can view stage history" on public.lead_stage_history
  for select using (public.is_workspace_member(workspace_id));

create policy "Members can record stage history" on public.lead_stage_history
  for insert with check (public.is_workspace_member(workspace_id));

-- OUTREACH TEMPLATES Policies
create policy "Members can view templates" on public.outreach_templates
  for select using (public.is_workspace_member(workspace_id));

create policy "Members can manage templates" on public.outreach_templates
  for all using (public.is_workspace_member(workspace_id));

-- OUTREACH DRAFTS Policies
create policy "Members can view drafts" on public.outreach_drafts
  for select using (public.is_workspace_member(workspace_id));

create policy "Members can manage drafts" on public.outreach_drafts
  for all using (public.is_workspace_member(workspace_id));

-- OUTREACH MESSAGES Policies
create policy "Members can view sent messages" on public.outreach_messages
  for select using (public.is_workspace_member(workspace_id));

create policy "Members can log sent messages" on public.outreach_messages
  for insert with check (public.is_workspace_member(workspace_id));

-- REPLY CLASSIFICATIONS Policies
create policy "Members can view replies" on public.reply_classifications
  for select using (public.is_workspace_member(workspace_id));

create policy "Members can manage replies" on public.reply_classifications
  for all using (public.is_workspace_member(workspace_id));

-- TASKS Policies
create policy "Members can view tasks" on public.tasks
  for select using (public.is_workspace_member(workspace_id));

create policy "Members can manage tasks" on public.tasks
  for all using (public.is_workspace_member(workspace_id));

-- SUPPRESSION LIST Policies
create policy "Members can view suppression list" on public.suppression_list
  for select using (public.is_workspace_member(workspace_id));

create policy "Members can manage suppression list" on public.suppression_list
  for all using (public.is_workspace_member(workspace_id));

-- NOTIFICATIONS Policies
create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

-- AUDIT LOGS Policies
create policy "Members can view audit logs" on public.audit_logs
  for select using (public.is_workspace_member(workspace_id));

-- ==============================================================================
-- AUTOMATIC USER PROVISIONING TRIGGER (auth.users -> public.profiles + workspace)
-- ==============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  new_ws_id uuid;
  user_full_name text;
begin
  user_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  -- 1. Create Profile
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, user_full_name, 'owner');

  -- 2. Create Default Workspace
  insert into public.workspaces (name, slug, owner_id)
  values (
    user_full_name || '''s Sales Org',
    lower(regexp_replace(user_full_name, '[^a-zA-Z0-9]', '-', 'g')) || '-sales',
    new.id
  )
  returning id into new_ws_id;

  -- 3. Add as Workspace Member
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_ws_id, new.id, 'owner');

  -- 4. Seed Standard B2B Outreach Templates
  insert into public.outreach_templates (workspace_id, name, subject_template, body_template, category)
  values
    (new_ws_id, 'Executive Value Proposition', 'Quick question regarding {{company_name}}''s sales pipeline', 'Hi {{first_name}},\n\nI noticed your work leading initiatives at {{company_name}}. We built DealPilot to help B2B revenue teams automate deal prioritization and high-intent engagement without manual overhead.\n\nWould you be open to a 10-minute briefing next Tuesday to see how peers in {{industry}} are scaling their pipeline?\n\nBest regards,\n{{sender_name}}', 'cold_outreach'),
    (new_ws_id, 'Strategic Follow-Up', 'Following up: DealPilot AI for {{company_name}}', 'Hi {{first_name}},\n\nCircling back on my previous note. Thought this might be top of mind given {{company_name}}''s growth in {{industry}}.\n\nDo you have 5 minutes this week for a quick perspective exchange?\n\nBest,\n{{sender_name}}', 'follow_up');

  return new;
end;
$$;

-- Trigger execution on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
