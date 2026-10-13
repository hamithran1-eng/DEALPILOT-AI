export type PipelineStage = 
  | 'new'
  | 'qualified'
  | 'contacted'
  | 'engaged'
  | 'meeting_scheduled'
  | 'proposal'
  | 'won'
  | 'lost';

export interface LeadScoreFactor {
  name: string;
  score: number;
  weight: number;
  reasoning: string;
}

export interface Lead {
  id: string;
  workspace_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  job_title?: string;
  company_name?: string;
  company_domain?: string;
  industry?: string;
  company_size?: string;
  deal_value?: number;
  stage: PipelineStage;
  status: 'active' | 'nurturing' | 'unresponsive' | 'disqualified';
  source?: string;
  score: number;
  score_explanation?: string;
  score_factors?: LeadScoreFactor[];
  scored_at?: string;
  scoring_model?: string;
  notes?: string;
  last_contacted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadStageHistory {
  id: string;
  workspace_id: string;
  lead_id: string;
  from_stage: PipelineStage;
  to_stage: PipelineStage;
  reason?: string;
  changed_by: string;
  created_at: string;
}

export interface OutreachTemplate {
  id: string;
  workspace_id: string;
  name: string;
  subject_template: string;
  body_template: string;
  category: 'cold_outreach' | 'follow_up' | 'breakup' | 'meeting_request';
  created_at: string;
}

export interface OutreachDraft {
  id: string;
  workspace_id: string;
  lead_id: string;
  subject: string;
  body: string;
  ai_prompt_used?: string;
  status: 'draft' | 'approved' | 'rejected' | 'sent';
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OutreachMessage {
  id: string;
  workspace_id: string;
  lead_id: string;
  draft_id?: string;
  to_email: string;
  from_email: string;
  subject: string;
  body: string;
  provider: string;
  provider_message_id?: string;
  status: 'sent' | 'delivered' | 'bounced' | 'failed';
  error_message?: string;
  sent_at: string;
}

export type ReplyCategory = 
  | 'interested'
  | 'meeting_request'
  | 'question'
  | 'objection'
  | 'follow_up_later'
  | 'not_interested'
  | 'out_of_office'
  | 'unsubscribe'
  | 'unknown';

export interface ReplyClassification {
  id: string;
  workspace_id: string;
  lead_id: string;
  message_id?: string;
  inbound_text: string;
  sender_email: string;
  category: ReplyCategory;
  confidence: number;
  explanation: string;
  recommended_action: string;
  human_reviewed: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  workspace_id: string;
  lead_id?: string;
  title: string;
  description?: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'completed' | 'cancelled';
  completed_at?: string;
  created_at: string;
}

export interface SuppressionEntry {
  id: string;
  workspace_id: string;
  email: string;
  reason: 'unsubscribed' | 'hard_bounce' | 'complaint' | 'manual';
  added_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'sales_rep';
}

export interface WorkspaceSettings {
  ai_scoring_auto: boolean;
  ai_model: string;
  sender_email: string;
  sender_name: string;
  email_provider: 'resend' | 'smtp' | 'sendgrid';
  resend_api_key?: string;
  supabase_connected?: boolean;
  supabase_url?: string;
  supabase_anon_key?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  currency: string;
  settings: WorkspaceSettings;
  created_at: string;
}

export interface Notification {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface DashboardMetrics {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  contactedLeads: number;
  meetingScheduled: number;
  wonLeads: number;
  pipelineValue: number;
  wonValue: number;
  totalDrafts: number;
  approvedDrafts: number;
  sentMessages: number;
  totalReplies: number;
  positiveReplies: number;
  replyRate: number;
  positiveRate: number;
  winRate: number;
  tasksDueToday: number;
  tasksOverdue: number;
  pendingTasksCount: number;
  stageDistribution: Array<{ stage: PipelineStage; label: string; count: number }>;
  leadTrends: Array<{ date: string; count: number }>;
}

export interface IntegrationStatus {
  gemini: {
    status: 'connected' | 'requires_setup';
    model: string;
    configured: boolean;
    message: string;
  };
  email: {
    provider: string;
    status: 'connected' | 'requires_setup';
    sender_email: string;
    sender_name: string;
    has_api_key: boolean;
    message: string;
  };
  supabase: {
    status: 'connected' | 'not_configured';
    url: string;
    message: string;
  };
}
