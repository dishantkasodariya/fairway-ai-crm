 import pg from 'pg';
import { config } from './index.js';
import { hashPassword } from '../utils/password.js';
import { runAllSchemaFixes } from './migrate_all_schemas.js';

const { Client, Pool } = pg;

/**
 * Automatically connects to the default 'postgres' database
 * to create the target database (fairway_crm) if it does not exist yet.
 */
const ensureDatabaseExists = async (targetDbName: string) => {
  let maintenanceClient: pg.Client | null = null;
  try {
    // Parse database URL to connect to default maintenance database 'postgres'
    const url = new URL(config.databaseUrl);
    url.pathname = '/postgres';
    
    maintenanceClient = new Client({
      connectionString: url.toString(),
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    await maintenanceClient.connect();

    const checkRes = await maintenanceClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1;',
      [targetDbName]
    );

    if (checkRes.rows.length === 0) {
      console.log(`🔨 Database "${targetDbName}" not found. Creating database now...`);
      await maintenanceClient.query(`CREATE DATABASE "${targetDbName}";`);
      console.log(`🎉 Database "${targetDbName}" created successfully!`);
    } else {
      console.log(`ℹ️ Database "${targetDbName}" already exists.`);
    }
  } catch (err: any) {
    console.warn(`⚠️ Database check/creation notice:`, err.message);
  } finally {
    if (maintenanceClient) {
      try {
        await maintenanceClient.end();
      } catch {}
    }
  }
};

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

const AVAILABLE_AREA_EXPR = `GREATEST(0,
  COALESCE(p.total_area_sq_ft, 0)
  - COALESCE(p.baseline_occupied_sq_ft, 0)
  - COALESCE((SELECT SUM(l.area_sq_ft) FROM leases l WHERE l.property_id = p.id AND l.status = 'active'), 0)
  - COALESCE((SELECT SUM(h.area_sq_ft) FROM space_holds h WHERE h.property_id = p.id AND h.status = 'active'), 0))`;

export const RECALCULATE_ALL_PROPERTY_SPACE_SQL = `UPDATE properties p SET available_area_sq_ft = ${AVAILABLE_AREA_EXPR};`;
export const RECALCULATE_PROPERTY_SPACE_SQL = `UPDATE properties p SET available_area_sq_ft = ${AVAILABLE_AREA_EXPR}, updated_at = CURRENT_TIMESTAMP WHERE p.id = $1;`;

/**
 * Initializes PostgreSQL database and tables.
 */
export const initDatabase = async () => {
  try {
    const url = new URL(config.databaseUrl);
    const targetDbName = url.pathname.replace(/^\//, '').split('?')[0] || 'fairway_crm';

    // 1. Ensure database exists
    await ensureDatabaseExists(targetDbName);

    // 2. Connect to the target database
    const client = await pool.connect();
    console.log(`✅ Connected to PostgreSQL database "${targetDbName}".`);

    // 3. Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        department VARCHAR(255) DEFAULT 'Industrial Leasing',
        avatar TEXT,
        phone VARCHAR(50) DEFAULT '+91 988496151',
        timezone VARCHAR(100) DEFAULT 'Asia/Kolkata',
        working_hours_start VARCHAR(50) DEFAULT '10:00 AM',
        working_hours_end VARCHAR(50) DEFAULT '7:30 PM',
        two_factor_enabled BOOLEAN DEFAULT false,
        birth_date VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Active',
        assigned_leads_count INT DEFAULT 0,
        last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255) DEFAULT 'Industrial Leasing';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT '+91 988496151';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'Asia/Kolkata';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS working_hours_start VARCHAR(50) DEFAULT '10:00 AM';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS working_hours_end VARCHAR(50) DEFAULT '7:30 PM';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_leads_count INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      DO $do$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'createdAt') THEN
          ALTER TABLE users ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
          ALTER TABLE users ALTER COLUMN "createdAt" DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updatedAt') THEN
          ALTER TABLE users ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
          ALTER TABLE users ALTER COLUMN "updatedAt" DROP NOT NULL;
        END IF;
      END
      $do$;
    `);
    console.log('✅ Table "users" verified / updated in PostgreSQL.');

    // 4. Create roles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        key VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        color VARCHAR(50) DEFAULT 'blue',
        is_system BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "roles" verified / updated in PostgreSQL.');

    // Seed default system roles if empty
    const roleCountRes = await client.query('SELECT COUNT(*) FROM roles;');
    if (parseInt(roleCountRes.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding default roles into PostgreSQL...');
      const defaultRoles = [
        ['role_admin', 'Admin', 'admin', 'Full platform authority with unrestricted access to all data, security logs, and configuration.', 'blue', true],
      ];

      for (const r of defaultRoles) {
        await client.query(
          `INSERT INTO roles (id, name, key, description, color, is_system)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING;`,
          r
        );
      }
      console.log('✅ System roles seeded in PostgreSQL.');
    }

    // 5. Create role_permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id VARCHAR(255) PRIMARY KEY,
        capability VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'General',
        super_admin VARCHAR(50) DEFAULT 'Yes',
        admin VARCHAR(50) DEFAULT 'Yes',
        sales VARCHAR(50) DEFAULT 'No',
        viewer VARCHAR(50) DEFAULT 'No',
        custom_permissions JSONB DEFAULT '{}',
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS custom_permissions JSONB DEFAULT '{}';
    `);
    console.log('✅ Table "role_permissions" verified / updated in PostgreSQL.');


    // Seed default role_permissions if table is empty
    const permRes = await client.query('SELECT COUNT(*) FROM role_permissions;');
    if (parseInt(permRes.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding initial Role Permissions Matrix into PostgreSQL...');
      const defaultMatrix = [
        ['perm_1', 'View all companies & accounts', 'Companies & Accounts', 'Yes', 'Yes', 'Assigned / All', 'View', 'Ability to browse company records and detailed dossiers.'],
        ['perm_2', 'Create new company & contacts', 'Companies & Accounts', 'Yes', 'Yes', 'Yes', 'No', 'Ability to register new enterprise companies and associated stakeholders.'],
        ['perm_3', 'Edit company information', 'Companies & Accounts', 'Yes', 'Yes', 'Assigned / All', 'No', 'Update company contact information, GSTIN, and requirements.'],
        ['perm_4', 'Delete / Archive company', 'Companies & Accounts', 'Yes', 'Yes', 'Restricted', 'No', 'Permanently delete or archive company records.'],
        ['perm_5', 'Create & import inquiries', 'Inquiries & Leads', 'Yes', 'Yes', 'Yes', 'No', 'Add new inquiries or bulk import from CSV/Excel sheets.'],
        ['perm_6', 'Change pipeline stages', 'Pipeline & Deals', 'Yes', 'Yes', 'Yes', 'No', 'Move deals through Kanban stages from Inquiry to Won.'],
        ['perm_7', 'Configure pipeline stages', 'Pipeline & Deals', 'Yes', 'Yes', 'No', 'No', 'Modify stage win probabilities, SLAs, and order.'],
        ['perm_8', 'Create & complete tasks', 'Tasks & Follow-ups', 'Yes', 'Yes', 'Yes', 'No', 'Assign and execute follow-up tasks and call schedules.'],
        ['perm_9', 'Draft commercial proposals', 'Proposals & Financials', 'Yes', 'Yes', 'Yes', 'View', 'Generate PDF proposals and commercial lease quotes.'],
        ['perm_10', 'Manage users & roles', 'Administration', 'Yes', 'Configurable', 'No', 'No', 'Add, edit, deactivate users and update role permissions.'],
        ['perm_11', 'View system audit logs', 'Administration', 'Yes', 'Limited', 'No', 'No', 'Inspect security and audit trail event logs.'],
        ['perm_12', 'Export data to Excel / CSV', 'Administration', 'Yes', 'Yes', 'Restricted', 'No', 'Export master tables and analytical reports.'],
        ['perm_13', 'View all properties & warehouses', 'Properties & Warehouses', 'Yes', 'Yes', 'Assigned / All', 'View', 'Ability to browse warehouse park records and facility details.'],
        ['perm_14', 'Create new property & warehouse', 'Properties & Warehouses', 'Yes', 'Yes', 'Yes', 'No', 'Ability to register new warehouse parks and facilities.'],
        ['perm_15', 'Edit property information', 'Properties & Warehouses', 'Yes', 'Yes', 'Assigned / All', 'No', 'Update warehouse park details, coordinates, and specifications.'],
        ['perm_16', 'Delete / Archive property', 'Properties & Warehouses', 'Yes', 'Yes', 'Restricted', 'No', 'Permanently delete or archive warehouse park records.'],
        ['perm_17', 'View all inquiries & leads', 'Inquiries & Leads', 'Yes', 'Yes', 'Assigned / All', 'View', 'Browse inquiries, deal details and follow-up history.'],
        ['perm_18', 'Edit inquiries & log follow-ups', 'Inquiries & Leads', 'Yes', 'Yes', 'Assigned / All', 'No', 'Update deal details, log follow-ups, draft proposals and schedule visits.'],
        ['perm_19', 'Delete / Archive inquiries', 'Inquiries & Leads', 'Yes', 'Yes', 'Restricted', 'No', 'Permanently delete or archive inquiries.'],
      ];

      for (const row of defaultMatrix) {
        await client.query(
          `INSERT INTO role_permissions (id, capability, category, super_admin, admin, sales, viewer, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING;`,
          row
        );
      }
      console.log('✅ Default Role Permissions Matrix seeded successfully in PostgreSQL.');
    }

    // 5. Seed default demo admin, Bhavya, and sales accounts
    console.log('🌱 Ensuring standard user accounts exist in PostgreSQL...');
    const defaultPasswordHash = await hashPassword('fairway123');

    const defaultSeedUsers = [
      [
        'usr_amit_1',
        'Amit Patel',
        'amit@fairway.co.in',
        defaultPasswordHash,
        'admin',
        'Executive Leadership',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        '+91 98250 12345',
        'Active',
        16,
      ],
      [
        'usr_aryan_1',
        'Aryan Verma',
        'aryan@fairway.co.in',
        defaultPasswordHash,
        'admin',
        'Executive Leadership',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        '+91 98250 67890',
        'Active',
        14,
      ],
      [
        'usr_bhavya_1',
        'Bhavya Sharma',
        'bhavya@gmail.com',
        defaultPasswordHash,
        'management',
        'Executive Leadership',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        '+91 98250 12345',
        'Active',
        8,
      ],
      [
        'usr_bhavya_2',
        'Bhavya Sharma',
        'bhavya.sharma@fairwaylogistics.in',
        defaultPasswordHash,
        'management',
        'Executive Leadership',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        '+91 98250 12345',
        'Active',
        8,
      ],
      
      [
        'usr_sales_1',
        'Pooja Hegde',
        'sales@fairway.co.in',
        defaultPasswordHash,
        'admin',
        'Gujarat Leasing Desk',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        '+91 98980 11223',
        'Active',
        22,
      ],
    ];

    for (const u of defaultSeedUsers) {
      await client.query(
        `INSERT INTO users (id, name, email, password, role, department, avatar, phone, status, assigned_leads_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (email) DO UPDATE 
         SET name = EXCLUDED.name, 
             password = EXCLUDED.password, 
             department = EXCLUDED.department, 
             avatar = EXCLUDED.avatar;`,
        u
      );
    }

    // Explicitly ensure Amit and Aryan are Admin with standard fairway123 password
    await client.query(`
      UPDATE users 
      SET role = 'admin',
          password = $1,
          department = 'Executive Leadership'
      WHERE LOWER(email) IN ('amit@fairway.co.in', 'aryan@fairway.co.in');
    `, [defaultPasswordHash]);

    console.log('✅ Standard users verified and synced in PostgreSQL.');

    // 6. Create companies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        legal_name VARCHAR(255),
        website VARCHAR(255),
        industry VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Active',
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(20),
        phone VARCHAR(50),
        email VARCHAR(255),
        assigned_owner_id VARCHAR(255),
        assigned_owner_name VARCHAR(255),
        prospect_stage VARCHAR(100) DEFAULT 'New',
        priority VARCHAR(50) DEFAULT 'High',
        annual_turnover VARCHAR(100),
        employee_count VARCHAR(100),
        gujarat_presence BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "companies" verified / updated in PostgreSQL.');

    // 7. Create contacts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id VARCHAR(255) PRIMARY KEY,
        company_id VARCHAR(255) REFERENCES companies(id) ON DELETE CASCADE,
        company_name VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        designation VARCHAR(255),
        department VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        linkedin_url VARCHAR(255),
        is_primary BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "contacts" verified / updated in PostgreSQL.');

    // 8. Create facilities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS facilities (
        id VARCHAR(255) PRIMARY KEY,
        company_id VARCHAR(255) REFERENCES companies(id) ON DELETE CASCADE,
        company_name VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(20),
        latitude NUMERIC(10, 6),
        longitude NUMERIC(10, 6),
        status VARCHAR(50) DEFAULT 'Planned',
        built_up_area_sq_ft NUMERIC(12, 2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "facilities" verified / updated in PostgreSQL.');

    // 9. Create inquiries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id VARCHAR(255) PRIMARY KEY,
        inquiry_number VARCHAR(50) UNIQUE NOT NULL,
        company_id VARCHAR(255) REFERENCES companies(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL,
        contact_id VARCHAR(255),
        contact_name VARCHAR(255),
        contact_phone VARCHAR(50),
        contact_email VARCHAR(255),
        whatsapp VARCHAR(50),
        linkedin VARCHAR(255),
        source VARCHAR(100) DEFAULT 'Direct',
        inquiry_date VARCHAR(50) DEFAULT CURRENT_DATE,
        salesperson_id VARCHAR(255),
        salesperson_name VARCHAR(255),
        requirement TEXT,
        required_area_sq_ft NUMERIC(12, 2) DEFAULT 0,
        location VARCHAR(255),
        target_corridor VARCHAR(255),
        industry VARCHAR(255),
        possession_date VARCHAR(50),
        lease_duration_months INT DEFAULT 60,
        budget_monthly_inr NUMERIC(15, 2) DEFAULT 0,
        dock_requirements INT DEFAULT 0,
        clear_height_ft NUMERIC(6, 2) DEFAULT 0,
        floor_load_capacity VARCHAR(100),
        power_kva NUMERIC(10, 2) DEFAULT 0,
        fire_systems_required BOOLEAN DEFAULT false,
        special_requirements TEXT,
        broker_name VARCHAR(255),
        broker_commission VARCHAR(100),
        priority VARCHAR(50) DEFAULT 'High',
        lead_score INT DEFAULT 85,
        opportunity_score INT DEFAULT 90,
        stage VARCHAR(100) DEFAULT 'new',
        status VARCHAR(50) DEFAULT 'Active',
        next_action TEXT,
        next_follow_up_date VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Auto-migrate columns to unconstrained NUMERIC/BIGINT to prevent any numeric field overflow
      ALTER TABLE inquiries ALTER COLUMN required_area_sq_ft TYPE NUMERIC;
      ALTER TABLE inquiries ALTER COLUMN budget_monthly_inr TYPE NUMERIC;
      ALTER TABLE inquiries ALTER COLUMN power_kva TYPE NUMERIC;
      ALTER TABLE inquiries ALTER COLUMN clear_height_ft TYPE NUMERIC;
      ALTER TABLE inquiries ALTER COLUMN dock_requirements TYPE BIGINT;
      ALTER TABLE inquiries ALTER COLUMN lease_duration_months TYPE BIGINT;
      ALTER TABLE inquiries ALTER COLUMN lead_score TYPE BIGINT;
      ALTER TABLE inquiries ALTER COLUMN opportunity_score TYPE BIGINT;

      -- Auto-migrate companies columns
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255);
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS assigned_owner_id VARCHAR(255);
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS assigned_owner_name VARCHAR(255);
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS prospect_stage VARCHAR(100) DEFAULT 'New';
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS annual_turnover VARCHAR(100);
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count VARCHAR(100);
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS gujarat_presence BOOLEAN DEFAULT true;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      -- Auto-migrate contacts columns
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255);
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      -- Auto-migrate facilities columns
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS latitude NUMERIC;
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS longitude NUMERIC;
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS built_up_area_sq_ft NUMERIC;
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE facilities ALTER COLUMN latitude TYPE NUMERIC;
      ALTER TABLE facilities ALTER COLUMN longitude TYPE NUMERIC;
      ALTER TABLE facilities ALTER COLUMN built_up_area_sq_ft TYPE NUMERIC;

      -- Auto-migrate inquiries columns
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS inquiry_number VARCHAR(50);
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS contact_id VARCHAR(255);
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS linkedin VARCHAR(255);
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS source VARCHAR(100) DEFAULT 'Direct';
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS inquiry_date VARCHAR(50) DEFAULT CURRENT_DATE;
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS salesperson_id VARCHAR(255);
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS salesperson_name VARCHAR(255);
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS requirement TEXT;
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS required_area_sq_ft NUMERIC;
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS location VARCHAR(255);
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS target_corridor VARCHAR(255);
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS possession_date VARCHAR(50);
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS lease_duration_months BIGINT DEFAULT 36;
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS budget_monthly_inr NUMERIC;
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS dock_requirements BIGINT DEFAULT 2;
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS clear_height_ft NUMERIC DEFAULT 30;
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS floor_load_capacity VARCHAR(100) DEFAULT '5 MT/Sq.M';
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS power_kva NUMERIC DEFAULT 50;
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS fire_systems_required BOOLEAN DEFAULT true;
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS special_requirements TEXT;
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'Medium';
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS lead_score BIGINT DEFAULT 80;
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS opportunity_score BIGINT DEFAULT 90;
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS stage VARCHAR(100) DEFAULT 'new';
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS next_action TEXT;
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS next_follow_up_date VARCHAR(50);
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      -- Relax legacy camelCase NOT NULL constraints if they exist
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'companyId') THEN
          ALTER TABLE contacts ALTER COLUMN "companyId" DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'updatedAt') THEN
          ALTER TABLE contacts ALTER COLUMN "updatedAt" DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'createdAt') THEN
          ALTER TABLE contacts ALTER COLUMN "createdAt" DROP NOT NULL;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facilities' AND column_name = 'companyId') THEN
          ALTER TABLE facilities ALTER COLUMN "companyId" DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facilities' AND column_name = 'name') THEN
          ALTER TABLE facilities ALTER COLUMN "name" DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facilities' AND column_name = 'updatedAt') THEN
          ALTER TABLE facilities ALTER COLUMN "updatedAt" DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facilities' AND column_name = 'createdAt') THEN
          ALTER TABLE facilities ALTER COLUMN "createdAt" DROP NOT NULL;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inquiries' AND column_name = 'companyId') THEN
          ALTER TABLE inquiries ALTER COLUMN "companyId" DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inquiries' AND column_name = 'stageId') THEN
          ALTER TABLE inquiries ALTER COLUMN "stageId" DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inquiries' AND column_name = 'inquiryNumber') THEN
          ALTER TABLE inquiries ALTER COLUMN "inquiryNumber" DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inquiries' AND column_name = 'updatedAt') THEN
          ALTER TABLE inquiries ALTER COLUMN "updatedAt" DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inquiries' AND column_name = 'createdAt') THEN
          ALTER TABLE inquiries ALTER COLUMN "createdAt" DROP NOT NULL;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'updatedAt') THEN
          ALTER TABLE companies ALTER COLUMN "updatedAt" DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'createdAt') THEN
          ALTER TABLE companies ALTER COLUMN "createdAt" DROP NOT NULL;
        END IF;
      END $$;
    `);
    console.log('✅ Tables "companies", "contacts", "facilities", and "inquiries" verified / updated in PostgreSQL.');

    // System metadata for tracking migrations and seeds
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_metadata (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const seedMetaCheck = await client.query(
      "SELECT value FROM system_metadata WHERE key = 'initial_demo_seed_applied';"
    );
    const initialSeedAlreadyApplied = seedMetaCheck.rows.length > 0;

    // Seed initial companies & inquiries only if seed hasn't been applied yet
    const compCount = await client.query('SELECT COUNT(*) FROM companies;');
    if (!initialSeedAlreadyApplied && process.env.SEED_DEMO_DATA !== 'false' && parseInt(compCount.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding initial demo companies and inquiries into PostgreSQL...');
      
      const comp1Id = 'comp_1';
      await client.query(`
        INSERT INTO companies (
          id, name, legal_name, website, industry, status, address, city, state, pincode, phone, email, assigned_owner_id, assigned_owner_name, prospect_stage, priority, annual_turnover, employee_count, gujarat_presence
        ) VALUES (
          $1, 'Reliance Petrochemicals', 'Reliance Petrochemicals Private Limited', 'https://reliancepetro.com', 'Specialty Chemicals & Polymers', 'Active',
          'Plot 42, Dahej PCPIR Complex', 'Dahej', 'Gujarat', '392130', '+91 98250 11223', 'contact@reliancepetro.com', 'usr_sales_1', 'Pooja Hegde', 'Requirement Confirmed', 'High', '₹5,000+ Cr', '5,000+', true
        );
      `, [comp1Id]);

      await client.query(`
        INSERT INTO contacts (
          id, company_id, company_name, name, designation, department, phone, email, is_primary
        ) VALUES (
          'cnt_1', $1, 'Reliance Petrochemicals', 'Rajesh Patel', 'VP Supply Chain & Real Estate', 'Supply Chain', '+91 98250 11223', 'rajesh.patel@reliancepetro.com', true
        );
      `, [comp1Id]);

      await client.query(`
        INSERT INTO facilities (
          id, company_id, company_name, name, type, address, city, state, pincode, status, built_up_area_sq_ft
        ) VALUES (
          'fac_1', $1, 'Reliance Petrochemicals', 'Dahej Bulk Chemical Hub', 'Warehouse', 'Plot 42, Dahej PCPIR Complex', 'Dahej', 'Gujarat', '392130', 'Active', 120000
        );
      `, [comp1Id]);

      await client.query(`
        INSERT INTO inquiries (
          id, inquiry_number, company_id, company_name, contact_id, contact_name, contact_phone, contact_email, source, inquiry_date, salesperson_id, salesperson_name, requirement, required_area_sq_ft, location, target_corridor, industry, possession_date, lease_duration_months, budget_monthly_inr, dock_requirements, clear_height_ft, floor_load_capacity, power_kva, fire_systems_required, special_requirements, priority, lead_score, opportunity_score, stage, status, next_action, next_follow_up_date
        ) VALUES (
          'inq_1048', 'INQ-1048', $1, 'Reliance Petrochemicals', 'cnt_1', 'Rajesh Patel', '+91 98250 11223', 'rajesh.patel@reliancepetro.com', 'Direct', '2026-08-25', 'usr_sales_1', 'Pooja Hegde',
          'Requirement for 75,000 sq.ft Grade A chemical storage warehouse in Dahej PCPIR', 75000, 'Dahej PCPIR', 'Dahej PCPIR Corridor', 'Specialty Chemicals & Polymers', '2026-10-01', 60, 1650000, 10, 12, '6 MT/sq.m', 1200, true,
          'NFPA compliant fire sprinklers, chemical grade epoxy flooring, 24/7 security.', 'High', 85, 90, 'property_matched', 'Active', 'Review initial property matches and share commercial proposal.', '2026-09-02'
        );
      `, [comp1Id]);

      console.log('✅ Demo company & inquiry seeded successfully.');
    }

    // 10. Create tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(255) PRIMARY KEY,
        company_id VARCHAR(255) REFERENCES companies(id) ON DELETE SET NULL,
        company_name VARCHAR(255),
        inquiry_id VARCHAR(255) REFERENCES inquiries(id) ON DELETE SET NULL,
        inquiry_number VARCHAR(50),
        facility_id VARCHAR(255),
        assigned_user_id VARCHAR(255),
        assigned_user_name VARCHAR(255),
        task_type VARCHAR(50) DEFAULT 'Call',
        description TEXT NOT NULL,
        due_date VARCHAR(50) NOT NULL,
        due_time VARCHAR(50) DEFAULT '11:00 AM',
        priority VARCHAR(50) DEFAULT 'High',
        status VARCHAR(50) DEFAULT 'Pending',
        completed_at TIMESTAMP WITH TIME ZONE,
        completed_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "tasks" verified / updated in PostgreSQL.');

    // Seed initial demo tasks if table is empty and seed not applied yet
    const taskCount = await client.query('SELECT COUNT(*) FROM tasks;');
    if (!initialSeedAlreadyApplied && process.env.SEED_DEMO_DATA !== 'false' && parseInt(taskCount.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding initial demo tasks into PostgreSQL...');
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      await client.query(`
        INSERT INTO tasks (
          id, company_id, company_name, inquiry_id, inquiry_number, assigned_user_id, assigned_user_name, task_type, description, due_date, due_time, priority, status
        ) VALUES 
        (
          'task_1', 'comp_1', 'Reliance Petrochemicals', 'inq_1048', 'INQ-1048', 'usr_sales_1', 'Pooja Hegde', 'Call',
          'Follow up on Dahej Grade-A technical layout specs with Rajesh Patel.', $1, '11:00 AM', 'High', 'Pending'
        ),
        (
          'task_2', 'comp_1', 'Reliance Petrochemicals', 'inq_1048', 'INQ-1048', 'usr_sales_1', 'Pooja Hegde', 'Site Visit',
          'Schedule physical warehouse inspection at Dahej PCPIR Logistics Park.', $2, '02:30 PM', 'High', 'Pending'
        ),
        (
          'task_3', 'comp_1', 'Reliance Petrochemicals', 'inq_1048', 'INQ-1048', 'usr_admin_1', 'Aditya Mehta', 'Meeting',
          'Review quarterly industrial requirements with regional corporate director.', $3, '04:00 PM', 'Medium', 'Pending'
        );
      `, [todayStr, tomorrowStr, yesterdayStr]);
      console.log('✅ Demo tasks seeded successfully.');
    }

    // 11. Create properties table
    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id VARCHAR(255) PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        corridor VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL DEFAULT 'Gujarat',
        pincode VARCHAR(20),
        total_area_sq_ft NUMERIC(12, 2) NOT NULL,
        available_area_sq_ft NUMERIC(12, 2) NOT NULL,
        rent_per_sq_ft_inr NUMERIC(10, 2) NOT NULL,
        deposit_months INT DEFAULT 3,
        lease_terms_years INT DEFAULT 5,
        availability_date VARCHAR(50),
        clear_height_ft NUMERIC(6, 2) DEFAULT 12,
        docks_count INT DEFAULT 8,
        fire_systems VARCHAR(255) DEFAULT 'NFPA Compliant Sprinklers & Hydrants',
        power_kva NUMERIC(10, 2) DEFAULT 1000,
        parking_slots INT DEFAULT 20,
        truck_access VARCHAR(255) DEFAULT 'Multi-Axle & Trailer Access',
        flooring_capacity_mt NUMERIC(6, 2) DEFAULT 6,
        cctv_security BOOLEAN DEFAULT true,
        green_building_cert VARCHAR(100) DEFAULT 'IGBC Pre-Certified Gold',
        latitude NUMERIC(10, 6) DEFAULT 21.712,
        longitude NUMERIC(10, 6) DEFAULT 72.585,
        photos JSONB DEFAULT '[]',
        brochure_url TEXT,
        status VARCHAR(50) DEFAULT 'Available',
        amenities JSONB DEFAULT '[]',
        suitable_industries JSONB DEFAULT '[]',
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "properties" verified / updated in PostgreSQL.');

    // Seed initial properties if empty and seed not applied yet
    const propCount = await client.query('SELECT COUNT(*) FROM properties;');
    if (!initialSeedAlreadyApplied && process.env.SEED_DEMO_DATA !== 'false' && parseInt(propCount.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding initial demo properties into PostgreSQL...');
      
      const demoProps = [
        {
          id: 'prop_1',
          code: 'FW-DHJ-01',
          name: 'Dahej Mega Logistics Park - Phase 1',
          location: 'Dahej PCPIR Corridor, Bharuch',
          corridor: 'Dahej PCPIR Corridor',
          city: 'Dahej',
          state: 'Gujarat',
          pincode: '392130',
          total_area_sq_ft: 250000,
          available_area_sq_ft: 95000,
          rent_per_sq_ft_inr: 22,
          deposit_months: 3,
          lease_terms_years: 5,
          availability_date: 'Immediate',
          clear_height_ft: 12,
          docks_count: 14,
          fire_systems: 'NFPA 13 Compliant Sprinklers + Smoke Detectors',
          power_kva: 1500,
          parking_slots: 35,
          truck_access: 'Multi-Axle Commercial Grade Access',
          flooring_capacity_mt: 6,
          cctv_security: true,
          green_building_cert: 'IGBC Gold Certified',
          latitude: 21.7124,
          longitude: 72.5852,
          photos: JSON.stringify([
            'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&auto=format&fit=crop&q=80',
          ]),
          status: 'Available',
          amenities: JSON.stringify(['24/7 Security', 'Weighbridge 100MT', 'LED High-Bay Lighting', 'Drivers Lounge']),
          suitable_industries: JSON.stringify(['Specialty Chemicals & Polymers', 'Pharmaceuticals & APIs', '3PL & Contract Logistics']),
          description: 'State of the art Grade A chemical and heavy distribution warehouse located right at Dahej PCPIR node.',
        },
        {
          id: 'prop_2',
          code: 'FW-SND-02',
          name: 'Sanand Industrial & EV Logistics Hub',
          location: 'Sanand GIDC Phase 2, Ahmedabad',
          corridor: 'Sanand Auto Hub Corridor',
          city: 'Sanand',
          state: 'Gujarat',
          pincode: '382110',
          total_area_sq_ft: 180000,
          available_area_sq_ft: 60000,
          rent_per_sq_ft_inr: 25,
          deposit_months: 3,
          lease_terms_years: 5,
          availability_date: 'Immediate',
          clear_height_ft: 13,
          docks_count: 10,
          fire_systems: 'FM Global Standard Sprinklers',
          power_kva: 2000,
          parking_slots: 40,
          truck_access: 'Trailer Grade Concrete Apron',
          flooring_capacity_mt: 7,
          cctv_security: true,
          green_building_cert: 'IGBC Platinum Certified',
          latitude: 22.9868,
          longitude: 72.3812,
          photos: JSON.stringify([
            'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&auto=format&fit=crop&q=80',
          ]),
          status: 'Available',
          amenities: JSON.stringify(['EV Fast Chargers', '100% DG Backup', 'Canteen & Rest Area']),
          suitable_industries: JSON.stringify(['Automotive & EV Components', 'Electronics', 'Heavy Engineering']),
          description: 'High-spec industrial manufacturing and staging facility built for automotive suppliers and electronics assemblers.',
        },
        {
          id: 'prop_3',
          code: 'FW-SRT-03',
          name: 'Surat Hazira Portside Logistics Centre',
          location: 'Hazira Industrial Zone, Surat',
          corridor: 'Hazira Port Corridor',
          city: 'Surat',
          state: 'Gujarat',
          pincode: '394270',
          total_area_sq_ft: 320000,
          available_area_sq_ft: 140000,
          rent_per_sq_ft_inr: 24,
          deposit_months: 4,
          lease_terms_years: 9,
          availability_date: 'Oct 2026',
          clear_height_ft: 14,
          docks_count: 20,
          fire_systems: 'NFPA Hydrant & Sprinkler Grid',
          power_kva: 2500,
          parking_slots: 50,
          truck_access: 'Heavy Container Truck Port Access',
          flooring_capacity_mt: 8,
          cctv_security: true,
          green_building_cert: 'IGBC Certified',
          latitude: 21.1158,
          longitude: 72.6582,
          photos: JSON.stringify([
            'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&auto=format&fit=crop&q=80',
          ]),
          status: 'Available',
          amenities: JSON.stringify(['Port CFS Connectivity', 'Customs Bonded Area', '24/7 Gatehouse']),
          suitable_industries: JSON.stringify(['FMCG & Retail Distribution', 'Edible Oils & Commodities', '3PL & Contract Logistics']),
          description: 'Portside distribution center with bonded customs warehousing and container loading yards.',
        },
      ];

      for (const p of demoProps) {
        await client.query(`
          INSERT INTO properties (
            id, code, name, location, corridor, city, state, pincode, total_area_sq_ft, available_area_sq_ft,
            rent_per_sq_ft_inr, deposit_months, lease_terms_years, availability_date, clear_height_ft,
            docks_count, fire_systems, power_kva, parking_slots, truck_access, flooring_capacity_mt,
            cctv_security, green_building_cert, latitude, longitude, photos, status, amenities,
            suitable_industries, description, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21,
            $22, $23, $24, $25, $26, $27, $28,
            $29, $30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          ) ON CONFLICT (id) DO NOTHING;
        `, [
          p.id, p.code, p.name, p.location, p.corridor, p.city, p.state, p.pincode, p.total_area_sq_ft, p.available_area_sq_ft,
          p.rent_per_sq_ft_inr, p.deposit_months, p.lease_terms_years, p.availability_date, p.clear_height_ft,
          p.docks_count, p.fire_systems, p.power_kva, p.parking_slots, p.truck_access, p.flooring_capacity_mt,
          p.cctv_security, p.green_building_cert, p.latitude, p.longitude, p.photos, p.status, p.amenities,
          p.suitable_industries, p.description,
        ]);
      }
      console.log('✅ Demo properties seeded successfully.');
    }

    // 12. Create proposals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS proposals (
        id VARCHAR(255) PRIMARY KEY,
        proposal_number VARCHAR(50) UNIQUE NOT NULL,
        inquiry_id VARCHAR(255) REFERENCES inquiries(id) ON DELETE CASCADE,
        inquiry_number VARCHAR(50),
        company_id VARCHAR(255) REFERENCES companies(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL,
        contact_id VARCHAR(255),
        contact_name VARCHAR(255),
        property_id VARCHAR(255) REFERENCES properties(id) ON DELETE SET NULL,
        property_name VARCHAR(255) NOT NULL,
        proposed_area_sq_ft NUMERIC(12, 2) NOT NULL,
        base_rent_per_sq_ft_inr NUMERIC(10, 2) NOT NULL,
        maintenance_per_sq_ft_inr NUMERIC(10, 2) DEFAULT 0,
        total_monthly_rent_inr NUMERIC(15, 2) NOT NULL,
        security_deposit_months INT DEFAULT 3,
        total_deposit_inr NUMERIC(15, 2) NOT NULL,
        lease_tenure_years INT DEFAULT 5,
        lock_in_months INT DEFAULT 36,
        escalation_percent_per_year NUMERIC(5, 2) DEFAULT 5,
        possession_date VARCHAR(50),
        commercial_terms TEXT,
        proposal_date VARCHAR(50),
        expiry_date VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Sent',
        document_name VARCHAR(255),
        document_size VARCHAR(50) DEFAULT '1.4 MB',
        notes TEXT,
        created_by_user_id VARCHAR(255),
        created_by_user_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "proposals" verified / updated in PostgreSQL.');

    // Seed initial proposals if empty and seed not applied yet
    const proposalCount = await client.query('SELECT COUNT(*) FROM proposals;');
    if (!initialSeedAlreadyApplied && process.env.SEED_DEMO_DATA !== 'false' && parseInt(proposalCount.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding initial demo proposals into PostgreSQL...');
      await client.query(`
        INSERT INTO proposals (
          id, proposal_number, inquiry_id, inquiry_number, company_id, company_name,
          contact_id, contact_name, property_id, property_name, proposed_area_sq_ft,
          base_rent_per_sq_ft_inr, maintenance_per_sq_ft_inr, total_monthly_rent_inr,
          security_deposit_months, total_deposit_inr, lease_tenure_years, lock_in_months,
          escalation_percent_per_year, possession_date, commercial_terms, proposal_date,
          expiry_date, status, document_name, document_size, notes, created_by_user_id,
          created_by_user_name, created_at, updated_at
        ) VALUES (
          'prp_1043', 'PR-1043', 'inq_1048', 'INQ-1048', 'comp_1', 'Reliance Petrochemicals',
          'cnt_1', 'Rajesh Patel', 'prop_1', 'Dahej Mega Logistics Park - Phase 1', 75000,
          22, 1.5, 1762500,
          3, 5287500, 5, 36,
          5, '2026-10-01', 'Includes 10 dock doors, NFPA sprinkler system, 1,200 kVA power line.', '2026-08-28',
          '2026-09-28', 'Sent', 'Fairway_Proposal_INQ-1048_FW-DHJ-01.pdf', '1.4 MB', 'Commercial proposal delivered for technical review.', 'usr_sales_1',
          'Pooja Hegde', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Demo proposals seeded successfully.');
    }

    // Mark that initial demo seed has been processed so deleted records never resurrect
    if (!initialSeedAlreadyApplied) {
      await client.query(`
        INSERT INTO system_metadata (key, value)
        VALUES ('initial_demo_seed_applied', 'true')
        ON CONFLICT (key) DO NOTHING;
      `);
    }

    // 13. Create activities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id VARCHAR(255) PRIMARY KEY,
        company_id VARCHAR(255) REFERENCES companies(id) ON DELETE CASCADE,
        company_name VARCHAR(255),
        inquiry_id VARCHAR(255) REFERENCES inquiries(id) ON DELETE SET NULL,
        inquiry_number VARCHAR(50),
        user_id VARCHAR(255),
        user_name VARCHAR(255),
        activity_type VARCHAR(50) DEFAULT 'Call',
        title VARCHAR(255) NOT NULL,
        description TEXT,
        metadata JSONB DEFAULT '{}',
        activity_date VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_activities_company ON activities(company_id);
      CREATE INDEX IF NOT EXISTS idx_activities_inquiry ON activities(inquiry_id);
    `);
    console.log('✅ Table "activities" verified / updated in PostgreSQL.');

    // Seed demo activity if empty
    const actCount = await client.query('SELECT COUNT(*) FROM activities;');
    if (parseInt(actCount.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO activities (
          id, company_id, company_name, inquiry_id, inquiry_number, user_id, user_name, activity_type, title, description, activity_date
        ) VALUES (
          'act_1', 'comp_1', 'Reliance Petrochemicals', 'inq_1048', 'INQ-1048', 'usr_sales_1', 'Pooja Hegde', 'Call',
          'Initial technical discussion regarding 75,000 sq.ft requirement at Dahej PCPIR node.',
          CURRENT_DATE::text
        );
      `);
      console.log('✅ Demo activity seeded.');
    }

    // 14. Create notes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id VARCHAR(255) PRIMARY KEY,
        company_id VARCHAR(255) REFERENCES companies(id) ON DELETE CASCADE,
        company_name VARCHAR(255),
        inquiry_id VARCHAR(255) REFERENCES inquiries(id) ON DELETE SET NULL,
        inquiry_number VARCHAR(50),
        author_id VARCHAR(255),
        author_name VARCHAR(255),
        content TEXT NOT NULL,
        is_pinned BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_notes_company ON notes(company_id);
      CREATE INDEX IF NOT EXISTS idx_notes_inquiry ON notes(inquiry_id);
    `);
    console.log('✅ Table "notes" verified / updated in PostgreSQL.');

    // Seed demo note if empty
    const noteCount = await client.query('SELECT COUNT(*) FROM notes;');
    if (parseInt(noteCount.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO notes (
          id, company_id, company_name, inquiry_id, inquiry_number, author_id, author_name, content, is_pinned
        ) VALUES (
          'not_1', 'comp_1', 'Reliance Petrochemicals', 'inq_1048', 'INQ-1048', 'usr_sales_1', 'Pooja Hegde',
          'Client requires FM Global or NFPA standard sprinkler system and heavy trailer turnaround apron. Budget is flexible if delivery by Q4 is guaranteed.',
          true
        );
      `);
      console.log('✅ Demo note seeded.');
    }

    // 15. Create follow_ups table
    await client.query(`
      CREATE TABLE IF NOT EXISTS follow_ups (
        id VARCHAR(255) PRIMARY KEY,
        inquiry_id VARCHAR(255) REFERENCES inquiries(id) ON DELETE SET NULL,
        inquiry_number VARCHAR(50),
        company_id VARCHAR(255) REFERENCES companies(id) ON DELETE CASCADE,
        company_name VARCHAR(255),
        contact_id VARCHAR(255) REFERENCES contacts(id) ON DELETE SET NULL,
        contact_name VARCHAR(255),
        assigned_user_id VARCHAR(255),
        assigned_user_name VARCHAR(255),
        follow_up_date VARCHAR(50) NOT NULL,
        follow_up_time VARCHAR(50) DEFAULT '11:00 AM',
        channel VARCHAR(50) DEFAULT 'Call',
        status VARCHAR(50) DEFAULT 'Scheduled',
        priority VARCHAR(50) DEFAULT 'High',
        summary TEXT,
        outcome_notes TEXT,
        pdf_generated_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_follow_ups_company ON follow_ups(company_id);
      CREATE INDEX IF NOT EXISTS idx_follow_ups_inquiry ON follow_ups(inquiry_id);
      CREATE INDEX IF NOT EXISTS idx_follow_ups_date ON follow_ups(follow_up_date);
    `);
    console.log('✅ Table "follow_ups" verified / updated in PostgreSQL.');

    // Seed demo follow-up if empty
    const followUpCount = await client.query('SELECT COUNT(*) FROM follow_ups;');
    if (parseInt(followUpCount.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO follow_ups (
          id, inquiry_id, inquiry_number, company_id, company_name, contact_id, contact_name,
          assigned_user_id, assigned_user_name, follow_up_date, follow_up_time, channel, status, priority, summary
        ) VALUES (
          'fu_1', 'inq_1048', 'INQ-1048', 'comp_1', 'Reliance Petrochemicals', 'cnt_1', 'Rajesh Patel',
          'usr_sales_1', 'Pooja Hegde', CURRENT_DATE::text, '02:00 PM', 'Call', 'Scheduled', 'High',
          'Follow up on commercial lease proposal and schedule technical team site visit.'
        );
      `);
      console.log('✅ Demo follow-up seeded.');
    }

    // 16. Create inquiry_stage_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inquiry_stage_history (
        id VARCHAR(255) PRIMARY KEY,
        inquiry_id VARCHAR(255) REFERENCES inquiries(id) ON DELETE CASCADE,
        from_stage VARCHAR(100),
        to_stage VARCHAR(100) NOT NULL,
        changed_by_user_id VARCHAR(255),
        changed_by_user_name VARCHAR(255),
        reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_stage_hist_inq ON inquiry_stage_history(inquiry_id);
    `);
    console.log('✅ Table "inquiry_stage_history" verified / updated in PostgreSQL.');

    // 17. Create audit_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        user_name VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id VARCHAR(255),
        details JSONB DEFAULT '{}',
        ip_address VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
    `);
    console.log('✅ Table "audit_logs" verified / updated in PostgreSQL.');

    // 18. Create documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) DEFAULT 'PDF',
        file_size VARCHAR(50) DEFAULT '1.2 MB',
        url TEXT,
        company_id VARCHAR(255) REFERENCES companies(id) ON DELETE SET NULL,
        company_name VARCHAR(255),
        inquiry_id VARCHAR(255) REFERENCES inquiries(id) ON DELETE SET NULL,
        inquiry_number VARCHAR(50),
        uploaded_by_id VARCHAR(255),
        uploaded_by_name VARCHAR(255),
        category VARCHAR(100) DEFAULT 'Commercial Proposal',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
      CREATE INDEX IF NOT EXISTS idx_documents_inquiry ON documents(inquiry_id);
    `);
    console.log('✅ Table "documents" verified / updated in PostgreSQL.');

    // Seed demo documents if empty
    const docCount = await client.query('SELECT COUNT(*) FROM documents;');
    if (parseInt(docCount.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO documents (
          id, name, file_type, file_size, url, company_id, company_name, inquiry_id, inquiry_number, uploaded_by_id, uploaded_by_name, category
        ) VALUES 
        (
          'doc_1', 'Fairway_Commercial_Proposal_INQ-1048.pdf', 'PDF', '1.8 MB',
          '/api/v1/follow-ups/fu_1/download-pdf', 'comp_1', 'Reliance Petrochemicals', 'inq_1048', 'INQ-1048',
          'usr_sales_1', 'Pooja Hegde', 'Commercial Proposal'
        ),
        (
          'doc_2', 'Dahej_Logistics_Park_PCPIR_Layout_Specs.pdf', 'PDF', '4.2 MB',
          '/api/v1/follow-ups/fu_1/download-pdf', 'comp_1', 'Reliance Petrochemicals', 'inq_1048', 'INQ-1048',
          'usr_admin_1', 'Aditya Mehta', 'Engineering Blueprint'
        ),
        (
          'doc_3', 'Master_Inquiry_Specifications_Matrix.xlsx', 'XLSX', '650 KB',
          '#', 'comp_1', 'Reliance Petrochemicals', 'inq_1048', 'INQ-1048',
          'usr_sales_1', 'Pooja Hegde', 'Requirements Matrix'
        );
      `);
      console.log('✅ Demo documents seeded.');
    }

    // 19. Create communications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS communications (
        id VARCHAR(255) PRIMARY KEY,
        channel VARCHAR(50) NOT NULL,
        direction VARCHAR(50) DEFAULT 'Outbound',
        subject VARCHAR(255),
        message TEXT NOT NULL,
        company_id VARCHAR(255) REFERENCES companies(id) ON DELETE SET NULL,
        company_name VARCHAR(255),
        contact_id VARCHAR(255) REFERENCES contacts(id) ON DELETE SET NULL,
        contact_name VARCHAR(255),
        user_id VARCHAR(255),
        user_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Delivered',
        attachments JSONB DEFAULT '[]',
        duration_minutes INT DEFAULT 0,
        outcome VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_comm_company ON communications(company_id);
      CREATE INDEX IF NOT EXISTS idx_comm_channel ON communications(channel);
      CREATE INDEX IF NOT EXISTS idx_comm_created ON communications(created_at);
    `);
    console.log('✅ Table "communications" verified / updated in PostgreSQL.');

    // Seed demo communications if empty
    const commCount = await client.query('SELECT COUNT(*) FROM communications;');
    if (parseInt(commCount.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO communications (
          id, channel, direction, subject, message, company_id, company_name, contact_id, contact_name,
          user_id, user_name, status, attachments, duration_minutes, outcome, created_at
        ) VALUES 
        (
          'comm_1', 'Email', 'Outbound', 'Commercial Proposal & Layout Specifications - Dahej Mega Logistics Park',
          'Dear Mr. Rajesh Patel,\n\nPlease find attached the formal commercial proposal for the 75,000 sq.ft Grade A chemical warehouse at Dahej PCPIR node, along with NFPA fire safety specifications and trailer turning apron layouts.\n\nBest regards,\nPooja Hegde\nFairway CRM Gujarat Leasing Desk',
          'comp_1', 'Reliance Petrochemicals', 'cnt_1', 'Rajesh Patel',
          'usr_sales_1', 'Pooja Hegde', 'Delivered',
          '[{"name":"Fairway_Commercial_Proposal_INQ-1048.pdf","size":"1.8 MB"}]'::jsonb,
          0, 'Proposal Sent', CURRENT_TIMESTAMP - INTERVAL '2 hours'
        ),
        (
          'comm_2', 'Call', 'Outbound', 'Technical Discussion on Clear Height & Floor Load',
          'Discussed clear height requirement (12m required by Reliance operations) and 6 MT/sq.m floor load capacity. Client confirmed alignment with Dahej park specifications. Agreed to conduct physical site inspection next Tuesday.',
          'comp_1', 'Reliance Petrochemicals', 'cnt_1', 'Rajesh Patel',
          'usr_sales_1', 'Pooja Hegde', 'Delivered',
          '[]'::jsonb,
          18, 'Positive - Site Visit Scheduled', CURRENT_TIMESTAMP - INTERVAL '1 day'
        ),
        (
          'comm_3', 'WhatsApp', 'Inbound', 'Site Visit Confirmation',
          'Confirmed: Our VP Supply Chain and structural engineering head will reach Dahej park at 11:30 AM next Tuesday. Please keep site gate pass arranged.',
          'comp_1', 'Reliance Petrochemicals', 'cnt_1', 'Rajesh Patel',
          'usr_sales_1', 'Pooja Hegde', 'Received',
          '[]'::jsonb,
          0, 'Acknowledged', CURRENT_TIMESTAMP - INTERVAL '4 hours'
        ),
        (
          'comm_4', 'LinkedIn', 'Outbound', 'Initial Executive Outreach',
          'Connected with Mr. Rajesh Patel regarding Fairway industrial infrastructure corridors across Gujarat PCPIR nodes.',
          'comp_1', 'Reliance Petrochemicals', 'cnt_1', 'Rajesh Patel',
          'usr_sales_1', 'Pooja Hegde', 'Delivered',
          '[]'::jsonb,
          0, 'Connection Accepted', CURRENT_TIMESTAMP - INTERVAL '5 days'
        );
      `);
      console.log('✅ Demo communications seeded.');
    }

    // 20. Create site_visits table
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_visits (
        id VARCHAR(255) PRIMARY KEY,
        inquiry_id VARCHAR(255) REFERENCES inquiries(id) ON DELETE SET NULL,
        inquiry_number VARCHAR(50),
        company_id VARCHAR(255) REFERENCES companies(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL,
        property_id VARCHAR(255) REFERENCES properties(id) ON DELETE SET NULL,
        property_name VARCHAR(255) NOT NULL,
        scheduled_date VARCHAR(50) NOT NULL,
        scheduled_time VARCHAR(50) DEFAULT '11:00 AM',
        host_user_id VARCHAR(255),
        host_user_name VARCHAR(255),
        visitor_name VARCHAR(255),
        visitor_phone VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Scheduled',
        client_feedback TEXT,
        follow_up_action TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_site_visits_company ON site_visits(company_id);
      CREATE INDEX IF NOT EXISTS idx_site_visits_inquiry ON site_visits(inquiry_id);
      CREATE INDEX IF NOT EXISTS idx_site_visits_date ON site_visits(scheduled_date);
    `);
    console.log('✅ Table "site_visits" verified / updated in PostgreSQL.');

    // 21. Create pipeline_stages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pipeline_stages (
        id VARCHAR(255) PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        label VARCHAR(255) NOT NULL,
        color VARCHAR(50) DEFAULT '#64748B',
        bg_color VARCHAR(50) DEFAULT 'bg-slate-50',
        text_color VARCHAR(50) DEFAULT 'text-slate-700',
        border_color VARCHAR(50) DEFAULT 'border-slate-300',
        description TEXT,
        stage_order INT DEFAULT 1,
        is_system BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "pipeline_stages" verified / updated in PostgreSQL.');

    // Seed default pipeline stages
    const defaultPipelineStages = [
      ['stg_1', 'new', 'New Lead', '#64748B', 'bg-slate-50', 'text-slate-700', 'border-slate-300', 'Inquiry received, awaiting initial sales touchpoint.', 1, true],
      ['stg_2', 'contacted', 'Contacted', '#0284C7', 'bg-sky-50', 'text-sky-700', 'border-sky-300', 'Initial interaction conducted via call, WhatsApp, or email.', 2, true],
      ['stg_3', 'requirement_confirmed', 'Req. Confirmed', '#4F46E5', 'bg-indigo-50', 'text-indigo-700', 'border-indigo-300', 'Area, timeline, budget, and technical specs validated.', 3, true],
      ['stg_4', 'property_matched', 'Property Matched', '#0F6B4F', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-300', 'At least one Fairway warehouse park matched to requirement.', 4, true],
      ['stg_5', 'property_shared', 'Property Shared', '#0D9488', 'bg-teal-50', 'text-teal-700', 'border-teal-300', 'Brochure, specs, and layout shared with decision-maker.', 5, true],
      ['stg_6', 'proposal', 'Proposal Sent', '#7C3AED', 'bg-purple-50', 'text-purple-700', 'border-purple-300', 'Formal commercial proposal document drafted & delivered.', 6, true],
      ['stg_7', 'site_visit', 'Site Visit', '#EA580C', 'bg-orange-50', 'text-orange-700', 'border-orange-300', 'Site inspection scheduled or in progress at warehouse park.', 7, true],
      ['stg_8', 'negotiation', 'Negotiation', '#D97706', 'bg-amber-50', 'text-amber-700', 'border-amber-300', 'Commercial terms, lock-in, and lease duration under active review.', 8, true],
      ['stg_9', 'won', 'Won (Closed)', '#059669', 'bg-green-100', 'text-green-800', 'border-green-400', 'Lease agreement finalized and LOI signed.', 9, true],
      ['stg_10', 'lost', 'Lost', '#DC2626', 'bg-rose-50', 'text-rose-700', 'border-rose-300', 'Deal lost with mandatory documented reason and context.', 10, true],
    ];

    for (const stage of defaultPipelineStages) {
      await client.query(
        `INSERT INTO pipeline_stages (id, key, label, color, bg_color, text_color, border_color, description, stage_order, is_system)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (key) DO NOTHING;`,
        stage
      );
    }
    console.log('✅ Default pipeline stages seeded in PostgreSQL.');

    // 22. Create notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        type VARCHAR(50) DEFAULT 'info',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        entity_type VARCHAR(100),
        entity_id VARCHAR(255),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
    `);
    console.log('✅ Table "notifications" verified / updated in PostgreSQL.');

    // Ensure all CRM schema columns, constraints, and matrix baseline are in sync
    await runAllSchemaFixes();

    // Lead-to-lease space model: a warehouse's free space is calculated as
    // total - baseline_occupied (tenants not yet entered as leases) - active leases - active holds.
    await client.query(`
      CREATE TABLE IF NOT EXISTS leases (
        id VARCHAR(255) PRIMARY KEY,
        inquiry_id VARCHAR(255) REFERENCES inquiries(id) ON DELETE SET NULL,
        company_id VARCHAR(255) REFERENCES companies(id) ON DELETE SET NULL,
        company_name VARCHAR(255),
        property_id VARCHAR(255) NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
        property_name VARCHAR(255),
        area_sq_ft NUMERIC(12, 2) NOT NULL CHECK (area_sq_ft > 0),
        rent_per_sq_ft_inr NUMERIC(10, 2),
        monthly_rent_inr NUMERIC(14, 2),
        start_date DATE NOT NULL,
        end_date DATE,
        tenure_years NUMERIC(5, 2),
        lock_in_months INT,
        escalation_percent NUMERIC(5, 2),
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'terminated')),
        notes TEXT,
        created_by_user_id VARCHAR(255),
        created_by_user_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_leases_property ON leases(property_id, status);
      CREATE INDEX IF NOT EXISTS idx_leases_company ON leases(company_id);
      CREATE INDEX IF NOT EXISTS idx_leases_end_date ON leases(end_date);
      -- true when the lease records a tenant already counted in baseline_occupied_sq_ft
      ALTER TABLE leases ADD COLUMN IF NOT EXISTS from_baseline BOOLEAN NOT NULL DEFAULT false;

      CREATE TABLE IF NOT EXISTS space_holds (
        id VARCHAR(255) PRIMARY KEY,
        inquiry_id VARCHAR(255) REFERENCES inquiries(id) ON DELETE CASCADE,
        proposal_id VARCHAR(255) REFERENCES proposals(id) ON DELETE SET NULL,
        property_id VARCHAR(255) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        area_sq_ft NUMERIC(12, 2) NOT NULL CHECK (area_sq_ft > 0),
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'converted')),
        reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        released_at TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS idx_space_holds_property ON space_holds(property_id, status);
      CREATE INDEX IF NOT EXISTS idx_space_holds_inquiry ON space_holds(inquiry_id);

      ALTER TABLE properties ADD COLUMN IF NOT EXISTS baseline_occupied_sq_ft NUMERIC(12, 2);
      -- Which intelligence (AI Discovery) company a CRM company came from, so a prospect is never added twice.
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS intelligence_company_id INTEGER;
      CREATE INDEX IF NOT EXISTS idx_companies_intelligence_id ON companies(intelligence_company_id);
      -- One-time backfill (only rows never set): whatever was hand-typed as occupied becomes the baseline,
      -- so no displayed "available" number changes when the calculation takes over.
      UPDATE properties
        SET baseline_occupied_sq_ft = GREATEST(COALESCE(total_area_sq_ft, 0) - COALESCE(available_area_sq_ft, 0), 0)
        WHERE baseline_occupied_sq_ft IS NULL;
    `);
    await client.query(RECALCULATE_ALL_PROPERTY_SPACE_SQL);
    // Proposals used to write stage keys that aren't pipeline stages, so those cards vanished from the board.
    await client.query(`
      UPDATE inquiries SET stage = 'proposal' WHERE stage = 'proposal_sent';
      UPDATE inquiries SET stage = 'won' WHERE stage = 'deal_won';
    `);
    console.log('✅ Leases, space holds and calculated warehouse space verified in PostgreSQL.');

    // runAllSchemaFixes() unconditionally drops role_permissions' primary key
    // on every run (legacy Prisma-style cleanup) and never restores it, so
    // this must come after it, not before - restore the PK, then backfill
    // any permission rows added after the initial seed (e.g. Properties &
    // Warehouses) that the empty-table-only seed block above never got to
    // insert into an already-seeded table.
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conrelid = 'role_permissions'::regclass AND contype = 'p'
        ) THEN
          ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);
        END IF;
      END $$;
    `);
    const permissionsBackfill = [
      ['perm_13', 'View all properties & warehouses', 'Properties & Warehouses', 'Yes', 'Yes', 'Assigned / All', 'View', 'Ability to browse warehouse park records and facility details.'],
      ['perm_14', 'Create new property & warehouse', 'Properties & Warehouses', 'Yes', 'Yes', 'Yes', 'No', 'Ability to register new warehouse parks and facilities.'],
      ['perm_15', 'Edit property information', 'Properties & Warehouses', 'Yes', 'Yes', 'Assigned / All', 'No', 'Update warehouse park details, coordinates, and specifications.'],
      ['perm_16', 'Delete / Archive property', 'Properties & Warehouses', 'Yes', 'Yes', 'Restricted', 'No', 'Permanently delete or archive warehouse park records.'],
      // "Inquiries & Leads" only ever had a create/import row, so the client denied edit to every
      // non-super-admin: no Edit Inquiry, Draft Proposal, Visit or "I followed up" in the UI.
      ['perm_17', 'View all inquiries & leads', 'Inquiries & Leads', 'Yes', 'Yes', 'Assigned / All', 'View', 'Browse inquiries, deal details and follow-up history.'],
      ['perm_18', 'Edit inquiries & log follow-ups', 'Inquiries & Leads', 'Yes', 'Yes', 'Assigned / All', 'No', 'Update deal details, log follow-ups, draft proposals and schedule visits.'],
      ['perm_19', 'Delete / Archive inquiries', 'Inquiries & Leads', 'Yes', 'Yes', 'Restricted', 'No', 'Permanently delete or archive inquiries.'],
    ];
    for (const row of permissionsBackfill) {
      await client.query(
        `INSERT INTO role_permissions (id, capability, category, super_admin, admin, sales, viewer, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING;`,
        row
      );
    }

    client.release();

  } catch (error: any) {
    console.warn('⚠️ PostgreSQL initialization warning:', error.message);
    console.log('💡 The server will start and fall back gracefully to memory store if PostgreSQL connection is unavailable.');
  }
};

export default {
  pool,
  query,
  initDatabase,
};
