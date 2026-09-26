import { Request, Response } from 'express';
import { query } from '../config/db.js';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

/**
 * GET /api/v1/pipeline-stages
 * Retrieve all pipeline stages ordered by stage_order
 */
export const getPipelineStages = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT
        id,
        key,
        label,
        COALESCE(color, '#64748B') AS color,
        COALESCE(bg_color, 'bg-slate-50') AS bg_color,
        COALESCE(text_color, 'text-slate-700') AS text_color,
        COALESCE(border_color, 'border-slate-300') AS border_color,
        COALESCE(description, '') AS description,
        COALESCE(stage_order, 1) AS stage_order,
        COALESCE(is_system, true) AS is_system,
        created_at,
        updated_at
      FROM pipeline_stages
      ORDER BY COALESCE(stage_order, 1) ASC, created_at ASC;
    `);

    const formatted = result.rows.map((r) => ({
      id: r.id,
      key: r.key,
      label: r.label,
      color: r.color,
      bgColor: r.bg_color,
      textColor: r.text_color,
      borderColor: r.border_color,
      description: r.description,
      order: Number(r.stage_order),
      isSystem: Boolean(r.is_system),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    res.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error('Error in getPipelineStages:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve pipeline stages.' });
  }
};

/**
 * POST /api/v1/pipeline-stages
 * Create a new custom pipeline stage
 */
export const createPipelineStage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { key, label, color, bgColor, textColor, borderColor, description, order } = req.body;

    if (!key || !label) {
      res.status(400).json({ success: false, error: 'Key and label are required for a pipeline stage.' });
      return;
    }

    const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const id = `stg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const stageOrder = order ? Number(order) : 99;

    const insertSql = `
      INSERT INTO pipeline_stages (
        id, key, label, color, bg_color, text_color, border_color, description, stage_order, is_system,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const result = await query(insertSql, [
      id,
      cleanKey,
      label,
      color || '#64748B',
      bgColor || 'bg-slate-50',
      textColor || 'text-slate-700',
      borderColor || 'border-slate-300',
      description || '',
      stageOrder,
    ]);

    const r = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        id: r.id,
        key: r.key || cleanKey,
        label: r.label || label,
        color: r.color || color || '#64748B',
        bgColor: r.bg_color || bgColor || 'bg-slate-50',
        textColor: r.text_color || textColor || 'text-slate-700',
        borderColor: r.border_color || borderColor || 'border-slate-300',
        description: r.description || description || '',
        order: Number(r.stage_order || stageOrder),
        isSystem: Boolean(r.is_system),
      },
    });
  } catch (error: any) {
    console.error('Error in createPipelineStage:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create pipeline stage.' });
  }
};

/**
 * PUT /api/v1/pipeline-stages/:id
 */
export const updatePipelineStage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { label, color, bgColor, textColor, borderColor, description, order } = req.body;

    const fields: string[] = [];
    const params: any[] = [id];

    if (label !== undefined) {
      params.push(label);
      fields.push(`label = $${params.length}`);
    }
    if (color !== undefined) {
      params.push(color);
      fields.push(`color = $${params.length}`);
    }
    if (bgColor !== undefined) {
      params.push(bgColor);
      fields.push(`bg_color = $${params.length}`);
    }
    if (textColor !== undefined) {
      params.push(textColor);
      fields.push(`text_color = $${params.length}`);
    }
    if (borderColor !== undefined) {
      params.push(borderColor);
      fields.push(`border_color = $${params.length}`);
    }
    if (description !== undefined) {
      params.push(description);
      fields.push(`description = $${params.length}`);
    }
    if (order !== undefined) {
      params.push(Number(order));
      fields.push(`stage_order = $${params.length}`);
    }

    if (fields.length === 0) {
      res.status(400).json({ success: false, error: 'No update parameters provided.' });
      return;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const sql = `
      UPDATE pipeline_stages 
      SET ${fields.join(', ')} 
      WHERE id = $1 
      RETURNING *;
    `;

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Pipeline stage not found.' });
      return;
    }

    const r = result.rows[0];
    res.json({
      success: true,
      data: {
        id: r.id,
        key: r.key,
        label: r.label,
        color: r.color,
        bgColor: r.bg_color,
        textColor: r.text_color,
        borderColor: r.border_color,
        description: r.description,
        order: Number(r.stage_order || 1),
        isSystem: Boolean(r.is_system),
      },
    });
  } catch (error: any) {
    console.error('Error in updatePipelineStage:', error);
    res.status(500).json({ success: false, error: 'Failed to update pipeline stage.' });
  }
};
