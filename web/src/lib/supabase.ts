/**
 * web/src/lib/supabase.ts
 * Supabase client + typed helpers used across all dashboards.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Types ───────────────────────────────────────────────────────────────────

export type AppRole = 'citizen' | 'volunteer' | 'authority' | 'admin';

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AppRole;
  district: string | null;
  created_at: string;
}

export interface VolunteerProfile {
  id: string;
  skills: string[];
  availability: 'full_time' | 'part_time' | 'on_call';
  district: string;
  certifications: string | null;
  experience_years: number;
}

export interface IncidentReport {
  id: string;
  reporter_id: string;
  reporter_name?: string;
  title: string;
  description: string;
  type: string;
  district: string;
  location: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'assigned' | 'in_progress' | 'resolved';
  created_at: string;
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

/** Sign up → creates auth user + inserts profile row */
export async function supabaseSignUp(payload: {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: AppRole;
  district?: string;
}) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: { name: payload.name, role: payload.role },
    },
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error('Sign-up failed. Please try again.');

  // Insert into profiles table
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    role: payload.role,
    district: payload.district ?? null,
  });

  if (profileError) throw new Error(profileError.message);

  return { user: authData.user, session: authData.session };
}

/** Sign in → returns user + their profile row */
export async function supabaseSignIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Login failed.');

  // Fetch role from profiles table
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('role, name, district')
    .eq('id', data.user.id)
    .single();

  if (pErr) throw new Error('Could not fetch your profile. Contact support.');

  return {
    user: data.user,
    session: data.session,
    role: profile.role as AppRole,
    name: profile.name as string,
  };
}

// ── Data helpers (used by dashboards) ────────────────────────────────────────

/** Fetch all users (admin / authority) */
export async function getProfiles(role?: AppRole): Promise<Profile[]> {
  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (role) query = query.eq('role', role);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Fetch volunteers with their extended profile */
export async function getVolunteers(): Promise<(Profile & Partial<VolunteerProfile>)[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, volunteer_profiles(*)')
    .eq('role', 'volunteer')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => {
    const vp = (row.volunteer_profiles as VolunteerProfile[] | null)?.[0] ?? {};
    return { ...row, ...vp };
  });
}

/** Fetch incident reports */
export async function getIncidentReports(district?: string): Promise<IncidentReport[]> {
  let query = supabase
    .from('incidents')
    .select('*, profiles(name)')
    .order('created_at', { ascending: false });
  if (district) query = query.eq('district', district);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...(row as IncidentReport),
    reporter_name: (row.profiles as { name: string } | null)?.name ?? 'Unknown',
  }));
}

/** Submit a new incident/help request from a citizen */
export async function submitIncident(payload: {
  reporter_id: string;
  title: string;
  description: string;
  type: string;
  district: string;
  location?: string;
  severity: IncidentReport['severity'];
}): Promise<IncidentReport> {
  const { data, error } = await supabase
    .from('incidents')
    .insert({ ...payload, status: 'open' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as IncidentReport;
}
