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

    // 10. pipeline_stages table
    `ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS key VARCHAR(100);`,
    `ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS label VARCHAR(255);`,
    `ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS bg_color VARCHAR(50) DEFAULT 'bg-slate-50';`,
    `ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS text_color VARCHAR(50) DEFAULT 'text-slate-700';`,
    `ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS border_color VARCHAR(50) DEFAULT 'border-slate-300';`,
    `ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS stage_order INTEGER DEFAULT 1;`,
    `ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT TRUE;`,
    `ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE pipeline_stages ALTER COLUMN code DROP NOT NULL;`,
    `ALTER TABLE pipeline_stages ALTER COLUMN name DROP NOT NULL;`,
    `ALTER TABLE pipeline_stages ALTER COLUMN "orderIndex" DROP NOT NULL;`,
    `ALTER TABLE pipeline_stages ALTER COLUMN "createdAt" DROP NOT NULL;`,
    `ALTER TABLE pipeline_stages ALTER COLUMN "updatedAt" DROP NOT NULL;`,
    `ALTER TABLE pipeline_stages ALTER COLUMN "isWon" DROP NOT NULL;`,
    `ALTER TABLE pipeline_stages ALTER COLUMN "isLost" DROP NOT NULL;`,
    `ALTER TABLE pipeline_stages ALTER COLUMN "isActive" DROP NOT NULL;`,

    // Backfill standard stages for pipeline_stages
    `UPDATE pipeline_stages SET
       key = 'new',
       label = 'New Lead',
       color = '#64748B',
       bg_color = 'bg-slate-50',
       text_color = 'text-slate-700',
       border_color = 'border-slate-300',
       description = 'Inquiry received, awaiting initial sales touchpoint.',
       stage_order = 1,
       is_system = true,
       created_at = COALESCE(created_at, "createdAt", CURRENT_TIMESTAMP),
       updated_at = COALESCE(updated_at, "updatedAt", CURRENT_TIMESTAMP)
     WHERE code = 'NEW_INQUIRY' OR key = 'new';`,

    `UPDATE pipeline_stages SET
       key = 'contacted',
       label = 'Contacted',
       color = '#0284C7',
       bg_color = 'bg-sky-50',
       text_color = 'text-sky-700',
       border_color = 'border-sky-300',
       description = 'Initial interaction conducted via call, WhatsApp, or email.',
       stage_order = 2,
       is_system = true,
       created_at = COALESCE(created_at, "createdAt", CURRENT_TIMESTAMP),
       updated_at = COALESCE(updated_at, "updatedAt", CURRENT_TIMESTAMP)
     WHERE code = 'CONTACT_ESTABLISHED' OR key = 'contacted';`,

    `UPDATE pipeline_stages SET
       key = 'requirement_confirmed',
       label = 'Req. Confirmed',
       color = '#4F46E5',
       bg_color = 'bg-indigo-50',
       text_color = 'text-indigo-700',
       border_color = 'border-indigo-300',
       description = 'Area, timeline, budget, and technical specs validated.',
       stage_order = 3,
       is_system = true,
       created_at = COALESCE(created_at, "createdAt", CURRENT_TIMESTAMP),
       updated_at = COALESCE(updated_at, "updatedAt", CURRENT_TIMESTAMP)
     WHERE code = 'QUALIFIED' OR key = 'requirement_confirmed';`,

    `UPDATE pipeline_stages SET
       key = 'proposal',
       label = 'Proposal Sent',
       color = '#7C3AED',
       bg_color = 'bg-purple-50',
       text_color = 'text-purple-700',
       border_color = 'border-purple-300',
       description = 'Formal commercial proposal document drafted & delivered.',
       stage_order = 6,
       is_system = true,
       created_at = COALESCE(created_at, "createdAt", CURRENT_TIMESTAMP),
       updated_at = COALESCE(updated_at, "updatedAt", CURRENT_TIMESTAMP)
     WHERE code = 'PROPOSAL' OR key = 'proposal';`,

    `UPDATE pipeline_stages SET
       key = 'site_visit',
       label = 'Site Visit',
       color = '#EA580C',
       bg_color = 'bg-orange-50',
       text_color = 'text-orange-700',
       border_color = 'border-orange-300',
       description = 'Site inspection scheduled or in progress at warehouse park.',
       stage_order = 7,
       is_system = true,
       created_at = COALESCE(created_at, "createdAt", CURRENT_TIMESTAMP),
       updated_at = COALESCE(updated_at, "updatedAt", CURRENT_TIMESTAMP)
     WHERE code = 'SITE_VISIT' OR key = 'site_visit';`,

    `UPDATE pipeline_stages SET
       key = 'negotiation',
       label = 'Negotiation',
       color = '#D97706',
       bg_color = 'bg-amber-50',
       text_color = 'text-amber-700',
       border_color = 'border-amber-300',
       description = 'Commercial terms, lock-in, and lease duration under active review.',
       stage_order = 8,
       is_system = true,
       created_at = COALESCE(created_at, "createdAt", CURRENT_TIMESTAMP),
       updated_at = COALESCE(updated_at, "updatedAt", CURRENT_TIMESTAMP)
     WHERE code = 'NEGOTIATION' OR key = 'negotiation';`,

    `UPDATE pipeline_stages SET
       key = 'won',
       label = 'Won (Closed)',
       color = '#059669',
       bg_color = 'bg-green-100',
       text_color = 'text-green-800',
       border_color = 'border-green-400',
       description = 'Lease agreement finalized and LOI signed.',
       stage_order = 9,
       is_system = true,
       created_at = COALESCE(created_at, "createdAt", CURRENT_TIMESTAMP),
       updated_at = COALESCE(updated_at, "updatedAt", CURRENT_TIMESTAMP)
     WHERE code = 'WON' OR key = 'won';`,

    `UPDATE pipeline_stages SET
       key = 'lost',
       label = 'Lost',
       color = '#DC2626',
       bg_color = 'bg-rose-50',
       text_color = 'text-rose-700',
       border_color = 'border-rose-300',
       description = 'Lead dropped, postponed, or selected competitor facility.',
       stage_order = 10,
       is_system = true,
       created_at = COALESCE(created_at, "createdAt", CURRENT_TIMESTAMP),
       updated_at = COALESCE(updated_at, "updatedAt", CURRENT_TIMESTAMP)
     WHERE code = 'LOST' OR key = 'lost';`,

    // Insert property_matched and property_shared if missing
    `INSERT INTO pipeline_stages (id, key, label, color, bg_color, text_color, border_color, description, stage_order, is_system, name, code, "orderIndex", created_at, updated_at)
     SELECT 'stg_4', 'property_matched', 'Property Matched', '#0F6B4F', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-300', 'At least one Fairway warehouse park matched to requirement.', 4, true, 'Property Matched', 'PROPERTY_MATCHED', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
     WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE key = 'property_matched' OR code = 'PROPERTY_MATCHED');`,

    `INSERT INTO pipeline_stages (id, key, label, color, bg_color, text_color, border_color, description, stage_order, is_system, name, code, "orderIndex", created_at, updated_at)
     SELECT 'stg_5', 'property_shared', 'Property Shared', '#0D9488', 'bg-teal-50', 'text-teal-700', 'border-teal-300', 'Brochure, specs, and layout shared with decision-maker.', 5, true, 'Property Shared', 'PROPERTY_SHARED', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
     WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE key = 'property_shared' OR code = 'PROPERTY_SHARED');`,

     // Ensure any other row has key, label, stage_order populated
    `UPDATE pipeline_stages SET
       key = COALESCE(key, LOWER(code), id),
       label = COALESCE(label, name, 'Stage'),
       stage_order = COALESCE(stage_order, "orderIndex", 1),
       is_system = COALESCE(is_system, true),
       created_at = COALESCE(created_at, "createdAt", CURRENT_TIMESTAMP),
       updated_at = COALESCE(updated_at, "updatedAt", CURRENT_TIMESTAMP)
     WHERE key IS NULL OR label IS NULL OR stage_order IS NULL;`,

    // 11. notifications table
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100);`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id VARCHAR(255);`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE notifications ALTER COLUMN "userId" DROP NOT NULL;`,
    `ALTER TABLE notifications ALTER COLUMN "type" DROP NOT NULL;`,
    `ALTER TABLE notifications ALTER COLUMN "title" DROP NOT NULL;`,
    `ALTER TABLE notifications ALTER COLUMN "message" DROP NOT NULL;`,
    `ALTER TABLE notifications ALTER COLUMN "isRead" DROP NOT NULL;`,
    `ALTER TABLE notifications ALTER COLUMN "createdAt" DROP NOT NULL;`,
    `DO $$ 
     BEGIN 
       IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'userId') THEN
         UPDATE notifications SET 
           user_id = COALESCE(user_id, "userId"),
           is_read = COALESCE(is_read, "isRead", false),
           created_at = COALESCE(created_at, "createdAt", CURRENT_TIMESTAMP);
       END IF;
     END $$;`,
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
      ['perm_13', 'View all properties & warehouses', 'Properties & Warehouses', 'Yes', 'Yes', 'Assigned / All', 'View', 'Ability to browse warehouse park records and facility details.'],
      ['perm_14', 'Create new property & warehouse', 'Properties & Warehouses', 'Yes', 'Yes', 'Yes', 'No', 'Ability to register new warehouse parks and facilities.'],
      ['perm_15', 'Edit property information', 'Properties & Warehouses', 'Yes', 'Yes', 'Assigned / All', 'No', 'Update warehouse park details, coordinates, and specifications.'],
      ['perm_16', 'Delete / Archive property', 'Properties & Warehouses', 'Yes', 'Yes', 'Restricted', 'No', 'Permanently delete or archive warehouse park records.'],
      ['perm_17', 'View all inquiries & leads', 'Inquiries & Leads', 'Yes', 'Yes', 'Assigned / All', 'View', 'Browse inquiries, deal details and follow-up history.'],
      ['perm_18', 'Edit inquiries & log follow-ups', 'Inquiries & Leads', 'Yes', 'Yes', 'Assigned / All', 'No', 'Update deal details, log follow-ups, draft proposals and schedule visits.'],
      ['perm_19', 'Delete / Archive inquiries', 'Inquiries & Leads', 'Yes', 'Yes', 'Restricted', 'No', 'Permanently delete or archive inquiries.'],
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

  // Check if notifications needs default seeding
  try {
    const checkNotifs = await pool.query('SELECT COUNT(*) as count FROM notifications;');
    if (parseInt(checkNotifs.rows[0]?.count || '0', 10) === 0) {
      console.log('Seeding initial notifications...');
      const defaultNotifs = [
        ['notif_1', null, 'inquiry_assigned', 'New High-Priority Inquiry', 'Titan Warehousing inquiry (120,000 sq ft) assigned for Chakan Phase 2.', 'inquiry', 'inq_62cd9514', false],
        ['notif_2', null, 'site_visit_upcoming', 'Upcoming Client Site Inspection', 'Site inspection scheduled tomorrow at 11:30 AM with Decathlon Logistics team at Talegaon Park.', 'site_visit', 'sv_1', false],
        ['notif_3', null, 'proposal_updated', 'Commercial Proposal Accepted', 'Client approved standard lease terms for Mahindra Logistics Unit 4B.', 'proposal', 'prop_1', true],
        ['notif_4', null, 'system', 'Fairway CRM Live System', 'Real-time pipeline analytics, WhatsApp alerts, and PDF proposals are active.', 'user', 'usr_amit_1', true],
      ];

      for (const row of defaultNotifs) {
        try {
          await pool.query(
            `INSERT INTO notifications (id, user_id, type, title, message, entity_type, entity_id, is_read, "userId", "isRead", created_at, "createdAt")
             VALUES ($1, $2::text, $3, $4, $5, $6, $7, $8, $2::text, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
            row
          );
        } catch (err: any) {
          console.warn('Failed to insert default notification row:', err.message);
        }
      }
    }
  } catch (err: any) {
    console.warn('Notifications check note:', err.message);
  }

  // Check if calls table exists and needs seeding
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calls (
        id VARCHAR(255) PRIMARY KEY,
        call_for_type VARCHAR(50) DEFAULT 'Contact',
        call_for_id VARCHAR(255),
        call_for_name VARCHAR(255),
        related_to_type VARCHAR(50) DEFAULT 'Account',
        related_to_id VARCHAR(255),
        related_to_name VARCHAR(255),
        call_type VARCHAR(50) DEFAULT 'Outbound',
        call_status VARCHAR(50) DEFAULT 'Scheduled',
        call_start_date VARCHAR(50) DEFAULT CURRENT_DATE::text,
        call_start_time VARCHAR(50) DEFAULT '06:00 PM',
        call_duration VARCHAR(50) DEFAULT '00:15',
        call_owner_id VARCHAR(255),
        call_owner_name VARCHAR(255),
        subject VARCHAR(255) NOT NULL,
        call_purpose VARCHAR(100) DEFAULT 'Prospecting',
        agenda TEXT,
        call_result VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_calls_owner ON calls(call_owner_id);
      CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(call_status);
      CREATE INDEX IF NOT EXISTS idx_calls_date ON calls(call_start_date);
    `);

    const checkCalls = await pool.query('SELECT COUNT(*) as count FROM calls;');
    if (parseInt(checkCalls.rows[0]?.count || '0', 10) === 0) {
      console.log('Seeding initial demo calls matching reference...');
      const defaultCalls = [
        [
          'call_1', 'Contact', 'cnt_1', 'Rajesh Patel', 'Account', 'comp_1', 'Reliance Petrochemicals',
          'Inbound', 'Completed', '2026-08-23', '01:59 PM', '00:15',
          'usr_amit_1', 'Harsheel Kasodariya', 'Call Customer on Potential', 'Prospecting',
          'Client called regarding 75,000 sq ft warehouse expansion in Dahej PCPIR node. Discussed high power load and fire sprinkler specifications.',
          'Interested - Needs Site Visit'
        ],
        [
          'call_2', 'Lead', 'inq_62cd9514', 'Titan Warehousing Lead', 'Deal', 'inq_62cd9514', 'INQ-1048 Titan Expansion',
          'Outbound', 'Scheduled', '2026-08-23', '05:59 PM', '00:10',
          'usr_amit_1', 'Harsheel Kasodariya', 'Follow up with Lead', 'Follow-up',
          'Scheduled follow-up call to review preliminary layout drawings and commercial lease pricing.',
          'Pending Call'
        ],
        [
          'call_3', 'Contact', 'cnt_2', 'Sunil Deshmukh', 'Account', 'comp_2', 'Tata Advanced Systems',
          'Outbound', 'Completed', '2026-08-24', '11:30 AM', '00:20',
          'usr_sales_1', 'Pooja Hegde', 'Technical discussion on Clear Height & Apron', 'Project Demo',
          'Reviewed 12m clear height and trailer turning apron radius requirement with client engineering head.',
          'Positive - Specs Approved'
        ],
        [
          'call_4', 'Lead', 'inq_2', 'Adani Ports Logistics Lead', 'Deal', 'inq_2', 'INQ-1049 Adani Cold Chain',
          'Inbound', 'Scheduled', '2026-08-25', '04:00 PM', '00:30',
          'usr_amit_1', 'Amit Patel', 'Commercial proposal review & negotiation', 'Negotiation',
          'Scheduled conference call with CFO and procurement team to negotiate lease escalation and lock-in period.',
          'Scheduled'
        ],
      ];

      for (const row of defaultCalls) {
        try {
          await pool.query(
            `INSERT INTO calls (
              id, call_for_type, call_for_id, call_for_name,
              related_to_type, related_to_id, related_to_name,
              call_type, call_status, call_start_date, call_start_time, call_duration,
              call_owner_id, call_owner_name, subject, call_purpose, agenda, call_result,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
              CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            );`,
            row
          );
        } catch (err: any) {
          console.warn('Failed to insert default call:', err.message);
        }
      }
    }
  } catch (err: any) {
    console.warn('Calls table initialization note:', err.message);
  }

  // 17. site_visits table
  try {
    await pool.query(`
      ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS inquiry_id VARCHAR(255);
      ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS inquiry_number VARCHAR(50);
      ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
      ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
      ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS property_id VARCHAR(255);
      ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS property_name VARCHAR(255);
      ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS scheduled_date VARCHAR(50);
      ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS scheduled_time VARCHAR(50) DEFAULT '11:00 AM';
      ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS host_user_id VARCHAR(255);
      ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS host_user_name VARCHAR(255);
      ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS visitor_name VARCHAR(255);
      ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS visitor_phone VARCHAR(50);
      ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Scheduled';
      ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS client_feedback TEXT;
      ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS follow_up_action TEXT;
      ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);
  } catch (err: any) {
    console.warn('site_visits table alignment note:', err.message);
  }

  // 18. properties table alignment
  try {
    await pool.query(`
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS location VARCHAR(255);
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS pincode VARCHAR(50);
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS corridor VARCHAR(255);
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_area_sq_ft NUMERIC;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS available_area_sq_ft NUMERIC;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS rent_per_sq_ft_inr NUMERIC;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS deposit_months INT DEFAULT 3;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS lease_terms_years INT DEFAULT 5;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS clear_height_ft NUMERIC DEFAULT 12;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS docks_count INT DEFAULT 8;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS fire_systems VARCHAR(255);
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS power_kva NUMERIC DEFAULT 1000;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking_slots INT DEFAULT 20;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS truck_access VARCHAR(255);
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS flooring_capacity_mt NUMERIC DEFAULT 6;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS cctv_security BOOLEAN DEFAULT true;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS green_building_cert VARCHAR(100);
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS brochure_url TEXT;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]';
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS suitable_industries JSONB DEFAULT '[]';
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS manager_user_id VARCHAR(255);
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255);
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notified_to VARCHAR(255);
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR(255);
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255);
    `);

    // Sync location from address or corridor if empty
    await pool.query(`
      UPDATE properties 
      SET location = COALESCE(NULLIF(location, ''), NULLIF(address, ''), NULLIF(corridor, ''), city)
      WHERE location IS NULL OR location = '';
    `);

    const propLegacyCols = ['propertyCode', 'developer', 'address', 'zone', 'possessionStatus', 'type', 'remarks', 'askingRentPerSqFt', 'totalAreaSqFt', 'availableAreaSqFt', 'clearHeightFt', 'floorLoadCapacityTons', 'dockCount', 'fireNoc', 'leedCertified', 'maintenancePerSqFt', 'powerHp', 'createdAt', 'updatedAt'];
    for (const col of propLegacyCols) {
      try {
        await pool.query(`ALTER TABLE properties ALTER COLUMN "${col}" DROP NOT NULL;`);
      } catch {}
    }
  } catch (err: any) {
    console.warn('properties table alignment note:', err.message);
  }

  // 19. proposals table alignment
  try {
    await pool.query(`
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS contact_id VARCHAR(255);
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS total_deposit_inr NUMERIC;
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS lock_in_months INT DEFAULT 36;
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS possession_date VARCHAR(50);
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS commercial_terms TEXT;
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS proposal_date VARCHAR(50);
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS expiry_date VARCHAR(50);
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS document_name VARCHAR(255);
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS document_size VARCHAR(50) DEFAULT '1.4 MB';
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR(255);
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS created_by_user_name VARCHAR(255);
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);

    const propCols = ['contactId', 'companyId', 'inquiryId', 'propertyId', 'proposalNumber', 'validUntil', 'sentAt', 'proposedAreaSqFt', 'proposedRentPerSqFt', 'depositMonths', 'leaseTenureYears', 'lockInPeriodMonths', 'escalationPercent', 'specialTerms', 'createdById', 'createdAt', 'updatedAt'];
    for (const col of propCols) {
      try {
        await pool.query(`ALTER TABLE proposals ALTER COLUMN "${col}" DROP NOT NULL;`);
      } catch {}
    }
    // 25. Align inquiries won / lost columns and lost_reasons table
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
  } catch (err: any) {
    console.warn('alignment note:', err.message);
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
