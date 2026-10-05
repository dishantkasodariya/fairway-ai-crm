import { Router, Request, Response } from 'express';
import { requirePermission } from '../middleware/permission.middleware.js';
import { buildTodayList, TODAY_RULES } from '../services/todayList.js';

const router = Router();

/** GET /api/today — the shared daily action list; every item names who should act on it. */
router.get('/', requirePermission('inquiries', 'view'), async (_req: Request, res: Response) => {
  try {
    const data = await buildTodayList();
    res.status(200).json({ success: true, data: { ...data, rules: TODAY_RULES } });
  } catch (error: any) {
    console.error('Error building today list:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to build the Today list.' });
  }
});

export default router;
