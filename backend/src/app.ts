import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import morgan from 'morgan';
import crypto from 'crypto';
import { config } from './config/index.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security Headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Rate Limiting: General API limiter (300 req / min)
const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalApiLimiter);

// Rate Limiting: Authentication brute-force protection (20 req / 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many authentication attempts. Please try again in 15 minutes.' },
  },
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/auth/login', authLimiter);

// Rate Limiting on registration and signup routes
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/auth/register', authLimiter);
app.use('/api/v1/auth/signup', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/auth/signup', authLimiter);

// Request ID middleware
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${crypto.randomUUID()}`;
  (req as any).requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

// Secure CORS Whitelist
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:5000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }
      return callback(new Error('Cross-Origin Request Blocked by CORS policy'));
    },
    credentials: true,
  })
);

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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

