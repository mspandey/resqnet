/**
 * Dispatch & Resource Service — src/routes/dispatch.ts
 * Assigns teams to incidents and updates incident operational status.
 * Table names match SCHEMA.md exactly: `teams`, `dispatches` (RULES.md §1).
 */

import { Router, Request, Response } from 'express';
import { db } from '../index';
import logger from '../logger';
import { z } from 'zod';

export const dispatchRouter = Router();

const assignTeamSchema = z.object({
  team_id: z.string().uuid(),
  incident_id: z.string().uuid(),
});

const updateStatusSchema = z.object({
  // Only the statuses valid after dispatch (SCHEMA.md §3 state machine)
  status: z.enum(['en_route', 'on_site', 'resolved', 'cancelled']),
  outcome_notes: z.string().optional(),
});

// ── POST /api/dispatch/assign ─────────────────────────────────────────────────
// Assign an available rescue team to an incident; creates a `dispatches` row.
dispatchRouter.post('/dispatch/assign', async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.headers['x-user-role'];
    if (role !== 'authority' && role !== 'rescue_team') {
      res.status(403).json({ detail: 'Only authority or rescue_team roles can assign dispatch' });
      return;
    }

    const parsed = assignTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ detail: 'Invalid request body', errors: parsed.error.format() });
      return;
    }

    const { team_id, incident_id } = parsed.data;

    // Verify incident exists and is assignable
    const incidentRes = await db.query(
      'SELECT status FROM incidents WHERE id = $1',
      [incident_id]
    );
    if (incidentRes.rowCount === 0) {
      res.status(404).json({ detail: 'Incident not found' });
      return;
    }
    const { status: incStatus } = incidentRes.rows[0];
    if (incStatus === 'resolved' || incStatus === 'flagged_duplicate') {
      res.status(409).json({ detail: `Cannot dispatch to an incident with status '${incStatus}'` });
      return;
    }

    // Verify team exists and is available (SCHEMA.md: teams.current_status)
    const teamRes = await db.query(
      'SELECT current_status FROM teams WHERE id = $1',
      [team_id]
    );
    if (teamRes.rowCount === 0) {
      res.status(404).json({ detail: 'Team not found' });
      return;
    }
    if (teamRes.rows[0].current_status !== 'available') {
      res.status(409).json({ detail: 'Team is not currently available' });
      return;
    }

    // Insert dispatch record (SCHEMA.md §2.9)
    const dispatchRes = await db.query(
      `INSERT INTO dispatches (incident_id, team_id, status, assigned_at)
       VALUES ($1, $2, 'assigned', NOW())
       RETURNING id, incident_id, team_id, status, assigned_at`,
      [incident_id, team_id]
    );

    // Transition incident → dispatched, team → dispatched
    await db.query(
      `UPDATE incidents SET status = 'dispatched' WHERE id = $1`,
      [incident_id]
    );
    await db.query(
      `UPDATE teams SET current_status = 'dispatched' WHERE id = $1`,
      [team_id]
    );

    logger.info(`Team ${team_id} dispatched to incident ${incident_id}`);
    res.status(201).json(dispatchRes.rows[0]);
  } catch (err: any) {
    logger.error(`dispatch/assign error: ${err.message}`);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// ── PATCH /api/dispatch/:dispatch_id/status ───────────────────────────────────
// Rescue team updates their operational status for a dispatch.
// RULES.md §3: If resolved, outcome_notes must be present.
dispatchRouter.patch('/dispatch/:dispatch_id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { dispatch_id } = req.params;
    const role = req.headers['x-user-role'];

    if (role !== 'authority' && role !== 'rescue_team') {
      res.status(403).json({ detail: 'Only authority or rescue_team can update dispatch status' });
      return;
    }

    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ detail: 'Invalid body', errors: parsed.error.format() });
      return;
    }

    const { status, outcome_notes } = parsed.data;

    if (status === 'resolved' && !outcome_notes) {
      res.status(422).json({ detail: 'outcome_notes is required when resolving a dispatch' });
      return;
    }

    // Fetch the dispatch to get its team_id
    const dispRes = await db.query(
      'SELECT team_id, incident_id, status FROM dispatches WHERE id = $1',
      [dispatch_id]
    );
    if (dispRes.rowCount === 0) {
      res.status(404).json({ detail: 'Dispatch not found' });
      return;
    }

    const { team_id, incident_id } = dispRes.rows[0];

    let updateQuery = `UPDATE dispatches SET status = $1`;
    const params: any[] = [status, dispatch_id];

    if (status === 'resolved' || status === 'cancelled') {
      updateQuery += `, resolved_at = NOW()`;
    }
    if (outcome_notes) {
      params.splice(1, 0, outcome_notes); // insert before dispatch_id
      updateQuery += `, outcome_notes = $2`;
      params[params.length - 1] = dispatch_id; // fix dispatch_id position
      // rebuild cleanly
      const setStatus = status;
      const setNotes = outcome_notes;
      const setDispId = dispatch_id;
      const updRes = await db.query(
        `UPDATE dispatches
         SET status = $1, outcome_notes = $2, resolved_at = CASE WHEN $1 IN ('resolved','cancelled') THEN NOW() ELSE NULL END
         WHERE id = $3
         RETURNING *`,
        [setStatus, setNotes, setDispId]
      );
      // Free team if resolved/cancelled
      if (status === 'resolved' || status === 'cancelled') {
        await db.query(`UPDATE teams SET current_status = 'available' WHERE id = $1`, [team_id]);
        if (status === 'resolved') {
          await db.query(`UPDATE incidents SET status = 'resolved', resolved_at = NOW() WHERE id = $1`, [incident_id]);
        }
      } else {
        // Map dispatch status → incident status
        const incidentStatus = status === 'en_route' ? 'en_route' : 'on_site';
        await db.query(`UPDATE incidents SET status = $1 WHERE id = $2`, [incidentStatus, incident_id]);
      }
      logger.info(`Dispatch ${dispatch_id} updated to ${status}`);
      res.json(updRes.rows[0]);
      return;
    }

    // Simple status update (no notes)
    updateQuery += ` WHERE id = $2 RETURNING *`;
    const updRes = await db.query(updateQuery, [status, dispatch_id]);

    const incidentStatus = status === 'en_route' ? 'en_route' : 'on_site';
    await db.query(`UPDATE incidents SET status = $1 WHERE id = $2`, [incidentStatus, incident_id]);

    logger.info(`Dispatch ${dispatch_id} updated to ${status}`);
    res.json(updRes.rows[0]);
  } catch (err: any) {
    logger.error(`dispatch/status error: ${err.message}`);
    res.status(500).json({ detail: 'Internal server error' });
  }
});
