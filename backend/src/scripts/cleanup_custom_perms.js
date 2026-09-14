import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const rows = await pool.query("SELECT id, custom_permissions FROM role_permissions");
  for (const r of rows.rows) {
    const cp = r.custom_permissions || {};
    const newCp = {};
    for (const [k, v] of Object.entries(cp)) {
      const lowerKey = k.toLowerCase();
      // Keep only roles that actually exist in the roles table
      if (lowerKey === 'management') {
        newCp['management'] = v;
      }
    }
    await pool.query(
      "UPDATE role_permissions SET custom_permissions = $1::jsonb WHERE id = $2",
      [JSON.stringify(newCp), r.id]
    );
  }
  console.log("Successfully cleaned custom_permissions in role_permissions");
  await pool.end();
}

run().catch(console.error);
