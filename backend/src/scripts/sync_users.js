import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await pool.query("UPDATE users SET role = 'management' WHERE LOWER(email) LIKE '%bhavya%'");
  await pool.query("UPDATE users SET role = 'admin' WHERE LOWER(email) NOT LIKE '%bhavya%'");
  const res = await pool.query("SELECT id, name, email, role, status FROM users ORDER BY role, name");
  console.log("Updated users in DB:");
  console.table(res.rows);
  await pool.end();
}

run().catch(console.error);
