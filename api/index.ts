import type { VercelRequest, VercelResponse } from '@vercel/node';

let appInstance: any = null;
let initialized = false;

async function initialize() {
  if (initialized) return;
  initialized = true;
  const { initDb } = await import('../server/dist/db/index.js');
  const { createApp } = await import('../server/dist/app.js');
  const { startHealthChecker } = await import('../server/dist/services/health.js');

  await initDb();
  appInstance = createApp();
  startHealthChecker();
}

export default async (req: VercelRequest, res: VercelResponse) => {
  await initialize();
  return appInstance(req, res);
};
