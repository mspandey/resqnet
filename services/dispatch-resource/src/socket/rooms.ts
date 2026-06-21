/**
 * Dispatch & Resource Service — src/socket/rooms.ts
 * Socket.IO room management for real-time incident board updates.
 * TECHSPEC §5: Socket.IO with Redis adapter for multi-instance deployments.
 *
 * Room naming convention:
 *   district:<district_name>  — All active clients in a district (authority + rescue)
 *   incident:<incident_id>   — Clients tracking a specific incident
 *   role:<role_name>         — Role-scoped broadcast channel
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import logger from '../logger';

export interface JoinRoomPayload {
  district?: string;
  incident_id?: string;
  role?: string;
}

export interface IncidentUpdatePayload {
  incident_id: string;
  status: string;
  severity_tier?: string;
  district: string;
  updated_by?: string;
}

/**
 * attachSocketIO
 * Attaches a Socket.IO server to the given HTTP server and wires up
 * the Redis pub/sub adapter for horizontal scaling.
 */
export async function attachSocketIO(httpServer: any): Promise<SocketIOServer> {
  // Redis pub/sub clients (separate connections required by socket.io-redis-adapter)
  const pubClient = createClient({ url: process.env.REDIS_URL ?? 'redis://redis:6379' });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);
  logger.info('Socket.IO Redis adapter clients connected');

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Allow long-polling fallback for weak connectivity (TECHSPEC §4)
    transports: ['websocket', 'polling'],
  });

  // Wire up Redis adapter
  io.adapter(createAdapter(pubClient, subClient));

  // ── Auth middleware ────────────────────────────────────────────────────────
  // Expects auth token in handshake.auth.token — validated by API Gateway before
  // this service is reached, but we perform a basic check here for direct connections.
  io.use((socket: Socket, next) => {
    const userId = socket.handshake.auth?.user_id;
    const userRole = socket.handshake.auth?.user_role;

    if (!userId || !userRole) {
      logger.warn(`Socket connection rejected — missing auth: ${socket.id}`);
      return next(new Error('Authentication required'));
    }

    // Attach to socket for use in event handlers
    (socket as any).userId = userId;
    (socket as any).userRole = userRole;
    next();
  });

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    const userRole = (socket as any).userRole;
    logger.info(`Socket connected: id=${socket.id} user=${userId} role=${userRole}`);

    // Auto-join the role room
    socket.join(`role:${userRole}`);

    // ── join:room ──────────────────────────────────────────────────────────
    // Client specifies district and/or incident_id to subscribe to
    socket.on('join:room', (payload: JoinRoomPayload) => {
      if (payload.district) {
        const room = `district:${payload.district}`;
        socket.join(room);
        logger.info(`${socket.id} joined ${room}`);
      }
      if (payload.incident_id) {
        const room = `incident:${payload.incident_id}`;
        socket.join(room);
        logger.info(`${socket.id} joined ${room}`);
      }
      socket.emit('room:joined', { rooms: [...socket.rooms] });
    });

    // ── leave:room ─────────────────────────────────────────────────────────
    socket.on('leave:room', (payload: JoinRoomPayload) => {
      if (payload.district) socket.leave(`district:${payload.district}`);
      if (payload.incident_id) socket.leave(`incident:${payload.incident_id}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: id=${socket.id} reason=${reason}`);
    });
  });

  return io;
}

/**
 * broadcastIncidentUpdate
 * Emit a real-time incident update to all clients in the district and incident rooms.
 * Called by dispatch/queue routes after any status mutation.
 */
export function broadcastIncidentUpdate(io: SocketIOServer, payload: IncidentUpdatePayload): void {
  const { incident_id, district } = payload;

  // Emit to district room (authority dashboard)
  io.to(`district:${district}`).emit('incident:updated', payload);

  // Emit to incident-specific room (citizen status tracker)
  io.to(`incident:${incident_id}`).emit('incident:updated', payload);

  logger.info(
    `Broadcast incident:updated incident=${incident_id} district=${district} status=${payload.status}`
  );
}
