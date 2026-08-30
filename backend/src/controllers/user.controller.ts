import { Request, Response } from 'express';
import { query } from '../config/db.js';
import { hashPassword } from '../utils/password.js';

/**
 * GET /api/users/dd/active
 * Lightweight endpoint for active user / salesperson dropdown options
 */
export const getUsersDropdownActive = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, email, role, department, avatar
       FROM users
       WHERE status = 'Active' OR status IS NULL
       ORDER BY name ASC;`
    );

    const dropdownOptions = result.rows.map((row) => ({
      id: row.id,
      value: row.id,
      label: `${row.name} (${row.role || 'Sales'})`,
      name: row.name,
      email: row.email,
      role: row.role,
      department: row.department,
      avatar: row.avatar,
    }));

    res.status(200).json({ success: true, data: dropdownOptions });
  } catch (error: any) {
    console.error('Error fetching users dropdown:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch active users dropdown' });
  }
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, email, role, department, avatar, phone, timezone, 
              working_hours_start, working_hours_end, two_factor_enabled, 
              birth_date, status, assigned_leads_count, last_active, created_at, updated_at 
       FROM users 
       ORDER BY created_at ASC`
    );

    const users = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role || 'sales',
      department: row.department || 'Industrial Leasing',
      avatar: row.avatar || undefined,
      phone: row.phone || '+91 988496151',
      timezone: row.timezone || 'Asia/Kolkata',
      workingHoursStart: row.working_hours_start || '10:00 AM',
      workingHoursEnd: row.working_hours_end || '7:30 PM',
      twoFactorEnabled: !!row.two_factor_enabled,
      birthDate: row.birth_date || undefined,
      status: row.status || 'Active',
      assignedLeadsCount: row.assigned_leads_count || 0,
      lastActive: row.last_active ? 'Just now' : 'Recently',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    console.error('Error in getUsers:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to fetch users' },
    });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role = 'sales', department = 'Industrial Leasing', phone = '+91 988496151', avatar } = req.body;

    if (!name || !email) {
      res.status(400).json({
        success: false,
        error: { message: 'Name and email are required' },
      });
      return;
    }

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (existing.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: { message: 'A user with this email address already exists' },
      });
      return;
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const hashedPassword = await hashPassword(password || 'Fairway@123');

    const result = await query(
      `INSERT INTO users (id, name, email, password, role, department, phone, avatar, status, assigned_leads_count, last_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Active', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, name, email, role, department, avatar, phone, timezone, working_hours_start, working_hours_end, two_factor_enabled, birth_date, status, assigned_leads_count, last_active, created_at, updated_at`,
      [userId, name.trim(), email.trim().toLowerCase(), hashedPassword, role, department.trim(), phone.trim(), avatar || null]
    );

    const row = result.rows[0];
    const newUser = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      department: row.department,
      avatar: row.avatar || undefined,
      phone: row.phone,
      timezone: row.timezone || 'Asia/Kolkata',
      workingHoursStart: row.working_hours_start || '10:00 AM',
      workingHoursEnd: row.working_hours_end || '7:30 PM',
      twoFactorEnabled: !!row.two_factor_enabled,
      birthDate: row.birth_date || undefined,
      status: row.status,
      assignedLeadsCount: row.assigned_leads_count,
      lastActive: 'Just now',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.status(201).json({
      success: true,
      data: newUser,
    });
  } catch (error: any) {
    console.error('Error in createUser:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to create user' },
    });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, role, department, phone, status, avatar, birthDate } = req.body;

    const userCheck = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'User not found' },
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
    if (role !== undefined) {
      updates.push(`role = $${idx++}`);
      values.push(role);
    }
    if (department !== undefined) {
      updates.push(`department = $${idx++}`);
      values.push(department.trim());
    }
    if (phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(phone.trim());
    }
    if (status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(status);
    }
    if (avatar !== undefined) {
      updates.push(`avatar = $${idx++}`);
      values.push(avatar);
    }
    if (birthDate !== undefined) {
      updates.push(`birth_date = $${idx++}`);
      values.push(birthDate);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${idx}
      RETURNING id, name, email, role, department, avatar, phone, timezone, working_hours_start, working_hours_end, two_factor_enabled, birth_date, status, assigned_leads_count, last_active, created_at, updated_at
    `;

    const result = await query(updateQuery, values);
    const row = result.rows[0];

    const updatedUser = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      department: row.department,
      avatar: row.avatar || undefined,
      phone: row.phone,
      timezone: row.timezone || 'Asia/Kolkata',
      workingHoursStart: row.working_hours_start || '10:00 AM',
      workingHoursEnd: row.working_hours_end || '7:30 PM',
      twoFactorEnabled: !!row.two_factor_enabled,
      birthDate: row.birth_date || undefined,
      status: row.status,
      assignedLeadsCount: row.assigned_leads_count,
      lastActive: 'Just now',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.json({
      success: true,
      data: updatedUser,
    });
  } catch (error: any) {
    console.error('Error in updateUser:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to update user' },
    });
  }
};

export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const userCheck = await query('SELECT id, status FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'User not found' },
      });
      return;
    }

    const currentStatus = userCheck.rows[0].status || 'Active';
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    const result = await query(
      `UPDATE users 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, name, email, role, status`,
      [newStatus, id]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: `User status changed to ${newStatus}`,
    });
  } catch (error: any) {
    console.error('Error in toggleUserStatus:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to toggle user status' },
    });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const userCheck = await query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'User not found' },
      });
      return;
    }

    // Protect super admin from accidental deletion if only 1 exists
    if (userCheck.rows[0].role === 'super_admin') {
      const superAdminCount = await query(`SELECT COUNT(*) as count FROM users WHERE role = 'super_admin'`);
      if (parseInt(superAdminCount.rows[0].count) <= 1) {
        res.status(400).json({
          success: false,
          error: { message: 'Cannot delete the primary Super Admin account' },
        });
        return;
      }
    }

    await query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'User removed successfully',
    });
  } catch (error: any) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to delete user' },
    });
  }
};
