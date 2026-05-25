import type { VercelRequest, VercelResponse } from '@vercel/node';

let appInstance: any = null;
let initialized = false;

async function initialize() {
  if (initialized) return;
  initialized = true;

  try {
    console.log('[API] Loading modules...');
    const appModule = await import('../server/dist/app.js');

    console.log('[API] Creating app (database will init on first use)...');
    appInstance = appModule.createApp();
    console.log('[API] App initialized');
  } catch (error) {
    console.error('[API] Init error:', error);
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
