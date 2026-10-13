import { db, OutreachDraft, Lead, OutreachMessage } from './db.js';

export interface SendEmailParams {
  draft: OutreachDraft;
  lead: Lead;
  workspaceId: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  status: 'sent' | 'failed';
  error?: string;
}

/**
 * Validates whether the workspace has configured a real email provider (e.g. Resend)
 * and whether the recipient is safe from the suppression list.
 */
export async function sendOutreachEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { draft, lead, workspaceId } = params;
  const workspace = db.getWorkspace(workspaceId);

  if (!workspace) {
    return {
      success: false,
      status: 'failed',
      error: 'Workspace not found',
    };
  }

  // 1. Mandatory Suppression Safeguard
  if (db.isEmailSuppressed(workspaceId, lead.email)) {
    return {
      success: false,
      status: 'failed',
      error: `Outreach blocked: ${lead.email} is listed on the Suppression List (opted out or unsubscribed).`,
    };
  }

  // 2. Sender email check
  const senderEmail = workspace.settings.sender_email || process.env.RESEND_FROM_EMAIL;
  const senderName = workspace.settings.sender_name || workspace.name;
  if (!senderEmail || !senderEmail.includes('@')) {
    return {
      success: false,
      status: 'failed',
      error: 'Email sending disabled: No verified sender address configured. Please configure your sender email (e.g. sales@yourdomain.com) in Settings > Integrations.',
    };
  }

  // 3. Provider credentials check
  const apiKey = workspace.settings.resend_api_key || process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return {
      success: false,
      status: 'failed',
      error: 'Email sending disabled: Resend API Key is not configured. Please supply a valid Resend API key in Settings > Integrations to enable authenticated sending.',
    };
  }

  // 4. Real HTTP call to Resend API
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: [lead.email],
        subject: draft.subject,
        text: draft.body,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = data.message || `Resend API returned status ${res.status}`;
      // Log failed message in DB
      db.createOutreachMessage({
        workspace_id: workspaceId,
        lead_id: lead.id,
        draft_id: draft.id,
        to_email: lead.email,
        from_email: senderEmail,
        subject: draft.subject,
        body: draft.body,
        provider: 'resend',
        status: 'failed',
        error_message: errMsg,
        sent_at: new Date().toISOString(),
      });

      return {
        success: false,
        status: 'failed',
        error: errMsg,
      };
    }

    // Success response with real provider ID
    const providerMessageId = data.id || 'resend_' + Date.now();
    const sentMsg = db.createOutreachMessage({
      workspace_id: workspaceId,
      lead_id: lead.id,
      draft_id: draft.id,
      to_email: lead.email,
      from_email: senderEmail,
      subject: draft.subject,
      body: draft.body,
      provider: 'resend',
      provider_message_id: providerMessageId,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    // Update draft status to sent
    db.updateOutreachDraft(draft.id, workspaceId, { status: 'sent' });

    // Update lead last contacted & stage to 'contacted' if in 'new' or 'qualified'
    if (['new', 'qualified'].includes(lead.stage)) {
      db.updateLead(lead.id, workspaceId, {
        stage: 'contacted',
        last_contacted_at: new Date().toISOString(),
      }, 'email_send');
    } else {
      db.updateLead(lead.id, workspaceId, {
        last_contacted_at: new Date().toISOString(),
      }, 'email_send');
    }

    // Add audit log
    db.logAudit({
      workspace_id: workspaceId,
      user_id: draft.approved_by || 'system',
      action: 'email_sent',
      entity_type: 'outreach_message',
      entity_id: sentMsg.id,
      details: { to: lead.email, provider_id: providerMessageId },
    });

    return {
      success: true,
      status: 'sent',
      messageId: providerMessageId,
    };
  } catch (err: any) {
    console.error('Error contacting email provider:', err);
    return {
      success: false,
      status: 'failed',
      error: `Network error reaching email provider: ${err.message}`,
    };
  }
}

/**
 * Sends a real test verification email via Resend to verify API key & domain
 */
export async function sendTestEmail(params: {
  workspaceId: string;
  recipientEmail: string;
}): Promise<SendEmailResult> {
  const { workspaceId, recipientEmail } = params;
  const workspace = db.getWorkspace(workspaceId);

  if (!workspace) {
    return { success: false, status: 'failed', error: 'Workspace not found.' };
  }

  const senderEmail = workspace.settings.sender_email || process.env.RESEND_FROM_EMAIL;
  const senderName = workspace.settings.sender_name || workspace.name;
  const apiKey = workspace.settings.resend_api_key || process.env.RESEND_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return {
      success: false,
      status: 'failed',
      error: 'Resend API Key is not configured. Please supply a valid key starting with re_ in Settings > Integrations.',
    };
  }

  if (!senderEmail || !senderEmail.includes('@')) {
    return {
      success: false,
      status: 'failed',
      error: 'Verified sender email address is not configured. e.g. sales@yourdomain.com',
    };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: [recipientEmail],
        subject: `[DealPilot AI] Verification Dispatch from ${senderName}`,
        text: `This is a verified test email sent from DealPilot AI using your configured Resend credentials.\n\nSender: ${senderEmail}\nWorkspace: ${workspace.name}\nTimestamp: ${new Date().toISOString()}\n\nYour outbound email pipeline is verified and ready to dispatch approved outreach messages.`,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        status: 'failed',
        error: data.message || `Resend returned HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      status: 'sent',
      messageId: data.id || 'resend_test_' + Date.now(),
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      error: `Network error connecting to Resend: ${err.message}`,
    };
  }
}
