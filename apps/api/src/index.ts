import express from 'express';
import cors, { type CorsOptions } from 'cors';
import path from 'path';
import { createServer } from 'http';
import routes from './routes/index.js';
import { initializeSocketIO } from './sockets/index.js';
import { initializeMqttIngest } from './mqtt/ingest.js';
import { UPLOADS_DIR } from './config/paths.js';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocketIO(httpServer);

// Initialize MQTT ingest (EMQX)
initializeMqttIngest({ io });

// Make io available in req
app.set('io', io);

// Middleware - CORS handling; allow configuring allowed origins via env var `CORS_ORIGIN`
// Examples:
//  - CORS_ORIGIN='*' -> allow all origins (development)
//  - CORS_ORIGIN='http://localhost:19006' -> allow a single origin
//  - CORS_ORIGIN='http://a.com,http://b.com' -> allow multiple origins
const CORS_ORIGIN = process.env.CORS_ORIGIN || '';
const ALLOW_CREDENTIALS = CORS_ORIGIN !== '*';
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;

  if (CORS_ORIGIN) {
    if (CORS_ORIGIN === '*') {
      // Wildcard mode (development): allow all origins.
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
      const allowed = CORS_ORIGIN.split(',').map((s) => s.trim());
      if (origin && allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
    }
  } else if (origin) {
    // Fallback: echo incoming origin
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  if (ALLOW_CREDENTIALS) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});
app.use(cors({
  origin: !!CORS_ORIGIN
    ? (CORS_ORIGIN === '*'
      ? true
      : (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        const allowed = CORS_ORIGIN.split(',').map((s) => s.trim());
        callback(null, allowed.includes(origin));
      })
    : true,
  credentials: ALLOW_CREDENTIALS,
} satisfies CorsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'CertiLog API',
    version: '1.0.0',
    status: 'running',
  });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor',
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`
🚀 CertiLog API running on port ${PORT}
📡 Socket.IO enabled
🌍 Environment: ${process.env.NODE_ENV || 'development'}
  `);
});

export { app, io };
