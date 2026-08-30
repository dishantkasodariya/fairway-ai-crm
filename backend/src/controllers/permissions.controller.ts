import { Request, Response } from 'express';
import { query } from '../config/db.js';

export const getRolePermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, capability, category, super_admin, admin, sales, viewer, custom_permissions, description, created_at, updated_at 
       FROM role_permissions 
       ORDER BY id ASC`
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

export const updateRolePermission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { superAdmin, admin, sales, viewer, description } = req.body;

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
       RETURNING id, capability, category, super_admin, admin, sales, viewer, description, created_at, updated_at`,
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
      await query(
        `INSERT INTO role_permissions (id, capability, category, super_admin, admin, sales, viewer, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        row
      );
    }

    const result = await query('SELECT * FROM role_permissions ORDER BY id ASC');
    const permissions = result.rows.map((row) => ({
      id: row.id,
      capability: row.capability,
      category: row.category,
      superAdmin: row.super_admin,
      admin: row.admin,
      sales: row.sales,
      viewer: row.viewer,
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
