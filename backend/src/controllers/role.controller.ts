import { Request, Response } from 'express';
import { query } from '../config/db.js';

export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const rolesRes = await query(
      `SELECT r.id, r.name, r.key, r.description, r.color, r.is_system, r.created_at, r.updated_at,
              COALESCE(u.user_count, 0)::int as user_count
       FROM roles r
       LEFT JOIN (
         SELECT role, COUNT(*) as user_count 
         FROM users 
         GROUP BY role
       ) u ON LOWER(u.role) = LOWER(r.key)
       ORDER BY r.is_system DESC, r.created_at ASC`
    );

    const roles = rolesRes.rows.map((row) => ({
      id: row.id,
      name: row.name,
      key: row.key,
      description: row.description,
      color: row.color || 'blue',
      isSystem: !!row.is_system,
      userCount: row.user_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({
      success: true,
      data: roles,
    });
  } catch (error: any) {
    console.error('Error in getRoles:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to fetch roles' },
    });
  }
};

export const createRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, color = 'blue' } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        error: { message: 'Role name is required' },
      });
      return;
    }

    const trimmedName = name.trim();
    const roleKey = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const roleId = `role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Check if key already exists
    const existing = await query('SELECT id FROM roles WHERE LOWER(key) = LOWER($1)', [roleKey]);
    if (existing.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: { message: `A role with key "${roleKey}" already exists` },
      });
      return;
    }

    const result = await query(
      `INSERT INTO roles (id, name, key, description, color, is_system, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, name, key, description, color, is_system, created_at, updated_at`,
      [roleId, trimmedName, roleKey, description || '', color]
    );

    const row = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        key: row.key,
        description: row.description,
        color: row.color,
        isSystem: false,
        userCount: 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error in createRole:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to create role' },
    });
  }
};

export const updateRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;

    const existing = await query('SELECT id, is_system FROM roles WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Role not found' },
      });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(description.trim());
    }
    if (color !== undefined) {
      updates.push(`color = $${idx++}`);
      values.push(color);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE roles 
       SET ${updates.join(', ')} 
       WHERE id = $${idx} 
       RETURNING id, name, key, description, color, is_system, created_at, updated_at`,
      values
    );

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        key: row.key,
        description: row.description,
        color: row.color,
        isSystem: !!row.is_system,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error in updateRole:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to update role' },
    });
  }
};

export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, key, is_system FROM roles WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Role not found' },
      });
      return;
    }

    const role = existing.rows[0];
    if (role.is_system) {
      res.status(400).json({
        success: false,
        error: { message: 'System default roles cannot be deleted' },
      });
      return;
    }

    // Check if any users have this role assigned
    const userCount = await query('SELECT COUNT(*) as count FROM users WHERE LOWER(role) = LOWER($1)', [role.key]);
    if (parseInt(userCount.rows[0].count, 10) > 0) {
      res.status(400).json({
        success: false,
        error: { message: `Cannot delete role because ${userCount.rows[0].count} user(s) are currently assigned to it. Please reassign them first.` },
      });
      return;
    }

    await query('DELETE FROM roles WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error: any) {
    console.error('Error in deleteRole:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to delete role' },
    });
  }
};

export const getRolePermissionsForRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const roleKey = String(req.params.roleKey || '').trim();
    const normalizedKey = roleKey.toLowerCase();

    const result = await query(
      `SELECT id, capability, category, super_admin, admin, sales, viewer, custom_permissions, description 
       FROM role_permissions 
       ORDER BY id ASC`
    );

    const permissions = result.rows.map((row) => {
      let value = 'No';
      if (normalizedKey === 'admin' || normalizedKey === 'super_admin') {
        value = 'Yes';
      } else {
        const custom = (row.custom_permissions || {}) as Record<string, string>;
        if (custom[roleKey] !== undefined) {
          value = custom[roleKey];
        } else if (custom[normalizedKey] !== undefined) {
          value = custom[normalizedKey];
        } else if (custom[roleKey.toUpperCase()] !== undefined) {
          value = custom[roleKey.toUpperCase()];
        } else {
          for (const [k, v] of Object.entries(custom)) {
            if (k.toLowerCase() === normalizedKey) {
              value = v;
              break;
            }
          }
        }
      }

      return {
        id: row.id,
        capability: row.capability,
        category: row.category,
        value,
        description: row.description,
      };
    });

    res.json({
      success: true,
      roleKey,
      data: permissions,
    });
  } catch (error: any) {
    console.error('Error in getRolePermissionsForRole:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to fetch permissions for role' },
    });
  }
};

export const updatePermissionsForRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const roleKey = String(req.params.roleKey || '').trim();
    const normalizedKey = roleKey.toLowerCase();
    const { permissions } = req.body; // Array of { id: string, value: string }

    if (!Array.isArray(permissions)) {
      res.status(400).json({
        success: false,
        error: { message: 'Permissions array is required' },
      });
      return;
    }

    for (const item of permissions) {
      if (normalizedKey === 'admin' || normalizedKey === 'super_admin') {
        await query('UPDATE role_permissions SET admin = $1, super_admin = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [item.value, item.id]);
      } else {
        // Any custom or user-created role updates custom_permissions
        await query(
          `UPDATE role_permissions 
           SET custom_permissions = COALESCE(custom_permissions, '{}'::jsonb) 
               || jsonb_build_object($1::text, $2::text) 
               || jsonb_build_object($3::text, $2::text) 
               || jsonb_build_object($4::text, $2::text),
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = $5`,
          [roleKey, item.value, roleKey.toUpperCase(), normalizedKey, item.id]
        );
      }
    }

    res.json({
      success: true,
      message: `Permissions updated successfully for role ${roleKey}`,
    });
  } catch (error: any) {
    console.error('Error in updatePermissionsForRole:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to update permissions for role' },
    });
  }
};
