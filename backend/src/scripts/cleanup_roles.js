import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:Dishant%401012@localhost:5432/fairway_crm'
});

async function run() {
  console.log('--- Cleaning up roles & users ---');
  // Update users not in management to 'admin'
  await pool.query("UPDATE users SET role = 'admin' WHERE LOWER(role) NOT IN ('management')");
  await pool.query("UPDATE users SET role = 'management' WHERE LOWER(role) = 'management'");

  // Delete unwanted roles, keeping only admin and management
  await pool.query("DELETE FROM roles WHERE LOWER(key) NOT IN ('admin', 'management')");

  // Ensure admin role exists and is marked is_system
  const adminExists = await pool.query("SELECT * FROM roles WHERE LOWER(key) = 'admin'");
  if (adminExists.rows.length === 0) {
    await pool.query(`
      INSERT INTO roles (id, name, key, description, color, is_system)
      VALUES ('role_admin', 'Admin', 'admin', 'Full platform authority with unrestricted access to all data and configuration.', 'blue', true)
    `);
  } else {
    await pool.query("UPDATE roles SET is_system = true, key = 'admin', name = 'Admin', color = 'blue' WHERE LOWER(key) = 'admin'");
  }

  // Ensure management role exists and is is_system = false
  const mgmtExists = await pool.query("SELECT * FROM roles WHERE LOWER(key) = 'management'");
  if (mgmtExists.rows.length === 0) {
    await pool.query(`
      INSERT INTO roles (id, name, key, description, color, is_system)
      VALUES ('role_management', 'Management', 'management', 'Management access with custom configured rights.', 'amber', false)
    `);
  } else {
    await pool.query("UPDATE roles SET is_system = false, key = 'management', name = 'Management', color = 'amber' WHERE LOWER(key) = 'management'");
  }

  // Sync custom_permissions so both lowercase and uppercase 'management' have the same permissions
  const perms = await pool.query('SELECT id, custom_permissions FROM role_permissions');
  for (const row of perms.rows) {
    const cp = row.custom_permissions || {};
    const mgmtVal = cp['management'] || cp['MANAGEMENT'];
    if (mgmtVal) {
      await pool.query(
        `UPDATE role_permissions 
         SET custom_permissions = COALESCE(custom_permissions, '{}'::jsonb) || jsonb_build_object('management', $1::text) || jsonb_build_object('MANAGEMENT', $1::text)
         WHERE id = $2`,
        [mgmtVal, row.id]
      );
    }
  }

  const roles = await pool.query('SELECT id, name, key, is_system, color FROM roles ORDER BY is_system DESC, name ASC');
  console.log('Current Roles in DB:', roles.rows);

  const users = await pool.query('SELECT id, name, email, role FROM users ORDER BY role ASC, name ASC');
  console.log('Current Users in DB:', users.rows);

  await pool.end();
}

run().catch(console.error);
