/**
 * Notification Service — src/worker.ts
 * Background worker to consume the 'queue:notifications' Redis list
 * and push alerts via Firebase or SMS via Twilio.
 */

import { RedisClientType } from 'redis';
import logger from './logger';
import { db } from './index';
import twilio from 'twilio';

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFromNumber = process.env.TWILIO_FROM_NUMBER ?? '+15017122661';

let twilioClient: any = null;
if (twilioAccountSid && twilioAuthToken) {
  twilioClient = twilio(twilioAccountSid, twilioAuthToken);
  logger.info('Twilio client initialized');
} else {
  logger.warn('Twilio environment variables missing — SMS sending will run in dev/mock mode');
}

interface NotificationJob {
  type: 'broadcast' | 'direct';
  title: string;
  body: string;
  target_role?: string;
  district?: string;
  user_id?: string;
}

export function startNotificationWorker(redis: any) {
  const workerLoop = async () => {
    logger.info('Notification worker started and waiting for jobs...');
    while (true) {
      try {
        const result = await redis.blPop('queue:notifications', 0); // Block indefinitely
        if (!result) continue;

        const { element } = result;
        const job: NotificationJob = JSON.parse(element);
        logger.info(`Processing notification job type=${job.type} title="${job.title}"`);

        if (job.type === 'broadcast') {
          await handleBroadcast(job);
        } else if (job.type === 'direct') {
          await handleDirect(job);
        }
      } catch (err: any) {
        logger.error(`Error in notification worker loop: ${err.message}`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  };

  workerLoop();
}

async function handleBroadcast(job: NotificationJob) {
  // Find users matching target_role and/or district
  let query = 'SELECT id, phone_number, role FROM users WHERE phone_number IS NOT NULL';
  const params: any[] = [];

  if (job.target_role) {
    params.push(job.target_role);
    query += ` AND role = $${params.length}`;
  }

  // Filter by district using postgis or direct field if needed
  // For MVP, we fetch all active numbers and send SMS
  const result = await db.query(query, params);
  const users = result.rows;
  logger.info(`Broadcasting to ${users.length} matching users`);

  for (const user of users) {
    await sendSms(user.phone_number, `ALERT: ${job.title}\n\n${job.body}`);
  }
}

async function handleDirect(job: NotificationJob) {
  if (!job.user_id) return;
  const result = await db.query('SELECT phone_number FROM users WHERE id = $1', [job.user_id]);
  if (result.rowCount === 0) return;

  const phone = result.rows[0].phone_number;
  if (phone) {
    await sendSms(phone, `${job.title}: ${job.body}`);
  }
}

async function sendSms(to: string, body: string) {
  try {
    if (twilioClient) {
      await twilioClient.messages.create({
        body,
        to,
        from: twilioFromNumber,
      });
      logger.info(`SMS sent successfully to ${to}`);
    } else {
      logger.info(`[MOCK SMS] To: ${to} | Body: ${body}`);
    }
  } catch (error: any) {
    logger.error(`Failed to send SMS to ${to}: ${error.message}`);
  }
}
