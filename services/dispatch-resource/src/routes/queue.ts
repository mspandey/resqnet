/**
 * Dispatch & Resource Service — src/routes/queue.ts
 * Authority live incident queue management endpoints.
 */

import { Router, Request, Response } from 'express';
import { db, redis } from '../index';
import logger from '../logger';
import { z } from 'zod';

export const queueRouter = Router();

const severityOverrideSchema = z.object({
  new_severity_tier: z.enum(['critical', 'high', 'moderate', 'low']),
  reason: z.string().min(5),
});

// GET /api/queue - List all active incidents ordered by severity and time
queueRouter.get('/queue', async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.headers['x-user-role'];
    if (role !== 'authority' && role !== 'rescue_team') {
      res.status(403).json({ detail: 'Only command center roles can view the dispatch queue' });
      return;
    }

    // Sort by status precedence (reported first) then severity tier high-to-low, then creation date
    // RULES.md and TECHSPEC require a clear live queue.
    const result = await db.query(`
      SELECT
        id,
        status,
        severity_tier,
        severity_score_raw,
        incident_type,
        district,
        ST_X(location::geometry) as longitude,
        ST_Y(location::geometry) as latitude,
        created_at,
        severity_overridden_by,
        severity_override_reason
      FROM incidents
      WHERE status NOT IN ('resolved', 'flagged_duplicate')
      ORDER BY
        CASE severity_tier
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'moderate' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END ASC,
        created_at DESC
    `);

    res.json(result.rows);
  } catch (error: any) {
    logger.error(`Error getting queue: ${error.message}`);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// POST /api/queue/:incident_id/override - Force override severity (Requires Authority)
queueRouter.post('/queue/:incident_id/override', async (req: Request, res: Response): Promise<void> => {
  try {
    const { incident_id } = req.params;
    const role = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];

    if (role !== 'authority' && role !== 'rescue_team') {
      res.status(403).json({ detail: 'Only authorities or rescue teams can trigger manual severity overrides' });
      return;
    }

    const bodyResult = severityOverrideSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ detail: 'Invalid override details', errors: bodyResult.error.format() });
      return;
    }

    const { new_severity_tier, reason } = bodyResult.data;

    // Verify incident exists
    const incidentRes = await db.query('SELECT status FROM incidents WHERE id = $1', [incident_id]);
    if (incidentRes.rowCount === 0) {
      res.status(404).json({ detail: 'Incident not found' });
      return;
    }

    // Enqueue override message for AI Orchestration worker (to process database updates and audits)
    const overrideMsg = {
      incident_id,
      user_id: userId,
      new_severity_tier,
      reason,
    };

    await redis.lPush('queue:override', JSON.stringify(overrideMsg));
    logger.info(`Enqueued severity override for incident ${incident_id} to ${new_severity_tier}`);

    res.status(202).json({
      status: 'queued',
      message: 'Severity override request queued for processing',
      incident_id,
      new_severity_tier,
    });
  } catch (error: any) {
    logger.error(`Error queueing severity override: ${error.message}`);
    res.status(500).json({ detail: 'Internal server error' });
  }
});
