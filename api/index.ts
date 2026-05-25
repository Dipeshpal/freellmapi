import type { VercelRequest, VercelResponse } from '@vercel/node';

let appInstance: any = null;
let initialized = false;

async function initialize() {
  if (initialized) return;
  initialized = true;

  try {
    console.log('[API] Loading modules...');
    const appModule = await import('../server/dist/app.js');
    const dbModule = await import('../server/dist/db/index.js');

    console.log('[API] App module exports:', Object.keys(appModule));
    console.log('[API] DB module exports:', Object.keys(dbModule));

    console.log('[API] Initializing database...');
    try {
      await dbModule.initDb();
      console.log('[API] Database initialized');
    } catch (dbError) {
      console.warn('[API] Database init warning:', dbError);
    }

    console.log('[API] Creating app...');

    if (typeof appModule.createApp !== 'function') {
      throw new Error(`createApp is not a function. Type: ${typeof appModule.createApp}`);
    }

    appInstance = appModule.createApp();

    if (!appInstance) {
      throw new Error('createApp() returned null or undefined');
    }

    if (typeof appInstance !== 'function') {
      throw new Error(`App is not a function. Type: ${typeof appInstance}`);
    }

    console.log('[API] App instance created successfully');
  } catch (error) {
    console.error('[API] Init error:', error);
    initialized = false;
    appInstance = null;
    throw error;
  }
}

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Health check - don't require full init
    if (req.url === '/api/health' || req.url === '/_health') {
      return res.status(200).json({ ok: true });
    }

    await initialize();
    if (!appInstance) {
      console.error('[API] App instance is null after initialize()');
      return res.status(503).json({
        error: {
          message: 'Server initialization incomplete',
          debug: 'appInstance is null'
        }
      });
    }
    appInstance(req, res);
  } catch (error) {
    console.error('[API] Handler error:', error);
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    res.status(500).json({
      error: {
        message: 'Server error',
        details: message,
        stack: stack.split('\n').slice(0, 3),
      },
    });
  }
};
