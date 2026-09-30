import { query, RECALCULATE_PROPERTY_SPACE_SQL } from '../config/db.js';

/** properties row + its live leased / held totals. Use as a subquery or add a WHERE on `p`. */
export const PROPERTY_WITH_SPACE_SELECT = `
  SELECT p.*,
    COALESCE((SELECT SUM(l.area_sq_ft) FROM leases l WHERE l.property_id = p.id AND l.status = 'active'), 0) AS leased_area_sq_ft,
    COALESCE((SELECT SUM(h.area_sq_ft) FROM space_holds h WHERE h.property_id = p.id AND h.status = 'active'), 0) AS held_area_sq_ft
  FROM properties p`;

/** Re-derive properties.available_area_sq_ft from leases + holds. Call after any lease/hold/area change. */
export const recalculatePropertySpace = async (propertyId: string): Promise<void> => {
  await query(RECALCULATE_PROPERTY_SPACE_SQL, [propertyId]);
};

export const fetchPropertyWithSpace = async (idOrCode: string) => {
  const result = await query(`${PROPERTY_WITH_SPACE_SELECT} WHERE p.id = $1 OR p.code = $1;`, [idOrCode]);
  return result.rows[0] || null;
};
