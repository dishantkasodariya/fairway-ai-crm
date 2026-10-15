import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || 'fairway_jwt_super_secret_key_default';

if (nodeEnv === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fairway_jwt_super_secret_key_default')) {
  throw new Error('🚨 CRITICAL SECURITY ERROR: Production deployment running with default or missing JWT_SECRET! Set a secure secret in .env immediately.');
}

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  nodeEnv,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fairway_crm?schema=public',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Fairway Company Intelligence API (Python/FastAPI service under /intelligence)
  intelligenceApiUrl:
    process.env.INTELLIGENCE_API_URL ||
    (nodeEnv === 'production' ? 'https://fairway-intelligence.onrender.com' : 'http://localhost:8000'),
  intelligenceApiKey: process.env.INTELLIGENCE_API_KEY || 'fairway_intelligence_dev_key',
  // Outbound email for AI Connections' Send Email action.
  // "resend" = Resend's API (needs a DNS-verified sending domain).
  // "smtp"   = send through a real mailbox (Gmail, Outlook, Microsoft 365, etc.) via an app password — no DNS.
  // "log" = don't send; append each email to EMAIL_OUTBOX_FILE (dev, tests, rehearsals).
  emailProvider: (process.env.EMAIL_PROVIDER || 'resend') as 'resend' | 'smtp' | 'log',
  emailOutboxFile: process.env.EMAIL_OUTBOX_FILE || 'logs/email-outbox.jsonl',
  resendApiKey: (process.env.RESEND_API_KEY || '').trim(),
  resendFromEmail: (process.env.RESEND_FROM_EMAIL || '').trim(),
  resendFromName: (process.env.RESEND_FROM_NAME || 'Fairway Warehousing').trim(),
  smtpHost: (process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
  smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465,
  smtpUser: (process.env.SMTP_USER || '').trim(),
  smtpPass: (process.env.SMTP_PASS || '').trim(),
  smtpFromName: (process.env.SMTP_FROM_NAME || 'Fairway Warehousing').trim(),
  // Automated Bulk Outreach / Sequences Cron
  outreachCronEnabled: process.env.OUTREACH_CRON_ENABLED !== 'false',
  outreachDailyLimit: parseInt(process.env.OUTREACH_DAILY_LIMIT || '50', 10),
  outreachDelayMs: parseInt(process.env.OUTREACH_DELAY_MS || '3000', 10),
};

