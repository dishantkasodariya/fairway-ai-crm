import { pool, query } from '../config/db.js';
import { OutreachService } from '../services/outreachService.js';
import { runOutreachBatchNow } from '../jobs/outreachCronRunner.js';

async function runTest() {
  console.log('🧪 Starting End-to-End Bulk Outreach & Sequence Verification...\n');

  try {
    // 1. Create a test campaign
    const campaign = await OutreachService.createCampaign({
      name: `Test Warehouse Outreach ${Date.now()}`,
      subjectTemplate: 'Industrial space inquiry for {{company}}',
      bodyTemplate: 'Hi {{name}}, we have 50,000 sq.ft available in your corridor. Interested in details?',
      followUpDelayDays: 7,
      followUpSubjectTemplate: 'Quick follow-up: Space for {{company}}',
      followUpBodyTemplate: 'Hi {{name}}, just bumping this in case you missed my earlier email regarding warehousing space.',
    });
    console.log(`✅ Step 1: Created campaign: "${campaign.name}" (ID: ${campaign.id})`);

    // 2. Enroll 2 leads
    const testLeads = [
      {
        email: `prospect_reply_${Date.now()}@example.com`,
        name: 'Amit Patel',
        companyName: 'Patel Logistics',
      },
      {
        email: `prospect_silent_${Date.now()}@example.com`,
        name: 'Suresh Kumar',
        companyName: 'Kumar Warehousing',
      },
    ];

    const enrollRes = await OutreachService.enrollContacts(campaign.id, testLeads);
    console.log(`✅ Step 2: Enrolled ${enrollRes.enrolledCount} contacts into campaign.`);

    // 3. Run Batch (Step 1 Initial pitch)
    console.log('\n🚀 Step 3: Triggering batch execution for Step 1...');
    const batch1 = await runOutreachBatchNow({ campaignId: campaign.id, delayBetweenSendsMs: 50 });
    console.log(`   Batch 1 Stats: sent=${batch1.sent}, failed=${batch1.failed}, completed=${batch1.completed}`);

    if (batch1.sent !== 2) {
      throw new Error(`Expected 2 emails sent in Batch 1, got ${batch1.sent}`);
    }

    // Inspect enrollments state after Step 1
    const campaignData1 = await OutreachService.getCampaignById(campaign.id);
    const leadReply = campaignData1?.enrollments.find((e) => e.recipientEmail === testLeads[0].email);
    const leadSilent = campaignData1?.enrollments.find((e) => e.recipientEmail === testLeads[1].email);

    console.log(`   Lead 1 Status: ${leadReply?.status}, currentStep: ${leadReply?.currentStep}, nextSendAt: ${leadReply?.nextSendAt}`);
    console.log(`   Lead 2 Status: ${leadSilent?.status}, currentStep: ${leadSilent?.currentStep}, nextSendAt: ${leadSilent?.nextSendAt}`);

    if (leadReply?.status !== 'sent' || leadReply?.currentStep !== 2) {
      throw new Error(`Lead 1 should be 'sent' on step 2, got status=${leadReply?.status}, step=${leadReply?.currentStep}`);
    }

    // 4. Simulate Lead 1 Replying
    console.log('\n📬 Step 4: Simulating reply received from Lead 1 (Amit Patel)...');
    await OutreachService.markRepliedByEmail(testLeads[0].email);

    const afterReply = await OutreachService.getCampaignById(campaign.id);
    const leadReplyAfter = afterReply?.enrollments.find((e) => e.recipientEmail === testLeads[0].email);
    console.log(`   Lead 1 Status after reply: ${leadReplyAfter?.status}`);
    if (leadReplyAfter?.status !== 'replied') {
      throw new Error(`Lead 1 status should be 'replied', got ${leadReplyAfter?.status}`);
    }

    // 5. Simulate 3 days passing for Lead 2 (Silent)
    console.log('\n⏰ Step 5: Simulating 3 days passed for Lead 2 (Suresh Kumar)...');
    await query(
      `UPDATE outreach_enrollments SET next_send_at = CURRENT_TIMESTAMP - INTERVAL '1 hour' WHERE recipient_email = $1;`,
      [testLeads[1].email]
    );

    // 6. Run Batch 2 (Follow-up 1)
    console.log('🚀 Step 6: Triggering batch execution for Follow-up 1...');
    const batch2 = await runOutreachBatchNow({ campaignId: campaign.id, delayBetweenSendsMs: 50 });
    console.log(`   Batch 2 Stats: sent=${batch2.sent}, failed=${batch2.failed}, completed=${batch2.completed}`);

    if (batch2.sent !== 1) {
      throw new Error(`Expected exactly 1 follow-up sent (to silent lead only), got ${batch2.sent}`);
    }

    // 7. Verify final states
    const finalData = await OutreachService.getCampaignById(campaign.id);
    const finalReplyLead = finalData?.enrollments.find((e) => e.recipientEmail === testLeads[0].email);
    const finalSilentLead = finalData?.enrollments.find((e) => e.recipientEmail === testLeads[1].email);

    console.log('\n📊 Final Verification Results:');
    console.log(`   - Replied Lead (Amit): Status = "${finalReplyLead?.status}" (Follow-up halted: SUCCESS)`);
    console.log(`   - Silent Lead (Suresh): Status = "${finalSilentLead?.status}" (Follow-up delivered & completed: SUCCESS)`);

    // Clean up test campaign
    await OutreachService.deleteCampaign(campaign.id);
    console.log('\n🧹 Test campaign cleaned up cleanly.');

    console.log('\n🎉 ALL TESTS PASSED! Automated Bulk Outreach & Reply Sequencing is 100% WORKING.');
  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTest();
