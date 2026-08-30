 import pg from 'pg';
import { config } from './index.js';
import { hashPassword } from '../utils/password.js';

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

      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT '+91 988496151';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'Asia/Kolkata';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS working_hours_start VARCHAR(50) DEFAULT '10:00 AM';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS working_hours_end VARCHAR(50) DEFAULT '7:30 PM';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date VARCHAR(50);
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
        ['role_super_admin', 'Super Admin', 'super_admin', 'Full platform authority with unrestricted access to all data, security logs, and configuration.', 'purple', true],
        ['role_admin', 'Admin', 'admin', 'Management access across inquiries, companies, inventory, and user accounts.', 'blue', true],
        ['role_sales', 'Sales', 'sales', 'Deal pipeline execution, contact management, task follow-ups, and proposal creation.', 'emerald', true],
        ['role_viewer', 'Viewer', 'viewer', 'Read-only visibility into portfolio metrics and authorized company dossiers.', 'slate', true],
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
        'usr_bhavya_1',
        'Bhavya Sharma',
        'bhavya@gmail.com',
        defaultPasswordHash,
        'super_admin',
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
        'super_admin',
        'Executive Leadership',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        '+91 98250 12345',
        'Active',
        8,
      ],
      [
        'usr_admin_1',
        'Aditya Mehta',
        'admin@fairway.co.in',
        defaultPasswordHash,
        'admin',
        'Executive Leadership',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        '+91 98250 67890',
        'Active',
        14,
      ],
      [
        'usr_sales_1',
        'Pooja Hegde',
        'sales@fairway.co.in',
        defaultPasswordHash,
        'sales',
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
         SET name = EXCLUDED.name, role = EXCLUDED.role, department = EXCLUDED.department, avatar = EXCLUDED.avatar;`,
        u
      );
    }
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
    `);
    console.log('✅ Table "inquiries" verified / updated in PostgreSQL.');

    // Seed initial companies & inquiries if empty
    const compCount = await client.query('SELECT COUNT(*) FROM companies;');
    if (parseInt(compCount.rows[0].count, 10) === 0) {
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

    // Seed initial demo tasks if table is empty
    const taskCount = await client.query('SELECT COUNT(*) FROM tasks;');
    if (parseInt(taskCount.rows[0].count, 10) === 0) {
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

    // Seed initial properties if empty
    const propCount = await client.query('SELECT COUNT(*) FROM properties;');
    if (parseInt(propCount.rows[0].count, 10) === 0) {
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

    // Seed initial proposals if empty
    const proposalCount = await client.query('SELECT COUNT(*) FROM proposals;');
    if (parseInt(proposalCount.rows[0].count, 10) === 0) {
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
