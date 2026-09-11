import { Request, Response, NextFunction } from 'express';

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

  res.status(statusCode).json({
    success: false,
    requestId,
    error: {
      code,
      message,
    },
  });
};

