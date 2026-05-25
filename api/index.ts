import { createRequire } from 'module';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const require = createRequire(import.meta.url);

let appInstance: any = null;
let initialized = false;

async function initialize() {
  if (initialized) return;
  initialized = true;

  try {
    console.log('[API] Starting initialization...');
    const appModule = require('../server/dist/app.js');
    const dbModule = require('../server/dist/db/index.js');
    const healthModule = require('../server/dist/services/health.js');

    const { initDb } = dbModule;
    const { createApp } = appModule;
    const { startHealthChecker } = healthModule;

    console.log('[API] Initializing database (in-memory mode)...');
    try {
      await initDb(':memory:');
      console.log('[API] Database initialized');
    } catch (dbError) {
      console.warn('[API] Database init failed, continuing without db:', dbError);
    }

    console.log('[API] Creating app...');
    appInstance = createApp();
    console.log('[API] App created');

    console.log('[API] Starting health checker...');
    try {
      startHealthChecker();
    } catch (healthError) {
      console.warn('[API] Health checker failed, continuing:', healthError);
    }
    console.log('[API] Initialization complete');
  } catch (error) {
    console.error('[API] Critical init error:', error);
    throw error;
  }
}

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    await initialize();
    if (!appInstance) {
      return res.status(503).json({ error: { message: 'Server not ready' } });
    }
    return appInstance(req, res);
  } catch (error) {
    console.error('[API] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: {
        message: 'Server error',
        details: message,
      },
    });
  }
};
