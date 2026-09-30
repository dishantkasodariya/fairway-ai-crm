import { Request, Response } from 'express';
import { query } from '../config/db.js';
import crypto from 'crypto';
import { PROPERTY_WITH_SPACE_SELECT, fetchPropertyWithSpace, recalculatePropertySpace } from '../services/spaceService.js';

/**
 * Helper to map database property row to camelCase frontend interface
 */
const mapPropertyRow = (row: any) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  location: row.location,
  corridor: row.corridor,
  city: row.city,
  state: row.state || 'Gujarat',
  pincode: row.pincode || '',
  totalAreaSqFt: parseFloat(row.total_area_sq_ft) || 0,
  availableAreaSqFt: parseFloat(row.available_area_sq_ft) || 0,
  baselineOccupiedSqFt: parseFloat(row.baseline_occupied_sq_ft) || 0,
  leasedAreaSqFt: parseFloat(row.leased_area_sq_ft) || 0,
  heldAreaSqFt: parseFloat(row.held_area_sq_ft) || 0,
  rentPerSqFtINR: parseFloat(row.rent_per_sq_ft_inr) || 0,
  depositMonths: parseInt(row.deposit_months, 10) || 3,
  leaseTermsYears: parseInt(row.lease_terms_years, 10) || 5,
  availabilityDate: row.availability_date || 'Immediate',
  clearHeightFt: parseFloat(row.clear_height_ft) || 12,
  docksCount: parseInt(row.docks_count, 10) || 0,
  fireSystems: row.fire_systems || 'NFPA Compliant Hydrants',
  powerKVA: parseFloat(row.power_kva) || 0,
  parkingSlots: parseInt(row.parking_slots, 10) || 0,
  truckAccess: row.truck_access || 'Multi-Axle Access',
  flooringCapacityMT: parseFloat(row.flooring_capacity_mt) || 6,
  cctvSecurity: !!row.cctv_security,
  greenBuildingCert: row.green_building_cert || '',
  latitude: parseFloat(row.latitude) || 21.712,
  longitude: parseFloat(row.longitude) || 72.585,
  photos: typeof row.photos === 'string' ? JSON.parse(row.photos) : (row.photos || []),
  brochureUrl: row.brochure_url || undefined,
  status: row.status || 'Available',
  amenities: typeof row.amenities === 'string' ? JSON.parse(row.amenities) : (row.amenities || []),
  suitableIndustries: typeof row.suitable_industries === 'string' ? JSON.parse(row.suitable_industries) : (row.suitable_industries || []),
  description: row.description || '',
  managerUserId: row.manager_user_id || null,
  managerName: row.manager_name || null,
  createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
  updatedAt: row.updated_at ? row.updated_at.toISOString() : new Date().toISOString(),
});

/**
 * GET /api/properties/dd/active
 * Lightweight endpoint for property / warehouse dropdown options
 */
export const getPropertiesDropdownActive = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, code, name, location, corridor, city, available_area_sq_ft, rent_per_sq_ft_inr, status
       FROM properties
       WHERE UPPER(status) IN ('AVAILABLE', 'UNDER NEGOTIATION') OR status IS NULL
       ORDER BY name ASC;`
    );

    const dropdownOptions = result.rows.map((row) => ({
      id: row.id,
      value: row.id,
      label: `${row.code} — ${row.name} (${row.available_area_sq_ft ? Number(row.available_area_sq_ft).toLocaleString('en-IN') : '0'} sq.ft available)`,
      code: row.code,
      name: row.name,
      location: row.location,
      corridor: row.corridor,
      city: row.city,
      availableAreaSqFt: parseFloat(row.available_area_sq_ft) || 0,
      rentPerSqFtINR: parseFloat(row.rent_per_sq_ft_inr) || 0,
      status: row.status,
    }));

    res.status(200).json({ success: true, data: dropdownOptions });
  } catch (error: any) {
    console.error('Error fetching properties dropdown:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch active properties dropdown' });
  }
};

/**
 * GET /api/properties
 * Lists warehouse properties with search, corridor, and status filters
 */
export const getProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const { corridor, status, search, minArea, maxRent } = req.query;

    let sql = `SELECT * FROM (${PROPERTY_WITH_SPACE_SELECT}) properties WHERE 1=1`;
    const params: any[] = [];

    if (corridor && corridor !== 'all') {
      params.push(corridor);
      sql += ` AND corridor ILIKE $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND UPPER(status) = UPPER($${params.length})`;
    }

    if (minArea) {
      params.push(parseFloat(minArea as string));
      sql += ` AND available_area_sq_ft >= $${params.length}`;
    }

    if (maxRent) {
      params.push(parseFloat(maxRent as string));
      sql += ` AND rent_per_sq_ft_inr <= $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $${params.length} OR code ILIKE $${params.length} OR city ILIKE $${params.length} OR corridor ILIKE $${params.length} OR location ILIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC;';

    const result = await query(sql, params);
    const properties = result.rows.map(mapPropertyRow);

    res.status(200).json({ success: true, data: properties });
  } catch (error: any) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch properties.' });
  }
};

/**
 * GET /api/properties/corridors
 * Returns unique corridors and property counts across database
 */
export const getCorridors = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT corridor, COUNT(*)::int as count
      FROM (
        SELECT corridor FROM properties WHERE corridor IS NOT NULL AND corridor != ''
        UNION ALL
        SELECT target_corridor AS corridor FROM inquiries WHERE target_corridor IS NOT NULL AND target_corridor != ''
      ) c
      GROUP BY corridor
      ORDER BY count DESC, corridor ASC;
    `);

    res.status(200).json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching corridors:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch corridors.' });
  }
};

/**
 * GET /api/properties/industries
 * Returns distinct industries across inquiries and companies from live database
 */
export const getIndustries = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT DISTINCT industry
      FROM (
        SELECT industry FROM inquiries WHERE industry IS NOT NULL AND industry != ''
        UNION
        SELECT industry FROM companies WHERE industry IS NOT NULL AND industry != ''
      ) ind
      ORDER BY industry ASC;
    `);

    const industries = result.rows.map((r) => r.industry);
    res.status(200).json({ success: true, data: industries });
  } catch (error: any) {
    console.error('Error fetching industries:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch industries.' });
  }
};

/**
 * GET /api/properties/capacity?areaSqFt=&inquiryId=
 * Which warehouses can take a requirement right now. Space already held for this deal counts as
 * usable for it. If no single warehouse fits, suggests a split across the most free space.
 */
export const getCapacity = async (req: Request, res: Response): Promise<void> => {
  try {
    const area = Number(req.query.areaSqFt);
    if (!(area > 0)) {
      res.status(400).json({ success: false, error: 'areaSqFt must be a positive number.' });
      return;
    }
    const inquiryId = req.query.inquiryId ? String(req.query.inquiryId) : null;

    const result = await query(
      `SELECT p.id, p.name, p.city, p.total_area_sq_ft, p.available_area_sq_ft,
         COALESCE((SELECT SUM(h.area_sq_ft) FROM space_holds h
                   WHERE h.property_id = p.id AND h.status = 'active' AND h.inquiry_id = $1), 0) AS held_for_deal
       FROM properties p
       WHERE COALESCE(p.total_area_sq_ft, 0) > 0;`,
      [inquiryId]
    );

    const warehouses = result.rows
      .map((r) => {
        const free = parseFloat(r.available_area_sq_ft) || 0;
        const heldForDeal = parseFloat(r.held_for_deal) || 0;
        return {
          id: r.id,
          name: r.name,
          city: r.city,
          totalAreaSqFt: parseFloat(r.total_area_sq_ft) || 0,
          freeSqFt: free,
          heldForThisDealSqFt: heldForDeal,
          usableSqFt: free + heldForDeal,
          fits: free + heldForDeal >= area,
        };
      })
      .sort((a, b) => b.usableSqFt - a.usableSqFt);

    const fitsAny = warehouses.some((w) => w.fits);
    let split: { parts: { id: string; name: string; useSqFt: number }[]; coveredSqFt: number; shortfallSqFt: number } | null = null;
    if (!fitsAny) {
      let remaining = area;
      const parts: { id: string; name: string; useSqFt: number }[] = [];
      for (const w of warehouses) {
        if (remaining <= 0 || w.usableSqFt <= 0) continue;
        const use = Math.min(remaining, w.usableSqFt);
        parts.push({ id: w.id, name: w.name, useSqFt: use });
        remaining -= use;
      }
      split = { parts, coveredSqFt: area - remaining, shortfallSqFt: remaining };
    }

    res.status(200).json({ success: true, data: { requiredSqFt: area, fitsAny, warehouses, split } });
  } catch (error: any) {
    console.error('Error checking capacity:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to check capacity.' });
  }
};

/**
 * GET /api/properties/:id
 */
export const getPropertyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const row = await fetchPropertyWithSpace(String(id));

    if (!row) {
      res.status(404).json({ success: false, error: 'Property not found.' });
      return;
    }

    res.status(200).json({ success: true, data: mapPropertyRow(row) });
  } catch (error: any) {
    console.error('Error fetching property by id:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch property.' });
  }
};

/**
 * POST /api/properties
 * Creates a new warehouse property
 */
export const createProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      code,
      name,
      location,
      corridor,
      city,
      state,
      pincode,
      totalAreaSqFt,
      availableAreaSqFt,
      rentPerSqFtINR,
      depositMonths,
      leaseTermsYears,
      availabilityDate,
      clearHeightFt,
      docksCount,
      fireSystems,
      powerKVA,
      parkingSlots,
      truckAccess,
      flooringCapacityMT,
      cctvSecurity,
      greenBuildingCert,
      latitude,
      longitude,
      photos,
      brochureUrl,
      status,
      amenities,
      suitableIndustries,
      description,
      managerUserId,
      managerName,
    } = req.body;

    const finalLocation = location || req.body.address || corridor || city || 'Gujarat Industrial Belt';
    const finalCorridor = corridor || finalLocation;
    const finalCity = city || 'Ahmedabad';

    // 0 is a legitimate "not known yet" value for a real warehouse whose area/rent haven't been entered.
    if (!name || totalAreaSqFt === undefined || totalAreaSqFt === null || rentPerSqFtINR === undefined || rentPerSqFtINR === null) {
      res.status(400).json({ success: false, error: 'Name, totalAreaSqFt, and rentPerSqFtINR are required.' });
      return;
    }

    const propId = `prop_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const propCode = code || `FW-${finalCity ? finalCity.slice(0, 3).toUpperCase() : 'GUJ'}-${Math.floor(10 + Math.random() * 90)}`;

    const sql = `
      INSERT INTO properties (
        id, code, name, location, corridor, city, state, pincode,
        total_area_sq_ft, available_area_sq_ft, rent_per_sq_ft_inr, deposit_months, lease_terms_years,
        availability_date, clear_height_ft, docks_count, fire_systems, power_kva,
        parking_slots, truck_access, flooring_capacity_mt, cctv_security, green_building_cert,
        latitude, longitude, photos, brochure_url, status, amenities, suitable_industries,
        description, manager_user_id, manager_name, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23,
        $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *;
    `;

    const values = [
      propId,
      propCode,
      name.trim(),
      finalLocation,
      finalCorridor,
      finalCity,
      state || 'Gujarat',
      pincode || '392130',
      totalAreaSqFt,
      availableAreaSqFt ?? totalAreaSqFt,
      rentPerSqFtINR,
      depositMonths || 3,
      leaseTermsYears || 5,
      availabilityDate || 'Immediate',
      clearHeightFt || 12,
      docksCount || 8,
      fireSystems || 'NFPA Compliant',
      powerKVA || 1000,
      parkingSlots || 20,
      truckAccess || 'Multi-Axle Access',
      flooringCapacityMT || 6,
      cctvSecurity ?? true,
      greenBuildingCert || 'IGBC Certified',
      latitude || 21.712,
      longitude || 72.585,
      JSON.stringify(photos || []),
      brochureUrl || null,
      status || 'Available',
      JSON.stringify(amenities || []),
      JSON.stringify(suitableIndustries || []),
      description || '',
      managerUserId || null,
      managerName || null,
    ];

    const result = await query(sql, values);
    await query(
      `UPDATE properties SET baseline_occupied_sq_ft = GREATEST(COALESCE(total_area_sq_ft, 0) - COALESCE(available_area_sq_ft, 0), 0) WHERE id = $1;`,
      [propId]
    );
    await recalculatePropertySpace(propId);
    const created = await fetchPropertyWithSpace(propId);
    res.status(201).json({ success: true, data: mapPropertyRow(created || result.rows[0]) });
  } catch (error: any) {
    console.error('Error creating property:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create property.' });
  }
};

/**
 * PUT /api/properties/:id
 * Update an existing property
 */
export const updateProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      location,
      corridor,
      city,
      state,
      pincode,
      totalAreaSqFt,
      availableAreaSqFt,
      rentPerSqFtINR,
      depositMonths,
      leaseTermsYears,
      availabilityDate,
      clearHeightFt,
      docksCount,
      fireSystems,
      powerKVA,
      parkingSlots,
      truckAccess,
      flooringCapacityMT,
      cctvSecurity,
      greenBuildingCert,
      latitude,
      longitude,
      photos,
      brochureUrl,
      status,
      amenities,
      suitableIndustries,
      description,
      managerUserId,
      managerName,
      baselineOccupiedSqFt,
    } = req.body;

    // available_area_sq_ft is never written directly. An explicit baseline wins; otherwise a typed
    // "available" figure is translated into the baseline that yields it given current leases/holds.
    const sql = `
      UPDATE properties SET
        name = COALESCE($1, name),
        location = COALESCE($2, location),
        corridor = COALESCE($3, corridor),
        city = COALESCE($4, city),
        state = COALESCE($5, state),
        pincode = COALESCE($6, pincode),
        total_area_sq_ft = COALESCE($7, total_area_sq_ft),
        baseline_occupied_sq_ft = CASE
          WHEN $33::numeric IS NOT NULL THEN GREATEST($33::numeric, 0)
          WHEN $8::numeric IS NOT NULL THEN GREATEST(0,
            COALESCE($7::numeric, total_area_sq_ft) - $8::numeric
            - COALESCE((SELECT SUM(l.area_sq_ft) FROM leases l WHERE l.property_id = properties.id AND l.status = 'active'), 0)
            - COALESCE((SELECT SUM(h.area_sq_ft) FROM space_holds h WHERE h.property_id = properties.id AND h.status = 'active'), 0))
          ELSE baseline_occupied_sq_ft
        END,
        rent_per_sq_ft_inr = COALESCE($9, rent_per_sq_ft_inr),
        deposit_months = COALESCE($10, deposit_months),
        lease_terms_years = COALESCE($11, lease_terms_years),
        availability_date = COALESCE($12, availability_date),
        clear_height_ft = COALESCE($13, clear_height_ft),
        docks_count = COALESCE($14, docks_count),
        fire_systems = COALESCE($15, fire_systems),
        power_kva = COALESCE($16, power_kva),
        parking_slots = COALESCE($17, parking_slots),
        truck_access = COALESCE($18, truck_access),
        flooring_capacity_mt = COALESCE($19, flooring_capacity_mt),
        cctv_security = COALESCE($20, cctv_security),
        green_building_cert = COALESCE($21, green_building_cert),
        latitude = COALESCE($22, latitude),
        longitude = COALESCE($23, longitude),
        photos = COALESCE($24, photos),
        brochure_url = COALESCE($25, brochure_url),
        status = COALESCE($26, status),
        amenities = COALESCE($27, amenities),
        suitable_industries = COALESCE($28, suitable_industries),
        description = COALESCE($29, description),
        manager_user_id = COALESCE($31, manager_user_id),
        manager_name = COALESCE($32, manager_name),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $30
      RETURNING *;
    `;

    const values = [
      name,
      location,
      corridor,
      city,
      state,
      pincode,
      totalAreaSqFt,
      availableAreaSqFt,
      rentPerSqFtINR,
      depositMonths,
      leaseTermsYears,
      availabilityDate,
      clearHeightFt,
      docksCount,
      fireSystems,
      powerKVA,
      parkingSlots,
      truckAccess,
      flooringCapacityMT,
      cctvSecurity,
      greenBuildingCert,
      latitude,
      longitude,
      photos ? JSON.stringify(photos) : null,
      brochureUrl,
      status,
      amenities ? JSON.stringify(amenities) : null,
      suitableIndustries ? JSON.stringify(suitableIndustries) : null,
      description,
      id,
      managerUserId,
      managerName,
      baselineOccupiedSqFt ?? null,
    ];

    const result = await query(sql, values);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Property not found.' });
      return;
    }

    await recalculatePropertySpace(result.rows[0].id);
    const updated = await fetchPropertyWithSpace(result.rows[0].id);
    res.status(200).json({ success: true, data: mapPropertyRow(updated) });
  } catch (error: any) {
    console.error('Error updating property:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update property.' });
  }
};

/**
 * DELETE /api/properties/:id
 */
export const deleteProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM properties WHERE id = $1 RETURNING id;', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Property not found.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Property deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting property:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete property.' });
  }
};
