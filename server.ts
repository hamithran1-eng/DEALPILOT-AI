import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db, User, Workspace, Lead, PipelineStage, ReplyCategory } from './server/db.js';
import {
  scoreLeadWithGemini,
  generateOutreachDraftWithGemini,
  classifyInboundReplyWithGemini,
  copilotChatWithGemini,
  isGeminiConfigured,
} from './server/gemini.js';
import { sendOutreachEmail, sendTestEmail } from './server/email.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// --- Authentication Middleware ---
interface AuthenticatedRequest extends Request {
  user?: User;
  workspace?: Workspace;
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const session = db.getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }

  const user = db.getUserById(session.user_id);
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  const workspace = db.getWorkspaceForUser(user.id);
  req.user = user;
  req.workspace = workspace;
  next();
}

// ==========================================
// 1. AUTHENTICATION & ONBOARDING ROUTES
// ==========================================

// Register new account (strictly starts with empty workspace)
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { email, password, name, workspaceName } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and full name are required.' });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  // Create real user
  const user = db.createUser({
    email,
    name,
    role: 'owner',
    password_hash: password, // For simplicity in this environment
  });

  // Create initial empty workspace
  const ws = db.createWorkspace(workspaceName || `${name}'s Sales Org`, user.id);

  // Generate real session
  const session = db.createSession(user.id);

  // Audit log
  db.logAudit({
    workspace_id: ws.id,
    user_id: user.id,
    action: 'account_created',
    entity_type: 'user',
    entity_id: user.id,
  });

  return res.status(201).json({
    token: session.token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    workspace: ws,
  });
});

// Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.getUserByEmail(email);
  if (!user || user.password_hash !== password) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  let ws = db.getWorkspaceForUser(user.id);
  if (!ws) {
    ws = db.createWorkspace(`${user.name}'s Sales Org`, user.id);
  }

  const session = db.createSession(user.id);

  return res.json({
    token: session.token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    workspace: ws,
  });
});

// Current user & workspace info
app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    user: {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      role: req.user!.role,
    },
    workspace: req.workspace,
  });
});

// Logout
app.post('/api/auth/logout', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.slice(7);
  if (token) {
    db.deleteSession(token);
  }
  return res.json({ success: true });
});

// ==========================================
// 2. WORKSPACE SETTINGS & INTEGRATIONS
// ==========================================

app.get('/api/workspaces/current', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ workspace: req.workspace });
});

app.put('/api/workspaces/current', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { name, currency, settings } = req.body;
  const wsId = req.workspace!.id;

  if (settings) {
    db.updateWorkspaceSettings(wsId, settings);
  }

  const updated = db.getWorkspace(wsId);
  return res.json({ workspace: updated });
});

app.get('/api/integrations/status', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const ws = req.workspace!;
  const hasGemini = isGeminiConfigured();
  const hasResendKey = Boolean(ws.settings.resend_api_key || process.env.RESEND_API_KEY);
  const hasSenderEmail = Boolean(ws.settings.sender_email && ws.settings.sender_email.includes('@'));

  return res.json({
    gemini: {
      status: hasGemini ? 'connected' : 'requires_setup',
      model: 'gemini-3.8-flash',
      configured: hasGemini,
      message: hasGemini
        ? 'Connected via server-side Gemini 3.8 Flash SDK'
        : 'GEMINI_API_KEY is not configured in environment secrets',
    },
    email: {
      provider: ws.settings.email_provider || 'resend',
      status: hasResendKey && hasSenderEmail ? 'connected' : 'requires_setup',
      sender_email: ws.settings.sender_email || '',
      sender_name: ws.settings.sender_name || '',
      has_api_key: hasResendKey,
      message: !hasResendKey
        ? 'Resend API Key is required for live delivery'
        : !hasSenderEmail
        ? 'Sender email address must be configured'
        : 'Ready for approved email dispatch',
    },
    supabase: {
      status: ws.settings.supabase_connected ? 'connected' : 'not_configured',
      url: ws.settings.supabase_url || '',
      message: ws.settings.supabase_connected ? 'Supabase synced' : 'External Supabase instance optional (Local ACID engine active)',
    },
  });
});

app.post('/api/integrations/test-email', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const { recipient_email } = req.body;
  const targetEmail = recipient_email || req.user!.email;

  const result = await sendTestEmail({
    workspaceId: wsId,
    recipientEmail: targetEmail,
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error, status: result.status });
  }

  return res.json({ success: true, messageId: result.messageId, status: result.status });
});

// ==========================================
// 3. LEADS CRM ROUTES
// ==========================================

app.get('/api/leads', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { stage, status, search } = req.query;
  const leads = db.getLeads(req.workspace!.id, {
    stage: stage as string,
    status: status as string,
    search: search as string,
  });
  return res.json({ leads });
});

app.post('/api/leads', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const {
    first_name,
    last_name,
    email,
    phone,
    job_title,
    company_name,
    company_domain,
    industry,
    company_size,
    deal_value,
    stage = 'new',
    status = 'active',
    source = 'Manual Entry',
    notes,
  } = req.body;

  if (!first_name || !last_name || !email) {
    return res.status(400).json({ error: 'First name, last name, and email are required.' });
  }

  // Duplicate email detection
  const duplicate = db.findLeadByEmail(email, wsId);
  if (duplicate) {
    return res.status(409).json({ error: `A lead with email ${email} already exists.` });
  }

  const initialScore = 40;
  const newLead = db.createLead({
    workspace_id: wsId,
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    email: email.trim().toLowerCase(),
    phone,
    job_title,
    company_name,
    company_domain,
    industry,
    company_size,
    deal_value: deal_value ? Number(deal_value) : undefined,
    stage: stage as PipelineStage,
    status,
    source,
    score: initialScore,
    notes,
  });

  // Automatic AI qualification scoring if enabled
  if (req.workspace!.settings.ai_scoring_auto) {
    try {
      const scoreResult = await scoreLeadWithGemini(newLead);
      db.updateLead(newLead.id, wsId, {
        score: scoreResult.score,
        score_explanation: scoreResult.explanation,
        score_factors: scoreResult.factors,
        scored_at: new Date().toISOString(),
        scoring_model: scoreResult.model,
      });
      newLead.score = scoreResult.score;
      newLead.score_explanation = scoreResult.explanation;
      newLead.score_factors = scoreResult.factors;
      newLead.scored_at = new Date().toISOString();
      newLead.scoring_model = scoreResult.model;
    } catch (err) {
      console.error('Initial lead scoring error:', err);
    }
  }

  db.logAudit({
    workspace_id: wsId,
    user_id: req.user!.id,
    action: 'lead_created',
    entity_type: 'lead',
    entity_id: newLead.id,
    details: { name: `${newLead.first_name} ${newLead.last_name}`, email: newLead.email },
  });

  return res.status(201).json({ lead: newLead });
});

app.get('/api/leads/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const lead = db.getLeadById(req.params.id, wsId);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found.' });
  }

  const stageHistory = db.getLeadStageHistory(lead.id, wsId);
  const drafts = db.getOutreachDrafts(wsId, lead.id);
  const tasks = db.getTasks(wsId, lead.id);
  const replies = db.getReplyClassifications(wsId, lead.id);

  return res.json({
    lead,
    stageHistory,
    drafts,
    tasks,
    replies,
  });
});

app.put('/api/leads/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const updated = db.updateLead(req.params.id, wsId, req.body, req.user!.name);
  if (!updated) {
    return res.status(404).json({ error: 'Lead not found.' });
  }

  db.logAudit({
    workspace_id: wsId,
    user_id: req.user!.id,
    action: 'lead_updated',
    entity_type: 'lead',
    entity_id: updated.id,
    details: req.body,
  });

  return res.json({ lead: updated });
});

app.delete('/api/leads/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const deleted = db.deleteLead(req.params.id, wsId);
  if (!deleted) {
    return res.status(404).json({ error: 'Lead not found.' });
  }

  db.logAudit({
    workspace_id: wsId,
    user_id: req.user!.id,
    action: 'lead_deleted',
    entity_type: 'lead',
    entity_id: req.params.id,
  });

  return res.json({ success: true });
});

// Bulk Stage Update
app.post('/api/leads/bulk-stage', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const { lead_ids, stage } = req.body;

  if (!Array.isArray(lead_ids) || !stage) {
    return res.status(400).json({ error: 'lead_ids array and stage are required.' });
  }

  let updatedCount = 0;
  for (const id of lead_ids) {
    const resUpdate = db.updateLead(id, wsId, { stage: stage as PipelineStage }, req.user!.name);
    if (resUpdate) updatedCount++;
  }

  return res.json({ success: true, updated_count: updatedCount });
});

// CSV Import with field mapping & validation
app.post('/api/leads/import-csv', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const { rows } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'CSV rows array is required.' });
  }

  let imported = 0;
  let duplicates = 0;
  let errors = 0;

  for (const row of rows) {
    const email = (row.email || '').trim().toLowerCase();
    const firstName = (row.first_name || '').trim();
    const lastName = (row.last_name || '').trim() || (firstName ? 'Contact' : '');

    if (!email || !firstName || !email.includes('@')) {
      errors++;
      continue;
    }

    if (db.findLeadByEmail(email, wsId)) {
      duplicates++;
      continue;
    }

    const lead = db.createLead({
      workspace_id: wsId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: row.phone,
      job_title: row.job_title || row.title,
      company_name: row.company_name || row.company,
      company_domain: row.company_domain || row.domain,
      industry: row.industry,
      company_size: row.company_size,
      deal_value: row.deal_value ? Number(row.deal_value) : undefined,
      stage: 'new',
      status: 'active',
      source: 'CSV Import',
      score: 50,
      notes: row.notes,
    });

    imported++;
  }

  db.addNotification({
    workspace_id: wsId,
    user_id: req.user!.id,
    title: 'CSV Import Complete',
    message: `Processed ${rows.length} rows: ${imported} imported, ${duplicates} duplicates skipped, ${errors} invalid.`,
    type: 'success',
  });

  return res.json({
    success: true,
    total_processed: rows.length,
    imported,
    duplicates,
    errors,
  });
});

// CSV Export
app.get('/api/leads/export-csv', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const leads = db.getLeads(wsId);

  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Job Title',
    'Company',
    'Industry',
    'Stage',
    'Score',
    'Deal Value (INR)',
    'Created At',
  ];

  const escapeCsv = (str?: string | number) => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const lines = [headers.join(',')];
  for (const l of leads) {
    lines.push([
      escapeCsv(l.first_name),
      escapeCsv(l.last_name),
      escapeCsv(l.email),
      escapeCsv(l.phone),
      escapeCsv(l.job_title),
      escapeCsv(l.company_name),
      escapeCsv(l.industry),
      escapeCsv(l.stage),
      escapeCsv(l.score),
      escapeCsv(l.deal_value),
      escapeCsv(l.created_at),
    ].join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="dealpilot_leads.csv"');
  return res.send(lines.join('\n'));
});

// ==========================================
// 4. AI LEAD INTELLIGENCE SCORING
// ==========================================

app.post('/api/leads/:id/score', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const lead = db.getLeadById(req.params.id, wsId);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found.' });
  }

  try {
    const result = await scoreLeadWithGemini(lead);
    const updated = db.updateLead(lead.id, wsId, {
      score: result.score,
      score_explanation: result.explanation,
      score_factors: result.factors,
      scored_at: new Date().toISOString(),
      scoring_model: result.model,
    });

    return res.json({
      lead: updated,
      result,
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Scoring failed: ${err.message}` });
  }
});

// ==========================================
// 5. AI COPILOT CHAT
// ==========================================

app.post('/api/copilot/chat', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const { message, lead_id } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  let lead: Lead | undefined;
  if (lead_id) {
    lead = db.getLeadById(lead_id, wsId);
  }

  const metrics = db.calculateDashboardMetrics(wsId);

  try {
    const answer = await copilotChatWithGemini(message, lead, {
      totalLeads: metrics.totalLeads,
      pipelineValue: metrics.pipelineValue,
    });

    return res.json({ answer });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. OUTREACH STUDIO (TEMPLATES, DRAFTS, DISPATCH)
// ==========================================

app.get('/api/outreach/templates', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const templates = db.getOutreachTemplates(req.workspace!.id);
  return res.json({ templates });
});

app.post('/api/outreach/templates', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const { name, subject_template, body_template, category } = req.body;

  if (!name || !subject_template || !body_template) {
    return res.status(400).json({ error: 'Template name, subject, and body are required.' });
  }

  const template = db.createOutreachTemplate({
    workspace_id: wsId,
    name,
    subject_template,
    body_template,
    category: category || 'cold_outreach',
  });

  return res.status(201).json({ template });
});

app.get('/api/outreach/drafts', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const { lead_id } = req.query;
  const drafts = db.getOutreachDrafts(wsId, lead_id as string);
  return res.json({ drafts });
});

// Generate AI Outreach Draft (Starts ALWAYS as 'draft', never auto-sends!)
app.post('/api/outreach/generate-draft', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const { lead_id, instructions, template_subject, template_body } = req.body;

  if (!lead_id) {
    return res.status(400).json({ error: 'lead_id is required.' });
  }

  const lead = db.getLeadById(lead_id, wsId);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found.' });
  }

  try {
    const draftRes = await generateOutreachDraftWithGemini(
      lead,
      instructions,
      template_subject,
      template_body,
      req.workspace!.settings.sender_name || req.user!.name
    );

    const draft = db.createOutreachDraft({
      workspace_id: wsId,
      lead_id: lead.id,
      subject: draftRes.subject,
      body: draftRes.body,
      ai_prompt_used: instructions,
      status: 'draft',
    });

    db.addNotification({
      workspace_id: wsId,
      user_id: req.user!.id,
      title: 'New Outreach Draft Ready',
      message: `Draft created for ${lead.first_name} ${lead.last_name} (${lead.company_name || 'Prospect'}). Review and approve before sending.`,
      type: 'info',
    });

    return res.status(201).json({ draft });
  } catch (err: any) {
    return res.status(500).json({ error: `AI Draft generation failed: ${err.message}` });
  }
});

// Edit draft
app.put('/api/outreach/drafts/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const { subject, body } = req.body;

  const updated = db.updateOutreachDraft(req.params.id, wsId, { subject, body });
  if (!updated) {
    return res.status(404).json({ error: 'Draft not found.' });
  }

  return res.json({ draft: updated });
});

// Explicit user approval of draft
app.post('/api/outreach/drafts/:id/approve', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const draft = db.getOutreachDraftById(req.params.id, wsId);
  if (!draft) {
    return res.status(404).json({ error: 'Draft not found.' });
  }

  const updated = db.updateOutreachDraft(draft.id, wsId, {
    status: 'approved',
    approved_by: req.user!.name,
    approved_at: new Date().toISOString(),
  });

  return res.json({ draft: updated });
});

// Send approved draft via real email provider
app.post('/api/outreach/drafts/:id/send', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const draft = db.getOutreachDraftById(req.params.id, wsId);
  if (!draft) {
    return res.status(404).json({ error: 'Draft not found.' });
  }

  if (draft.status !== 'approved') {
    return res.status(400).json({
      error: 'Approval required: drafts must be explicitly approved before sending.',
    });
  }

  const lead = db.getLeadById(draft.lead_id, wsId);
  if (!lead) {
    return res.status(404).json({ error: 'Associated lead not found.' });
  }

  const sendResult = await sendOutreachEmail({
    draft,
    lead,
    workspaceId: wsId,
  });

  if (!sendResult.success) {
    return res.status(400).json({
      error: sendResult.error || 'Failed to dispatch email.',
      status: sendResult.status,
    });
  }

  return res.json({
    success: true,
    messageId: sendResult.messageId,
    status: sendResult.status,
  });
});

app.get('/api/outreach/messages', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const messages = db.getOutreachMessages(req.workspace!.id);
  return res.json({ messages });
});

// ==========================================
// 7. RESPONSE INTELLIGENCE & INBOUND REPLIES
// ==========================================

// Inbound Reply Processor (Receives real or test webhook payload)
app.post('/api/replies/process', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const { lead_id, reply_text, sender_email } = req.body;

  if (!lead_id || !reply_text) {
    return res.status(400).json({ error: 'lead_id and reply_text are required.' });
  }

  const lead = db.getLeadById(lead_id, wsId);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found.' });
  }

  try {
    const classification = await classifyInboundReplyWithGemini(reply_text, lead);

    const record = db.createReplyClassification({
      workspace_id: wsId,
      lead_id: lead.id,
      inbound_text: reply_text,
      sender_email: sender_email || lead.email,
      category: classification.category,
      confidence: classification.confidence,
      explanation: classification.explanation,
      recommended_action: classification.recommended_action,
      human_reviewed: false,
    });

    // Automatic operational stage transition based on verified intent
    if (classification.category === 'meeting_request') {
      db.updateLead(lead.id, wsId, { stage: 'meeting_scheduled' }, 'reply_processor');
    } else if (classification.category === 'interested') {
      db.updateLead(lead.id, wsId, { stage: 'engaged' }, 'reply_processor');
    } else if (classification.category === 'unsubscribe') {
      // Mandatory suppression trigger!
      db.addSuppression(wsId, lead.email, 'unsubscribed');
      db.updateLead(lead.id, wsId, { status: 'disqualified', stage: 'lost' }, 'unsubscribe_trigger');
    }

    db.addNotification({
      workspace_id: wsId,
      user_id: req.user!.id,
      title: `Inbound Reply: ${classification.category.toUpperCase()}`,
      message: `${lead.first_name} ${lead.last_name}: "${reply_text.slice(0, 80)}..."`,
      type: classification.category === 'unsubscribe' ? 'alert' : 'info',
    });

    return res.status(201).json({ reply: record });
  } catch (err: any) {
    return res.status(500).json({ error: `Reply analysis failed: ${err.message}` });
  }
});

app.get('/api/replies', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const { lead_id } = req.query;
  const replies = db.getReplyClassifications(wsId, lead_id as string);
  return res.json({ replies });
});

app.post('/api/replies/:id/review', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const updated = db.updateReplyClassification(req.params.id, wsId, { human_reviewed: true });
  if (!updated) {
    return res.status(404).json({ error: 'Reply classification record not found.' });
  }
  return res.json({ reply: updated });
});

// ==========================================
// 8. FOLLOW-UP TASKS
// ==========================================

app.get('/api/tasks', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const { lead_id } = req.query;
  const tasks = db.getTasks(wsId, lead_id as string);
  return res.json({ tasks });
});

app.post('/api/tasks', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const { title, description, due_date, priority = 'medium', lead_id } = req.body;

  if (!title || !due_date) {
    return res.status(400).json({ error: 'Task title and due date are required.' });
  }

  const task = db.createTask({
    workspace_id: wsId,
    lead_id,
    title,
    description,
    due_date,
    priority,
    status: 'pending',
  });

  return res.status(201).json({ task });
});

app.put('/api/tasks/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const updated = db.updateTask(req.params.id, wsId, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Task not found.' });
  }
  return res.json({ task: updated });
});

app.post('/api/tasks/:id/toggle', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const task = db.getTasks(wsId).find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const newStatus = task.status === 'completed' ? 'pending' : 'completed';
  const updated = db.updateTask(task.id, wsId, {
    status: newStatus,
    completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined,
  });

  return res.json({ task: updated });
});

app.delete('/api/tasks/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const deleted = db.deleteTask(req.params.id, wsId);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found.' });
  }
  return res.json({ success: true });
});

// ==========================================
// 9. SUPPRESSION LIST
// ==========================================

app.get('/api/suppression', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const list = db.getSuppressionList(req.workspace!.id);
  return res.json({ list });
});

app.post('/api/suppression', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const { email, reason = 'manual' } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }

  const entry = db.addSuppression(wsId, email, reason);
  return res.status(201).json({ entry });
});

app.delete('/api/suppression/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const wsId = req.workspace!.id;
  const removed = db.removeSuppression(wsId, req.params.id);
  if (!removed) {
    return res.status(404).json({ error: 'Suppression entry not found.' });
  }
  return res.json({ success: true });
});

// ==========================================
// 10. REAL-DATA ANALYTICS & DASHBOARD METRICS
// ==========================================

app.get('/api/analytics/dashboard', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const metrics = db.calculateDashboardMetrics(req.workspace!.id);
  return res.json({ metrics });
});

// ==========================================
// 11. NOTIFICATIONS & AUDIT LOGS
// ==========================================

app.get('/api/notifications', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const notifications = db.getNotifications(req.workspace!.id, req.user!.id);
  return res.json({ notifications });
});

app.post('/api/notifications/:id/read', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  db.markNotificationRead(req.params.id, req.workspace!.id);
  return res.json({ success: true });
});

app.get('/api/audit-logs', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const logs = db.getAuditLogs(req.workspace!.id);
  return res.json({ logs });
});

// ==========================================
// VITE DEV SERVER MOUNT & PRODUCTION SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DealPilot AI server ready on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start DealPilot server:', err);
  process.exit(1);
});
