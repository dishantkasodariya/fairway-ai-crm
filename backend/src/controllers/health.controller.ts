import { Request, Response } from 'express';
import { pool } from '../config/db.js';

export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;
  let errorDetails: string | null = null;

  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1;');
    dbLatencyMs = Date.now() - dbStart;
  } catch (err: any) {
    dbStatus = 'unhealthy';
    errorDetails = err.message || 'Database connection error';
  }

  const isHealthy = dbStatus === 'healthy';
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    success: isHealthy,
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'Fairway CRM Backend API',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        ...(errorDetails ? { error: errorDetails } : {}),
      },
    },
    responseTimeMs: Date.now() - start,
  });
};

