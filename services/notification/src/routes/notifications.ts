/**
 * Notification Service — src/routes/notifications.ts
 * API endpoints for posting alerts and handling webhooks (e.g. Twilio incoming SMS).
 */

import { Router, Request, Response } from 'express';
import { db, redis } from '../index';
import logger from '../logger';
import { z } from 'zod';
import axios from 'axios';

export const notificationRouter = Router();

const sendAlertSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(5),
  target_role: z.enum(['citizen', 'volunteer', 'rescue_team', 'authority']).optional(),
  district: z.string().optional(),
});

// POST /api/notifications/alert - Broadcast emergency alert (Authority only)
notificationRouter.post('/notifications/alert', async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.headers['x-user-role'];
    if (role !== 'authority') {
      res.status(403).json({ detail: 'Only authorities can broadcast global emergency alerts' });
      return;
    }

    const bodyResult = sendAlertSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ detail: 'Invalid parameters', errors: bodyResult.error.format() });
      return;
    }

    const { title, body, target_role, district } = bodyResult.data;

    // Enqueue broadcast job to Redis
    const notificationJob = {
      type: 'broadcast',
      title,
      body,
      target_role,
      district,
    };

    await redis.lPush('queue:notifications', JSON.stringify(notificationJob));
    logger.info(`Enqueued alert broadcast job: ${title}`);

    res.status(202).json({ status: 'queued', message: 'Broadcast queued for dispatch' });
  } catch (error: any) {
    logger.error(`Error sending notification alert: ${error.message}`);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// POST /api/notifications/sms-webhook - Receive incoming Twilio SMS / USSD reports
// RULES.md §4: Webhook inputs must be validated and sanitized.
// The SMS content is forwarded to the Ingestion Service to start report classification & dedup.
notificationRouter.post('/notifications/sms-webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const { From, Body, MessageSid } = req.body;
    
    if (!From || !Body) {
      res.status(400).send('<Response><Sms>Missing From or Body</Sms></Response>');
      return;
    }

    logger.info(`Received SMS report from ${From} (SID: ${MessageSid})`);

    // Parse coordinates or city name from body if present; otherwise default to safe local region
    // SMS Fallback: SCHEMA §2.6: Location is optional or defaults.
    // Try to extract decimal latitude/longitude like "34.05,-118.24"
    let lat = 0.0;
    let lon = 0.0;
    const geoRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
    const match = Body.match(geoRegex);
    if (match) {
      lat = parseFloat(match[1]);
      lon = parseFloat(match[2]);
    } else {
      // Default fallback grid coordinates for general region if offline SMS contains no geo tokens
      lat = 34.0522; 
      lon = -118.2437;
    }

    // Call Ingestion Service POST /reports to ingest this SMS report
    // Ingestion service endpoint URL
    const ingestionUrl = process.env.INGESTION_SERVICE_URL ?? 'http://ingestion:8001/api/reports';
    
    // We treat SMS reports as anonymous if we can't find a matching user by phone number
    const userRes = await db.query('SELECT id FROM users WHERE phone_number = $1', [From]);
    const reporter_id = (userRes.rowCount ?? 0) > 0 ? userRes.rows[0].id : null;

    const payload = {
      channel: 'sms',
      raw_text: Body,
      location: {
        longitude: lon,
        latitude: lat,
      },
      reporter_id: reporter_id,
      sync_status: 'synced',
    };

    // Make async ingestion call in background
    axios.post(ingestionUrl, payload, {
      headers: {
        'x-user-role': reporter_id ? 'citizen' : 'anonymous',
        'x-user-id': reporter_id ?? '',
      }
    }).then((response) => {
      logger.info(`SMS report forwarded to Ingestion Service: id=${response.data.id} duplicate=${response.data.is_duplicate}`);
    }).catch((err) => {
      logger.error(`Failed to forward SMS to Ingestion: ${err.message}`);
    });

    // Respond to Twilio with a confirmation SMS
    res.type('text/xml');
    res.send(`
      <Response>
        <Sms>ResQNet: Emergency report received and queued for classification. Stay safe!</Sms>
      </Response>
    `);
  } catch (error: any) {
    logger.error(`Error in SMS Webhook: ${error.message}`);
    res.status(500).send('<Response><Sms>Internal server error</Sms></Response>');
  }
});
