import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/index.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

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


// API Root
app.use('/api', apiRouter);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
    },
  });
});

// Error Handler
app.use(errorHandler);

export default app;
