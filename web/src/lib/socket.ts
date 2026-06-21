/**
 * web/src/lib/socket.ts
 * Singleton Socket.IO client connecting to the dispatch-resource service.
 * Exports a hook for joining district / incident rooms.
 */

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// ── React hooks ───────────────────────────────────────────────────────────────

/**
 * Join a Socket.IO room and receive events from it.
 * Automatically leaves the room on unmount.
 */
export function useSocketRoom(
  room: string | null,
  onEvent: (event: string, data: unknown) => void,
): void {
  const savedCallback = useRef(onEvent);
  useEffect(() => {
    savedCallback.current = onEvent;
  });

  useEffect(() => {
    if (!room) return;
    const s = getSocket();
    s.emit('join', room);

    const handler = (data: unknown) =>
      savedCallback.current('incident_update', data);

    s.on('incident_update', handler);

    return () => {
      s.emit('leave', room);
      s.off('incident_update', handler);
    };
  }, [room]);
}

/**
 * Subscribe to updates for a specific incident.
 */
export function useIncidentRoom(
  incidentId: string | null,
  onUpdate: (data: unknown) => void,
): void {
  useSocketRoom(incidentId ? `incident:${incidentId}` : null, onUpdate);
}

/**
 * Subscribe to district-level queue updates.
 */
export function useDistrictRoom(
  district: string | null,
  onUpdate: (data: unknown) => void,
): void {
  useSocketRoom(district ? `district:${district}` : null, onUpdate);
}
