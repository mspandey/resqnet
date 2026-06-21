/**
 * Dispatch & Resource Service — src/matching.ts
 * Nearest available team matching using PostGIS ST_Distance.
 * TECHSPEC §2 / SCHEMA §4: proximity-based dispatch algorithm.
 *
 * Algorithm:
 *   1. Accept incident location (lat/lon) and optional district filter.
 *   2. Query `teams` for current_status = 'available'.
 *   3. Use PostGIS ST_Distance (geography, meters) against team member's
 *      location_last_known in `users`.
 *   4. Return top-N teams ordered by distance ASC, then home_district match.
 */

import { db } from './index';
import logger from './logger';

export interface TeamMatch {
  team_id: string;
  team_name: string;
  agency_name: string;
  home_district: string;
  distance_meters: number | null; // null if no location data for any team member
  current_status: string;
}

interface MatchOptions {
  latitude: number;
  longitude: number;
  district?: string;
  limit?: number;
}

/**
 * findNearestTeams
 * Returns available rescue teams ordered by proximity to an incident location.
 */
export async function findNearestTeams(opts: MatchOptions): Promise<TeamMatch[]> {
  const { latitude, longitude, district, limit = 5 } = opts;

  // Build the query:
  // - Join teams → users (via rescue_team_members) to get member locations
  // - Calculate minimum ST_Distance from any team member to the incident
  // - Filter teams with current_status = 'available'
  // - Prioritize same-district teams (0) then by distance
  const params: any[] = [longitude, latitude, limit];
  let districtClause = '';
  if (district) {
    params.push(district);
    districtClause = `AND (t.home_district = $${params.length} OR 1=1)`;
  }

  const query = `
    SELECT
      t.id                                                        AS team_id,
      t.name                                                      AS team_name,
      a.name                                                      AS agency_name,
      t.home_district,
      t.current_status,
      CASE WHEN t.home_district = $4 THEN 0 ELSE 1 END           AS district_priority,
      MIN(
        ST_Distance(
          u.location_last_known,
          ST_GeogFromText('POINT(' || $1 || ' ' || $2 || ')')
        )
      )                                                           AS distance_meters
    FROM teams t
    JOIN agencies a ON t.agency_id = a.id
    LEFT JOIN rescue_team_members rtm ON rtm.team_id = t.id
    LEFT JOIN users u ON u.id = rtm.user_id AND u.location_last_known IS NOT NULL
    WHERE t.current_status = 'available'
    ${districtClause}
    GROUP BY t.id, t.name, a.name, t.home_district, t.current_status
    ORDER BY
      district_priority ASC,
      distance_meters ASC NULLS LAST
    LIMIT $3
  `;

  // If no district provided, use a placeholder to avoid param index mismatch
  const finalParams = district ? params : [longitude, latitude, limit, null];

  try {
    const result = await db.query(query, finalParams);
    logger.info(
      `findNearestTeams: found ${result.rowCount} available teams near (${latitude},${longitude})`
    );
    return result.rows as TeamMatch[];
  } catch (err: any) {
    logger.error(`findNearestTeams error: ${err.message}`);
    throw err;
  }
}

/**
 * GET /api/dispatch/suggest — HTTP endpoint wrapper.
 * Returns nearest teams for a given incident location.
 * Consumed by the authority dashboard "auto-suggest team" feature.
 */
import { Router, Request, Response } from 'express';
export const matchingRouter = Router();

matchingRouter.get('/dispatch/suggest', async (req: Request, res: Response): Promise<void> => {
  const role = req.headers['x-user-role'];
  if (role !== 'authority' && role !== 'rescue_team') {
    res.status(403).json({ detail: 'Insufficient role for team suggestions' });
    return;
  }

  const { lat, lon, district, limit } = req.query;
  if (!lat || !lon) {
    res.status(400).json({ detail: 'Query params lat and lon are required' });
    return;
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lon as string);

  if (isNaN(latitude) || isNaN(longitude)) {
    res.status(400).json({ detail: 'lat and lon must be valid numbers' });
    return;
  }

  try {
    const matches = await findNearestTeams({
      latitude,
      longitude,
      district: district as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : 5,
    });
    res.json(matches);
  } catch (err: any) {
    logger.error(`/dispatch/suggest error: ${err.message}`);
    res.status(500).json({ detail: 'Internal server error' });
  }
});
