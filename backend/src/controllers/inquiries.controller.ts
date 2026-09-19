import { Request, Response } from 'express';
import { query, pool } from '../config/db.js';
import crypto from 'crypto';

/**
 * Helper to generate sequential Inquiry Number like INQ-1049
 */
const generateInquiryNumber = async (): Promise<string> => {
  try {
    const result = await query(
      "SELECT inquiry_number FROM inquiries WHERE inquiry_number ~ '^INQ-[0-9]+$' ORDER BY created_at DESC LIMIT 1;"
    );
    if (result.rows.length > 0) {
      const match = result.rows[0].inquiry_number.match(/INQ-([0-9]+)/);
      if (match) {
        const nextNum = parseInt(match[1], 10) + 1;
        return `INQ-${nextNum}`;
      }
    }
  } catch (err) {
    console.warn('Could not compute sequential inquiry number:', err);
  }
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INQ-${randomSuffix}`;
};

/**
 * GET /api/inquiries/dd/active
 * Lightweight endpoint for dropdown options
 */
export const getInquiriesDropdownActive = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, inquiry_number, company_name, requirement, required_area_sq_ft, target_corridor, stage, priority
       FROM inquiries
       WHERE status = 'Active' OR status IS NULL
       ORDER BY created_at DESC;`
    );

    const dropdownOptions = result.rows.map((row) => ({
      id: row.id,
      value: row.id,
      label: `${row.inquiry_number} — ${row.company_name} (${row.required_area_sq_ft ? Number(row.required_area_sq_ft).toLocaleString('en-IN') : '0'} sq.ft)`,
      inquiryNumber: row.inquiry_number,
      companyName: row.company_name,
      requiredAreaSqFt: row.required_area_sq_ft ? parseFloat(row.required_area_sq_ft) : 0,
      corridor: row.target_corridor,
      stage: row.stage,
      priority: row.priority,
    }));

    res.status(200).json({ success: true, data: dropdownOptions });
  } catch (error: any) {
    console.error('Error fetching inquiries dropdown:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch active inquiries dropdown' });
  }
};

/**
 * GET /api/inquiries
 */
export const getInquiries = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      stage,
      status,
      corridor,
      pageNumber,
      pageSize,
      sortBy,
      ascending,
      sortOrder,
    } = req.query;

    let whereClause = '';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (inquiry_number ILIKE $${params.length} OR company_name ILIKE $${params.length} OR location ILIKE $${params.length} OR requirement ILIKE $${params.length} OR target_corridor ILIKE $${params.length} OR salesperson_name ILIKE $${params.length})`;
    }

    if (stage && stage !== 'all') {
      params.push(stage);
      whereClause += ` AND stage = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }

    if (corridor && corridor !== 'all') {
      params.push(corridor);
      whereClause += ` AND target_corridor = $${params.length}`;
    }

    // Count total matching records before pagination
    const countSql = `SELECT COUNT(*) as total FROM inquiries WHERE 1=1` + whereClause;
    const countResult = await query(countSql, params);
    const totalCount = parseInt(countResult.rows[0]?.total || '0', 10);

    // Map frontend column IDs to DB columns
    const sortFieldMap: Record<string, string> = {
      inquirynumber: 'inquiry_number',
      inquiry_number: 'inquiry_number',
      companyname: 'company_name',
      company_name: 'company_name',
      postingtitle: 'requirement',
      requirement: 'requirement',
      requiredareasqft: 'required_area_sq_ft',
      required_area_sq_ft: 'required_area_sq_ft',
      area: 'required_area_sq_ft',
      budgetmonthlyinr: 'budget_monthly_inr',
      budget_monthly_inr: 'budget_monthly_inr',
      budget: 'budget_monthly_inr',
      corridor: 'target_corridor',
      targetcorridor: 'target_corridor',
      target_corridor: 'target_corridor',
      stage: 'stage',
      priority: 'priority',
      status: 'status',
      createdon: 'created_at',
      created_at: 'created_at',
      createdat: 'created_at',
      inquirydate: 'inquiry_date',
      inquiry_date: 'inquiry_date',
      salespersonname: 'salesperson_name',
      salesperson_name: 'salesperson_name',
    };

    const requestedSort = (sortBy as string)?.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const mappedSortColumn = sortFieldMap[requestedSort] || 'created_at';
    const isAscending =
      String(ascending).toLowerCase() === 'true' ||
      sortOrder === 'asc' ||
      sortOrder === 'ASC';
    const sortDirection = isAscending ? 'ASC' : 'DESC';

    let dataSql = `SELECT * FROM inquiries WHERE 1=1` + whereClause + ` ORDER BY ${mappedSortColumn} ${sortDirection}`;

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

    const inquiries = result.rows.map((row) => ({
      id: row.id,
      inquiryNumber: row.inquiry_number,
      companyId: row.company_id,
      companyName: row.company_name,
      contactId: row.contact_id,
      contactName: row.contact_name,
      contactPhone: row.contact_phone,
      contactEmail: row.contact_email,
      whatsapp: row.whatsapp,
      linkedin: row.linkedin,
      source: row.source || 'Direct',
      inquiryDate: row.inquiry_date,
      salespersonId: row.salesperson_id,
      salespersonName: row.salesperson_name || 'Unassigned',
      requirement: row.requirement,
      requiredAreaSqFt: row.required_area_sq_ft ? parseFloat(row.required_area_sq_ft) : 0,
      location: row.location,
      targetCorridor: row.target_corridor,
      industry: row.industry,
      possessionDate: row.possession_date,
      leaseDurationMonths: row.lease_duration_months || 60,
      budgetMonthlyINR: row.budget_monthly_inr ? parseFloat(row.budget_monthly_inr) : 0,
      dockRequirements: row.dock_requirements || 0,
      clearHeightFt: row.clear_height_ft ? parseFloat(row.clear_height_ft) : 0,
      floorLoadCapacity: row.floor_load_capacity || '5 MT/sq.m',
      powerKVA: row.power_kva ? parseFloat(row.power_kva) : 0,
      fireSystemsRequired: row.fire_systems_required ?? false,
      specialRequirements: row.special_requirements || '',
      brokerName: row.broker_name || '',
      brokerCommission: row.broker_commission || '',
      priority: row.priority || 'High',
      leadScore: row.lead_score || 85,
      opportunityScore: row.opportunity_score || 90,
      stage: row.stage || 'new',
      status: row.status || 'Active',
      nextAction: row.next_action || '',
      nextFollowUpDate: row.next_follow_up_date || '',
      lostReason: row.lost_reason || '',
      lostComments: row.lost_comments || '',
      lostDate: row.lost_date || '',
      closedByUserId: row.closed_by_user_id || '',
      wonPropertyId: row.won_property_id || '',
      wonPropertyName: row.won_property_name || '',
      wonFinalValueMonthlyINR: row.won_final_value_monthly_inr ? parseFloat(row.won_final_value_monthly_inr) : 0,
      wonComments: row.won_comments || '',
      wonDate: row.won_date || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.status(200).json({
      success: true,
      data: inquiries,
      totalCount,
      pageNumber: page,
      pageSize: limit > 0 ? limit : totalCount,
      totalPages: limit > 0 ? Math.ceil(totalCount / limit) : 1,
    });
  } catch (error: any) {
    console.error('Error fetching inquiries:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch inquiries' });
  }
};

/**
 * GET /api/inquiries/:id
 */
export const getInquiryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM inquiries WHERE id = $1 OR LOWER(inquiry_number) = LOWER($1) LIMIT 1;',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Inquiry not found' });
      return;
    }

    const row = result.rows[0];
    res.status(200).json({
      success: true,
      data: {
        id: row.id,
        inquiryNumber: row.inquiry_number,
        companyId: row.company_id,
        companyName: row.company_name,
        contactId: row.contact_id,
        contactName: row.contact_name,
        contactPhone: row.contact_phone,
        contactEmail: row.contact_email,
        whatsapp: row.whatsapp,
        linkedin: row.linkedin,
        source: row.source,
        inquiryDate: row.inquiry_date,
        salespersonId: row.salesperson_id,
        salespersonName: row.salesperson_name,
        requirement: row.requirement,
        requiredAreaSqFt: row.required_area_sq_ft ? parseFloat(row.required_area_sq_ft) : 0,
        location: row.location,
        targetCorridor: row.target_corridor,
        industry: row.industry,
        possessionDate: row.possession_date,
        leaseDurationMonths: row.lease_duration_months,
        budgetMonthlyINR: row.budget_monthly_inr ? parseFloat(row.budget_monthly_inr) : 0,
        dockRequirements: row.dock_requirements,
        clearHeightFt: row.clear_height_ft ? parseFloat(row.clear_height_ft) : 0,
        floorLoadCapacity: row.floor_load_capacity,
        powerKVA: row.power_kva ? parseFloat(row.power_kva) : 0,
        fireSystemsRequired: row.fire_systems_required,
        specialRequirements: row.special_requirements,
        brokerName: row.broker_name,
        brokerCommission: row.broker_commission,
        priority: row.priority,
        leadScore: row.lead_score,
        opportunityScore: row.opportunity_score,
        stage: row.stage,
        status: row.status,
        nextAction: row.next_action,
        nextFollowUpDate: row.next_follow_up_date,
        lostReason: row.lost_reason || '',
        lostComments: row.lost_comments || '',
        lostDate: row.lost_date || '',
        closedByUserId: row.closed_by_user_id || '',
        wonPropertyId: row.won_property_id || '',
        wonPropertyName: row.won_property_name || '',
        wonFinalValueMonthlyINR: row.won_final_value_monthly_inr ? parseFloat(row.won_final_value_monthly_inr) : 0,
        wonComments: row.won_comments || '',
        wonDate: row.won_date || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error fetching inquiry details:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch inquiry' });
  }
};

/**
 * POST /api/inquiries/stepper
 * Handles the complete 5-Step New Inquiry Stepper workflow atomically:
 * - Step 1: Requirement & Parameters
 * - Step 2: Company Selection or Creation
 * - Step 3: Contact Selection or Creation
 * - Step 4: Facility Creation (optional)
 * - Step 5: Salesperson Assignment & Sequence Generation
 */
export const createInquiryStepper = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      inquiryData,
      companyMode, // 'existing' | 'new'
      selectedCompanyId,
      newCompanyData,
      contactMode, // 'existing' | 'new'
      selectedContactId,
      contactData,
      createFacility,
      facilityData,
      assignedSalespersonId,
      assignedSalespersonName,
    } = req.body;

    let finalCompanyId = selectedCompanyId;
    let finalCompanyName = '';

    // 1. Resolve Company
    if (companyMode === 'new' && newCompanyData) {
      finalCompanyId = `comp_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
      finalCompanyName = newCompanyData.name.trim();

      const insertCompSql = `
        INSERT INTO companies (
          id, name, legal_name, website, industry, status, address, city, state, pincode,
          phone, email, assigned_owner_id, assigned_owner_name, prospect_stage, priority,
          annual_turnover, employee_count, gujarat_presence, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 'Active', $6, $7, $8, $9,
          $10, $11, $12, $13, 'Requirement Confirmed', $14,
          $15, $16, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        );
      `;
      await client.query(insertCompSql, [
        finalCompanyId,
        finalCompanyName,
        newCompanyData.legalName || `${finalCompanyName} Private Limited`,
        newCompanyData.website || `https://${finalCompanyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        newCompanyData.industry || inquiryData.industry || 'Specialty Chemicals & Polymers',
        newCompanyData.address || '',
        newCompanyData.city || 'Dahej',
        newCompanyData.state || 'Gujarat',
        newCompanyData.pincode || '392130',
        newCompanyData.phone || '',
        newCompanyData.email || '',
        assignedSalespersonId || '',
        assignedSalespersonName || 'Admin',
        newCompanyData.priority || 'High',
        newCompanyData.annualTurnover || '₹500+ Cr',
        newCompanyData.employeeCount || '1,000+',
      ]);
    } else {
      const compCheck = await client.query('SELECT name FROM companies WHERE id = $1;', [finalCompanyId]);
      if (compCheck.rows.length > 0) {
        finalCompanyName = compCheck.rows[0].name;
      } else {
        finalCompanyName = 'Industrial Client';
      }
    }

    // 2. Resolve Contact
    let finalContactId = selectedContactId;
    let finalContactName = contactData?.name || '';
    let finalContactPhone = contactData?.phone || '';
    let finalContactEmail = contactData?.email || '';

    if (contactMode === 'new' && contactData && contactData.name) {
      finalContactId = `cnt_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
      finalContactName = contactData.name.trim();

      const insertContactSql = `
        INSERT INTO contacts (
          id, company_id, company_name, name, designation, department, phone, email,
          linkedin_url, is_primary, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        );
      `;
      await client.query(insertContactSql, [
        finalContactId,
        finalCompanyId,
        finalCompanyName,
        finalContactName,
        contactData.designation || 'Supply Chain & Logistics Head',
        contactData.department || 'Logistics Operations',
        contactData.phone || '',
        contactData.email || '',
        contactData.linkedinUrl || '',
        contactData.isPrimary ?? true,
      ]);
    } else if (contactMode === 'existing' && selectedContactId) {
      const cntRes = await client.query('SELECT name, phone, email FROM contacts WHERE id = $1;', [selectedContactId]);
      if (cntRes.rows.length > 0) {
        finalContactName = cntRes.rows[0].name;
        finalContactPhone = cntRes.rows[0].phone;
        finalContactEmail = cntRes.rows[0].email;
      }
    }

    // 3. Resolve Facility
    if (createFacility && facilityData && facilityData.name) {
      const facId = `fac_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
      const insertFacSql = `
        INSERT INTO facilities (
          id, company_id, company_name, name, type, address, city, state, pincode,
          latitude, longitude, status, built_up_area_sq_ft, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Planned', $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        );
      `;
      await client.query(insertFacSql, [
        facId,
        finalCompanyId,
        finalCompanyName,
        facilityData.name,
        facilityData.type || 'Warehouse',
        facilityData.address || '',
        facilityData.city || 'Dahej',
        facilityData.state || 'Gujarat',
        facilityData.pincode || '392130',
        facilityData.latitude || 21.712,
        facilityData.longitude || 72.585,
        facilityData.builtUpAreaSqFt || inquiryData.requiredAreaSqFt || 75000,
      ]);
    }

    // 4. Create Inquiry
    const inquiryId = `inq_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const inquiryNumber = await generateInquiryNumber();

    const insertInqSql = `
      INSERT INTO inquiries (
        id, inquiry_number, company_id, company_name, contact_id, contact_name, contact_phone, contact_email,
        source, inquiry_date, salesperson_id, salesperson_name, requirement, required_area_sq_ft,
        location, target_corridor, industry, possession_date, lease_duration_months, budget_monthly_inr,
        dock_requirements, clear_height_ft, floor_load_capacity, power_kva, fire_systems_required,
        special_requirements, priority, lead_score, opportunity_score, stage, status,
        next_action, next_follow_up_date, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, CURRENT_DATE, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24,
        $25, $26, 85, 90, 'property_matched', 'Active',
        $27, $28, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *;
    `;

    const inqValues = [
      inquiryId,
      inquiryNumber,
      finalCompanyId,
      finalCompanyName,
      finalContactId || null,
      finalContactName || null,
      finalContactPhone || null,
      finalContactEmail || null,
      inquiryData.source || 'Direct',
      assignedSalespersonId || '',
      assignedSalespersonName || 'Admin',
      inquiryData.requirement || `Requirement for ${inquiryData.requiredAreaSqFt} sq.ft in ${inquiryData.location}`,
      inquiryData.requiredAreaSqFt || 75000,
      inquiryData.location || 'Dahej PCPIR',
      inquiryData.targetCorridor || 'Dahej PCPIR Corridor',
      inquiryData.industry || 'Specialty Chemicals & Polymers',
      inquiryData.possessionDate || '2026-10-01',
      inquiryData.leaseDurationMonths || 60,
      inquiryData.budgetMonthlyINR || 1650000,
      inquiryData.dockRequirements || 10,
      inquiryData.clearHeightFt || 12,
      inquiryData.floorLoadCapacity || '6 MT/sq.m',
      inquiryData.powerKVA || 1200,
      inquiryData.fireSystemsRequired ?? true,
      inquiryData.specialRequirements || '',
      inquiryData.priority || 'High',
      inquiryData.nextAction || 'Review initial property matches and share commercial proposal.',
      inquiryData.nextFollowUpDate || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    ];

    const inqResult = await client.query(insertInqSql, inqValues);
    const createdInq = inqResult.rows[0];

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        id: createdInq.id,
        inquiryNumber: createdInq.inquiry_number,
        companyId: createdInq.company_id,
        companyName: createdInq.company_name,
        contactId: createdInq.contact_id,
        contactName: createdInq.contact_name,
        contactPhone: createdInq.contact_phone,
        contactEmail: createdInq.contact_email,
        source: createdInq.source,
        inquiryDate: createdInq.inquiry_date,
        salespersonId: createdInq.salesperson_id,
        salespersonName: createdInq.salesperson_name,
        requirement: createdInq.requirement,
        requiredAreaSqFt: parseFloat(createdInq.required_area_sq_ft),
        location: createdInq.location,
        targetCorridor: createdInq.target_corridor,
        industry: createdInq.industry,
        possessionDate: createdInq.possession_date,
        leaseDurationMonths: createdInq.lease_duration_months,
        budgetMonthlyINR: parseFloat(createdInq.budget_monthly_inr),
        dockRequirements: createdInq.dock_requirements,
        clearHeightFt: parseFloat(createdInq.clear_height_ft),
        floorLoadCapacity: createdInq.floor_load_capacity,
        powerKVA: parseFloat(createdInq.power_kva),
        fireSystemsRequired: createdInq.fire_systems_required,
        specialRequirements: createdInq.special_requirements,
        priority: createdInq.priority,
        leadScore: createdInq.lead_score,
        opportunityScore: createdInq.opportunity_score,
        stage: createdInq.stage,
        status: createdInq.status,
        nextAction: createdInq.next_action,
        nextFollowUpDate: createdInq.next_follow_up_date,
        createdAt: createdInq.created_at,
      },
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error in createInquiryStepper:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to execute inquiry creation stepper' });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/inquiries/:id
 */
export const updateInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      requirement,
      requiredAreaSqFt,
      location,
      targetCorridor,
      industry,
      possessionDate,
      leaseDurationMonths,
      budgetMonthlyINR,
      dockRequirements,
      clearHeightFt,
      floorLoadCapacity,
      powerKVA,
      fireSystemsRequired,
      specialRequirements,
      priority,
      stage,
      status,
      salespersonId,
      salespersonName,
      nextAction,
      nextFollowUpDate,
      lostReason,
      lostComments,
      lostDate,
      closedByUserId,
      wonPropertyId,
      wonPropertyName,
      wonFinalValueMonthlyINR,
      wonComments,
      wonDate,
    } = req.body;

    const sql = `
      UPDATE inquiries SET
        requirement = COALESCE($1, requirement),
        required_area_sq_ft = COALESCE($2, required_area_sq_ft),
        location = COALESCE($3, location),
        target_corridor = COALESCE($4, target_corridor),
        industry = COALESCE($5, industry),
        possession_date = COALESCE($6, possession_date),
        lease_duration_months = COALESCE($7, lease_duration_months),
        budget_monthly_inr = COALESCE($8, budget_monthly_inr),
        dock_requirements = COALESCE($9, dock_requirements),
        clear_height_ft = COALESCE($10, clear_height_ft),
        floor_load_capacity = COALESCE($11, floor_load_capacity),
        power_kva = COALESCE($12, power_kva),
        fire_systems_required = COALESCE($13, fire_systems_required),
        special_requirements = COALESCE($14, special_requirements),
        priority = COALESCE($15, priority),
        stage = COALESCE($16, stage),
        status = COALESCE($17, status),
        salesperson_id = COALESCE($18, salesperson_id),
        salesperson_name = COALESCE($19, salesperson_name),
        next_action = COALESCE($20, next_action),
        next_follow_up_date = COALESCE($21, next_follow_up_date),
        lost_reason = COALESCE($22, lost_reason),
        lost_comments = COALESCE($23, lost_comments),
        lost_date = COALESCE($24, lost_date),
        closed_by_user_id = COALESCE($25, closed_by_user_id),
        won_property_id = COALESCE($26, won_property_id),
        won_property_name = COALESCE($27, won_property_name),
        won_final_value_monthly_inr = COALESCE($28, won_final_value_monthly_inr),
        won_comments = COALESCE($29, won_comments),
        won_date = COALESCE($30, won_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $31 OR LOWER(inquiry_number) = LOWER($31)
      RETURNING *;
    `;

    const values = [
      requirement,
      requiredAreaSqFt,
      location,
      targetCorridor,
      industry,
      possessionDate,
      leaseDurationMonths,
      budgetMonthlyINR,
      dockRequirements,
      clearHeightFt,
      floorLoadCapacity,
      powerKVA,
      fireSystemsRequired,
      specialRequirements,
      priority,
      stage,
      status,
      salespersonId,
      salespersonName,
      nextAction,
      nextFollowUpDate,
      lostReason,
      lostComments,
      lostDate,
      closedByUserId,
      wonPropertyId,
      wonPropertyName,
      wonFinalValueMonthlyINR,
      wonComments,
      wonDate,
      id,
    ];

    const result = await query(sql, values);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Inquiry not found' });
      return;
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating inquiry:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update inquiry' });
  }
};

/**
 * GET /api/inquiries/lost-reasons
 * Fetches dynamic lost reasons configured in PostgreSQL database
 */
export const getLostReasons = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      'SELECT id, reason, category, sort_order as "sortOrder" FROM lost_reasons WHERE is_active = true ORDER BY sort_order ASC, reason ASC;'
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching lost reasons:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch lost reasons' });
  }
};

/**
 * POST /api/inquiries/lost-reasons
 * Adds a new custom lost reason dynamically to PostgreSQL database
 */
export const createLostReason = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reason, category } = req.body;
    if (!reason || !reason.trim()) {
      res.status(400).json({ success: false, error: 'Reason is required' });
      return;
    }
    const id = `lr_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const result = await query(
      'INSERT INTO lost_reasons (id, reason, category, sort_order) VALUES ($1, $2, $3, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM lost_reasons)) ON CONFLICT (reason) DO UPDATE SET is_active = true RETURNING id, reason, category;',
      [id, reason.trim(), category || 'Custom']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating lost reason:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create lost reason' });
  }
};

/**
 * DELETE /api/inquiries/:id
 */
export const deleteInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query(
      'DELETE FROM inquiries WHERE id = $1 OR LOWER(inquiry_number) = LOWER($1) RETURNING id;',
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Inquiry not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Inquiry deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting inquiry:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete inquiry' });
  }
};

/**
 * POST /api/inquiries
 * Direct inquiry creation
 */
export const createInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const b = req.body;
    const id = b.id || `inq_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const inquiryNumber = b.inquiryNumber || (await generateInquiryNumber());

    const sql = `
      INSERT INTO inquiries (
        id, inquiry_number, company_id, company_name, contact_id, contact_name,
        contact_phone, contact_email, whatsapp, linkedin, source, inquiry_date,
        salesperson_id, salesperson_name, requirement, required_area_sq_ft,
        location, target_corridor, industry, possession_date, lease_duration_months,
        budget_monthly_inr, dock_requirements, clear_height_ft, floor_load_capacity,
        power_kva, fire_systems_required, special_requirements, broker_name,
        broker_commission, priority, lead_score, opportunity_score, stage, status,
        next_action, next_follow_up_date, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *;
    `;

    const values = [
      id,
      inquiryNumber,
      b.companyId || null,
      b.companyName || 'Industrial Client',
      b.contactId || null,
      b.contactName || '',
      b.contactPhone || '',
      b.contactEmail || '',
      b.whatsapp || '',
      b.linkedin || '',
      b.source || 'Direct',
      b.inquiryDate || new Date().toISOString().split('T')[0],
      b.salespersonId || null,
      b.salespersonName || 'Unassigned',
      b.requirement || `${b.requiredAreaSqFt || '50,000'} sq.ft industrial requirement`,
      b.requiredAreaSqFt ? parseFloat(b.requiredAreaSqFt) : 0,
      b.location || 'Gujarat',
      b.targetCorridor || 'Sanand',
      b.industry || 'Logistics',
      b.possessionDate || 'Immediate',
      b.leaseDurationMonths ? parseInt(b.leaseDurationMonths, 10) : 60,
      b.budgetMonthlyINR ? parseFloat(b.budgetMonthlyINR) : 0,
      b.dockRequirements ? parseInt(b.dockRequirements, 10) : 0,
      b.clearHeightFt ? parseFloat(b.clearHeightFt) : 0,
      b.floorLoadCapacity || '5 MT/sq.m',
      b.powerKVA ? parseFloat(b.powerKVA) : 0,
      b.fireSystemsRequired ?? false,
      b.specialRequirements || '',
      b.brokerName || '',
      b.brokerCommission || '',
      b.priority || 'High',
      b.leadScore || 85,
      b.opportunityScore || 90,
      b.stage || 'new',
      b.status || 'Active',
      b.nextAction || '',
      b.nextFollowUpDate || '',
    ];

    const result = await query(sql, values);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating inquiry:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create inquiry' });
  }
};
