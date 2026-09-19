import { Request, Response } from 'express';
import { query } from '../config/db.js';

export const getRolePermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, capability, category, super_admin, admin, sales, viewer, custom_permissions, description, created_at, updated_at 
       FROM role_permissions 
       ORDER BY category ASC, id ASC`
    );

    const permissions = result.rows.map((row) => ({
      id: row.id,
      capability: row.capability,
      category: row.category,
      superAdmin: row.super_admin,
      admin: row.admin,
      sales: row.sales,
      viewer: row.viewer,
      customPermissions: row.custom_permissions || {},
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({
      success: true,
      data: permissions,
    });

  } catch (error: any) {
    console.error('Error in getRolePermissions:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to fetch permissions matrix' },
    });
  }
};

export const createRolePermission = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      capability,
      category,
      description,
      superAdmin = 'Yes',
      admin = 'Yes',
      sales = 'No',
      viewer = 'No',
    } = req.body;

    if (!capability || !capability.trim()) {
      res.status(400).json({
        success: false,
        error: { message: 'Capability name is required' },
      });
      return;
    }

    const id = `perm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const cat = category?.trim() || 'General';

    const result = await query(
      `INSERT INTO role_permissions (id, capability, category, super_admin, admin, sales, viewer, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, capability, category, super_admin, admin, sales, viewer, custom_permissions, description, created_at, updated_at`,
      [id, capability.trim(), cat, superAdmin, admin, sales, viewer, description?.trim() || '']
    );

    const row = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        capability: row.capability,
        category: row.category,
        superAdmin: row.super_admin,
        admin: row.admin,
        sales: row.sales,
        viewer: row.viewer,
        customPermissions: row.custom_permissions || {},
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error in createRolePermission:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to create permission capability' },
    });
  }
};

export const deleteRolePermission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await query('DELETE FROM role_permissions WHERE id = $1', [id]);
    res.json({
      success: true,
      message: 'Permission capability removed successfully',
    });
  } catch (error: any) {
    console.error('Error in deleteRolePermission:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to delete permission capability' },
    });
  }
};

export const updateRolePermission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { superAdmin, admin, sales, viewer, description, category, capability } = req.body;

    const existing = await query('SELECT id FROM role_permissions WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Permission record not found' },
      });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (capability !== undefined) {
      updates.push(`capability = $${idx++}`);
      values.push(capability.trim());
    }
    if (category !== undefined) {
      updates.push(`category = $${idx++}`);
      values.push(category.trim());
    }
    if (superAdmin !== undefined) {
      updates.push(`super_admin = $${idx++}`);
      values.push(superAdmin);
    }
    if (admin !== undefined) {
      updates.push(`admin = $${idx++}`);
      values.push(admin);
    }
    if (sales !== undefined) {
      updates.push(`sales = $${idx++}`);
      values.push(sales);
    }
    if (viewer !== undefined) {
      updates.push(`viewer = $${idx++}`);
      values.push(viewer);
    }
    if (description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(description);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE role_permissions 
       SET ${updates.join(', ')} 
       WHERE id = $${idx} 
       RETURNING id, capability, category, super_admin, admin, sales, viewer, custom_permissions, description, created_at, updated_at`,
      values
    );

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        capability: row.capability,
        category: row.category,
        superAdmin: row.super_admin,
        admin: row.admin,
        sales: row.sales,
        viewer: row.viewer,
        customPermissions: row.custom_permissions || {},
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error in updateRolePermission:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to update permission' },
    });
  }
};

export const resetRolePermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    await query('DELETE FROM role_permissions;');

    const defaultMatrix = [
      // 1. Inquiries & Leads Module
      ['perm_inq_view', 'View inquiries & leads', 'Inquiries & Leads', 'Yes', 'Yes', 'Assigned / All', 'View', 'Ability to browse and view lead requirements and customer specifications.'],
      ['perm_inq_create', 'Create new inquiries', 'Inquiries & Leads', 'Yes', 'Yes', 'Yes', 'No', 'Ability to register new client warehouse space requirements.'],
      ['perm_inq_edit', 'Edit inquiry specifications', 'Inquiries & Leads', 'Yes', 'Yes', 'Assigned / All', 'No', 'Update required area, budget range, target corridor, and customer contacts.'],
      ['perm_inq_delete', 'Delete inquiries', 'Inquiries & Leads', 'Yes', 'Yes', 'Restricted', 'No', 'Permanently remove or archive warehouse inquiry dossiers.'],
      ['perm_inq_export', 'Export inquiries to CSV', 'Inquiries & Leads', 'Yes', 'Yes', 'Assigned / All', 'No', 'Download filtered or complete inquiries list as CSV/Excel.'],
      ['perm_inq_import', 'Bulk import inquiries', 'Inquiries & Leads', 'Yes', 'Yes', 'Restricted', 'No', 'Bulk upload inquiry spreadsheets into the CRM.'],
      ['perm_inq_stage', 'Change pipeline stage', 'Inquiries & Leads', 'Yes', 'Yes', 'Yes', 'No', 'Advance inquiries across pipeline stages from Leads to Closed Won.'],
      ['perm_inq_assign', 'Reassign salesperson', 'Inquiries & Leads', 'Yes', 'Yes', 'No', 'No', 'Transfer inquiry ownership between team members.'],

      // 2. Companies & Accounts Module
      ['perm_comp_view', 'View companies & accounts', 'Companies & Accounts', 'Yes', 'Yes', 'Assigned / All', 'View', 'Ability to browse enterprise client accounts and dossiers.'],
      ['perm_comp_create', 'Create company & contacts', 'Companies & Accounts', 'Yes', 'Yes', 'Yes', 'No', 'Register new industrial client companies and executive stakeholders.'],
      ['perm_comp_edit', 'Edit company information', 'Companies & Accounts', 'Yes', 'Yes', 'Assigned / All', 'No', 'Update company GSTIN, industry type, and contact details.'],
      ['perm_comp_delete', 'Delete / Archive company', 'Companies & Accounts', 'Yes', 'Yes', 'Restricted', 'No', 'Archive or delete client company profiles.'],
      ['perm_comp_export', 'Export companies to CSV', 'Companies & Accounts', 'Yes', 'Yes', 'Assigned / All', 'No', 'Download client company roster as Excel / CSV spreadsheet.'],
      ['perm_comp_import', 'Import companies', 'Companies & Accounts', 'Yes', 'Yes', 'Restricted', 'No', 'Bulk upload enterprise accounts from CSV files.'],

      // 3. Properties & Warehouses Module
      ['perm_prop_view', 'View property listings', 'Properties & Warehouses', 'Yes', 'Yes', 'Yes', 'View', 'Browse available warehouses, industrial parks, and micro-locations.'],
      ['perm_prop_create', 'Add new property', 'Properties & Warehouses', 'Yes', 'Yes', 'Yes', 'No', 'List new industrial assets, clear heights, and docks.'],
      ['perm_prop_edit', 'Edit property specs', 'Properties & Warehouses', 'Yes', 'Yes', 'Yes', 'No', 'Update lease rates, carpet area, zoning, and facility specs.'],
      ['perm_prop_delete', 'Delete property', 'Properties & Warehouses', 'Yes', 'Yes', 'Restricted', 'No', 'Remove warehouse assets from live inventory.'],
      ['perm_prop_export', 'Export properties to CSV', 'Properties & Warehouses', 'Yes', 'Yes', 'Yes', 'No', 'Export property availability sheets.'],
      ['perm_prop_docs', 'Upload property documents', 'Properties & Warehouses', 'Yes', 'Yes', 'Yes', 'No', 'Upload layout CAD plans, floor photos, and fire NOCs.'],

      // 4. Proposals & Financials Module
      ['perm_prop_quote_view', 'View commercial proposals', 'Proposals & Financials', 'Yes', 'Yes', 'Yes', 'View', 'Inspect drafted commercial quotes and rental schedules.'],
      ['perm_prop_quote_create', 'Create commercial proposal', 'Proposals & Financials', 'Yes', 'Yes', 'Yes', 'No', 'Generate commercial leasing proposals with custom escalation terms.'],
      ['perm_prop_quote_edit', 'Edit proposal terms', 'Proposals & Financials', 'Yes', 'Yes', 'Assigned / All', 'No', 'Adjust base rent, CAM charges, lock-in, and security deposit.'],
      ['perm_prop_quote_delete', 'Delete proposal draft', 'Proposals & Financials', 'Yes', 'Yes', 'Restricted', 'No', 'Delete draft or rejected commercial proposals.'],
      ['perm_prop_quote_pdf', 'Download proposal PDF', 'Proposals & Financials', 'Yes', 'Yes', 'Yes', 'View', 'Generate stamped Fairway proposal PDF documents.'],

      // 5. Tasks & Follow-ups Module
      ['perm_task_view', 'View team tasks', 'Tasks & Follow-ups', 'Yes', 'Yes', 'Assigned / All', 'View', 'Access calendar deadlines, inspections, and client call lists.'],
      ['perm_task_create', 'Create & assign tasks', 'Tasks & Follow-ups', 'Yes', 'Yes', 'Yes', 'No', 'Create follow-up actions and assign to team members.'],
      ['perm_task_edit', 'Edit & reschedule tasks', 'Tasks & Follow-ups', 'Yes', 'Yes', 'Assigned / All', 'No', 'Update due dates, priority, and task notes.'],
      ['perm_task_delete', 'Complete / Delete tasks', 'Tasks & Follow-ups', 'Yes', 'Yes', 'Assigned / All', 'No', 'Mark tasks as completed or remove cancelled tasks.'],

      // 6. Communications & Activity Module
      ['perm_comm_view', 'View communication history', 'Communications', 'Yes', 'Yes', 'Assigned / All', 'View', 'Read client call notes, site visit feedback, and email trail.'],
      ['perm_comm_email', 'Send client emails', 'Communications', 'Yes', 'Yes', 'Yes', 'No', 'Dispatch direct email communications from Fairway CRM.'],
      ['perm_comm_call', 'Log calls and site visits', 'Communications', 'Yes', 'Yes', 'Yes', 'No', 'Record phone calls, WhatsApp updates, and client site tours.'],

      // 7. Reports & Analytics Module
      ['perm_rep_view', 'View executive dashboards', 'Reports & Analytics', 'Yes', 'Yes', 'Assigned / All', 'View', 'Inspect pipeline volume, deal status distribution, and sales metrics.'],
      ['perm_rep_financial', 'View financial revenue analytics', 'Reports & Analytics', 'Yes', 'Yes', 'Restricted', 'No', 'Analyze brokerage commissions, lease values, and revenue forecasts.'],
      ['perm_rep_export', 'Export reports to Excel / PDF', 'Reports & Analytics', 'Yes', 'Yes', 'Restricted', 'No', 'Export analytical reports and pipeline summaries.'],

      // 8. Administration & Security Module
      ['perm_adm_users', 'Manage users & team members', 'Administration', 'Yes', 'Configurable', 'No', 'No', 'Add, edit, and deactivate user accounts and change passwords.'],
      ['perm_adm_roles', 'Configure roles & RBAC', 'Administration', 'Yes', 'Configurable', 'No', 'No', 'Create security roles and modify module permission matrices.'],
      ['perm_adm_stages', 'Configure pipeline stages', 'Administration', 'Yes', 'Configurable', 'No', 'No', 'Reorder stages, change win probabilities, and SLAs.'],
      ['perm_adm_audit', 'View security audit logs', 'Administration', 'Yes', 'Limited', 'No', 'No', 'Inspect tamper-evident audit logs and user activity.'],
    ];

    for (const row of defaultMatrix) {
      await query(
        `INSERT INTO role_permissions (id, capability, category, super_admin, admin, sales, viewer, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        row
      );
    }

    const result = await query('SELECT * FROM role_permissions ORDER BY category ASC, id ASC');
    const permissions = result.rows.map((row) => ({
      id: row.id,
      capability: row.capability,
      category: row.category,
      superAdmin: row.super_admin,
      admin: row.admin,
      sales: row.sales,
      viewer: row.viewer,
      customPermissions: row.custom_permissions || {},
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({
      success: true,
      data: permissions,
      message: 'Roles & Permissions matrix reset to default baseline',
    });
  } catch (error: any) {
    console.error('Error in resetRolePermissions:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to reset permissions' },
    });
  }
};
