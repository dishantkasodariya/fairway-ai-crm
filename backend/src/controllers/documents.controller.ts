import { Request, Response } from 'express';
import { query } from '../config/db.js';
import crypto from 'crypto';

/**
 * GET /api/documents
 */
export const getDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, inquiryId, category, search } = req.query;
    let sql = 'SELECT * FROM documents WHERE 1=1';
    const params: any[] = [];

    if (companyId) {
      params.push(companyId);
      sql += ` AND company_id = $${params.length}`;
    }

    if (inquiryId) {
      params.push(inquiryId);
      sql += ` AND inquiry_id = $${params.length}`;
    }

    if (category && category !== 'all') {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $${params.length} OR company_name ILIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC;';
    const result = await query(sql, params);

    const docs = result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      fileType: r.file_type,
      fileSize: r.file_size,
      url: r.url,
      companyId: r.company_id,
      companyName: r.company_name,
      inquiryId: r.inquiry_id,
      inquiryNumber: r.inquiry_number,
      uploadedById: r.uploaded_by_id,
      uploadedByName: r.uploaded_by_name,
      category: r.category,
      createdAt: r.created_at,
    }));

    res.status(200).json({ success: true, data: docs });
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to fetch documents' } });
  }
};

/**
 * POST /api/documents
 */
export const createDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      fileType = 'PDF',
      fileSize = '1.0 MB',
      url = '#',
      companyId,
      companyName,
      inquiryId,
      inquiryNumber,
      uploadedById,
      uploadedByName,
      category = 'Commercial Proposal',
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: { message: 'Document name is required' } });
      return;
    }

    const id = `doc_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;

    const sql = `
      INSERT INTO documents (
        id, name, file_type, file_size, url, company_id, company_name,
        inquiry_id, inquiry_number, uploaded_by_id, uploaded_by_name, category,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const values = [
      id,
      name.trim(),
      fileType,
      fileSize,
      url,
      companyId || null,
      companyName || '',
      inquiryId || null,
      inquiryNumber || '',
      uploadedById || '',
      uploadedByName || 'Admin',
      category,
    ];

    const result = await query(sql, values);
    const r = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: r.id,
        name: r.name,
        fileType: r.file_type,
        fileSize: r.file_size,
        url: r.url,
        companyId: r.company_id,
        companyName: r.company_name,
        inquiryId: r.inquiry_id,
        inquiryNumber: r.inquiry_number,
        uploadedById: r.uploaded_by_id,
        uploadedByName: r.uploaded_by_name,
        category: r.category,
        createdAt: r.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error creating document:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to create document' } });
  }
};

/**
 * DELETE /api/documents/:id
 */
export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const result = await query('DELETE FROM documents WHERE id = $1 RETURNING id;', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Document not found' } });
      return;
    }
    res.status(200).json({ success: true, message: 'Document deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to delete document' } });
  }
};
