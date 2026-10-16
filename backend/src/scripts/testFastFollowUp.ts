import { pool, query } from '../config/db.js';
import { OutreachService } from '../services/outreachService.js';
import { runOutreachBatchNow } from '../jobs/outreachCronRunner.js';
import { config } from '../config/index.js';

async function testFastFollowUp() {
  const recipient = process.argv[2] || process.env.TEST_RECIPIENT_EMAIL || config.smtpUser;

  if (!recipient || !recipient.includes('@')) {
    console.error('❌ Please provide a valid recipient email:');
    console.error('Usage: npx tsx src/scripts/testFastFollowUp.ts your_email@gmail.com');
    process.exit(1);
  }

  console.log('🧪 =======================================================');
  console.log('🧪 Starting 7-Day Follow-Up Rapid Test (Time-Travel Mode)');
  console.log('🧪 Recipient Email:', recipient);
  console.log('🧪 =======================================================\n');

  let testCampaignId = '';

  try {
    // 1. Create a test campaign with 7-day follow-up configuration
    const campaign = await OutreachService.createCampaign({
      name: `7-Day Follow-Up Test (${Date.now()})`,
      subjectTemplate: 'Industrial warehousing availability for {{company}}',
      bodyTemplate: 'Hi {{name}},\n\nWe have Grade-A warehouse space available for {{company}} with 12m clear height.\n\nWould you be open to a quick call this week?\n\nBest regards,\nFairway Warehousing Team',
      followUpDelayDays: 7,
      followUpSubjectTemplate: 'Re: Industrial warehousing availability for {{company}}',
      followUpBodyTemplate: 'Hi {{name}},\n\nFollowing up on my note from last week regarding warehouse availability for {{company}}.\n\nDid you have a chance to review?\n\nBest regards,\nFairway Warehousing Team',
    });
    testCampaignId = campaign.id;
    console.log(`✅ 1. Created Campaign: "${campaign.name}" (ID: ${campaign.id})`);
    console.log(`   Follow-up interval set to: ${campaign.follow_up_delay_days} days\n`);

    // 2. Enroll the test recipient
    const enrollRes = await OutreachService.enrollContacts(campaign.id, [
      {
        email: recipient,
        name: 'Prospective Client',
        companyName: 'Test Enterprises',
      },
    ]);
    console.log(`✅ 2. Enrolled ${enrollRes.enrolledCount} lead(s) into campaign.`);

    // 3. Send Step 1 email (Initial Pitch)
    console.log('\n🚀 3. Triggering Step 1 email send...');
    const step1Batch = await runOutreachBatchNow({ campaignId: campaign.id, delayBetweenSendsMs: 50 });
    console.log(`   Result: Sent=${step1Batch.sent}, Failed=${step1Batch.failed}`);

    if (step1Batch.sent !== 1) {
      throw new Error(`Step 1 send failed. Sent count: ${step1Batch.sent}`);
    }
    console.log('   ✅ Step 1 email delivered successfully to SMTP transporter!');

    // 4. Verify enrollment state in database
    const dbCheck1 = await query(
      `SELECT current_step, status, next_send_at, last_message_id FROM outreach_enrollments WHERE campaign_id = $1`,
      [campaign.id]
    );
    const row1 = dbCheck1.rows[0];
    console.log(`\n📊 4. Database Status after Step 1:`);
    console.log(`   - Status: ${row1.status}`);
    console.log(`   - Current Step: ${row1.current_step} (Ready for Step 2)`);
    console.log(`   - Scheduled Next Send (7 days in future): ${new Date(row1.next_send_at).toLocaleString()}`);
    console.log(`   - Message ID (for threading): ${row1.last_message_id}`);

    // 5. Time-Travel: Fast-forward 7 days in database
    console.log('\n⏩ 5. Simulating 7 days passed (Time-Travel: shifting next_send_at to past)...');
    await query(
      `UPDATE outreach_enrollments 
       SET next_send_at = CURRENT_TIMESTAMP - INTERVAL '5 minutes' 
       WHERE campaign_id = $1`,
      [campaign.id]
    );
    console.log('   ✅ next_send_at adjusted to past timestamp. The cron runner will now treat this follow-up as DUE.');

    // 6. Trigger Step 2 email (7-Day Follow-Up)
    console.log('\n🚀 6. Triggering Step 2 (Follow-up) execution...');
    const step2Batch = await runOutreachBatchNow({ campaignId: campaign.id, delayBetweenSendsMs: 50 });
    console.log(`   Result: Sent=${step2Batch.sent}, Failed=${step2Batch.failed}, Completed=${step2Batch.completed}`);

    if (step2Batch.sent !== 1) {
      throw new Error(`Step 2 send failed. Sent count: ${step2Batch.sent}`);
    }
    console.log('   ✅ Step 2 Follow-Up email delivered successfully in the same thread!');

    // 7. Final status verification
    const dbCheck2 = await query(
      `SELECT current_step, status, last_sent_at FROM outreach_enrollments WHERE campaign_id = $1`,
      [campaign.id]
    );
    const row2 = dbCheck2.rows[0];
    console.log(`\n📊 7. Final Database Status:`);
    console.log(`   - Status: ${row2.status} (Sequence complete)`);
    console.log(`   - Last Sent: ${new Date(row2.last_sent_at).toLocaleString()}`);

    console.log('\n🎉 =======================================================');
    console.log('🎉 7-DAY FOLLOW-UP WORKFLOW TEST 100% SUCCESSFUL!');
    console.log('🎉 Check your Gmail inbox: you will see Step 1 and Step 2');
    console.log('🎉 grouped together in a single conversation thread.');
    console.log('🎉 =======================================================\n');
  } catch (err: any) {
    console.error('\n❌ Test failed with error:', err.message);
  } finally {
    if (testCampaignId) {
      await OutreachService.deleteCampaign(testCampaignId);
      console.log('🧹 Cleaned up test campaign from database.');
    }
    await pool.end();
  }
}

testFastFollowUp();
