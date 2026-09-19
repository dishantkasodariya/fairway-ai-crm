import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function sanitize() {
  await pool.query(`
    UPDATE inquiries
    SET budget_monthly_inr = 3300000, required_area_sq_ft = 150000
    WHERE inquiry_number = 'INQ-6245';

    UPDATE inquiries
    SET budget_monthly_inr = 250000, required_area_sq_ft = 45000
    WHERE inquiry_number = 'INQ-6303';

    UPDATE inquiries
    SET budget_monthly_inr = 5000000
    WHERE budget_monthly_inr > 50000000;
  `);
  console.log('✅ Successfully sanitized outlier records in inquiries table.');
  process.exit(0);
}

sanitize().catch((e) => {
  console.error(e);
  process.exit(1);
});
