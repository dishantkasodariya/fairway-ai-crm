import { query } from '../config/db.js';
import { config } from '../config/index.js';
import { BUSINESS_TZ } from './businessDate.js';
import { sendOutreachEmail } from './emailSender.js';

/**
 * "Notify" on a task: email the assignee what to do, when, for which deal, and who asked.
 * A failed email never fails the task; the caller gets { sent, to | reason } to show.
 */

export interface TaskForEmail {
  id: string;
  task_type: string | null;
  description: string;
  due_date: string | null;
  due_time: string | null;
  priority: string | null;
  company_name: string | null;
  inquiry_id: string | null;
  inquiry_number: string | null;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
}

export type TaskNotification = { sent: true; to: string } | { sent: false; reason: string };

const todayInIndia = (now = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TZ }).format(now); // YYYY-MM-DD

/** "Today", "Tomorrow", "Overdue since Mon, 6 Oct" or "Wed, 15 Oct". */
export const describeDueDay = (dueDate: string | null, now = new Date()): string => {
  if (!dueDate) return 'Today';
  const today = todayInIndia(now);
  const due = dueDate.slice(0, 10);
  const pretty = new Date(`${due}T00:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  });
  const dayMs = 86_400_000;
  const diff = Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / dayMs);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return `Overdue since ${pretty}`;
  return pretty;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const buildTaskEmail = (
  task: TaskForEmail,
  assignee: { name: string },
  assignedBy: string,
  now = new Date()
): { subject: string; text: string; html: string } => {
  const type = task.task_type || 'Task';
  const day = describeDueDay(task.due_date, now);
  const when = task.due_time ? `${day}, ${task.due_time}` : day;
  const forWhom = task.company_name ? ` with ${task.company_name}` : '';
  const deal = task.inquiry_number ? `${task.inquiry_number}${task.company_name ? ` · ${task.company_name}` : ''}` : task.company_name;
  const link = task.inquiry_id ? `${config.clientUrl}/inquiries/${task.inquiry_id}` : `${config.clientUrl}/tasks`;
  const firstName = (assignee.name || 'there').split(' ')[0];

  const subject = `${day === 'Today' ? 'Today' : day}: ${type}${forWhom}${task.due_time ? ` at ${task.due_time}` : ''}`;

  const rows: [string, string][] = [
    ['What', type],
    ['When', when],
    ...(deal ? ([[task.inquiry_number ? 'Deal' : 'Company', deal]] as [string, string][]) : []),
    ['Priority', task.priority || 'Normal'],
    ['Assigned by', assignedBy],
  ];

  const text = [
    `Hi ${firstName},`,
    '',
    `${assignedBy} assigned you a ${type.toLowerCase()} in Fairway CRM.`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'Notes:',
    task.description,
    '',
    `Open it: ${link}`,
    'When it is done, mark the task complete in the CRM (add an outcome note).',
  ].join('\n');

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px">
<tr><td style="padding:20px 24px;border-bottom:1px solid #e5e7eb">
<div style="font-size:12px;font-weight:700;color:#EB661F;letter-spacing:.04em;text-transform:uppercase">Fairway CRM · New task</div>
<div style="font-size:20px;font-weight:700;margin-top:6px">${escapeHtml(type)}${escapeHtml(forWhom)}</div>
<div style="font-size:14px;color:#374151;margin-top:4px">${escapeHtml(when)}</div>
</td></tr>
<tr><td style="padding:20px 24px">
<p style="margin:0 0 14px;font-size:14px">Hi ${escapeHtml(firstName)}, ${escapeHtml(assignedBy)} assigned you a ${escapeHtml(type.toLowerCase())}.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse">
${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#6b7280;width:110px;vertical-align:top">${escapeHtml(k)}</td><td style="padding:6px 0;font-weight:600">${escapeHtml(v)}</td></tr>`).join('\n')}
</table>
<div style="margin-top:16px;padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;white-space:pre-wrap">${escapeHtml(task.description)}</div>
<a href="${escapeHtml(link)}" style="display:inline-block;margin-top:18px;background:#EB661F;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:10px 18px;border-radius:8px">Open in Fairway CRM</a>
<p style="margin:16px 0 0;font-size:12px;color:#6b7280">When it's done, mark the task complete in the CRM and add an outcome note.</p>
</td></tr></table></td></tr></table></body></html>`;

  return { subject, text, html };
};

/** Email the task's assignee. Records notified_at/notified_to on success. */
export const notifyTaskAssignee = async (task: TaskForEmail, assignedBy: string): Promise<TaskNotification> => {
  if (!task.assigned_user_id) return { sent: false, reason: 'Nobody is assigned to this task.' };
  const { rows } = await query('SELECT name, email FROM users WHERE id = $1', [task.assigned_user_id]);
  const assignee = rows[0];
  if (!assignee) return { sent: false, reason: 'The assignee is not a CRM user, so there is no email address to send to.' };
  if (!assignee.email) return { sent: false, reason: `${assignee.name || 'The assignee'} has no email address on file.` };

  try {
    const email = buildTaskEmail(task, { name: assignee.name || task.assigned_user_name || '' }, assignedBy);
    await sendOutreachEmail({ to: assignee.email, ...email });
    await query('UPDATE tasks SET notified_at = CURRENT_TIMESTAMP, notified_to = $1 WHERE id = $2', [assignee.email, task.id]);
    return { sent: true, to: assignee.email };
  } catch (err: any) {
    console.error(`[tasks] notify failed for ${task.id}:`, err?.message);
    return { sent: false, reason: err?.message || 'The email could not be sent.' };
  }
};
