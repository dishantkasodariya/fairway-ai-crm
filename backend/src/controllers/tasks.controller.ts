import { Request, Response } from 'express';
import { query } from '../config/db.js';
import crypto from 'crypto';

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

    const formattedTasks = result.rows.map((row) => ({
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
    }));

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

    let completedAt = null;
    if (status === 'Completed') {
      completedAt = new Date();
    }

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
      res.status(404).json({ success: false, error: 'Task not found.' });
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
        completedAt: row.completed_at ? row.completed_at.toISOString() : undefined,
        completedNotes: row.completed_notes,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update task.' });
  }
};

/**
 * PATCH /api/tasks/:id/toggle
 * Toggles task status between Pending and Completed
 */
export const toggleTaskStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const check = await query('SELECT status FROM tasks WHERE id = $1;', [id]);
    if (check.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found.' });
      return;
    }

    const currentStatus = check.rows[0].status;
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';

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
        completedAt: row.completed_at ? row.completed_at.toISOString() : undefined,
        completedNotes: row.completed_notes,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error toggling task status:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to toggle task.' });
  }
};

/**
 * DELETE /api/tasks/:id
 */
export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM tasks WHERE id = $1 RETURNING id;', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Task not found.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Task deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete task.' });
  }
};
