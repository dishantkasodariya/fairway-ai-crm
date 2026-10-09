import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

/**
 * Outbound email for AI Connections' "Send Email" action — a one-at-a-time,
 * human-reviewed send the salesperson triggers after reading the draft,
 * never a bulk/campaign send.
 *
 * Two interchangeable providers, picked by EMAIL_PROVIDER:
 *  - "resend": Resend's REST API. Needs a DNS-verified sending domain.
 *  - "smtp":   sends through a real mailbox (Gmail, Outlook, Microsoft 365,
 *              any SMTP account) using an app password. No DNS to set up —
 *              it sends as that real address immediately.
 */

export class EmailSendError extends Error {}

export interface SendOutreachEmailParams {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

export async function sendOutreachEmail(params: SendOutreachEmailParams): Promise<{ id: string }> {
  if (config.emailProvider === 'smtp') {
    return sendViaSmtp(params);
  }
  return sendViaResend(params);
}

async function sendViaResend(params: SendOutreachEmailParams): Promise<{ id: string }> {
  if (!config.resendApiKey) {
    throw new EmailSendError('Email sending is not configured: RESEND_API_KEY is missing.');
  }
  if (!config.resendFromEmail) {
    throw new EmailSendError(
      'Email sending is not configured: RESEND_FROM_EMAIL is missing. It must be an address on a domain ' +
        'verified in the Resend dashboard (Domains tab), e.g. sales@mail.yourcompany.com.'
    );
  }

  const from = config.resendFromName ? `${config.resendFromName} <${config.resendFromEmail}>` : config.resendFromEmail;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.text,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    }),
  });

  const body = await response.json().catch(() => ({}) as any);
  if (!response.ok) {
    // Resend's error body shape: { message, name, statusCode }
    throw new EmailSendError(body?.message || `Resend API error (HTTP ${response.status})`);
  }
  return { id: body.id };
}

// One transporter, reused across requests rather than reconnecting per send.
let smtpTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;
  smtpTransporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });
  return smtpTransporter;
}

async function sendViaSmtp(params: SendOutreachEmailParams): Promise<{ id: string }> {
  if (!config.smtpUser || !config.smtpPass) {
    throw new EmailSendError(
      'Email sending is not configured: SMTP_USER and SMTP_PASS are missing. SMTP_PASS must be an app ' +
        'password (not the account\'s normal login password) — see the setup guide for how to create one.'
    );
  }

  try {
    const info = await getSmtpTransporter().sendMail({
      from: `${config.smtpFromName} <${config.smtpUser}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    });
    return { id: info.messageId };
  } catch (err: any) {
    // Reset the transporter so the next attempt opens a fresh connection
    // instead of retrying over one that may have gone bad (auth failure, etc).
    smtpTransporter = null;
    throw new EmailSendError(err?.message || 'SMTP send failed.');
  }
}
