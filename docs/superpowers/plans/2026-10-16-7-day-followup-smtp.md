# 7-Day Automated Follow-up Email with Google SMTP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure Google Gmail SMTP in Fairway CRM, set the automated sequence follow-up delay to 7 days, and establish a rapid time-travel test workflow to verify email delivery without waiting 7 days.

**Architecture:** 
- Email Delivery: Nodemailer via Google SMTP (`smtp.gmail.com:465`) authenticated with an App Password.
- Sequencing: PostgreSQL `outreach_campaigns` and `outreach_enrollments` tables tracking `current_step` and `next_send_at`.
- Execution Engine: `outreachCronRunner.ts` scheduled via `node-cron` during business hours, plus manual on-demand execution via `/api/outreach/run-now`.
- Testing Strategy: Enroll a test email, send Step 1, fast-forward `next_send_at` in the database to simulate 7 days passing, trigger the runner, and confirm threaded Step 2 delivery.

**Tech Stack:** Node.js, Express, TypeScript, PostgreSQL (Neon), Nodemailer, React, TailwindCSS.

## Global Constraints

- Never commit real passwords, App Passwords, or API keys to Git.
- Always use Google App Password (16 characters), never the primary Google Account password.
- Respect Gmail daily rate limits: configure `OUTREACH_DAILY_LIMIT=50` for safety.
- Keep emails threaded using `In-Reply-To` and `References` headers with `last_message_id`.
- Support manual reply tracking ("Mark Replied") to immediately halt future follow-ups.

---

### Task 1: Configure Google SMTP in Backend Environment

**Files:**
- Modify: `backend/.env`
- Test: `backend/src/scripts/testSmtpConnection.ts` (new scratch verification script)

**Interfaces:**
- Consumes: Google App Password, Gmail address
- Produces: Working SMTP transporter in `backend/src/services/emailSender.ts`

- [ ] **Step 1: Obtain Google App Password**
  1. Go to Google Account -> Security (https://myaccount.google.com/security).
  2. Ensure 2-Step Verification is active.
  3. Navigate to App Passwords (https://myaccount.google.com/apppasswords).
  4. Create new App Password named "Fairway CRM".
  5. Copy the 16-character code (e.g. `abcd efgh ijkl mnop`).

- [ ] **Step 2: Update `backend/.env` with SMTP configuration**
  Add the following lines to `backend/.env`:
  ```env
  EMAIL_PROVIDER=smtp
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=465
  SMTP_USER=your_email@gmail.com
  SMTP_PASS=your_16_character_app_password
  SMTP_FROM_NAME=Fairway Warehousing
  OUTREACH_CRON_ENABLED=true
  OUTREACH_DAILY_LIMIT=50
  OUTREACH_DELAY_MS=2000
  ```

- [ ] **Step 3: Create verification script `backend/src/scripts/testSmtpConnection.ts`**
  ```typescript
  import { sendOutreachEmail } from '../services/emailSender.js';
  import { config } from '../config/index.js';

  async function testSmtp() {
    console.log(`Connecting to SMTP host: ${config.smtpHost}:${config.smtpPort} as ${config.smtpUser}...`);
    try {
      const res = await sendOutreachEmail({
        to: config.smtpUser,
        subject: 'Fairway CRM - SMTP Verification Test',
        text: 'Hello! Your Gmail SMTP configuration in Fairway CRM is working successfully.',
      });
      console.log('✅ Email sent successfully! Message ID:', res.id);
    } catch (err: any) {
      console.error('❌ SMTP Test Failed:', err.message);
      process.exit(1);
    }
  }

  testSmtp();
  ```

- [ ] **Step 4: Run verification test**
  Run: `npx tsx src/scripts/testSmtpConnection.ts` from `backend` directory.
  Expected: Message `✅ Email sent successfully!` and test email arrives in the inbox.

- [ ] **Step 5: Clean up scratch test script**
  Remove scratch script or keep it in `backend/src/scripts/` for future diagnosis.

---

### Task 2: Set Sequence Default to 7 Days across Frontend & Backend

**Files:**
- Modify: `backend/src/services/outreachService.ts:168-185`
- Modify: `backend/src/jobs/outreachCronRunner.ts:105-115`
- Modify: `client/src/modules/intelligence/components/BulkOutreachModal.tsx:40-55`
- Modify: `client/src/modules/intelligence/components/CampaignsDrawer.tsx:170-180`

**Interfaces:**
- Consumes: Campaign creation payload
- Produces: `follow_up_delay_days` defaulting to `7` throughout the app

- [ ] **Step 1: Update backend service default in `outreachService.ts`**
  In `backend/src/services/outreachService.ts`:
  Change `data.followUpDelayDays ?? 3` to `data.followUpDelayDays ?? 7`.

- [ ] **Step 2: Update cron runner fallback in `outreachCronRunner.ts`**
  In `backend/src/jobs/outreachCronRunner.ts`:
  Change line 108: `nextDelayDays = lead.follow_up_delay_days || 7;` (was `3`).

- [ ] **Step 3: Update frontend modal initial state in `BulkOutreachModal.tsx`**
  In `client/src/modules/intelligence/components/BulkOutreachModal.tsx`:
  Change line 43: `const [followUpDelayDays, setFollowUpDelayDays] = useState(7);` (was `3`).
  Change line 329: Default fallback `parseInt(e.target.value, 10) || 7`.

- [ ] **Step 4: Update display label in `CampaignsDrawer.tsx`**
  In `client/src/modules/intelligence/components/CampaignsDrawer.tsx`:
  Change line 176: `Follow-up interval: {selectedCampaign.followUpDelayDays || 7} days`.

- [ ] **Step 5: Commit changes**
  ```bash
  git add backend/src/services/outreachService.ts backend/src/jobs/outreachCronRunner.ts client/src/modules/intelligence/components/BulkOutreachModal.tsx client/src/modules/intelligence/components/CampaignsDrawer.tsx
  git commit -m "feat(outreach): set default sequence follow-up delay to 7 days"
  ```

---

### Task 3: Implement Quick Time-Travel Test Script for 7-Day Follow-Up

**Files:**
- Create: `backend/src/scripts/testFastFollowUp.ts`

**Interfaces:**
- Consumes: Enrolled test lead in `outreach_enrollments`
- Produces: Immediate step 1 send, automated time-travel SQL shift (`next_send_at = now() - 1 min`), followed by step 2 follow-up send.

- [ ] **Step 1: Create `backend/src/scripts/testFastFollowUp.ts`**
  ```typescript
  import { pool, query } from '../config/db.js';
  import { OutreachService } from '../services/outreachService.js';
  import { runOutreachBatchNow } from '../jobs/outreachCronRunner.js';
  import { config } from '../config/index.js';

  async function testFastFollowUp() {
    const testEmail = process.env.TEST_RECIPIENT_EMAIL || config.smtpUser;
    if (!testEmail) {
      console.error('❌ Please specify TEST_RECIPIENT_EMAIL or configure SMTP_USER in .env');
      process.exit(1);
    }

    console.log(`\n🧪 Testing 7-Day Follow-up Cycle with recipient: ${testEmail}`);

    // 1. Create a test campaign with 7-day delay
    const campaign = await OutreachService.createCampaign({
      name: `7-Day Test Campaign ${Date.now()}`,
      subjectTemplate: 'Warehousing Partnership for {{company}}',
      bodyTemplate: 'Hi {{name}},\n\nWe have warehouse availability in Bhiwandi. Let us know if you need space.\n\nBest,\nFairway Team',
      followUpDelayDays: 7,
      followUpSubjectTemplate: 'Re: Warehousing Partnership for {{company}}',
      followUpBodyTemplate: 'Hi {{name}},\n\nFollowing up on my note from last week regarding warehouse availability. Did you have a chance to review?\n\nBest,\nFairway Team',
    });
    console.log(`✅ 1. Campaign created with 7-day follow-up delay (ID: ${campaign.id})`);

    // 2. Enroll lead
    await OutreachService.enrollContacts(campaign.id, [
      { email: testEmail, name: 'Test Lead', companyName: 'Acme Logistics' }
    ]);
    console.log('✅ 2. Lead enrolled.');

    // 3. Send Step 1
    console.log('\n📨 Sending Step 1 initial email...');
    const resStep1 = await runOutreachBatchNow({ campaignId: campaign.id });
    console.log(`   Step 1 result: sent=${resStep1.sent}, failed=${resStep1.failed}`);

    // 4. Verify DB state (next_send_at should be ~7 days from now)
    const check1 = await query(
      'SELECT id, current_step, status, next_send_at FROM outreach_enrollments WHERE campaign_id = $1',
      [campaign.id]
    );
    const row = check1.rows[0];
    console.log(`   Current Step: ${row.current_step}, Status: ${row.status}`);
    console.log(`   Scheduled Next Send (approx +7 days): ${row.next_send_at}`);

    // 5. Time-Travel Simulation
    console.log('\n⏩ Simulating 7 days passed (Time-Travel SQL update)...');
    await query(
      `UPDATE outreach_enrollments 
       SET next_send_at = CURRENT_TIMESTAMP - INTERVAL '5 minutes' 
       WHERE campaign_id = $1`,
      [campaign.id]
    );
    console.log('✅ Enrollment next_send_at set to past timestamp.');

    // 6. Send Step 2 (Follow-up)
    console.log('\n📨 Triggering Step 2 (7-Day Follow-Up email)...');
    const resStep2 = await runOutreachBatchNow({ campaignId: campaign.id });
    console.log(`   Step 2 result: sent=${resStep2.sent}, failed=${resStep2.failed}, completed=${resStep2.completed}`);

    // 7. Verify completed state
    const check2 = await query(
      'SELECT id, current_step, status, last_sent_at FROM outreach_enrollments WHERE campaign_id = $1',
      [campaign.id]
    );
    console.log(`   Final Status: ${check2.rows[0].status}`);

    // 8. Clean up test campaign
    await OutreachService.deleteCampaign(campaign.id);
    console.log('\n🎉 Test completed! Check your Gmail inbox: You should see both Step 1 and the 7-day follow-up in the same thread.');
    await pool.end();
  }

  testFastFollowUp();
  ```

- [ ] **Step 2: Run Fast Follow-Up test**
  Run: `npx tsx src/scripts/testFastFollowUp.ts` from `backend`
  Expected: Both emails delivered to inbox, threaded with "Re:", and campaign cleaned up.

---

### Task 4: End-to-End Verification in CRM Web Interface

**Files:**
- Manual UI Testing in browser

- [ ] **Step 1: Start CRM services**
  In terminal 1 (backend): `cd backend && npm run dev`
  In terminal 2 (client): `cd client && npm run dev`

- [ ] **Step 2: Open AI Connections Page**
  Navigate to `http://localhost:5173/intelligence/connections`
  Click on **Bulk Outreach** button.

- [ ] **Step 3: Create & Enroll Campaign**
  - Verify Step 1 template is filled.
  - Verify Step 2 shows **Wait 7 days** by default.
  - Enter test email in contacts table.
  - Click **Start Outreach Sequence**.

- [ ] **Step 4: Check Campaigns Drawer**
  - Open **Campaigns** drawer.
  - Confirm the campaign shows enrolled contact with `Step 1 Sent` or `Pending`.
  - Next send shows date exactly 7 days ahead.

- [ ] **Step 5: Test "Mark Replied" feature**
  - If a prospect replies, click **Mark Replied** on their enrollment in the drawer.
  - Verify status changes to `Replied` and no further follow-ups are sent.
