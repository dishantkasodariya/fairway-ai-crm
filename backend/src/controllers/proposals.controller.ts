import { Request, Response } from 'express';
import { query } from '../config/db.js';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

/**
 * Helper to generate sequential Proposal Number like PR-1044
 */
const generateProposalNumber = async (): Promise<string> => {
  try {
    const result = await query(
      "SELECT proposal_number FROM proposals WHERE proposal_number ~ '^PR-[0-9]+$' ORDER BY created_at DESC LIMIT 1;"
    );
    if (result.rows.length > 0) {
      const match = result.rows[0].proposal_number.match(/PR-([0-9]+)/);
      if (match) {
        const nextNum = parseInt(match[1], 10) + 1;
        return `PR-${nextNum}`;
      }
    }
  } catch (err) {
    console.warn('Could not compute sequential proposal number:', err);
  }
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `PR-${randomSuffix}`;
};

/**
 * Helper to map database proposal row to frontend interface
 */
const mapProposalRow = (row: any) => ({
  id: row.id,
  proposalNumber: row.proposal_number,
  inquiryId: row.inquiry_id,
  inquiryNumber: row.inquiry_number,
  companyId: row.company_id,
  companyName: row.company_name,
  contactId: row.contact_id,
  contactName: row.contact_name,
  propertyId: row.property_id,
  propertyName: row.property_name,
  proposedAreaSqFt: parseFloat(row.proposed_area_sq_ft) || 0,
  baseRentPerSqFtINR: parseFloat(row.base_rent_per_sq_ft_inr) || 0,
  maintenancePerSqFtINR: parseFloat(row.maintenance_per_sq_ft_inr) || 0,
  totalMonthlyRentINR: parseFloat(row.total_monthly_rent_inr) || 0,
  securityDepositMonths: parseInt(row.security_deposit_months, 10) || 3,
  totalDepositINR: parseFloat(row.total_deposit_inr) || 0,
  leaseTenureYears: parseInt(row.lease_tenure_years, 10) || 5,
  lockInMonths: parseInt(row.lock_in_months, 10) || 36,
  escalationPercentPerYear: parseFloat(row.escalation_percent_per_year) || 5,
  possessionDate: row.possession_date,
  commercialTerms: row.commercial_terms,
  proposalDate: row.proposal_date,
  expiryDate: row.expiry_date,
  status: row.status,
  documentName: row.document_name,
  documentSize: row.document_size || '1.4 MB',
  notes: row.notes,
  createdByUserId: row.created_by_user_id,
  createdByUserName: row.created_by_user_name,
  createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
  updatedAt: row.updated_at ? row.updated_at.toISOString() : new Date().toISOString(),
});

/**
 * GET /api/proposals
 * List proposals with status, search, inquiryId, or companyId filters
 */
export const getProposals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, inquiryId, companyId } = req.query;

    let sql = 'SELECT * FROM proposals WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
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
      sql += ` AND (proposal_number ILIKE $${params.length} OR company_name ILIKE $${params.length} OR property_name ILIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC;';

    const result = await query(sql, params);
    const proposals = result.rows.map(mapProposalRow);

    res.status(200).json({ success: true, data: proposals });
  } catch (error: any) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch proposals.' });
  }
};

/**
 * GET /api/proposals/:id
 */
export const getProposalById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM proposals WHERE id = $1;', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Proposal not found.' });
      return;
    }

    res.status(200).json({ success: true, data: mapProposalRow(result.rows[0]) });
  } catch (error: any) {
    console.error('Error fetching proposal by ID:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch proposal.' });
  }
};

/**
 * POST /api/proposals
 * Create a new commercial proposal
 */
export const createProposal = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      inquiryId,
      inquiryNumber,
      companyId,
      companyName,
      contactId,
      contactName,
      propertyId,
      propertyName,
      proposedAreaSqFt,
      baseRentPerSqFtINR,
      maintenancePerSqFtINR = 0,
      securityDepositMonths = 3,
      leaseTenureYears = 5,
      lockInMonths = 36,
      escalationPercentPerYear = 5,
      possessionDate,
      commercialTerms,
      documentName,
      documentSize = '1.4 MB',
      notes,
      createdByUserId,
      createdByUserName,
    } = req.body;

    const finalCompanyId = companyId || `comp_${crypto.randomUUID().slice(0, 6)}`;
    const finalCompanyName = companyName || 'Corporate Client';

    if ((!companyId && !companyName) || !propertyName || !proposedAreaSqFt || !baseRentPerSqFtINR) {
      res.status(400).json({
        success: false,
        error: 'Company, Property, Proposed Area, and Base Rent are required.',
      });
      return;
    }

    const proposalId = `prp_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const proposalNumber = await generateProposalNumber();

    const area = parseFloat(proposedAreaSqFt) || 0;
    const baseRent = parseFloat(baseRentPerSqFtINR) || 0;
    const maint = parseFloat(maintenancePerSqFtINR) || 0;
    const totalMonthlyRentINR = (baseRent + maint) * area;
    const totalDepositINR = totalMonthlyRentINR * (parseInt(securityDepositMonths, 10) || 3);
    const todayStr = new Date().toISOString().split('T')[0];
    const expiryDateStr = new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0];

    const finalDocName = documentName || `Fairway_Proposal_${inquiryNumber || 'Direct'}_${proposalNumber}.pdf`;

    const sql = `
      INSERT INTO proposals (
        id, proposal_number, inquiry_id, inquiry_number, company_id, company_name,
        contact_id, contact_name, property_id, property_name, proposed_area_sq_ft,
        base_rent_per_sq_ft_inr, maintenance_per_sq_ft_inr, total_monthly_rent_inr,
        security_deposit_months, total_deposit_inr, lease_tenure_years, lock_in_months,
        escalation_percent_per_year, possession_date, commercial_terms, proposal_date,
        expiry_date, status, document_name, document_size, notes, created_by_user_id,
        created_by_user_name, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21, $22,
        $23, 'Sent', $24, $25, $26, $27,
        $28, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *;
    `;

    const values = [
      proposalId,
      proposalNumber,
      inquiryId || null,
      inquiryNumber || null,
      finalCompanyId,
      finalCompanyName,
      contactId || null,
      contactName || null,
      propertyId || null,
      propertyName,
      area,
      baseRent,
      maint,
      totalMonthlyRentINR,
      securityDepositMonths,
      totalDepositINR,
      leaseTenureYears,
      lockInMonths,
      escalationPercentPerYear,
      possessionDate || '2026-10-01',
      commercialTerms || 'Includes dock levelers, fire safety, perimeter security.',
      todayStr,
      expiryDateStr,
      finalDocName,
      documentSize,
      notes || 'Generated from Fairway Proposal Master.',
      createdByUserId || null,
      createdByUserName || 'Admin',
    ];

    const result = await query(sql, values);

    // If linked to an inquiry, also update the inquiry stage to 'proposal_sent'
    if (inquiryId) {
      await query("UPDATE inquiries SET stage = 'proposal_sent', updated_at = CURRENT_TIMESTAMP WHERE id = $1;", [inquiryId]);
    }

    res.status(201).json({ success: true, data: mapProposalRow(result.rows[0]) });
  } catch (error: any) {
    console.error('Error creating proposal:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create proposal.' });
  }
};

/**
 * PATCH /api/proposals/:id/status
 * Update proposal status (Draft, Sent, Viewed, Negotiation, Accepted, Rejected, Expired)
 */
export const updateProposalStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ success: false, error: 'Status is required.' });
      return;
    }

    const sql = `
      UPDATE proposals SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;

    const result = await query(sql, [status, id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Proposal not found.' });
      return;
    }

    const row = result.rows[0];

    // If accepted, also mark inquiry negotiation/won
    if (status === 'Accepted' && row.inquiry_id) {
      await query("UPDATE inquiries SET stage = 'deal_won', status = 'Won', updated_at = CURRENT_TIMESTAMP WHERE id = $1;", [row.inquiry_id]);
    }

    res.status(200).json({ success: true, data: mapProposalRow(row) });
  } catch (error: any) {
    console.error('Error updating proposal status:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update proposal status.' });
  }
};

/**
 * PUT /api/proposals/:id
 * Update proposal commercial details
 */
export const updateProposal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      proposedAreaSqFt,
      baseRentPerSqFtINR,
      maintenancePerSqFtINR,
      totalMonthlyRentINR,
      securityDepositMonths,
      totalDepositINR,
      leaseTenureYears,
      lockInMonths,
      escalationPercentPerYear,
      possessionDate,
      commercialTerms,
      notes,
    } = req.body;

    const sql = `
      UPDATE proposals SET
        proposed_area_sq_ft = COALESCE($1, proposed_area_sq_ft),
        base_rent_per_sq_ft_inr = COALESCE($2, base_rent_per_sq_ft_inr),
        maintenance_per_sq_ft_inr = COALESCE($3, maintenance_per_sq_ft_inr),
        total_monthly_rent_inr = COALESCE($4, total_monthly_rent_inr),
        security_deposit_months = COALESCE($5, security_deposit_months),
        total_deposit_inr = COALESCE($6, total_deposit_inr),
        lease_tenure_years = COALESCE($7, lease_tenure_years),
        lock_in_months = COALESCE($8, lock_in_months),
        escalation_percent_per_year = COALESCE($9, escalation_percent_per_year),
        possession_date = COALESCE($10, possession_date),
        commercial_terms = COALESCE($11, commercial_terms),
        notes = COALESCE($12, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *;
    `;

    const result = await query(sql, [
      proposedAreaSqFt,
      baseRentPerSqFtINR,
      maintenancePerSqFtINR,
      totalMonthlyRentINR,
      securityDepositMonths,
      totalDepositINR,
      leaseTenureYears,
      lockInMonths,
      escalationPercentPerYear,
      possessionDate,
      commercialTerms,
      notes,
      id,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Proposal not found.' });
      return;
    }

    res.status(200).json({ success: true, data: mapProposalRow(result.rows[0]) });
  } catch (error: any) {
    console.error('Error updating proposal:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update proposal.' });
  }
};

/**
 * DELETE /api/proposals/:id
 */
export const deleteProposal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const sessionUser = req.user;

    // Security (RBAC): Only super_admin and admin can delete financial proposals
    if (sessionUser?.role !== 'super_admin' && sessionUser?.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Forbidden. You do not have permission to delete commercial proposals.',
      });
      return;
    }

    const result = await query('DELETE FROM proposals WHERE id = $1 RETURNING id;', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Proposal not found.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Proposal deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting proposal:', error);
    res.status(500).json({ success: false, error: 'Failed to delete proposal.' });
  }
};
