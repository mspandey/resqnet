/**
 * Dispatch & Resource Service — src/index.ts
 * Express + Socket.IO server on port 3001.
 * TECHSPEC §2: Node.js/TypeScript service.
 */

import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';
import { Pool } from 'pg';
import 'dotenv/config';
import logger from './logger';
import { dispatchRouter } from './routes/dispatch';
import { resourceRouter } from './routes/resource';
import { queueRouter } from './routes/queue';
import { matchingRouter } from './matching';
import { attachSocketIO } from './socket/rooms';

const app = express();
app.use(express.json());

// ── DB Pool ──────────────────────────────────────────────────────────────────
export const db = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://resqnet:resqnet@postgres:5432/resqnet',
  max: 10,
});

// ── Redis Client ─────────────────────────────────────────────────────────────
export const redis = createClient({ url: process.env.REDIS_URL ?? 'redis://redis:6379' });

// ── HTTP Server (required for Socket.IO) ─────────────────────────────────────
const httpServer = http.createServer(app);

async function bootstrap() {
  await redis.connect();
  logger.info('Dispatch-Resource: Redis connected');

  // Attach Socket.IO with Redis adapter
  const io = await attachSocketIO(httpServer);
  logger.info('Dispatch-Resource: Socket.IO attached');

  // Make io accessible in routes via app.locals
  app.locals.io = io;

  // Mount routers
  app.use('/api', dispatchRouter);
  app.use('/api', resourceRouter);
  app.use('/api', queueRouter);
  app.use('/api', matchingRouter);

  // Health
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'dispatch-resource' });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error: %s', err.message);
    res.status(500).json({ detail: 'Internal server error' });
  });

  const port = Number(process.env.PORT ?? 3001);
  httpServer.listen(port, () => logger.info('Dispatch-Resource listening on port %d', port));
}

bootstrap().catch((err) => {
  logger.error('Failed to start: %s', err);
  process.exit(1);
});
