import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

export interface AppError extends Error {
  statusCode?: number;
  type?: string;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';

  // Handle Payload Too Large
  if (err.type === 'entity.too.large' || message.includes('request entity too large')) {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'The uploaded photo exceeds the 2MB size limit. Please choose a photo under 2MB.';
  } else if (statusCode === 404) {
    code = 'NOT_FOUND';
  } else if (statusCode === 401) {
    code = 'UNAUTHORIZED';
  } else if (statusCode === 403) {
    code = 'FORBIDDEN';
  } else if (statusCode === 400) {
    code = 'VALIDATION_ERROR';
  }

  const requestId = (req.headers['x-request-id'] as string) || (req as any).requestId || 'req_unknown';

  console.error(`[Error] [${requestId}] ${statusCode} (${code}) - ${message}`);

  // Below 500, the message was deliberately set by our own code (validation,
  // auth, not-found, ...) and is safe to show. A 500 is unexpected — in
  // production, hide whatever the underlying error (db driver, aws sdk, ...)
  // actually said and point at the requestId for support/log correlation
  // instead, so internals never leak to the client.
  if (statusCode >= 500 && config.nodeEnv === 'production') {
    message = 'Something went wrong on our end. Please try again, or contact support with this request ID.';
  }

  res.status(statusCode).json({
    success: false,
    requestId,
    error: {
      code,
      message,
    },
  });
};

