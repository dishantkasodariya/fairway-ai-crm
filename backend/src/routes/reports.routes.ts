import { Router, Request, Response } from 'express';
import { requirePermission } from '../middleware/permission.middleware.js';
import { buildAttributionReport } from '../services/attributionReport.js';

const router = Router();
const isIsoDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; // rejects 2026-13-01, 2026-02-30
};

/** GET /api/reports/ai-attribution?from=YYYY-MM-DD&to=YYYY-MM-DD — leads created in the window (IST), both optional. */
router.get('/ai-attribution', requirePermission('inquiries', 'view'), async (req: Request, res: Response) => {
  const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : null;
  const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : null;
  if ((from && !isIsoDate(from)) || (to && !isIsoDate(to))) {
    res.status(400).json({ success: false, error: 'from and to must be dates like 2026-10-01' });
    return;
  }
  if (from && to && from > to) {
    res.status(400).json({ success: false, error: '"from" must be on or before "to"' });
    return;
  }
  try {
    res.status(200).json({ success: true, data: await buildAttributionReport({ from, to }) });
  } catch (error: any) {
    console.error('Error building AI attribution report:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to build the report.' });
  }
});

export default router;
