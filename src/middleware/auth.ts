import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';

export interface AuthPayload extends jwt.JwtPayload {
  role?: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    console.warn({
      method: req.method,
      path: req.path,
      error: 'Missing auth token',
    });
    res.status(401).json({ success: false, error: 'Missing auth token' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as AuthPayload;
    (req as any).account = payload.sub;
    (req as any).role = payload.role;
    next();
  } catch {
    console.warn({
      method: req.method,
      path: req.path,
      error: 'Invalid or expired token',
    });
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      console.warn({
        method: req.method,
        path: req.path,
        error: 'Missing auth token',
        requiredRole: role,
      });
      res.status(401).json({ success: false, error: 'Missing auth token' });
      return;
    }
    try {
      const payload = jwt.verify(header.slice(7), config.jwtSecret) as AuthPayload;
      if (payload.role !== role) {
        console.warn({
          method: req.method,
          path: req.path,
          error: 'Insufficient permissions',
          requiredRole: role,
          providedRole: payload.role,
        });
        res.status(403).json({ success: false, error: 'Insufficient permissions' });
        return;
      }
      (req as any).account = payload.sub;
      (req as any).role = payload.role;
      next();
    } catch {
      console.warn({
        method: req.method,
        path: req.path,
        error: 'Invalid or expired token',
        requiredRole: role,
      });
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
  };
}
