import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log('Migrating inquiries table and lost_reasons table...');
  await pool.query(`
    ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS lost_reason VARCHAR(255);
    ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS lost_comments TEXT;
    ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS lost_date VARCHAR(50);
    ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS closed_by_user_id VARCHAR(255);
    ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS won_property_id VARCHAR(255);
    ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS won_property_name VARCHAR(255);
    ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS won_final_value_monthly_inr NUMERIC(12, 2);
    ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS won_comments TEXT;
    ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS won_date VARCHAR(50);

    CREATE TABLE IF NOT EXISTS lost_reasons (
      id VARCHAR(100) PRIMARY KEY,
      reason VARCHAR(255) NOT NULL UNIQUE,
      category VARCHAR(100) DEFAULT 'General',
      sort_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const initialReasons = [
    ['lr_1', 'Budget / Pricing Misalignment', 'Financial', 1],
    ['lr_2', 'Location / Corridor Mismatch', 'Location', 2],
    ['lr_3', 'Required Clear Height / Tech Spec Unavailable', 'Specifications', 3],
    ['lr_4', 'Timeline / Possession Date Delayed', 'Timeline', 4],
    ['lr_5', 'Competitor Warehouse Selected', 'Competition', 5],
    ['lr_6', 'Project Postponed / Shelved by Client', 'Client Strategy', 6],
    ['lr_7', 'Client Decided to Buy Land / Self-Build', 'Client Strategy', 7],
    ['lr_8', 'Regulatory / Pollution Clearance Issue', 'Regulatory', 8],
    ['lr_9', 'Other / Unspecified', 'Other', 9],
  ];

  for (const [id, reason, category, order] of initialReasons) {
    await pool.query(
      'INSERT INTO lost_reasons (id, reason, category, sort_order) VALUES ($1, $2, $3, $4) ON CONFLICT (reason) DO NOTHING;',
      [id, reason, category, order]
    );
  }

  const res = await pool.query('SELECT * FROM lost_reasons ORDER BY sort_order ASC;');
  console.log('✅ Successfully created/seeded lost_reasons table. Count:', res.rows.length);
  process.exit(0);
}

run().catch((e) => {
  console.error('Migration error:', e);
  process.exit(1);
});
