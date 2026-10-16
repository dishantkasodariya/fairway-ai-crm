import { sendOutreachEmail } from '../services/emailSender.js';
import { config } from '../config/index.js';

async function testSmtp() {
  console.log('🧪 Checking SMTP Configuration...');
  console.log(`- Provider: ${config.emailProvider}`);
  console.log(`- SMTP Host: ${config.smtpHost}:${config.smtpPort}`);
  console.log(`- SMTP User: ${config.smtpUser || '(not set)'}`);

  if (!config.smtpUser || !config.smtpPass) {
    console.error('\n❌ SMTP_USER or SMTP_PASS is missing in backend/.env!');
    console.error('Please add your Gmail address and 16-character App Password to backend/.env first.');
    process.exit(1);
  }

  const recipient = process.argv[2] || config.smtpUser;
  console.log(`\n📨 Sending a verification email to: ${recipient}...`);

  try {
    const res = await sendOutreachEmail({
      to: recipient,
      subject: 'Fairway CRM - Google SMTP Verification Test',
      text: 'Congratulations! Your Google SMTP configuration in Fairway CRM is working correctly. Automated outreach emails and follow-ups are ready to be sent.',
    });
    console.log('\n✅ SUCCESS: Verification email sent!');
    console.log(`Message ID: ${res.id}`);
    console.log('Please check your Gmail inbox to confirm delivery.');
  } catch (err: any) {
    console.error('\n❌ SMTP Test Failed:', err.message);
    if (err.message.includes('535') || err.message.includes('BadCredentials')) {
      console.error('💡 Hint: Gmail rejected your credentials. Make sure you are using a 16-character Google App Password (not your main Google account password).');
    }
    process.exit(1);
  }
}

testSmtp();
