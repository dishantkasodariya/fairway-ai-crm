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
    console.warn('Notice in Today list (database offline or reconnecting):', error.message);
    res.status(200).json({
      success: true,
      data: {
        urgentCount: 0,
        pendingCount: 0,
        items: [],
        rules: TODAY_RULES,
      },
      warning: 'Today agenda temporarily unavailable while database is reconnecting.',
    });
  }
});

export default router;
