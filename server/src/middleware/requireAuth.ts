import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { authenticated: true };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    return res.status(500).json({ error: { message: 'SESSION_SECRET not configured' } });
  }

  const token = req.cookies.dashboard_session;
  if (!token) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }

  try {
    jwt.verify(token, sessionSecret);
    req.user = { authenticated: true };
    next();
  } catch {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }
}
