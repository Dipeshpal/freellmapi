import type { VercelRequest, VercelResponse } from '@vercel/node';

let appInstance: any = null;
let initialized = false;

async function initialize() {
  if (initialized) return;
  initialized = true;

  const appModule = await import('../server/dist/app.js');
  const dbModule = await import('../server/dist/db/index.js');
  const healthModule = await import('../server/dist/services/health.js');

  const { initDb } = dbModule;
  const { createApp } = appModule;
  const { startHealthChecker } = healthModule;

  await initDb();
  appInstance = createApp();
  startHealthChecker();
}

export default async (req: VercelRequest, res: VercelResponse) => {
  await initialize();
  return appInstance(req, res);
};
