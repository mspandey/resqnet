/**
 * Notification Service — src/index.ts
 * Listens to redis queue `queue:notifications` to dispatch notifications to users.
 * Offers REST endpoints for manual notifications and webhooks for Twilio callback.
 */

import express, { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';
import { Pool } from 'pg';
import 'dotenv/config';
import logger from './logger';
import { startNotificationWorker } from './worker';
import { notificationRouter } from './routes/notifications';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // to parse Twilio webhook urlencoded payload

export const db = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://resqnet:resqnet@postgres:5432/resqnet',
  max: 5,
});

export const redis = createClient({ url: process.env.REDIS_URL ?? 'redis://redis:6379' });

async function bootstrap() {
  await redis.connect();
  logger.info('Notification Service: Redis connected');

  // Mount routes
  app.use('/api', notificationRouter);

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'notification' });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error in Notification service: %s', err.message);
    res.status(500).json({ detail: 'Internal server error' });
  });

  // Start the background Redis worker for async notifications (push/sms)
  startNotificationWorker(redis);

  const port = Number(process.env.PORT ?? 3002);
  app.listen(port, () => logger.info('Notification Service listening on port %d', port));
}

bootstrap().catch((err) => {
  logger.error('Failed to start: %s', err);
  process.exit(1);
});
