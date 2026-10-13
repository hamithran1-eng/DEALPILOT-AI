import { GoogleGenAI, Type } from '@google/genai';
import { Lead, LeadScoreFactor, ReplyCategory } from './db.js';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function isGeminiConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 0);
}

export interface ScoreResult {
  score: number;
  explanation: string;
  factors: LeadScoreFactor[];
  recommended_action: string;
  model: string;
}

/**
 * Lead scoring grounded strictly in real lead attributes:
 * industry fit, authority level, deal size, notes, company data.
 */
export async function scoreLeadWithGemini(lead: Lead): Promise<ScoreResult> {
  const ai = getGeminiClient();
  if (!ai) {
    // If API key is missing, provide honest deterministic evaluation
    return scoreLeadDeterministic(lead, 'Deterministic scoring rule engine (Gemini API key not configured)');
  }

  const prompt = `
Analyze the following B2B sales lead and calculate an explainable qualification score between 0 and 100.
Ground your evaluation ONLY on the provided attributes:

Lead Data:
- Name: ${lead.first_name} ${lead.last_name}
- Email: ${lead.email}
- Job Title: ${lead.job_title || 'Unknown'}
- Company: ${lead.company_name || 'Unknown'}
- Domain: ${lead.company_domain || 'Unknown'}
- Industry: ${lead.industry || 'Unknown'}
- Company Size: ${lead.company_size || 'Unknown'}
- Opportunity Deal Value: ${lead.deal_value ? '₹' + lead.deal_value.toLocaleString('en-IN') : 'Unknown'}
- Pipeline Stage: ${lead.stage}
- Notes / Context: ${lead.notes || 'None'}

Evaluate 4 weighted categories:
1. Decision Authority Fit (Weight 0.30): VP, Director, Head, CXO vs junior or generic
2. Company & Industry Viability (Weight 0.25): High-value B2B industry, verifiable domain, market scale
3. Deal Potential & Intent (Weight 0.25): Explicit deal value, stage progression, concrete notes
4. Information Completeness & Reachability (Weight 0.20): Valid professional corporate email, complete name, verifiable domain

Return strict JSON matching the schema.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.INTEGER,
              description: 'Overall score from 0 to 100',
            },
            explanation: {
              type: Type.STRING,
              description: 'Clear, 2-3 sentence executive explanation of the score and evidence',
            },
            recommended_action: {
              type: Type.STRING,
              description: 'Recommended next action for sales rep (e.g. prioritize personalized executive outreach)',
            },
            factors: {
              type: Type.ARRAY,
              description: 'Breakdown of individual scoring factors',
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  score: { type: Type.INTEGER, description: 'Score 0-100 for this factor' },
                  weight: { type: Type.NUMBER, description: 'Weight between 0.0 and 1.0' },
                  reasoning: { type: Type.STRING, description: 'Specific observation supporting this factor' },
                },
                required: ['name', 'score', 'weight', 'reasoning'],
              },
            },
          },
          required: ['score', 'explanation', 'recommended_action', 'factors'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const finalScore = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 50)));

    return {
      score: finalScore,
      explanation: parsed.explanation || 'Score computed from verified lead attributes.',
      factors: Array.isArray(parsed.factors) ? parsed.factors : [],
      recommended_action: parsed.recommended_action || 'Review lead profile and initiate personalized contact.',
      model: 'gemini-3.8-flash',
    };
  } catch (err: any) {
    console.error('Gemini scoring call failed, falling back to deterministic calculation:', err);
    return scoreLeadDeterministic(lead, `Deterministic rule engine (Gemini call error: ${err.message})`);
  }
}

function scoreLeadDeterministic(lead: Lead, engineReason: string): ScoreResult {
  let score = 30;
  const factors: LeadScoreFactor[] = [];

  // 1. Role Authority
  const title = (lead.job_title || '').toLowerCase();
  let roleScore = 40;
  let roleReason = 'Generic or undisclosed job role';
  if (/cxo|ceo|cto|cfo|cro|coo|founder|president|owner|partner/.test(title)) {
    roleScore = 95;
    roleReason = 'Executive leadership with budget sign-off authority';
  } else if (/vp|vice president|head of|director/.test(title)) {
    roleScore = 85;
    roleReason = 'Senior decision maker with departmental leadership';
  } else if (/manager|lead|principal/.test(title)) {
    roleScore = 65;
    roleReason = 'Operational manager / prospective champion';
  }
  factors.push({ name: 'Decision Authority Fit', score: roleScore, weight: 0.30, reasoning: roleReason });

  // 2. Company / Domain Fit
  let compScore = 40;
  let compReason = 'Basic company name provided';
  if (lead.company_domain && !/gmail|yahoo|hotmail|outlook/.test(lead.company_domain)) {
    compScore = 80;
    compReason = `Corporate custom domain verified (${lead.company_domain})`;
  }
  if (lead.industry) {
    compScore += 10;
    compReason += `, target industry specified (${lead.industry})`;
  }
  factors.push({ name: 'Company & Industry Fit', score: Math.min(100, compScore), weight: 0.25, reasoning: compReason });

  // 3. Deal Size & Stage
  let dealScore = 35;
  let dealReason = 'Stage: ' + lead.stage;
  if (lead.deal_value && lead.deal_value > 0) {
    dealScore += Math.min(40, Math.round(lead.deal_value / 50000));
    dealReason += `, explicit deal pipeline value: ₹${lead.deal_value.toLocaleString('en-IN')}`;
  }
  if (['meeting_scheduled', 'proposal', 'engaged'].includes(lead.stage)) {
    dealScore += 25;
  }
  factors.push({ name: 'Opportunity Intent', score: Math.min(100, dealScore), weight: 0.25, reasoning: dealReason });

  // 4. Data Completeness
  let compRate = 40;
  if (lead.phone) compRate += 20;
  if (lead.notes && lead.notes.length > 10) compRate += 25;
  if (lead.company_size) compRate += 15;
  factors.push({ name: 'Profile Completeness', score: Math.min(100, compRate), weight: 0.20, reasoning: `Profile contains ${compRate}% verified field completeness` });

  // Calculate weighted total
  score = Math.round(
    factors.reduce((acc, f) => acc + f.score * f.weight, 0)
  );

  return {
    score: Math.max(10, Math.min(98, score)),
    explanation: `${engineReason}. Lead evaluated on authority role (${lead.job_title || 'unspecified'}), corporate domain validation, and opportunity value.`,
    factors,
    recommended_action: score > 70 ? 'High intent fit: draft tailored executive email' : 'Enrich missing company signals and schedule qualification outreach',
    model: 'Rule-Engine-v1 (Deterministic)',
  };
}

export interface DraftResult {
  subject: string;
  body: string;
  model: string;
}

/**
 * Generate bespoke, non-generic sales outreach drafts grounded strictly in lead profile
 */
export async function generateOutreachDraftWithGemini(
  lead: Lead,
  customInstructions?: string,
  templateSubject?: string,
  templateBody?: string,
  senderName = 'DealPilot Sales Team'
): Promise<DraftResult> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('Gemini API key is not configured in process.env.GEMINI_API_KEY. Please verify configuration.');
  }

  const prompt = `
You are a top 1% B2B enterprise sales copywriter.
Generate a concise, highly personalized cold sales outreach email for the following prospect.
Ground the copy strictly in their real attributes. Avoid generic fluff, buzzwords, or pushy cliches.

Prospect Profile:
- Full Name: ${lead.first_name} ${lead.last_name}
- Job Title: ${lead.job_title || 'Leader'}
- Company: ${lead.company_name || 'your company'}
- Industry: ${lead.industry || 'B2B'}
- Deal Value / Scope: ${lead.deal_value ? '₹' + lead.deal_value.toLocaleString('en-IN') : 'strategic'}
- Context / Notes: ${lead.notes || 'None'}
- Sender Name: ${senderName}

${customInstructions ? `Special Instructions / Tone: ${customInstructions}` : ''}
${templateSubject ? `Reference Subject Style: ${templateSubject}` : ''}
${templateBody ? `Reference Template Structure: ${templateBody}` : ''}

Rules:
1. Subject line must be punchy, relevant, under 8 words, no exclamation marks.
2. Email body must be 75-140 words, conversational, respectful of their time.
3. Open with a personalized hook linking their role at ${lead.company_name || 'their firm'}.
4. Clear, friction-free Call to Action (e.g. asking for feedback or a brief 10-minute briefing next week).
5. Output valid JSON with "subject" and "body".
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          body: { type: Type.STRING },
        },
        required: ['subject', 'body'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');
  if (!parsed.subject || !parsed.body) {
    throw new Error('Failed to parse valid subject and body from AI model.');
  }

  return {
    subject: parsed.subject.trim(),
    body: parsed.body.trim(),
    model: 'gemini-3.8-flash',
  };
}

export interface ReplyClassificationResult {
  category: ReplyCategory;
  confidence: number;
  explanation: string;
  recommended_action: string;
}

/**
 * Classify inbound email responses into actionable sales categories
 */
export async function classifyInboundReplyWithGemini(
  replyText: string,
  lead: Lead
): Promise<ReplyClassificationResult> {
  const ai = getGeminiClient();
  if (!ai) {
    // Deterministic fallback for replies
    const lower = replyText.toLowerCase();
    if (lower.includes('unsubscribe') || lower.includes('remove me') || lower.includes('stop emailing')) {
      return {
        category: 'unsubscribe',
        confidence: 0.98,
        explanation: 'Explicit opt-out keyword detected in reply text.',
        recommended_action: 'Add to suppression list immediately.',
      };
    }
    if (lower.includes('out of office') || lower.includes('vacation') || lower.includes('automatic reply')) {
      return {
        category: 'out_of_office',
        confidence: 0.95,
        explanation: 'Automated away/out of office reply phrase identified.',
        recommended_action: 'Pause cadence until prospect returns.',
      };
    }
    if (lower.includes('interested') || lower.includes('sounds good') || lower.includes('send more info')) {
      return {
        category: 'interested',
        confidence: 0.85,
        explanation: 'Prospect expressed interest in learning more.',
        recommended_action: 'Respond with deck and schedule call.',
      };
    }
    return {
      category: 'unknown',
      confidence: 0.5,
      explanation: 'Keyword-based heuristic could not confirm intent with high confidence.',
      recommended_action: 'Review manually.',
    };
  }

  const prompt = `
Analyze the following inbound email response received from a B2B sales prospect (${lead.first_name} ${lead.last_name} at ${lead.company_name || 'their company'}).

Inbound Email Body:
"""
${replyText}
"""

Classify the reply into EXACTLY ONE of the following categories:
- "interested": Prospect wants to learn more or explores value proposition
- "meeting_request": Prospect asks for calendar link or proposes meeting times
- "question": Prospect asks technical, pricing, or product clarification
- "objection": Prospect mentions budget constraints, existing vendor, or timing hurdles
- "follow_up_later": Prospect asks to circle back in next quarter/month
- "not_interested": Polite or firm decline
- "out_of_office": Automated away message
- "unsubscribe": Direct request to be removed, opted out, or cease communications
- "unknown": Ambiguous or irrelevant content

Provide a confidence score (0.0 to 1.0), a concise explanation, and the recommended next operational action.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            description: 'One of the specified 9 reply categories',
          },
          confidence: {
            type: Type.NUMBER,
            description: 'Confidence between 0.0 and 1.0',
          },
          explanation: {
            type: Type.STRING,
            description: 'Why this category was chosen based on evidence',
          },
          recommended_action: {
            type: Type.STRING,
            description: 'Next step for sales representative',
          },
        },
        required: ['category', 'confidence', 'explanation', 'recommended_action'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');
  const validCategories: ReplyCategory[] = [
    'interested',
    'meeting_request',
    'question',
    'objection',
    'follow_up_later',
    'not_interested',
    'out_of_office',
    'unsubscribe',
    'unknown',
  ];

  const category: ReplyCategory = validCategories.includes(parsed.category) ? parsed.category : 'unknown';

  return {
    category,
    confidence: Number(parsed.confidence) || 0.85,
    explanation: parsed.explanation || 'Analyzed inbound email response sentiment and intent.',
    recommended_action: parsed.recommended_action || 'Review prospect response.',
  };
}

/**
 * AI Sales Copilot grounded in CRM records
 */
export async function copilotChatWithGemini(
  query: string,
  lead?: Lead,
  context?: { totalLeads: number; pipelineValue: number }
): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('Gemini API key is not configured in process.env.GEMINI_API_KEY. Sales copilot requires active AI configuration.');
  }

  let prompt = `You are DealPilot Copilot, an elite AI sales engineer and pipeline strategist.\n`;
  if (lead) {
    prompt += `
Current Lead Context:
- Name: ${lead.first_name} ${lead.last_name}
- Email: ${lead.email}
- Job Title: ${lead.job_title || 'N/A'}
- Company: ${lead.company_name || 'N/A'} (${lead.company_domain || 'N/A'})
- Industry: ${lead.industry || 'N/A'}
- Company Size: ${lead.company_size || 'N/A'}
- Stage: ${lead.stage}
- Deal Value: ${lead.deal_value ? '₹' + lead.deal_value.toLocaleString('en-IN') : 'N/A'}
- Score: ${lead.score}/100
- Notes: ${lead.notes || 'None'}
`;
  }

  if (context) {
    prompt += `Workspace Context: ${context.totalLeads} total leads, ₹${context.pipelineValue.toLocaleString('en-IN')} active pipeline.\n`;
  }

  prompt += `
User Question / Directive:
"${query}"

Instructions:
- Provide sharp, strategic, concise sales guidance.
- Distinguish verified CRM facts from hypotheses.
- If drafting a response or handling an objection, provide actionable, ready-to-use copy.
- No conversational fluff or meta-commentary.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
  });

  return (response.text || 'Unable to generate copilot guidance.').trim();
}
