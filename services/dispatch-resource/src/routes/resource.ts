/**
 * Dispatch & Resource Service — src/routes/resource.ts
 * Resource & volunteer management endpoints.
 * Table names match SCHEMA.md exactly: `teams`, `volunteer_profiles`, `resources` (RULES.md §1).
 */

import { Router, Request, Response } from 'express';
import { db } from '../index';
import logger from '../logger';
import { z } from 'zod';

export const resourceRouter = Router();

// ── Validation schemas ────────────────────────────────────────────────────────

const createTeamSchema = z.object({
  name: z.string().min(2),
  agency_id: z.string().uuid(),
  home_district: z.string().min(2),
});

const volunteerStatusSchema = z.object({
  availability_status: z.enum(['available', 'on_task', 'offline']),
});

const resourceUpdateSchema = z.object({
  status: z.enum(['available', 'allocated', 'depleted']),
  quantity: z.number().int().min(0).optional(),
});

// ── POST /api/resources/teams ─────────────────────────────────────────────────
// Authority creates a new rescue team. (SCHEMA.md §2.4: teams table)
resourceRouter.post('/resources/teams', async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.headers['x-user-role'];
    if (role !== 'authority') {
      res.status(403).json({ detail: 'Only authorities can create rescue teams' });
      return;
    }

    const parsed = createTeamSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ detail: 'Invalid body', errors: parsed.error.format() });
      return;
    }

    const { name, agency_id, home_district } = parsed.data;

    const agencyRes = await db.query('SELECT id FROM agencies WHERE id = $1', [agency_id]);
    if (agencyRes.rowCount === 0) {
      res.status(404).json({ detail: 'Agency not found' });
      return;
    }

    const result = await db.query(
      `INSERT INTO teams (agency_id, name, home_district, current_status)
       VALUES ($1, $2, $3, 'available')
       RETURNING id, name, home_district, current_status, agency_id`,
      [agency_id, name, home_district]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    logger.error(`POST /resources/teams error: ${err.message}`);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// ── GET /api/resources/teams ──────────────────────────────────────────────────
// List all teams with agency name. Available to rescue_team and authority.
resourceRouter.get('/resources/teams', async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.headers['x-user-role'];
    if (role !== 'authority' && role !== 'rescue_team') {
      res.status(403).json({ detail: 'Insufficient role' });
      return;
    }

    const result = await db.query(
      `SELECT t.id, t.name, t.home_district, t.current_status, a.name AS agency_name, a.type AS agency_type
       FROM teams t
       JOIN agencies a ON t.agency_id = a.id
       ORDER BY t.name`
    );
    res.json(result.rows);
  } catch (err: any) {
    logger.error(`GET /resources/teams error: ${err.message}`);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// ── PATCH /api/resources/volunteers/:user_id/status ───────────────────────────
// Volunteer updates their own availability status. (SCHEMA.md §2.2)
resourceRouter.patch('/resources/volunteers/:user_id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id } = req.params;
    const requestingUserId = req.headers['x-user-id'];
    const role = req.headers['x-user-role'];

    // Volunteers can only update their own status; authority can update any
    if (role !== 'authority' && requestingUserId !== user_id) {
      res.status(403).json({ detail: 'Cannot update another volunteer\'s status' });
      return;
    }

    const parsed = volunteerStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ detail: 'Invalid body', errors: parsed.error.format() });
      return;
    }

    const { availability_status } = parsed.data;

    const result = await db.query(
      `UPDATE volunteer_profiles
       SET availability_status = $1
       WHERE user_id = $2
       RETURNING user_id, skills, availability_status`,
      [availability_status, user_id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ detail: 'Volunteer profile not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    logger.error(`PATCH /resources/volunteers status error: ${err.message}`);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// ── GET /api/resources/volunteers ─────────────────────────────────────────────
// List available volunteers. Authority and rescue_team only.
resourceRouter.get('/resources/volunteers', async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.headers['x-user-role'];
    if (role !== 'authority' && role !== 'rescue_team') {
      res.status(403).json({ detail: 'Insufficient role' });
      return;
    }

    const result = await db.query(
      `SELECT vp.user_id, u.name, vp.skills, vp.availability_status,
              ST_X(u.location_last_known::geometry) AS longitude,
              ST_Y(u.location_last_known::geometry) AS latitude
       FROM volunteer_profiles vp
       JOIN users u ON vp.user_id = u.id
       WHERE vp.availability_status = 'available'
       ORDER BY u.name`
    );
    res.json(result.rows);
  } catch (err: any) {
    logger.error(`GET /resources/volunteers error: ${err.message}`);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// ── PATCH /api/resources/:resource_id ────────────────────────────────────────
// Authority updates a resource's status or quantity. (SCHEMA.md §2.10)
resourceRouter.patch('/resources/:resource_id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { resource_id } = req.params;
    const role = req.headers['x-user-role'];

    if (role !== 'authority') {
      res.status(403).json({ detail: 'Only authority can update resources' });
      return;
    }

    const parsed = resourceUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ detail: 'Invalid body', errors: parsed.error.format() });
      return;
    }

    const { status, quantity } = parsed.data;

    let query = `UPDATE resources SET status = $1`;
    const params: any[] = [status];

    if (quantity !== undefined) {
      params.push(quantity);
      query += `, quantity = $${params.length}`;
    }

    params.push(resource_id);
    query += ` WHERE id = $${params.length} RETURNING *`;

    const result = await db.query(query, params);
    if (result.rowCount === 0) {
      res.status(404).json({ detail: 'Resource not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    logger.error(`PATCH /resources error: ${err.message}`);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// ── GET /api/resources ────────────────────────────────────────────────────────
// List all resources. Authority only.
resourceRouter.get('/resources', async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.headers['x-user-role'];
    if (role !== 'authority') {
      res.status(403).json({ detail: 'Only authority can view resources' });
      return;
    }

    const result = await db.query(
      `SELECT r.id, r.type, r.quantity, r.status, t.name AS team_name, t.home_district
       FROM resources r
       LEFT JOIN teams t ON r.team_id = t.id
       ORDER BY r.type`
    );
    res.json(result.rows);
  } catch (err: any) {
    logger.error(`GET /resources error: ${err.message}`);
    res.status(500).json({ detail: 'Internal server error' });
  }
});
