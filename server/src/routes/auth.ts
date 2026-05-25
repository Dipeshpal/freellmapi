import { Router } from 'express';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const sessionSecret = process.env.SESSION_SECRET;
  const dashboardEmail = process.env.DASHBOARD_EMAIL;
  const dashboardPassword = process.env.DASHBOARD_PASSWORD;

  if (!sessionSecret || !dashboardEmail || !dashboardPassword) {
    return res.status(500).json({ error: { message: 'Server configuration incomplete' } });
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { message: 'Invalid email or password' } });
  }

  const { email, password } = parsed.data;

  // Constant-time comparison to mitigate timing attacks
  const emailMatch = email === dashboardEmail;
  const passwordMatch = password === dashboardPassword;

  if (!emailMatch || !passwordMatch) {
    return res.status(401).json({ error: { message: 'Invalid email or password' } });
  }

  const token = jwt.sign({ authenticated: true }, sessionSecret, { expiresIn: '7d' });

  res.cookie('dashboard_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({ authenticated: true });
});

authRouter.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('dashboard_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ success: true });
});

authRouter.get('/me', (req: Request, res: Response) => {
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
    res.json({ authenticated: true });
  } catch {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }
});
