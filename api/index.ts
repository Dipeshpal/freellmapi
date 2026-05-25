import { createApp } from '../server/dist/app';
import { initDb } from '../server/dist/db/index';
import { startHealthChecker } from '../server/dist/services/health';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let appInstance: any = null;
let initialized = false;

async function initialize() {
  if (initialized) return;
  initialized = true;
  await initDb();
  appInstance = createApp();
  startHealthChecker();
}

export default async (req: VercelRequest, res: VercelResponse) => {
  await initialize();
  return appInstance(req, res);
};
