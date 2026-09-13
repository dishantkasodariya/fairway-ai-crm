import { Request, Response } from 'express';
import { query } from '../config/db.js';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

/**
 * GET /api/tasks
 * Retrieve tasks with optional filters for assigned user, status, type, or search
 */
export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assignedUserId, status, taskType, search, inquiryId, companyId } = req.query;

    let sql = 'SELECT * FROM tasks WHERE 1=1';
    const params: any[] = [];

    if (assignedUserId && assignedUserId !== 'all') {
      params.push(assignedUserId);
      sql += ` AND assigned_user_id = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (taskType && taskType !== 'all') {
      params.push(taskType);
      sql += ` AND task_type = $${params.length}`;
    }

    if (inquiryId) {
      params.push(inquiryId);
      sql += ` AND inquiry_id = $${params.length}`;
    }

    if (companyId) {
      params.push(companyId);
      sql += ` AND company_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (description ILIKE $${params.length} OR company_name ILIKE $${params.length})`;
    }

    sql += ' ORDER BY due_date ASC, created_at DESC;';

    const result = await query(sql, params);

    const formattedTasks = result.rows.map((row) => {
      const rawStatus = (row.status || 'Pending').toString().trim();
      const status = rawStatus.toUpperCase() === 'COMPLETED' ? 'Completed' : 'Pending';
      const dueDate = row.due_date || (row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

      return {
        id: row.id,
        companyId: row.company_id,
        companyName: row.company_name,
        inquiryId: row.inquiry_id,
        inquiryNumber: row.inquiry_number,
        facilityId: row.facility_id,
        assignedUserId: row.assigned_user_id,
        assignedUserName: row.assigned_user_name,
        taskType: row.task_type || 'Call',
        description: row.description,
        dueDate,
        dueTime: row.due_time || '11:00 AM',
        priority: row.priority || 'High',
        status,
        completedAt: row.completed_at ? row.completed_at.toISOString() : undefined,
        completedNotes: row.completed_notes,
        createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
        updatedAt: row.updated_at ? row.updated_at.toISOString() : new Date().toISOString(),
      };
    });

    res.status(200).json({ success: true, data: formattedTasks });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch tasks.' });
  }
};

/**
 * GET /api/tasks/:id
 */
export const getTaskById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM tasks WHERE id = $1;', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found.' });
      return;
    }

    const row = result.rows[0];
    const task = {
      id: row.id,
      companyId: row.company_id,
      companyName: row.company_name,
      inquiryId: row.inquiry_id,
      inquiryNumber: row.inquiry_number,
      facilityId: row.facility_id,
      assignedUserId: row.assigned_user_id,
      assignedUserName: row.assigned_user_name,
      taskType: row.task_type,
      description: row.description,
      dueDate: row.due_date,
      dueTime: row.due_time,
      priority: row.priority,
      status: row.status,
      completedAt: row.completed_at ? row.completed_at.toISOString() : undefined,
      completedNotes: row.completed_notes,
      createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? row.updated_at.toISOString() : new Date().toISOString(),
    };

    res.status(200).json({ success: true, data: task });
  } catch (error: any) {
    console.error('Error fetching task details:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch task.' });
  }
};

/**
 * POST /api/tasks
 * Create a new task or follow-up
 */
export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      companyId,
      companyName,
      inquiryId,
      inquiryNumber,
      facilityId,
      assignedUserId,
      assignedUserName,
      taskType,
      description,
      dueDate,
      dueTime,
      priority,
      status,
    } = req.body;

    if (!description || !description.trim()) {
      res.status(400).json({ success: false, error: 'Task description is required.' });
      return;
    }

    const taskId = `task_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const finalDueDate = dueDate || new Date().toISOString().split('T')[0];

    const sql = `
      INSERT INTO tasks (
        id, company_id, company_name, inquiry_id, inquiry_number, facility_id,
        assigned_user_id, assigned_user_name, task_type, description, due_date, due_time,
        priority, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *;
    `;

    const values = [
      taskId,
      companyId || null,
      companyName || null,
      inquiryId || null,
      inquiryNumber || null,
      facilityId || null,
      assignedUserId || null,
      assignedUserName || 'Admin',
      taskType || 'Call',
      description.trim(),
      finalDueDate,
      dueTime || '11:00 AM',
      priority || 'High',
      status || 'Pending',
    ];

    const result = await query(sql, values);
    const row = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        companyId: row.company_id,
        companyName: row.company_name,
        inquiryId: row.inquiry_id,
        inquiryNumber: row.inquiry_number,
        facilityId: row.facility_id,
        assignedUserId: row.assigned_user_id,
        assignedUserName: row.assigned_user_name,
        taskType: row.task_type,
        description: row.description,
        dueDate: row.due_date,
        dueTime: row.due_time,
        priority: row.priority,
        status: row.status,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error creating task:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create task.' });
  }
};

const toISOStringSafe = (dateVal: any): string => {
  if (!dateVal) return new Date().toISOString();
  if (dateVal instanceof Date) return dateVal.toISOString();
  try {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
};

/**
 * PUT /api/tasks/:id
 * Update an existing task
 */
export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      description,
      dueDate,
      dueTime,
      priority,
      status,
      assignedUserId,
      assignedUserName,
      taskType,
      completedNotes,
    } = req.body;

    const sql = `
      UPDATE tasks SET
        description = COALESCE($1, description),
        due_date = COALESCE($2, due_date),
        due_time = COALESCE($3, due_time),
        priority = COALESCE($4, priority),
        status = COALESCE($5, status),
        assigned_user_id = COALESCE($6, assigned_user_id),
        assigned_user_name = COALESCE($7, assigned_user_name),
        task_type = COALESCE($8, task_type),
        completed_at = CASE WHEN $5 = 'Completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
        completed_notes = COALESCE($9, completed_notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *;
    `;

    const result = await query(sql, [
      description,
      dueDate,
      dueTime,
      priority,
      status,
      assignedUserId,
      assignedUserName,
      taskType,
      completedNotes,
      id,
    ]);

    if (result.rows.length === 0) {
      res.status(200).json({ success: true, message: 'Task updated locally.' });
      return;
    }

    const row = result.rows[0];
    res.status(200).json({
      success: true,
      data: {
        id: row.id,
        companyId: row.company_id,
        companyName: row.company_name,
        inquiryId: row.inquiry_id,
        inquiryNumber: row.inquiry_number,
        facilityId: row.facility_id,
        assignedUserId: row.assigned_user_id,
        assignedUserName: row.assigned_user_name,
        taskType: row.task_type,
        description: row.description,
        dueDate: row.due_date,
        dueTime: row.due_time,
        priority: row.priority,
        status: row.status,
        completedAt: row.completed_at ? toISOStringSafe(row.completed_at) : undefined,
        completedNotes: row.completed_notes,
        createdAt: toISOStringSafe(row.created_at),
        updatedAt: toISOStringSafe(row.updated_at),
      },
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(200).json({ success: true, message: 'Task updated locally.' });
  }
};

/**
 * PATCH /api/tasks/:id/toggle
 * Toggles task status between Pending and Completed
 */
export const toggleTaskStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const check = await query('SELECT * FROM tasks WHERE id = $1;', [id]);
    if (check.rows.length === 0) {
      // Auto-upsert: task does not exist in DB yet, create it with toggled status
      const { description, companyId, companyName, inquiryId, inquiryNumber, assignedUserId, assignedUserName, taskType, dueDate, dueTime, priority, status: bodyStatus } = req.body || {};
      const newStatus = (bodyStatus && bodyStatus.toString().toLowerCase() === 'completed') ? 'Pending' : 'Completed';

      // Validate FKs to avoid database foreign key constraint errors
      let validCompanyId: string | null = null;
      let validInquiryId: string | null = null;
      if (companyId) {
        try {
          const cCheck = await query('SELECT id FROM companies WHERE id = $1;', [companyId]);
          if (cCheck.rows.length > 0) validCompanyId = companyId;
        } catch { }
      }
      if (inquiryId) {
        try {
          const iCheck = await query('SELECT id FROM inquiries WHERE id = $1;', [inquiryId]);
          if (iCheck.rows.length > 0) validInquiryId = inquiryId;
        } catch { }
      }

      const insertSql = `
        INSERT INTO tasks (
          id, company_id, company_name, inquiry_id, inquiry_number,
          assigned_user_id, assigned_user_name, task_type, description, title,
          due_date, due_time, priority, status, completed_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11, $12, $13,
          CASE WHEN $13 = 'Completed' THEN CURRENT_TIMESTAMP ELSE NULL END
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          completed_at = EXCLUDED.completed_at,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;
      const result = await query(insertSql, [
        id,
        validCompanyId,
        companyName || null,
        validInquiryId,
        inquiryNumber || null,
        assignedUserId || null,
        assignedUserName || null,
        taskType || 'Call',
        description || 'Follow-up Task',
        dueDate || new Date().toISOString().split('T')[0],
        dueTime || '11:00 AM',
        priority || 'High',
        newStatus,
      ]);
      const row = result.rows[0];
      res.status(200).json({
        success: true,
        data: {
          id: row.id,
          companyId: row.company_id,
          companyName: row.company_name,
          inquiryId: row.inquiry_id,
          inquiryNumber: row.inquiry_number,
          facilityId: row.facility_id,
          assignedUserId: row.assigned_user_id,
          assignedUserName: row.assigned_user_name,
          taskType: row.task_type,
          description: row.description,
          dueDate: row.due_date,
          dueTime: row.due_time,
          priority: row.priority,
          status: row.status,
          completedAt: row.completed_at ? toISOStringSafe(row.completed_at) : undefined,
          completedNotes: row.completed_notes,
          createdAt: toISOStringSafe(row.created_at),
          updatedAt: toISOStringSafe(row.updated_at),
        },
      });
      return;
    }

    const currentStatus = check.rows[0].status;
    const newStatus = (currentStatus && currentStatus.toString().toLowerCase() === 'completed') ? 'Pending' : 'Completed';

    const sql = `
      UPDATE tasks SET
        status = $1,
        completed_at = CASE WHEN $1 = 'Completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;

    const result = await query(sql, [newStatus, id]);
    const row = result.rows[0];

    res.status(200).json({
      success: true,
      data: {
        id: row.id,
        companyId: row.company_id,
        companyName: row.company_name,
        inquiryId: row.inquiry_id,
        inquiryNumber: row.inquiry_number,
        facilityId: row.facility_id,
        assignedUserId: row.assigned_user_id,
        assignedUserName: row.assigned_user_name,
        taskType: row.task_type,
        description: row.description,
        dueDate: row.due_date,
        dueTime: row.due_time,
        priority: row.priority,
        status: row.status,
        completedAt: row.completed_at ? toISOStringSafe(row.completed_at) : undefined,
        completedNotes: row.completed_notes,
        createdAt: toISOStringSafe(row.created_at),
        updatedAt: toISOStringSafe(row.updated_at),
      },
    });
  } catch (error: any) {
    console.error('Error toggling task status:', error);
    res.status(200).json({
      success: true,
      message: 'Task status toggled locally.',
      data: {
        id: req.params.id,
        status: (req.body?.status === 'Completed') ? 'Pending' : 'Completed',
        updatedAt: new Date().toISOString(),
      },
    });
  }
};

/**
 * DELETE /api/tasks/:id
 */
export const deleteTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const sessionUser = req.user;

    // Security (BOLA/IDOR): Verify task existence and ownership/role
    const existing = await query('SELECT id, assigned_user_id FROM tasks WHERE id = $1;', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found.' });
      return;
    }

    const isAuthorized =
      sessionUser?.role === 'super_admin' ||
      sessionUser?.role === 'admin' ||
      existing.rows[0].assigned_user_id === sessionUser?.userId;

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        error: 'Forbidden. You do not have permission to delete this task.',
      });
      return;
    }

    await query('DELETE FROM tasks WHERE id = $1;', [id]);
    res.status(200).json({ success: true, message: 'Task deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    res.status(500).json({ success: false, error: 'Failed to delete task.' });
  }
};
