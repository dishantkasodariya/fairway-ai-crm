import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  type?: string;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle Payload Too Large
  if (err.type === 'entity.too.large' || message.includes('request entity too large')) {
    statusCode = 413;
    message = 'The uploaded photo exceeds the 2MB size limit. Please choose a photo under 2MB.';
  }


  console.error(`[Error] ${statusCode} - ${message}`);

  res.status(statusCode).json({
    success: false,
    error: {
      message,
    },
  });
};
