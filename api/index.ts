import { createRequire } from 'module';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const require = createRequire(import.meta.url);

let appInstance: any = null;
let initialized = false;
let initError: Error | null = null;

async function initialize() {
  if (initialized) return;
  initialized = true;

  try {
    console.log('[API] Starting initialization...');
    const appModule = require('../server/dist/app.js');
    const dbModule = require('../server/dist/db/index.js');
    const healthModule = require('../server/dist/services/health.js');

    console.log('[API] Modules loaded');

    const { initDb } = dbModule;
    const { createApp } = appModule;
    const { startHealthChecker } = healthModule;

    console.log('[API] Initializing database...');
    await initDb();
    console.log('[API] Database initialized');

    console.log('[API] Creating app...');
    appInstance = createApp();
    console.log('[API] App created');

    console.log('[API] Starting health checker...');
    startHealthChecker();
    console.log('[API] Initialization complete');
  } catch (error) {
    console.error('[API] Init error:', error);
    initError = error as Error;
    throw error;
  }
}

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    await initialize();
    if (!appInstance) {
      throw new Error('App instance not initialized');
    }
    return appInstance(req, res);
  } catch (error) {
    console.error('[API] Request error:', error);
    res.status(500).json({
      error: {
        message: 'Server initialization failed',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
};
