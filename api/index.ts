import { createRequire } from 'module';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const require = createRequire(import.meta.url);

let appInstance: any = null;
let initialized = false;

async function initialize() {
  if (initialized) return;
  initialized = true;

  try {
    const { initDb } = require('../server/dist/db/index.js');
    const { createApp } = require('../server/dist/app.js');
    const { startHealthChecker } = require('../server/dist/services/health.js');

    await initDb();
    appInstance = createApp();
    startHealthChecker();
  } catch (error) {
    console.error('[init] Error initializing app:', error);
    throw error;
  }
}

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    await initialize();
    return appInstance(req, res);
  } catch (error) {
    console.error('[handler] Error:', error);
    res.status(500).json({ error: { message: 'Server initialization failed' } });
  }
};
