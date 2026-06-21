/**
 * web/src/lib/auth.ts
 * Client-side auth helpers — token storage, decode, and role check.
 * Role enforcement is server-side (API Gateway) — these are UX guards only.
 */

export type AppRole = 'citizen' | 'volunteer' | 'rescue_team' | 'authority' | 'admin';

export interface AuthSession {
  token: string;
  role: AppRole;
  user_id: string;
}

const TOKEN_KEY = 'resqnet_token';
const ROLE_KEY = 'resqnet_role';
const USER_KEY = 'resqnet_user_id';

export function saveSession(session: AuthSession): void {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(ROLE_KEY, session.role);
  localStorage.setItem(USER_KEY, session.user_id);
}

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const role = localStorage.getItem(ROLE_KEY) as AppRole | null;
  const user_id = localStorage.getItem(USER_KEY);
  if (!token || !role || !user_id) return null;
  return { token, role, user_id };
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_KEY);
}

/** Returns the default landing path for a given role. */
export function defaultPathForRole(role: AppRole): string {
  switch (role) {
    case 'citizen':
      return '/citizen/dashboard';
    case 'volunteer':
      return '/volunteer/dashboard';
    case 'rescue_team':
      return '/rescue/queue';
    case 'authority':
      return '/authority/dashboard';
    case 'admin':
      return '/admin/dashboard';
  }
}
