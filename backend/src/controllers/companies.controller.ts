import { Request, Response } from 'express';
import { query } from '../config/db.js';
import crypto from 'crypto';

/**
 * GET /api/companies/dd/active
 * Lightweight endpoint for company dropdown options
 */
export const getCompaniesDropdownActive = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, legal_name, industry, city, state, priority
       FROM companies
       WHERE status = 'Active' OR status IS NULL
       ORDER BY name ASC;`
    );

    const dropdownOptions = result.rows.map((row) => ({
      id: row.id,
      value: row.id,
      label: row.name + (row.industry ? ` (${row.industry})` : ''),
      name: row.name,
      legalName: row.legal_name,
      industry: row.industry,
      city: row.city,
      state: row.state,
      priority: row.priority,
    }));

    res.status(200).json({ success: true, data: dropdownOptions });
  } catch (error: any) {
    console.error('Error fetching companies dropdown:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch active companies dropdown' });
  }
};

/**
 * GET /api/companies
 * List all companies with contact, facility, and inquiry counts, pagination, and sorting.
 * Format: /api/companies?pageNumber=1&pageSize=10&sortBy=createdAt&ascending=false
 */
export const getCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      pageNumber,
      pageSize,
      sortBy,
      ascending,
      sortOrder,
      search,
      industry,
      status,
      priority,
      city,
      assignedOwnerId,
    } = req.query;

    let whereClause = '';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (c.name ILIKE $${params.length} OR c.legal_name ILIKE $${params.length} OR c.city ILIKE $${params.length} OR c.industry ILIKE $${params.length} OR c.email ILIKE $${params.length})`;
    }

    if (industry && industry !== 'all') {
      params.push(industry);
      whereClause += ` AND c.industry = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      whereClause += ` AND c.status = $${params.length}`;
    }

    if (priority && priority !== 'all') {
      params.push(priority);
      whereClause += ` AND c.priority = $${params.length}`;
    }

    if (city && city !== 'all') {
      params.push(city);
      whereClause += ` AND c.city = $${params.length}`;
    }

    if (assignedOwnerId && assignedOwnerId !== 'all') {
      params.push(assignedOwnerId);
      whereClause += ` AND (c.assigned_owner_id = $${params.length} OR c.assigned_owner_name ILIKE $${params.length})`;
    }

    // 1. Total Count Query
    const countSql = `SELECT COUNT(*) as total FROM companies c WHERE 1=1` + whereClause;
    const countResult = await query(countSql, params);
    const totalCount = parseInt(countResult.rows[0]?.total || '0', 10);

    // 2. Sorting Map
    const sortFieldMap: Record<string, string> = {
      name: 'c.name',
      companyname: 'c.name',
      legalname: 'c.legal_name',
      legal_name: 'c.legal_name',
      industry: 'c.industry',
      status: 'c.status',
      city: 'c.city',
      state: 'c.state',
      priority: 'c.priority',
      owner: 'c.assigned_owner_name',
      assignedownername: 'c.assigned_owner_name',
      assigned_owner_name: 'c.assigned_owner_name',
      createdon: 'c.created_at',
      createdat: 'c.created_at',
      created_at: 'c.created_at',
      updatedat: 'c.updated_at',
      updated_at: 'c.updated_at',
    };

    const requestedSort = (sortBy as string)?.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const mappedSortColumn = sortFieldMap[requestedSort] || 'c.created_at';
    const isAscending =
      String(ascending).toLowerCase() === 'true' ||
      sortOrder === 'asc' ||
      sortOrder === 'ASC';
    const sortDirection = isAscending ? 'ASC' : 'DESC';

    // 3. Data Query with Pagination
    let dataSql = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM contacts cnt WHERE cnt.company_id = c.id)::int AS contacts_count,
        (SELECT COUNT(*) FROM facilities fac WHERE fac.company_id = c.id)::int AS facilities_count,
        (SELECT COUNT(*) FROM inquiries inq WHERE inq.company_id = c.id)::int AS inquiries_count
      FROM companies c
      WHERE 1=1${whereClause}
      ORDER BY ${mappedSortColumn} ${sortDirection}
    `;

    const page = pageNumber ? Math.max(1, parseInt(pageNumber as string, 10)) : 1;
    const limit = pageSize ? Math.max(1, parseInt(pageSize as string, 10)) : 0;
    const offset = limit > 0 ? (page - 1) * limit : 0;

    if (limit > 0) {
      params.push(limit);
      dataSql += ` LIMIT $${params.length}`;
      params.push(offset);
      dataSql += ` OFFSET $${params.length}`;
    }

    const result = await query(dataSql, params);

    const companies = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      legalName: row.legal_name || `${row.name} Private Limited`,
      website: row.website || '',
      industry: row.industry || 'Specialty Chemicals & Polymers',
      status: row.status || 'Active',
      address: row.address || '',
      city: row.city || 'Dahej',
      state: row.state || 'Gujarat',
      pincode: row.pincode || '392130',
      phone: row.phone || '',
      email: row.email || '',
      assignedOwnerId: row.assigned_owner_id || '',
      assignedOwnerName: row.assigned_owner_name || 'Admin',
      prospectStage: row.prospect_stage || 'New',
      priority: row.priority || 'High',
      annualTurnover: row.annual_turnover || '₹500+ Cr',
      employeeCount: row.employee_count || '1,000+',
      gujaratPresence: row.gujarat_presence ?? true,
      source: row.source || 'Manual',
      contactsCount: row.contacts_count || 0,
      facilitiesCount: row.facilities_count || 0,
      inquiriesCount: row.inquiries_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.status(200).json({
      success: true,
      data: companies,
      totalCount,
      pageNumber: page,
      pageSize: limit || totalCount,
      totalPages: limit > 0 ? Math.ceil(totalCount / limit) : 1,
    });
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to fetch companies',
      },
    });
  }
};

/**
 * GET /api/companies/:id
 */
export const getCompanyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyRes = await query('SELECT * FROM companies WHERE id = $1;', [id]);

    if (companyRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }

    const row = companyRes.rows[0];
    const contactsRes = await query('SELECT * FROM contacts WHERE company_id = $1 ORDER BY is_primary DESC, created_at ASC;', [id]);
    const facilitiesRes = await query('SELECT * FROM facilities WHERE company_id = $1 ORDER BY created_at ASC;', [id]);
    const inquiriesRes = await query('SELECT * FROM inquiries WHERE company_id = $1 ORDER BY created_at DESC;', [id]);

    const company = {
      id: row.id,
      name: row.name,
      legalName: row.legal_name,
      website: row.website,
      industry: row.industry,
      status: row.status,
      address: row.address,
      city: row.city,
      state: row.state,
      pincode: row.pincode,
      phone: row.phone,
      email: row.email,
      assignedOwnerId: row.assigned_owner_id,
      assignedOwnerName: row.assigned_owner_name,
      prospectStage: row.prospect_stage,
      priority: row.priority,
      annualTurnover: row.annual_turnover,
      employeeCount: row.employee_count,
      gujaratPresence: row.gujarat_presence,
      source: row.source || 'Manual',
      contacts: contactsRes.rows.map((c) => ({
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
      })),
      facilities: facilitiesRes.rows.map((f) => ({
        id: f.id,
        companyId: f.company_id,
        companyName: f.company_name,
        name: f.name,
        type: f.type,
        address: f.address,
        city: f.city,
        state: f.state,
        pincode: f.pincode,
        latitude: f.latitude ? parseFloat(f.latitude) : null,
        longitude: f.longitude ? parseFloat(f.longitude) : null,
        status: f.status,
        builtUpAreaSqFt: f.built_up_area_sq_ft ? parseFloat(f.built_up_area_sq_ft) : 0,
        createdAt: f.created_at,
      })),
      inquiries: inquiriesRes.rows.map((i) => ({
        id: i.id,
        inquiryNumber: i.inquiry_number,
        companyId: i.company_id,
        companyName: i.company_name,
        requirement: i.requirement,
        requiredAreaSqFt: i.required_area_sq_ft ? parseFloat(i.required_area_sq_ft) : 0,
        location: i.location,
        budgetMonthlyINR: i.budget_monthly_inr ? parseFloat(i.budget_monthly_inr) : 0,
        stage: i.stage,
        status: i.status,
        createdAt: i.created_at,
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.status(200).json({ success: true, data: company });
  } catch (error: any) {
    console.error('Error fetching company details:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch company details' });
  }
};

/**
 * POST /api/companies/check-duplicate
 */
export const checkDuplicateCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 3) {
      res.status(200).json({ success: true, duplicates: [] });
      return;
    }

    const clean = `%${name.trim()}%`;
    const dupeRes = await query(
      'SELECT id, name, legal_name, city, industry FROM companies WHERE name ILIKE $1 OR legal_name ILIKE $1 LIMIT 5;',
      [clean]
    );

    res.status(200).json({ success: true, duplicates: dupeRes.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/companies
 * Add New Industrial Company
 */
export const createCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      legalName,
      website,
      industry,
      status = 'Active',
      address,
      city = 'Dahej',
      state = 'Gujarat',
      pincode = '392130',
      phone,
      email,
      assignedOwnerId,
      assignedOwnerName,
      prospectStage = 'New',
      priority = 'High',
      annualTurnover = '₹500+ Cr',
      employeeCount = '1,000+',
      gujaratPresence = true,
      source = 'Manual',
      // Contact & notes from NewCompanyPage
      contactName,
      contactDesignation,
      contactPhone,
      contactEmail,
      initialNotes,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'Company brand name is required' });
      return;
    }

    const companyId = `comp_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const finalLegalName = legalName && legalName.trim() ? legalName.trim() : `${name.trim()} Private Limited`;
    const finalWebsite = website && website.trim() ? website.trim() : `https://${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

    const insertSql = `
      INSERT INTO companies (
        id, name, legal_name, website, industry, status, address, city, state, pincode,
        phone, email, assigned_owner_id, assigned_owner_name, prospect_stage, priority,
        annual_turnover, employee_count, gujarat_presence, source, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *;
    `;

    const values = [
      companyId,
      name.trim(),
      finalLegalName,
      finalWebsite,
      industry || 'Specialty Chemicals & Polymers',
      status,
      address || '',
      city,
      state,
      pincode,
      phone || '',
      email || '',
      assignedOwnerId || '',
      assignedOwnerName || 'Admin',
      prospectStage,
      priority,
      annualTurnover,
      employeeCount,
      gujaratPresence,
      source,
    ];

    const result = await query(insertSql, values);
    const row = result.rows[0];

    // If primary contact details provided, create contact record in PostgreSQL
    let createdContact = null;
    if (contactName && contactName.trim()) {
      try {
        const contactId = `cnt_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
        const insertContactSql = `
          INSERT INTO contacts (
            id, company_id, company_name, name, designation, department, phone, email, is_primary, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *;
        `;
        const contactValues = [
          contactId,
          companyId,
          name.trim(),
          contactName.trim(),
          contactDesignation || 'VP - Supply Chain & Operations',
          'Supply Chain & Operations',
          contactPhone || phone || '',
          contactEmail || email || '',
          true,
          initialNotes || '',
        ];
        const contactRes = await query(insertContactSql, contactValues);
        createdContact = contactRes.rows[0];
      } catch (cntErr: any) {
        console.warn('Could not auto-create contact in PostgreSQL:', cntErr.message);
      }
    }

    // If initial notes provided, record an activity entry in PostgreSQL
    if (initialNotes && initialNotes.trim()) {
      try {
        const actId = `act_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
        await query(
          `INSERT INTO activities (
            id, company_id, company_name, user_id, user_name, activity_type, title, description, activity_date, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE::text, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
          [
            actId,
            companyId,
            name.trim(),
            assignedOwnerId || 'usr_admin',
            assignedOwnerName || 'Admin',
            'Note',
            'Initial Account Registration Note',
            initialNotes.trim(),
          ]
        );
      } catch (actErr: any) {
        console.warn('Could not auto-create initial activity note in PostgreSQL:', actErr.message);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        legalName: row.legal_name,
        website: row.website,
        industry: row.industry,
        status: row.status,
        address: row.address,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        phone: row.phone,
        email: row.email,
        assignedOwnerId: row.assigned_owner_id,
        assignedOwnerName: row.assigned_owner_name,
        prospectStage: row.prospect_stage,
        priority: row.priority,
        annualTurnover: row.annual_turnover,
        employeeCount: row.employee_count,
        gujaratPresence: row.gujarat_presence,
        source: row.source || 'Manual',
        contactsCount: createdContact ? 1 : 0,
        contact: createdContact,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error creating company:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create company' });
  }
};

/**
 * PUT /api/companies/:id
 */
export const updateCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      legalName,
      website,
      industry,
      status,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      assignedOwnerId,
      assignedOwnerName,
      prospectStage,
      priority,
      annualTurnover,
      employeeCount,
      gujaratPresence,
    } = req.body;

    const sql = `
      UPDATE companies SET
        name = COALESCE($1, name),
        legal_name = COALESCE($2, legal_name),
        website = COALESCE($3, website),
        industry = COALESCE($4, industry),
        status = COALESCE($5, status),
        address = COALESCE($6, address),
        city = COALESCE($7, city),
        state = COALESCE($8, state),
        pincode = COALESCE($9, pincode),
        phone = COALESCE($10, phone),
        email = COALESCE($11, email),
        assigned_owner_id = COALESCE($12, assigned_owner_id),
        assigned_owner_name = COALESCE($13, assigned_owner_name),
        prospect_stage = COALESCE($14, prospect_stage),
        priority = COALESCE($15, priority),
        annual_turnover = COALESCE($16, annual_turnover),
        employee_count = COALESCE($17, employee_count),
        gujarat_presence = COALESCE($18, gujarat_presence),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $19
      RETURNING *;
    `;

    const values = [
      name ?? null,
      legalName ?? null,
      website ?? null,
      industry ?? null,
      status ?? null,
      address ?? null,
      city ?? null,
      state ?? null,
      pincode ?? null,
      phone ?? null,
      email ?? null,
      assignedOwnerId ?? null,
      assignedOwnerName ?? null,
      prospectStage ?? null,
      priority ?? null,
      annualTurnover ?? null,
      employeeCount ?? null,
      gujaratPresence ?? null,
      id,
    ];

    const result = await query(sql, values);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating company:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update company' });
  }
};

/**
 * DELETE /api/companies/:id
 */
export const deleteCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM companies WHERE id = $1 RETURNING id;', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Company deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting company:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete company' });
  }
};
