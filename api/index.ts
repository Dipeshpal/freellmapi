import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let appInstance: any = null;
let initialized = false;

async function initialize() {
  if (initialized) return;
  initialized = true;

  try {
    const serverDistDir = path.join(__dirname, '..', 'server', 'dist');
    console.log('[init] Loading modules from:', serverDistDir);

    const appPath = path.join(serverDistDir, 'app.js');
    const dbPath = path.join(serverDistDir, 'db', 'index.js');
    const healthPath = path.join(serverDistDir, 'services', 'health.js');

    console.log('[init] Loading app from:', appPath);
    const { createApp } = require(appPath);

    console.log('[init] Loading db from:', dbPath);
    const { initDb } = require(dbPath);

    console.log('[init] Loading health from:', healthPath);
    const { startHealthChecker } = require(healthPath);

    console.log('[init] Initializing database...');
    await initDb();

    console.log('[init] Creating app instance...');
    appInstance = createApp();

    console.log('[init] Starting health checker...');
    startHealthChecker();

    console.log('[init] App initialized successfully');
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
