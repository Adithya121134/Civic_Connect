import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db';
import { authRouter } from './server/routes/authRoutes';
import { residentRouter } from './server/routes/residentRoutes';
import { departmentRouter } from './server/routes/departmentRoutes';
import { adminRouter } from './server/routes/adminRoutes';
import { testRouter } from './server/routes/testRoutes';
import { mapsConfigRouter } from './server/routes/mapsConfigRoutes';
import { notificationRouter } from './server/routes/notificationRoutes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize SQLite Database schema and seed data
  console.log('[CivicConnect Server] Initializing SQLite Relational Database...');
  initDatabase();
  console.log('[CivicConnect Server] Relational Database Initialized & Ready.');

  // JSON Body Parser & URL Encoding (Allow high-resolution civic photos)
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Request Correlation and Logging
  app.use((req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || 'corr-' + Date.now();
    res.setHeader('x-correlation-id', correlationId);
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'CivicConnect Production Backend',
      timestamp: new Date().toISOString(),
      architecture: 'Express + SQLite WAL + PostGIS Geolocation + Role-Aware Portals'
    });
  });

  // Mount Portal API Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/resident', residentRouter);
  app.use('/api/v1/department', departmentRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/v1/test', testRouter);
  app.use('/api/v1/maps', mapsConfigRouter);

  // Catch unhandled API routes with JSON 404 before Vite/SPA fallback
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'ROUTE_NOT_FOUND', message: `API route ${req.method} ${req.path} not found` });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[CivicConnect Server] Mounted Vite SPA middleware.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CivicConnect Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[CivicConnect Server] Startup Failed:', err);
  process.exit(1);
});
