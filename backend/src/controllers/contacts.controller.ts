import { Request, Response } from 'express';
import { query } from '../config/db.js';
import crypto from 'crypto';

/**
 * GET /api/contacts?companyId=...
 */
export const getContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.query;
    let sql = 'SELECT * FROM contacts WHERE 1=1';
    const params: any[] = [];

    if (companyId) {
      params.push(companyId);
      sql += ` AND company_id = $${params.length}`;
    }

    sql += ' ORDER BY is_primary DESC, created_at ASC;';
    const result = await query(sql, params);

    const contacts = result.rows.map((c) => ({
      id: c.id,
      companyId: c.company_id,
      companyName: c.company_name,
      name: c.name,
      designation: c.designation,
      department: c.department,
      phone: c.phone,
      email: c.email,
      linkedinUrl: c.linkedin_url,
      isPrimary: c.is_primary,
      notes: c.notes,
      createdAt: c.created_at,
    }));

    res.status(200).json({ success: true, data: contacts });
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to fetch contacts' } });
  }
};

/**
 * POST /api/contacts
 */
export const createContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, companyName, name, designation, department, phone, email, linkedinUrl, isPrimary, notes } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: { message: 'Contact name is required' } });
      return;
    }

    const id = `cnt_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;

    // If marked as primary and companyId provided, unmark other contacts for this company
    if (isPrimary && companyId) {
      await query('UPDATE contacts SET is_primary = false WHERE company_id = $1;', [companyId]);
    }

    const sql = `
      INSERT INTO contacts (
        id, company_id, company_name, name, designation, department, phone, email, linkedin_url, is_primary, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const values = [
      id,
      companyId,
      companyName || '',
      name.trim(),
      designation || '',
      department || 'Supply Chain',
      phone || '',
      email || '',
      linkedinUrl || '',
      Boolean(isPrimary),
      notes || '',
    ];

    const result = await query(sql, values);
    const c = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: c.id,
        companyId: c.company_id,
        companyName: c.company_name,
        name: c.name,
        designation: c.designation,
        department: c.department,
        phone: c.phone,
        email: c.email,
        linkedinUrl: c.linkedin_url,
        isPrimary: c.is_primary,
        notes: c.notes,
        createdAt: c.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to create contact' } });
  }
};

/**
 * PUT /api/contacts/:id
 */
export const updateContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, designation, department, phone, email, linkedinUrl, isPrimary, notes } = req.body;

    const sql = `
      UPDATE contacts SET
        name = COALESCE($1, name),
        designation = COALESCE($2, designation),
        department = COALESCE($3, department),
        phone = COALESCE($4, phone),
        email = COALESCE($5, email),
        linkedin_url = COALESCE($6, linkedin_url),
        is_primary = COALESCE($7, is_primary),
        notes = COALESCE($8, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *;
    `;

    const result = await query(sql, [
      name || null,
      designation || null,
      department || null,
      phone || null,
      email || null,
      linkedinUrl || null,
      isPrimary !== undefined ? Boolean(isPrimary) : null,
      notes || null,
      id,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Contact not found' } });
      return;
    }

    const c = result.rows[0];
    res.status(200).json({
      success: true,
      data: {
        id: c.id,
        companyId: c.company_id,
        companyName: c.company_name,
        name: c.name,
        designation: c.designation,
        department: c.department,
        phone: c.phone,
        email: c.email,
        linkedinUrl: c.linkedin_url,
        isPrimary: c.is_primary,
        notes: c.notes,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error updating contact:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to update contact' } });
  }
};

/**
 * DELETE /api/contacts/:id
 */
export const deleteContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM contacts WHERE id = $1 RETURNING id;', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Contact not found' } });
      return;
    }
    res.status(200).json({ success: true, message: 'Contact deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to delete contact' } });
  }
};
