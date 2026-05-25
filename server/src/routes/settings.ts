import { Router } from 'express';
import type { Request, Response } from 'express';
import { getUnifiedApiKey, regenerateUnifiedKey } from '../db/index.js';

export const settingsRouter = Router();

// Get the unified API key
settingsRouter.get('/api-key', async (_req: Request, res: Response) => {
  const apiKey = await getUnifiedApiKey();
  res.json({ apiKey });
});

// Regenerate the unified API key
settingsRouter.post('/api-key/regenerate', async (_req: Request, res: Response) => {
  const newKey = await regenerateUnifiedKey();
  res.json({ apiKey: newKey });
});
