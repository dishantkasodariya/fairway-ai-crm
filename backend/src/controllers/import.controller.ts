import { Request, Response } from 'express';
import { query, pool } from '../config/db.js';
import crypto from 'crypto';

interface ColumnMapping {
  companyName?: string;
  company?: string;
  siteName?: string;
  city?: string;
  requiredAreaSqFt?: string;
  areaRequired?: string;
  inquiryDate?: string;
  date?: string;
  contactName?: string;
  contactPerson?: string;
  phone?: string;
  contactNumber?: string;
  email?: string;
  enteredBy?: string;
  salespersonName?: string;
  comments?: string;
  requirement?: string;
  currentStatus?: string;
  remark1CurrentStatus?: string;
  nextAction?: string;
  remark2NextAction?: string;
  followUpPlan?: string;
  remark3FollowUpPlan?: string;
  industry?: string;
  [key: string]: string | undefined;
}

/**
 * Map free-text status remark to CRM pipeline stage
 */
const mapStatusToStage = (statusRemark: string): string => {
  if (!statusRemark) return 'requirement_confirmed';
  const s = statusRemark.toLowerCase();
  if (s.includes('won') || s.includes('close won') || s.includes('deal closed')) return 'won';
  if (s.includes('lost') || s.includes('dropped') || s.includes('rejected') || s.includes('not applicable') || s.includes('close this inquiry')) return 'lost';
  if (s.includes('site') || s.includes('visit') || s.includes('inspection')) return 'site_visit';
  if (s.includes('proposal') || s.includes('quote') || s.includes('offer')) return 'proposal';
  if (s.includes('match') || s.includes('shortlist') || s.includes('property')) return 'property_matched';
  if (s.includes('negotiat') || s.includes('commercial')) return 'negotiation';
  if (s.includes('contact') || s.includes('call') || s.includes('reach') || s.includes('dormant')) return 'contacted';
  if (s.includes('new') || s.includes('inquiry') || s.includes('lead')) return 'new';
  return 'requirement_confirmed';
};

/**
 * Format string, number or Excel serial date to YYYY-MM-DD
 */
const parseDateString = (val?: any): string => {
  if (!val) return new Date().toISOString().split('T')[0];
  if (typeof val === 'number') {
    // Excel serial date formula (val - 25569) * 86400 * 1000
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {}
  return new Date().toISOString().split('T')[0];
};

/**
 * POST /api/import/inquiries
 * Bulk imports spreadsheets & CSV inquiries with custom field mapping
 */
export const bulkImportInquiries = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    const { rows, columnMapping } = req.body as {
      rows: Array<Record<string, any>>;
      columnMapping: ColumnMapping;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ success: false, error: 'No data rows provided for import.' });
      return;
    }

    const mapping = columnMapping || {};

    let importedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ row: number; error: string }> = [];
    const importedInquiries: any[] = [];

    // Helper getter for mapped keys with fallbacks
    const getVal = (row: Record<string, any>, ...keys: (string | undefined)[]) => {
      for (const k of keys) {
        if (k && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
          return String(row[k]).trim();
        }
      }
      return '';
    };

    await client.query('BEGIN');

    // 1. Calculate highest numeric INQ number suffix across database
    let highestNum = 1000;
    try {
      const maxRes = await client.query(
        "SELECT MAX(CAST(SUBSTRING(inquiry_number FROM 'INQ-([0-9]+)') AS INTEGER)) as max_num FROM inquiries WHERE inquiry_number ~ '^INQ-[0-9]+$';"
      );
      if (maxRes.rows[0]?.max_num) {
        highestNum = Math.max(highestNum, parseInt(maxRes.rows[0].max_num, 10));
      }
    } catch (e) {
      console.warn('Could not query max numeric inquiry number:', e);
    }

    const batchSeenInquiries = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const rowIndex = i + 1;

      // Extract fields supporting enquiries.xlsx schema & standard schema
      const rawCompName = getVal(raw, mapping.companyName, mapping.company, 'Company', 'Company Name', 'Client');
      const compName = rawCompName.trim();
      const siteName = (getVal(raw, mapping.siteName, mapping.city, 'Site Name', 'City', 'Location', 'Hub') || 'Gujarat Industrial Cluster').trim();
      const areaRaw = getVal(raw, mapping.requiredAreaSqFt, mapping.areaRequired, 'Area Required (sq. ft.)', 'Required Area', 'Area').replace(/[^0-9.]/g, '');
      const parsedArea = parseFloat(areaRaw);
      const area = Number.isFinite(parsedArea) && parsedArea >= 0 ? parsedArea : 0;
      const dateVal = raw[mapping.inquiryDate || 'Date'] ?? raw['Date_1'] ?? raw['Date'] ?? getVal(raw, mapping.date, 'Date');
      const contactName = getVal(raw, mapping.contactName, mapping.contactPerson, 'Contact Person', 'Contact').trim();
      const rawPhone = getVal(raw, mapping.phone, mapping.contactNumber, 'Contact Number', 'Phone', 'Mobile').trim();
      const phone = rawPhone ? (rawPhone.startsWith('+') ? rawPhone : `+91 ${rawPhone}`) : '+91 98000 00000';
      const email = getVal(raw, mapping.email, 'Email', 'Email Address').trim() || `contact@${compName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company'}.com`;
      const enteredBy = getVal(raw, mapping.enteredBy, mapping.salespersonName, 'Entered By', 'Salesperson', 'Owner') || 'Prapti Shah';
      const comments = getVal(raw, mapping.comments, mapping.requirement, 'Comments', 'Requirement Description', 'Remarks').trim();
      const remark1Status = getVal(raw, mapping.remark1CurrentStatus, mapping.currentStatus, 'Remark 1 – Current Status', 'Current Status', 'Status');
      const remark2NextAction = getVal(raw, mapping.remark2NextAction, mapping.nextAction, 'Remark 2 – Next Action', 'Next Action');
      const remark3FollowUp = getVal(raw, mapping.remark3FollowUpPlan, mapping.followUpPlan, 'Remark 3 – Follow-up Plan', 'Follow-up Plan');
      const industry = getVal(raw, mapping.industry, 'Industry', 'Industry Segment') || 'Logistics & Industrial Warehousing';

      // Validation: Only skip if Company Name is completely empty
      if (!compName) {
        errors.push({ row: rowIndex, error: 'Company Name is missing' });
        skippedCount++;
        continue;
      }

      const normComp = compName
        .toLowerCase()
        .replace(/\b(private\s+limited|pvt\.?\s*ltd\.?|limited|ltd\.?|llp|inc\.?|corp\.?|corporation|co\.?)\b/gi, '')
        .replace(/[^a-z0-9]/gi, '')
        .trim() || compName.toLowerCase().replace(/[^a-z0-9]/gi, '');

      // Within-batch duplicate check
      const inqKey = `${normComp}::${area}::${siteName.toLowerCase()}::${comments.toLowerCase()}`;
      if (batchSeenInquiries.has(inqKey)) {
        skippedCount++;
        errors.push({ row: rowIndex, error: `Duplicate row in file for ${compName} (${siteName}, ${area} sq.ft) - skipped.` });
        continue;
      }

      await client.query('SAVEPOINT row_savepoint');

      try {
        // 1. Resolve or Create Company with fuzzy/normalized deduplication
        let companyId: string;
        const compCheck = await client.query(
          `SELECT id, name, legal_name, industry FROM companies 
           WHERE TRIM(LOWER(name)) = TRIM(LOWER($1)) 
              OR (legal_name IS NOT NULL AND TRIM(LOWER(legal_name)) = TRIM(LOWER($1)))
              OR LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')) = $2
              OR (legal_name IS NOT NULL AND LOWER(REGEXP_REPLACE(legal_name, '[^a-zA-Z0-9]', '', 'g')) = $2)
           LIMIT 1;`,
          [compName, normComp]
        );

        if (compCheck.rows.length > 0) {
          companyId = compCheck.rows[0].id;
          // Optionally update industry if previous record had generic or missing industry
          if (industry && (!compCheck.rows[0].industry || compCheck.rows[0].industry === 'General Industrial')) {
            await client.query(`UPDATE companies SET industry = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`, [industry, companyId]);
          }
        } else {
          companyId = `comp_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
          await client.query(
            `INSERT INTO companies (
              id, name, legal_name, website, industry, status, address, city, state, pincode,
              phone, email, assigned_owner_name, prospect_stage, priority, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, 'Active', $6, $7, 'Gujarat', '392130',
              $8, $9, $10, 'Requirement Confirmed', 'High', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            );`,
            [
              companyId,
              compName,
              `${compName} Private Limited`,
              `https://${compName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
              industry,
              `${siteName}`,
              siteName,
              phone,
              email,
              enteredBy,
            ]
          );
        }

        // 2. Check for duplicate existing inquiry for this company (across previous imports or manual entries)
        const inqCheck = await client.query(
          `SELECT id, inquiry_number FROM inquiries 
           WHERE company_id = $1 
             AND (
               (required_area_sq_ft = $2 AND (LOWER(TRIM(location)) = LOWER(TRIM($3)) OR location IS NULL OR $3 = 'Gujarat Industrial Cluster'))
               OR ($4 <> '' AND contact_phone IS NOT NULL AND contact_phone = $4 AND required_area_sq_ft = $2)
               OR ($5 <> '' AND requirement IS NOT NULL AND LOWER(TRIM(requirement)) = LOWER(TRIM($5)))
             )
           LIMIT 1;`,
          [companyId, area, siteName, rawPhone ? phone : '', comments]
        );

        if (inqCheck.rows.length > 0) {
          batchSeenInquiries.add(inqKey);
          skippedCount++;
          errors.push({
            row: rowIndex,
            error: `Duplicate inquiry: already exists in CRM (${inqCheck.rows[0].inquiry_number}) for ${compName} - skipped.`,
          });
          await client.query('RELEASE SAVEPOINT row_savepoint');
          continue;
        }

        batchSeenInquiries.add(inqKey);

        // 3. Resolve or Create Contact
        let contactId: string | null = null;
        if (contactName) {
          const cntCheck = await client.query(
            'SELECT id FROM contacts WHERE company_id = $1 AND name ILIKE $2 LIMIT 1;',
            [companyId, contactName]
          );

          if (cntCheck.rows.length > 0) {
            contactId = cntCheck.rows[0].id;
          } else {
            contactId = `cnt_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
            await client.query(
              `INSERT INTO contacts (
                id, company_id, company_name, name, designation, department, phone, email, is_primary, created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, 'Key Decision Maker', 'Supply Chain Operations', $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
              );`,
              [contactId, companyId, compName, contactName, phone, email]
            );
          }
        }

        // 4. Create Inquiry with strictly incrementing sequence number
        highestNum += 1;
        const inquiryNumber = `INQ-${highestNum}`;
        const inquiryId = `inq_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
        const budgetMonthlyINR = area > 0 ? Math.round(area * 22) : 0; // Est. ₹22/sq.ft
        const parsedInquiryDate = parseDateString(dateVal);
        const stage = mapStatusToStage(remark1Status);
        const requirementDesc = comments || (area > 0 ? `Requirement for ${area.toLocaleString()} sq.ft at ${siteName}` : `Industrial inquiry at ${siteName} (Area TBD)`);
        const nextAction = remark2NextAction || 'Initial requirement review & discovery contact';
        const followUpDate = remark3FollowUp ? parseDateString(remark3FollowUp) : new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];

        const insertInqSql = `
          INSERT INTO inquiries (
            id, inquiry_number, company_id, company_name, contact_id, contact_name, contact_phone, contact_email,
            source, inquiry_date, salesperson_name, requirement, required_area_sq_ft, location, target_corridor,
            industry, possession_date, lease_duration_months, budget_monthly_inr, dock_requirements, clear_height_ft,
            floor_load_capacity, power_kva, fire_systems_required, priority, lead_score, opportunity_score, stage,
            status, next_action, next_follow_up_date, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            'Excel Import', $9, $10, $11, $12, $13, $14,
            $15, '2026-10-01', 60, $16, 6, 12,
            '5 MT/sq.m', 500, true, 'High', 85, 90, $17,
            'Active', $18, $19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          ) RETURNING *;
        `;

        const inqValues = [
          inquiryId,
          inquiryNumber,
          companyId,
          compName,
          contactId,
          contactName || null,
          phone || null,
          email || null,
          parsedInquiryDate,
          enteredBy,
          requirementDesc,
          area,
          siteName,
          `${siteName} Corridor`,
          industry,
          budgetMonthlyINR,
          stage,
          nextAction,
          followUpDate,
        ];

        const inqRes = await client.query(insertInqSql, inqValues);
        importedInquiries.push({
          id: inqRes.rows[0].id,
          inquiryNumber: inqRes.rows[0].inquiry_number,
          companyName: compName,
          requiredAreaSqFt: area,
          siteName,
        });

        await client.query('RELEASE SAVEPOINT row_savepoint');
        importedCount++;
      } catch (rowError: any) {
        await client.query('ROLLBACK TO SAVEPOINT row_savepoint');
        console.warn(`Row ${rowIndex} skipped due to error:`, rowError.message);
        errors.push({ row: rowIndex, error: rowError.message || 'Database insert error' });
        skippedCount++;
      }
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      data: {
        totalProcessed: rows.length,
        importedCount,
        skippedCount,
        errors,
        importedInquiries,
      },
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error executing bulk import:', error);
    res.status(500).json({ success: false, error: error.message || 'Bulk import execution failed.' });
  } finally {
    client.release();
  }
};
