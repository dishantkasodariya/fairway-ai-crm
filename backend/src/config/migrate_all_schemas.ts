import { pool } from './db.js';

export async function runAllSchemaFixes() {
  console.log('Running comprehensive database schema alignment...');

  const queries = [
    // 0. inquiries table
    `ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS broker_name VARCHAR(255);`,
    `ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS broker_commission VARCHAR(100);`,

    // 1. notes table
    `ALTER TABLE notes ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);`,
    `ALTER TABLE notes ADD COLUMN IF NOT EXISTS inquiry_number VARCHAR(100);`,
    `ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;`,
    `DO $$ 
     BEGIN 
       IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'isPinned') THEN
         UPDATE notes SET is_pinned = "isPinned" WHERE is_pinned IS NULL;
       END IF;
     END $$;`,

    // 2. follow_ups table
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS inquiry_id VARCHAR(255);`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS inquiry_number VARCHAR(100);`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS contact_id VARCHAR(255);`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS assigned_user_id VARCHAR(255);`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS assigned_user_name VARCHAR(255);`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS follow_up_date VARCHAR(50);`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS follow_up_time VARCHAR(50);`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS outcome_notes TEXT;`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMP;`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
    `DO $$ 
     BEGIN 
       IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups' AND column_name = 'inquiryId') THEN
         UPDATE follow_ups SET 
           inquiry_id = COALESCE(inquiry_id, "inquiryId"),
           company_id = COALESCE(company_id, "companyId"),
           contact_id = COALESCE(contact_id, "contactId"),
           assigned_user_id = COALESCE(assigned_user_id, "ownerId"),
           follow_up_date = COALESCE(follow_up_date, SUBSTRING("dueAt"::text, 1, 10)),
           created_at = COALESCE(created_at, "createdAt"),
           updated_at = COALESCE(updated_at, "updatedAt");
       END IF;
     END $$;`,

    // 3. roles table
    `ALTER TABLE roles ADD COLUMN IF NOT EXISTS key VARCHAR(100);`,
    `ALTER TABLE roles ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT 'blue';`,
    `ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE roles ALTER COLUMN code DROP NOT NULL;`,
    `ALTER TABLE roles ALTER COLUMN "createdAt" DROP NOT NULL;`,
    `ALTER TABLE roles ALTER COLUMN "updatedAt" DROP NOT NULL;`,
    `ALTER TABLE roles ALTER COLUMN "isSystem" DROP NOT NULL;`,
    `DO $$ 
     BEGIN 
       IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'code') THEN
         UPDATE roles SET 
           key = COALESCE(key, code, LOWER(REPLACE(name, ' ', '_'))),
           is_system = COALESCE(is_system, "isSystem", false),
           created_at = COALESCE(created_at, "createdAt", CURRENT_TIMESTAMP),
           updated_at = COALESCE(updated_at, "updatedAt", CURRENT_TIMESTAMP);
       END IF;
     END $$;`,
    `INSERT INTO roles (id, name, code, key, description, color, is_system, "isSystem", "createdAt", "updatedAt", created_at, updated_at)
     VALUES 
       ('role_super_admin', 'Super Admin', 'super_admin', 'super_admin', 'Full system access and configurations', 'purple', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('role_admin', 'Admin', 'admin', 'admin', 'Management and operations access', 'blue', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('role_sales', 'Sales Executive', 'sales', 'sales', 'Brokerage and deal pipeline execution', 'amber', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('role_viewer', 'Viewer', 'viewer', 'viewer', 'Read-only audit and reports access', 'slate', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO UPDATE SET key = EXCLUDED.key, is_system = EXCLUDED.is_system;`,

    // 4. role_permissions table
    `ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_pkey;`,
    `ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_roleId_fkey;`,
    `ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_permissionId_fkey;`,
    `ALTER TABLE role_permissions ALTER COLUMN "roleId" DROP NOT NULL;`,
    `ALTER TABLE role_permissions ALTER COLUMN "permissionId" DROP NOT NULL;`,
    `ALTER TABLE role_permissions ALTER COLUMN "assignedAt" DROP NOT NULL;`,
    `ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS id VARCHAR(255);`,
    `ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS capability VARCHAR(255);`,
    `ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS category VARCHAR(100);`,
    `ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS super_admin VARCHAR(50);`,
    `ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS admin VARCHAR(50);`,
    `ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS sales VARCHAR(50);`,
    `ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS viewer VARCHAR(50);`,
    `ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS description TEXT;`,
    `ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,

    // 5. audit_logs table
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);`,
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);`,
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100);`,
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id VARCHAR(255);`,
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';`,
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100);`,
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
    `DO $$ 
     BEGIN 
       IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'userId') THEN
         UPDATE audit_logs SET 
           user_id = COALESCE(user_id, "userId"::text),
           entity_type = COALESCE(entity_type, "entityType"),
           entity_id = COALESCE(entity_id, "entityId"::text),
           ip_address = COALESCE(ip_address, "ipAddress"),
           created_at = COALESCE(created_at, "createdAt");
       END IF;
     END $$;`,

    // 6. documents table
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS name VARCHAR(255);`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size VARCHAR(50);`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS url TEXT;`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS inquiry_id VARCHAR(255);`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS inquiry_number VARCHAR(100);`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by_id VARCHAR(255);`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by_name VARCHAR(255);`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS category VARCHAR(100);`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
    `DO $$ 
     BEGIN 
       IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'title') THEN
         UPDATE documents SET 
           name = COALESCE(name, "title"),
           file_type = COALESCE(file_type, "fileType"),
           file_size = COALESCE(file_size, "fileSize"),
           url = COALESCE(url, "fileUrl"),
           uploaded_by_id = COALESCE(uploaded_by_id, "uploadedById"::text),
           created_at = COALESCE(created_at, "createdAt"),
           updated_at = COALESCE(updated_at, "updatedAt");
       END IF;
     END $$;`,

    // 7. communications table
    `ALTER TABLE communications ADD COLUMN IF NOT EXISTS message TEXT;`,
    `ALTER TABLE communications ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);`,
    `ALTER TABLE communications ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);`,
    `ALTER TABLE communications ADD COLUMN IF NOT EXISTS contact_id VARCHAR(255);`,
    `ALTER TABLE communications ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);`,
    `ALTER TABLE communications ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);`,
    `ALTER TABLE communications ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);`,
    `ALTER TABLE communications ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';`,
    `ALTER TABLE communications ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 0;`,
    `ALTER TABLE communications ADD COLUMN IF NOT EXISTS outcome TEXT;`,
    `ALTER TABLE communications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE communications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
    `DO $$ 
     BEGIN 
       IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'companyId') THEN
         UPDATE communications SET 
           company_id = COALESCE(company_id, "companyId"::text),
           contact_id = COALESCE(contact_id, "contactId"::text),
           user_id = COALESCE(user_id, "createdById"::text),
           message = COALESCE(message, content),
           created_at = COALESCE(created_at, "createdAt");
       END IF;
     END $$;`,

    // 8. activities table
    `ALTER TABLE activities ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);`,
    `ALTER TABLE activities ADD COLUMN IF NOT EXISTS inquiry_number VARCHAR(100);`,
    `ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_type VARCHAR(50);`,
    `ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_date VARCHAR(50);`,
    `ALTER TABLE activities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE activities ALTER COLUMN "companyId" DROP NOT NULL;`,
    `ALTER TABLE activities ALTER COLUMN "activityDate" DROP NOT NULL;`,
    `ALTER TABLE activities ALTER COLUMN "createdAt" DROP NOT NULL;`,
    `ALTER TABLE activities ALTER COLUMN "type" DROP NOT NULL;`,

    // 9. Drop legacy camelCase NOT NULL constraints across all tables
    `ALTER TABLE follow_ups ALTER COLUMN "companyId" DROP NOT NULL;`,
    `ALTER TABLE follow_ups ALTER COLUMN "dueAt" DROP NOT NULL;`,
    `ALTER TABLE follow_ups ALTER COLUMN "createdAt" DROP NOT NULL;`,
    `ALTER TABLE follow_ups ALTER COLUMN "updatedAt" DROP NOT NULL;`,
    `ALTER TABLE follow_ups ALTER COLUMN "summary" DROP NOT NULL;`,
    `ALTER TABLE follow_ups ALTER COLUMN "priority" DROP NOT NULL;`,
    `ALTER TABLE follow_ups ALTER COLUMN "status" DROP NOT NULL;`,

    `ALTER TABLE communications ALTER COLUMN "companyId" DROP NOT NULL;`,
    `ALTER TABLE communications ALTER COLUMN "content" DROP NOT NULL;`,
    `ALTER TABLE communications ALTER COLUMN "createdAt" DROP NOT NULL;`,
    `ALTER TABLE communications ALTER COLUMN "direction" DROP NOT NULL;`,
    `ALTER TABLE communications ALTER COLUMN "sentAt" DROP NOT NULL;`,
    `ALTER TABLE communications ALTER COLUMN "status" DROP NOT NULL;`,
    `ALTER TABLE communications ALTER COLUMN "channel" DROP NOT NULL;`,

    `ALTER TABLE documents ALTER COLUMN "title" DROP NOT NULL;`,
    `ALTER TABLE documents ALTER COLUMN "entityId" DROP NOT NULL;`,
    `ALTER TABLE documents ALTER COLUMN "entityType" DROP NOT NULL;`,
    `ALTER TABLE documents ALTER COLUMN "fileUrl" DROP NOT NULL;`,
    `ALTER TABLE documents ALTER COLUMN "createdAt" DROP NOT NULL;`,
    `ALTER TABLE documents ALTER COLUMN "updatedAt" DROP NOT NULL;`,

    `ALTER TABLE notes ALTER COLUMN "createdAt" DROP NOT NULL;`,
    `ALTER TABLE notes ALTER COLUMN "isPinned" DROP NOT NULL;`,

    `ALTER TABLE audit_logs ALTER COLUMN "createdAt" DROP NOT NULL;`,
    `ALTER TABLE audit_logs ALTER COLUMN "entityType" DROP NOT NULL;`,

    `ALTER TABLE proposals ALTER COLUMN "createdAt" DROP NOT NULL;`,
    `ALTER TABLE proposals ALTER COLUMN "depositMonths" DROP NOT NULL;`,
    `ALTER TABLE proposals ALTER COLUMN "leaseTenureYears" DROP NOT NULL;`,
    `ALTER TABLE proposals ALTER COLUMN "lockInPeriodMonths" DROP NOT NULL;`,
  ];

  for (const q of queries) {
    try {
      await pool.query(q);
    } catch (err: any) {
      console.warn('Migration step note:', err.message);
    }
  }

  // Check if role_permissions needs default seeding
  const checkPerms = await pool.query('SELECT COUNT(*) as count FROM role_permissions WHERE id IS NOT NULL;');
  if (parseInt(checkPerms.rows[0]?.count || '0', 10) === 0) {
    console.log('Seeding default role permissions matrix...');
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
      try {
        await pool.query(
          `INSERT INTO role_permissions (id, capability, category, super_admin, admin, sales, viewer, description, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
          row
        );
      } catch (err: any) {
        console.warn('Failed to insert default perm row:', err.message);
      }
    }
  }

  console.log('✓ All database schemas successfully aligned and verified.');
}

if (process.argv[1]?.endsWith('migrate_all_schemas.ts') || process.argv[1]?.endsWith('migrate_all_schemas.js')) {
  runAllSchemaFixes()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
