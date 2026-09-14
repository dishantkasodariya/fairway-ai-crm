import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const customRole = (req.headers['x-user-role'] as string)?.trim().toLowerCase();
  const customUserId = (req.headers['x-user-id'] as string)?.trim();
  const customEmail = (req.headers['x-user-email'] as string)?.trim().toLowerCase();

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
      // If client explicitly passed active switch-user role, respect it
      if (customRole) {
        req.user.role = customRole;
      }
      if (customUserId) {
        req.user.userId = customUserId;
      }
      return next();
    } catch (error) {
      console.warn('Token verify failed:', error);
    }
  }

  // If client passed role/userId headers without valid Bearer
  if (customRole) {
    req.user = {
      userId: customUserId || 'usr_client',
      email: customEmail || '',
      role: customRole,
    };
    return next();
  }

  if (process.env.NODE_ENV !== 'production') {
    req.user = {
      userId: 'usr_amit_1',
      email: 'amit@fairway.co.in',
      role: 'admin',
    };
    return next();
  }

  res.status(401).json({
    success: false,
    error: { message: 'Authentication required. Please provide a valid Bearer token.' },
  });
};

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required.' },
      });
      return;
    }

    const userRole = (req.user.role || '').toLowerCase();
    const hasRole = allowedRoles.some((r) => r.toLowerCase() === userRole);

    if (!hasRole) {
      res.status(403).json({
        success: false,
        error: { message: 'Forbidden. You do not have sufficient permissions to perform this action.' },
      });
      return;
    }

    next();
  };
};
