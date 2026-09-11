import { Request, Response } from 'express';
import { query } from '../config/db.js';
import crypto from 'crypto';

/**
 * GET /api/notes?companyId=...&inquiryId=...
 */
export const getNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, inquiryId } = req.query;
    let sql = 'SELECT * FROM notes WHERE 1=1';
    const params: any[] = [];

    if (companyId) {
      params.push(companyId);
      sql += ` AND company_id = $${params.length}`;
    }

    if (inquiryId) {
      params.push(inquiryId);
      sql += ` AND inquiry_id = $${params.length}`;
    }

    sql += ' ORDER BY is_pinned DESC, created_at DESC;';
    const result = await query(sql, params);

    const notes = result.rows.map((row) => ({
      id: row.id,
      companyId: row.company_id,
      companyName: row.company_name,
      inquiryId: row.inquiry_id,
      inquiryNumber: row.inquiry_number,
      authorId: row.author_id,
      authorName: row.author_name,
      content: row.content,
      isPinned: row.is_pinned,
      createdAt: row.created_at,
    }));

    res.status(200).json({ success: true, data: notes });
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to fetch notes' } });
  }
};

/**
 * POST /api/notes
 */
export const createNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      companyId,
      companyName,
      inquiryId,
      inquiryNumber,
      authorId,
      authorName,
      content,
      isPinned = false,
    } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({ success: false, error: { message: 'Note content is required' } });
      return;
    }

    const id = `not_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;

    const sql = `
      INSERT INTO notes (
        id, company_id, company_name, inquiry_id, inquiry_number, author_id, author_name,
        content, is_pinned, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const values = [
      id,
      companyId || null,
      companyName || '',
      inquiryId || null,
      inquiryNumber || '',
      authorId || '',
      authorName || 'Admin',
      content.trim(),
      Boolean(isPinned),
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
        authorId: row.author_id,
        authorName: row.author_name,
        content: row.content,
        isPinned: row.is_pinned,
        createdAt: row.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error creating note:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to create note' } });
  }
};

/**
 * DELETE /api/notes/:id
 */
export const deleteNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM notes WHERE id = $1 RETURNING id;', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Note not found' } });
      return;
    }
    res.status(200).json({ success: true, message: 'Note deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting note:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to delete note' } });
  }
};
