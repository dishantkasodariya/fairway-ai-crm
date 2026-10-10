import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildTaskEmail, describeDueDay } from './taskNotifier.js';

// 10 Oct 2026, 09:00 IST
const NOW = new Date('2026-10-10T03:30:00Z');

describe('taskNotifier', () => {
  it('words the due day relative to today in India', () => {
    assert.strictEqual(describeDueDay('2026-10-10', NOW), 'Today');
    assert.strictEqual(describeDueDay('2026-10-11', NOW), 'Tomorrow');
    assert.match(describeDueDay('2026-10-06', NOW), /^Overdue since Tue, 6 Oct$/);
    assert.match(describeDueDay('2026-10-15', NOW), /Thu, 15 Oct/);
    assert.strictEqual(describeDueDay(null, NOW), 'Today');
  });

  it("uses India's date just after midnight IST (still the previous day in UTC)", () => {
    const justAfterMidnightIst = new Date('2026-10-10T18:40:00Z'); // 00:10 IST on 11 Oct
    assert.strictEqual(describeDueDay('2026-10-11', justAfterMidnightIst), 'Today');
  });

  it('builds a clear email with what, when, deal, notes and who assigned it', () => {
    const email = buildTaskEmail(
      {
        id: 'task_1', task_type: 'Meeting', description: 'Walk them through Bay 3 <and> the dock layout',
        due_date: '2026-10-10', due_time: '03:00 PM', priority: 'High', company_name: 'MRF Ltd',
        inquiry_id: 'inq_1', inquiry_number: 'INQ-1094', assigned_user_id: 'usr_bhavya_1', assigned_user_name: 'Bhavya Sharma',
      },
      { name: 'Bhavya Sharma' },
      'Amit Patel',
      NOW
    );
    assert.strictEqual(email.subject, 'Today: Meeting with MRF Ltd at 03:00 PM');
    assert.match(email.text, /^Hi Bhavya,/);
    assert.match(email.text, /Amit Patel assigned you a meeting/);
    assert.match(email.text, /When: Today, 03:00 PM/);
    assert.match(email.text, /Deal: INQ-1094 · MRF Ltd/);
    assert.match(email.text, /\/inquiries\/inq_1/);
    assert.match(email.html, /Walk them through Bay 3 &lt;and&gt; the dock layout/); // notes are escaped
  });
});
