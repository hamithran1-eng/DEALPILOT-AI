import {
  Lead,
  LeadStageHistory,
  OutreachTemplate,
  OutreachDraft,
  OutreachMessage,
  ReplyClassification,
  Task,
  SuppressionEntry,
  DashboardMetrics,
  IntegrationStatus,
  Notification,
  AuditLog,
  Workspace,
  User,
  PipelineStage,
} from '../types';

const TOKEN_KEY = 'dealpilot_auth_token';

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  register: (data: { email: string; password: string; name: string; workspaceName?: string }) =>
    request<{ token: string; user: User; workspace: Workspace }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User; workspace: Workspace }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => request<{ user: User; workspace: Workspace }>('/api/auth/me'),

  logout: () => request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),

  // Workspace
  getWorkspace: () => request<{ workspace: Workspace }>('/api/workspaces/current'),
  updateWorkspace: (data: Partial<Workspace>) =>
    request<{ workspace: Workspace }>('/api/workspaces/current', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getIntegrationsStatus: () => request<IntegrationStatus>('/api/integrations/status'),

  // Leads
  getLeads: (params?: { stage?: string; status?: string; search?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<{ leads: Lead[] }>(`/api/leads${q ? `?${q}` : ''}`);
  },

  getLeadById: (id: string) =>
    request<{
      lead: Lead;
      stageHistory: LeadStageHistory[];
      drafts: OutreachDraft[];
      tasks: Task[];
      replies: ReplyClassification[];
    }>(`/api/leads/${id}`),

  createLead: (lead: Partial<Lead>) =>
    request<{ lead: Lead }>('/api/leads', {
      method: 'POST',
      body: JSON.stringify(lead),
    }),

  updateLead: (id: string, updates: Partial<Lead>) =>
    request<{ lead: Lead }>(`/api/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteLead: (id: string) =>
    request<{ success: boolean }>(`/api/leads/${id}`, {
      method: 'DELETE',
    }),

  bulkUpdateStage: (leadIds: string[], stage: PipelineStage) =>
    request<{ success: boolean; updated_count: number }>('/api/leads/bulk-stage', {
      method: 'POST',
      body: JSON.stringify({ lead_ids: leadIds, stage }),
    }),

  importCsv: (rows: any[]) =>
    request<{ success: boolean; total_processed: number; imported: number; duplicates: number; errors: number }>(
      '/api/leads/import-csv',
      {
        method: 'POST',
        body: JSON.stringify({ rows }),
      }
    ),

  getExportCsvUrl: () => '/api/leads/export-csv',

  // Scoring
  scoreLead: (id: string) =>
    request<{ lead: Lead; result: any }>(`/api/leads/${id}/score`, {
      method: 'POST',
    }),

  // Copilot
  copilotChat: (message: string, leadId?: string) =>
    request<{ answer: string }>('/api/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({ message, lead_id: leadId }),
    }),

  // Outreach
  getTemplates: () => request<{ templates: OutreachTemplate[] }>('/api/outreach/templates'),
  createTemplate: (template: Partial<OutreachTemplate>) =>
    request<{ template: OutreachTemplate }>('/api/outreach/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    }),

  getDrafts: (leadId?: string) =>
    request<{ drafts: OutreachDraft[] }>(`/api/outreach/drafts${leadId ? `?lead_id=${leadId}` : ''}`),

  generateDraft: (data: {
    lead_id: string;
    instructions?: string;
    template_subject?: string;
    template_body?: string;
  }) =>
    request<{ draft: OutreachDraft }>('/api/outreach/generate-draft', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDraft: (id: string, data: { subject: string; body: string }) =>
    request<{ draft: OutreachDraft }>(`/api/outreach/drafts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  approveDraft: (id: string) =>
    request<{ draft: OutreachDraft }>(`/api/outreach/drafts/${id}/approve`, {
      method: 'POST',
    }),

  sendDraft: (id: string) =>
    request<{ success: boolean; messageId: string; status: string }>(`/api/outreach/drafts/${id}/send`, {
      method: 'POST',
    }),

  getSentMessages: () => request<{ messages: OutreachMessage[] }>('/api/outreach/messages'),

  // Replies
  getReplies: (leadId?: string) =>
    request<{ replies: ReplyClassification[] }>(`/api/replies${leadId ? `?lead_id=${leadId}` : ''}`),

  processReply: (data: { lead_id: string; reply_text: string; sender_email?: string }) =>
    request<{ reply: ReplyClassification }>('/api/replies/process', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reviewReply: (id: string) =>
    request<{ reply: ReplyClassification }>(`/api/replies/${id}/review`, {
      method: 'POST',
    }),

  // Tasks
  getTasks: (leadId?: string) =>
    request<{ tasks: Task[] }>(`/api/tasks${leadId ? `?lead_id=${leadId}` : ''}`),

  createTask: (task: Partial<Task>) =>
    request<{ task: Task }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    }),

  updateTask: (id: string, updates: Partial<Task>) =>
    request<{ task: Task }>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  toggleTask: (id: string) =>
    request<{ task: Task }>(`/api/tasks/${id}/toggle`, {
      method: 'POST',
    }),

  deleteTask: (id: string) =>
    request<{ success: boolean }>(`/api/tasks/${id}`, {
      method: 'DELETE',
    }),

  // Suppression
  getSuppressionList: () => request<{ list: SuppressionEntry[] }>('/api/suppression'),
  addSuppression: (email: string, reason?: string) =>
    request<{ entry: SuppressionEntry }>('/api/suppression', {
      method: 'POST',
      body: JSON.stringify({ email, reason }),
    }),
  removeSuppression: (id: string) =>
    request<{ success: boolean }>(`/api/suppression/${id}`, {
      method: 'DELETE',
    }),

  // Analytics
  getDashboardMetrics: () => request<{ metrics: DashboardMetrics }>('/api/analytics/dashboard'),

  // Notifications & Audit
  getNotifications: () => request<{ notifications: Notification[] }>('/api/notifications'),
  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'POST',
    }),
  getAuditLogs: () => request<{ logs: AuditLog[] }>('/api/audit-logs'),
  testEmail: (recipientEmail?: string) =>
    request<{ success: boolean; messageId: string; status: string }>('/api/integrations/test-email', {
      method: 'POST',
      body: JSON.stringify({ recipient_email: recipientEmail }),
    }),
};
