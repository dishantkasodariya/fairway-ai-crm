import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import crypto from 'crypto';
import { config } from './config/index.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Request ID middleware
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${crypto.randomUUID()}`;
  (req as any).requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server) or any origin in production/development
    callback(null, true);
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes (mounted on /api/v1 as standard, plus /api and root / for resilience)
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);
app.use('/', apiRouter);

// 404 Handler
app.use((req, res) => {
  const requestId = (req as any).requestId || 'req_unknown';
  res.status(404).json({
    success: false,
    requestId,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// Error Handler
app.use(errorHandler);

export default app;

