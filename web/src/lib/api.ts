/**
 * web/src/lib/api.ts
 * Centralised fetch wrapper for the ResQNet API Gateway.
 * Attaches JWT from localStorage, injects locale header.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('resqnet_token');
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body || res.statusText);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  role: 'citizen' | 'volunteer' | 'rescue_team' | 'authority' | 'admin';
  user_id: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export interface RegisterResponse {
  access_token: string;
  role: 'citizen' | 'volunteer' | 'authority' | 'admin';
  user_id: string;
}

export async function register(payload: {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'citizen' | 'volunteer' | 'authority' | 'admin';
  preferred_language?: string;
}): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: 'citizen' | 'volunteer' | 'rescue_team' | 'authority' | 'admin';
  preferred_language: string;
  created_at: string;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>('/api/admin/users');
}

export async function createAdminUser(payload: {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'citizen' | 'volunteer' | 'authority' | 'admin';
  preferred_language?: string;
}): Promise<AdminUser> {
  return apiFetch<AdminUser>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminUser(user_id: string): Promise<void> {
  return apiFetch<void>(`/api/admin/users/${user_id}`, {
    method: 'DELETE',
  });
}

// ── Incidents ─────────────────────────────────────────────────────────────────

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: string;
  severity_tier: 'critical' | 'high' | 'moderate' | 'medium' | 'low' | 'informational';
  severity_score: number | null;
  district: string;
  location?: { lat: number; lng: number };
  created_at: string;
  updated_at: string;
}

export async function getIncidents(params?: {
  district?: string;
  status?: string;
  limit?: number;
}): Promise<Incident[]> {
  const qs = new URLSearchParams();
  if (params?.district) qs.set('district', params.district);
  if (params?.status) qs.set('status', params.status);
  if (params?.limit) qs.set('limit', String(params.limit));
  return apiFetch<Incident[]>(`/api/incidents?${qs.toString()}`);
}

export async function getIncident(id: string): Promise<Incident> {
  return apiFetch<Incident>(`/api/incidents/${id}`);
}

export async function overrideIncidentSeverity(
  id: string,
  severity_tier: string,
  severity_score: number,
): Promise<Incident> {
  return apiFetch<Incident>(`/api/incidents/${id}/severity`, {
    method: 'PATCH',
    body: JSON.stringify({ severity_tier, severity_score }),
  });
}

// ── Dispatches ────────────────────────────────────────────────────────────────

export interface Dispatch {
  id: string;
  incident_id: string;
  team_id: string;
  status: string;
  assigned_at: string;
  arrived_at: string | null;
  resolved_at: string | null;
}

export async function createDispatch(
  incident_id: string,
  team_id: string,
): Promise<Dispatch> {
  return apiFetch<Dispatch>('/api/dispatch', {
    method: 'POST',
    body: JSON.stringify({ incident_id, team_id }),
  });
}

export async function updateDispatchStatus(
  dispatch_id: string,
  status: string,
): Promise<Dispatch> {
  return apiFetch<Dispatch>(`/api/dispatch/${dispatch_id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export interface TeamSuggestion {
  team_id: string;
  name: string;
  district: string;
  distance_m: number;
}

export async function suggestTeams(incident_id: string): Promise<TeamSuggestion[]> {
  return apiFetch<TeamSuggestion[]>(`/api/dispatch/suggest?incident_id=${incident_id}`);
}

// ── Resources ─────────────────────────────────────────────────────────────────

export interface Resource {
  id: string;
  name: string | null;
  type: string | null;       // equipment category
  category: string | null;
  quantity: number | null;
  status: 'available' | 'in_use' | 'allocated' | 'depleted' | 'inactive';
  district: string | null;
  updated_at: string | null;
}

export async function getResources(district?: string): Promise<Resource[]> {
  const qs = district ? `?district=${encodeURIComponent(district)}` : '';
  return apiFetch<Resource[]>(`/api/resources${qs}`);
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function broadcastAlert(payload: {
  district: string;
  message: string;
  severity: string;
}): Promise<void> {
  return apiFetch<void>('/api/alerts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
