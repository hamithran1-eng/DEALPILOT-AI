import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'sales_rep';
  avatar_url?: string;
  password_hash: string;
  created_at: string;
}

export interface Session {
  token: string;
  user_id: string;
  expires_at: string;
  created_at: string;
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

export interface LeadScoreFactor {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  reasoning: string;
}

export type PipelineStage = 
  | 'new'
  | 'qualified'
  | 'contacted'
  | 'engaged'
  | 'meeting_scheduled'
  | 'proposal'
  | 'won'
  | 'lost';

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
  score: number; // 0-100
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

interface DatabaseSchema {
  version: number;
  users: User[];
  sessions: Session[];
  workspaces: Workspace[];
  leads: Lead[];
  lead_stage_history: LeadStageHistory[];
  outreach_templates: OutreachTemplate[];
  outreach_drafts: OutreachDraft[];
  outreach_messages: OutreachMessage[];
  reply_classifications: ReplyClassification[];
  tasks: Task[];
  suppression_list: SuppressionEntry[];
  notifications: Notification[];
  audit_logs: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'dealpilot_data.json');

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('Failed to parse database file, initializing fresh database:', err);
      }
    }

    const initial: DatabaseSchema = {
      version: 1,
      users: [],
      sessions: [],
      workspaces: [],
      leads: [],
      lead_stage_history: [],
      outreach_templates: [],
      outreach_drafts: [],
      outreach_messages: [],
      reply_classifications: [],
      tasks: [],
      suppression_list: [],
      notifications: [],
      audit_logs: [],
    };

    this.saveData(initial);
    return initial;
  }

  private saveData(data: DatabaseSchema) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  private persist() {
    this.saveData(this.data);
  }

  // --- Utility ---
  public generateId(): string {
    return crypto.randomUUID();
  }

  // --- Users & Sessions ---
  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public createUser(user: Omit<User, 'id' | 'created_at'>): User {
    const newUser: User = {
      ...user,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.persist();
    return newUser;
  }

  public createSession(userId: string): Session {
    // 30 day session
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const session: Session = {
      token: crypto.randomBytes(32).toString('hex'),
      user_id: userId,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };
    this.data.sessions.push(session);
    this.persist();
    return session;
  }

  public getSession(token: string): Session | undefined {
    const session = this.data.sessions.find(s => s.token === token);
    if (!session) return undefined;
    if (new Date(session.expires_at) < new Date()) {
      this.deleteSession(token);
      return undefined;
    }
    return session;
  }

  public deleteSession(token: string): void {
    this.data.sessions = this.data.sessions.filter(s => s.token !== token);
    this.persist();
  }

  // --- Workspaces ---
  public getWorkspace(id: string): Workspace | undefined {
    return this.data.workspaces.find(w => w.id === id);
  }

  public getWorkspaceForUser(userId: string): Workspace | undefined {
    return this.data.workspaces.find(w => w.owner_id === userId);
  }

  public createWorkspace(name: string, ownerId: string): Workspace {
    const id = this.generateId();
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const ws: Workspace = {
      id,
      name,
      slug,
      owner_id: ownerId,
      currency: 'INR',
      settings: {
        ai_scoring_auto: true,
        ai_model: 'gemini-3.8-flash',
        sender_email: '',
        sender_name: name,
        email_provider: 'resend',
      },
      created_at: new Date().toISOString(),
    };
    this.data.workspaces.push(ws);

    // Seed default standard B2B outreach templates for the workspace
    this.seedDefaultTemplates(id);

    this.persist();
    return ws;
  }

  public updateWorkspaceSettings(id: string, settings: Partial<WorkspaceSettings>): Workspace | undefined {
    const ws = this.data.workspaces.find(w => w.id === id);
    if (!ws) return undefined;
    ws.settings = { ...ws.settings, ...settings };
    this.persist();
    return ws;
  }

  public seedDefaultTemplates(workspaceId: string) {
    const defaults: Omit<OutreachTemplate, 'id' | 'created_at'>[] = [
      {
        workspace_id: workspaceId,
        name: 'Executive Value Proposition',
        category: 'cold_outreach',
        subject_template: 'Quick question regarding {{company_name}}\'s sales pipeline',
        body_template: 'Hi {{first_name}},\n\nI noticed your work leading initiatives at {{company_name}}. We built DealPilot to help B2B revenue teams automate deal prioritization and high-intent engagement without manual overhead.\n\nWould you be open to a 10-minute briefing next Tuesday at 3:00 PM IST to see how peers in {{industry}} are scaling their pipeline?\n\nBest regards,\n{{sender_name}}',
      },
      {
        workspace_id: workspaceId,
        name: 'Strategic Follow-Up',
        category: 'follow_up',
        subject_template: 'Following up: DealPilot AI for {{company_name}}',
        body_template: 'Hi {{first_name}},\n\nCircling back on my previous note. Thought this might be top of mind given {{company_name}}\'s growth in {{industry}}.\n\nDo you have 5 minutes this week for a quick perspective exchange over call?\n\nBest,\n{{sender_name}}',
      },
      {
        workspace_id: workspaceId,
        name: 'Meeting Confirmation & Talk-Track',
        category: 'meeting_request',
        subject_template: 'Meeting confirmed: {{company_name}} x DealPilot briefing (IST)',
        body_template: 'Hi {{first_name}},\n\nLooking forward to speaking. I have prepared custom benchmarks for organizations in {{industry}} and look forward to sharing our latest automation playbooks.\n\nTalk soon,\n{{sender_name}}',
      },
    ];

    for (const t of defaults) {
      this.data.outreach_templates.push({
        ...t,
        id: this.generateId(),
        created_at: new Date().toISOString(),
      });
    }
  }

  // --- Leads CRM ---
  public getLeads(workspaceId: string, filter?: { stage?: string; search?: string; status?: string }): Lead[] {
    let list = this.data.leads.filter(l => l.workspace_id === workspaceId);
    if (filter?.stage && filter.stage !== 'all') {
      list = list.filter(l => l.stage === filter.stage);
    }
    if (filter?.status && filter.status !== 'all') {
      list = list.filter(l => l.status === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(l => 
        l.first_name.toLowerCase().includes(q) ||
        l.last_name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.company_name && l.company_name.toLowerCase().includes(q)) ||
        (l.job_title && l.job_title.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getLeadById(id: string, workspaceId: string): Lead | undefined {
    return this.data.leads.find(l => l.id === id && l.workspace_id === workspaceId);
  }

  public findLeadByEmail(email: string, workspaceId: string): Lead | undefined {
    return this.data.leads.find(l => l.workspace_id === workspaceId && l.email.toLowerCase() === email.toLowerCase());
  }

  public createLead(leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Lead {
    const id = this.generateId();
    const now = new Date().toISOString();
    const newLead: Lead = {
      ...leadData,
      id,
      created_at: now,
      updated_at: now,
    };
    this.data.leads.push(newLead);

    // Record initial stage history
    this.data.lead_stage_history.push({
      id: this.generateId(),
      workspace_id: newLead.workspace_id,
      lead_id: id,
      from_stage: newLead.stage,
      to_stage: newLead.stage,
      reason: 'Lead created',
      changed_by: 'system',
      created_at: now,
    });

    this.persist();
    return newLead;
  }

  public updateLead(id: string, workspaceId: string, updates: Partial<Lead>, changedBy = 'user'): Lead | undefined {
    const lead = this.getLeadById(id, workspaceId);
    if (!lead) return undefined;

    const oldStage = lead.stage;
    Object.assign(lead, updates, { updated_at: new Date().toISOString() });

    if (updates.stage && updates.stage !== oldStage) {
      this.data.lead_stage_history.push({
        id: this.generateId(),
        workspace_id: workspaceId,
        lead_id: id,
        from_stage: oldStage,
        to_stage: updates.stage,
        reason: 'Stage updated via CRM',
        changed_by: changedBy,
        created_at: new Date().toISOString(),
      });
    }

    this.persist();
    return lead;
  }

  public deleteLead(id: string, workspaceId: string): boolean {
    const initialLen = this.data.leads.length;
    this.data.leads = this.data.leads.filter(l => !(l.id === id && l.workspace_id === workspaceId));
    if (this.data.leads.length !== initialLen) {
      // cascade related child records
      this.data.lead_stage_history = this.data.lead_stage_history.filter(h => h.lead_id !== id);
      this.data.outreach_drafts = this.data.outreach_drafts.filter(d => d.lead_id !== id);
      this.data.tasks = this.data.tasks.filter(t => t.lead_id !== id);
      this.data.reply_classifications = this.data.reply_classifications.filter(r => r.lead_id !== id);
      this.persist();
      return true;
    }
    return false;
  }

  public getLeadStageHistory(leadId: string, workspaceId: string): LeadStageHistory[] {
    return this.data.lead_stage_history
      .filter(h => h.lead_id === leadId && h.workspace_id === workspaceId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  // --- Outreach Templates ---
  public getOutreachTemplates(workspaceId: string): OutreachTemplate[] {
    return this.data.outreach_templates.filter(t => t.workspace_id === workspaceId);
  }

  public createOutreachTemplate(t: Omit<OutreachTemplate, 'id' | 'created_at'>): OutreachTemplate {
    const newT: OutreachTemplate = {
      ...t,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };
    this.data.outreach_templates.push(newT);
    this.persist();
    return newT;
  }

  // --- Outreach Drafts ---
  public getOutreachDrafts(workspaceId: string, leadId?: string): OutreachDraft[] {
    let list = this.data.outreach_drafts.filter(d => d.workspace_id === workspaceId);
    if (leadId) {
      list = list.filter(d => d.lead_id === leadId);
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getOutreachDraftById(id: string, workspaceId: string): OutreachDraft | undefined {
    return this.data.outreach_drafts.find(d => d.id === id && d.workspace_id === workspaceId);
  }

  public createOutreachDraft(draft: Omit<OutreachDraft, 'id' | 'created_at' | 'updated_at'>): OutreachDraft {
    const now = new Date().toISOString();
    const newD: OutreachDraft = {
      ...draft,
      id: this.generateId(),
      created_at: now,
      updated_at: now,
    };
    this.data.outreach_drafts.push(newD);
    this.persist();
    return newD;
  }

  public updateOutreachDraft(id: string, workspaceId: string, updates: Partial<OutreachDraft>): OutreachDraft | undefined {
    const draft = this.getOutreachDraftById(id, workspaceId);
    if (!draft) return undefined;
    Object.assign(draft, updates, { updated_at: new Date().toISOString() });
    this.persist();
    return draft;
  }

  // --- Outreach Messages (Sent) ---
  public createOutreachMessage(msg: Omit<OutreachMessage, 'id'>): OutreachMessage {
    const newMsg: OutreachMessage = {
      ...msg,
      id: this.generateId(),
    };
    this.data.outreach_messages.push(newMsg);
    this.persist();
    return newMsg;
  }

  public getOutreachMessages(workspaceId: string): OutreachMessage[] {
    return this.data.outreach_messages
      .filter(m => m.workspace_id === workspaceId)
      .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
  }

  // --- Reply Classifications ---
  public createReplyClassification(reply: Omit<ReplyClassification, 'id' | 'created_at'>): ReplyClassification {
    const newR: ReplyClassification = {
      ...reply,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };
    this.data.reply_classifications.push(newR);
    this.persist();
    return newR;
  }

  public getReplyClassifications(workspaceId: string, leadId?: string): ReplyClassification[] {
    let list = this.data.reply_classifications.filter(r => r.workspace_id === workspaceId);
    if (leadId) {
      list = list.filter(r => r.lead_id === leadId);
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public updateReplyClassification(id: string, workspaceId: string, updates: Partial<ReplyClassification>): ReplyClassification | undefined {
    const r = this.data.reply_classifications.find(item => item.id === id && item.workspace_id === workspaceId);
    if (!r) return undefined;
    Object.assign(r, updates);
    this.persist();
    return r;
  }

  // --- Tasks ---
  public getTasks(workspaceId: string, leadId?: string): Task[] {
    let list = this.data.tasks.filter(t => t.workspace_id === workspaceId);
    if (leadId) {
      list = list.filter(t => t.lead_id === leadId);
    }
    return list.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }

  public createTask(task: Omit<Task, 'id' | 'created_at'>): Task {
    const newT: Task = {
      ...task,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };
    this.data.tasks.push(newT);
    this.persist();
    return newT;
  }

  public updateTask(id: string, workspaceId: string, updates: Partial<Task>): Task | undefined {
    const task = this.data.tasks.find(t => t.id === id && t.workspace_id === workspaceId);
    if (!task) return undefined;
    Object.assign(task, updates);
    this.persist();
    return task;
  }

  public deleteTask(id: string, workspaceId: string): boolean {
    const init = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter(t => !(t.id === id && t.workspace_id === workspaceId));
    if (this.data.tasks.length !== init) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Suppression List ---
  public isEmailSuppressed(workspaceId: string, email: string): boolean {
    const normalized = email.toLowerCase().trim();
    return this.data.suppression_list.some(s => s.workspace_id === workspaceId && s.email.toLowerCase() === normalized);
  }

  public getSuppressionList(workspaceId: string): SuppressionEntry[] {
    return this.data.suppression_list
      .filter(s => s.workspace_id === workspaceId)
      .sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
  }

  public addSuppression(workspaceId: string, email: string, reason: SuppressionEntry['reason']): SuppressionEntry {
    const normalized = email.toLowerCase().trim();
    const existing = this.data.suppression_list.find(s => s.workspace_id === workspaceId && s.email === normalized);
    if (existing) return existing;

    const entry: SuppressionEntry = {
      id: this.generateId(),
      workspace_id: workspaceId,
      email: normalized,
      reason,
      added_at: new Date().toISOString(),
    };
    this.data.suppression_list.push(entry);
    this.persist();
    return entry;
  }

  public removeSuppression(workspaceId: string, id: string): boolean {
    const init = this.data.suppression_list.length;
    this.data.suppression_list = this.data.suppression_list.filter(s => !(s.id === id && s.workspace_id === workspaceId));
    if (this.data.suppression_list.length !== init) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Notifications ---
  public getNotifications(workspaceId: string, userId: string): Notification[] {
    return this.data.notifications
      .filter(n => n.workspace_id === workspaceId && n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addNotification(notification: Omit<Notification, 'id' | 'created_at' | 'read'>): Notification {
    const newN: Notification = {
      ...notification,
      id: this.generateId(),
      read: false,
      created_at: new Date().toISOString(),
    };
    this.data.notifications.push(newN);
    this.persist();
    return newN;
  }

  public markNotificationRead(id: string, workspaceId: string): void {
    const n = this.data.notifications.find(item => item.id === id && item.workspace_id === workspaceId);
    if (n) {
      n.read = true;
      this.persist();
    }
  }

  // --- Audit Logs ---
  public logAudit(log: Omit<AuditLog, 'id' | 'created_at'>): void {
    this.data.audit_logs.push({
      ...log,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    });
    this.persist();
  }

  public getAuditLogs(workspaceId: string, limit = 50): AuditLog[] {
    return this.data.audit_logs
      .filter(a => a.workspace_id === workspaceId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  // --- Real-Data Metrics Calculation ---
  public calculateDashboardMetrics(workspaceId: string) {
    const leads = this.data.leads.filter(l => l.workspace_id === workspaceId);
    const drafts = this.data.outreach_drafts.filter(d => d.workspace_id === workspaceId);
    const messages = this.data.outreach_messages.filter(m => m.workspace_id === workspaceId);
    const replies = this.data.reply_classifications.filter(r => r.workspace_id === workspaceId);
    const tasks = this.data.tasks.filter(t => t.workspace_id === workspaceId);

    const totalLeads = leads.length;
    const newLeads = leads.filter(l => l.stage === 'new').length;
    const qualifiedLeads = leads.filter(l => l.stage === 'qualified').length;
    const contactedLeads = leads.filter(l => l.stage === 'contacted').length;
    const engagedLeads = leads.filter(l => l.stage === 'engaged').length;
    const meetingScheduled = leads.filter(l => l.stage === 'meeting_scheduled').length;
    const proposalLeads = leads.filter(l => l.stage === 'proposal').length;
    const wonLeads = leads.filter(l => l.stage === 'won').length;
    const lostLeads = leads.filter(l => l.stage === 'lost').length;

    // Actual Opportunity Pipeline Value sum
    const pipelineValue = leads.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);
    const wonValue = leads.filter(l => l.stage === 'won').reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);

    const totalDrafts = drafts.length;
    const approvedDrafts = drafts.filter(d => d.status === 'approved').length;
    const sentMessages = messages.filter(m => m.status === 'sent' || m.status === 'delivered').length;
    const totalReplies = replies.length;
    const positiveReplies = replies.filter(r => r.category === 'interested' || r.category === 'meeting_request').length;

    // Real conversions
    const replyRate = sentMessages > 0 ? (totalReplies / sentMessages) * 100 : 0;
    const positiveRate = totalReplies > 0 ? (positiveReplies / totalReplies) * 100 : 0;
    const winRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

    // Follow-ups due
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const tasksDueToday = pendingTasks.filter(t => t.due_date.startsWith(todayStr)).length;
    const tasksOverdue = pendingTasks.filter(t => new Date(t.due_date) < now && !t.due_date.startsWith(todayStr)).length;

    // Pipeline Stage breakdown
    const stageDistribution = [
      { stage: 'new', label: 'New', count: newLeads },
      { stage: 'qualified', label: 'Qualified', count: qualifiedLeads },
      { stage: 'contacted', label: 'Contacted', count: contactedLeads },
      { stage: 'engaged', label: 'Engaged', count: engagedLeads },
      { stage: 'meeting_scheduled', label: 'Meeting', count: meetingScheduled },
      { stage: 'proposal', label: 'Proposal', count: proposalLeads },
      { stage: 'won', label: 'Won', count: wonLeads },
      { stage: 'lost', label: 'Lost', count: lostLeads },
    ];

    // Leads by creation date (last 7 days grouping)
    const dateCounts: Record<string, number> = {};
    for (const lead of leads) {
      const d = lead.created_at.split('T')[0];
      dateCounts[d] = (dateCounts[d] || 0) + 1;
    }

    const leadTrends = Object.entries(dateCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalLeads,
      newLeads,
      qualifiedLeads,
      contactedLeads,
      meetingScheduled,
      wonLeads,
      pipelineValue,
      wonValue,
      totalDrafts,
      approvedDrafts,
      sentMessages,
      totalReplies,
      positiveReplies,
      replyRate: Number(replyRate.toFixed(1)),
      positiveRate: Number(positiveRate.toFixed(1)),
      winRate: Number(winRate.toFixed(1)),
      tasksDueToday,
      tasksOverdue,
      pendingTasksCount: pendingTasks.length,
      stageDistribution,
      leadTrends,
    };
  }
}

export const db = new Database();
