'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/api';
import { saveSession, defaultPathForRole, type AppRole } from '@/lib/auth';
import { HeartHandshake, CheckSquare } from 'lucide-react';
import { clsx } from 'clsx';

const PHONE_RE = /^[6-9]\d{9}$/;

const SKILL_OPTIONS = [
  'First Aid / CPR',
  'Search & Rescue',
  'Medical / Nursing',
  'Firefighting',
  'Flood & Water Rescue',
  'Communication / Radio',
  'Logistics & Supply',
  'Disaster Counselling',
  'Driving / Transport',
  'Community Coordination',
];

const DISTRICTS = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad',
  'Ahmedabad', 'Pune', 'Jaipur', 'Lucknow', 'Bhopal', 'Indore',
  'Patna', 'Bhubaneswar', 'Guwahati', 'Kochi', 'Chandigarh', 'Dehradun',
  'Raipur', 'Ranchi', 'Other',
];

export default function VolunteerSignupPage() {
  const router = useRouter();

  // Basic fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneErr, setPhoneErr] = useState('');

  // Volunteer-specific fields
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [district, setDistrict] = useState('');
  const [availability, setAvailability] = useState<'full_time' | 'part_time' | 'on_call'>('on_call');
  const [experienceYears, setExperienceYears] = useState(0);
  const [certifications, setCertifications] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validatePhone(value: string) {
    const digits = value.replace(/\D/g, '');
    if (!PHONE_RE.test(digits)) {
      setPhoneErr('Enter a valid 10-digit Indian mobile number (starts with 6–9)');
      return false;
    }
    setPhoneErr('');
    return true;
  }

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validatePhone(phone)) return;
    if (selectedSkills.length === 0) {
      setError('Please select at least one skill.');
      return;
    }
    if (!district) {
      setError('Please select your district.');
      return;
    }
    setLoading(true);

    try {
      const result = await register({
        email,
        password,
        name,
        phone: phone.replace(/\D/g, ''),
        role: 'volunteer',
      });

      // The API gateway automatically creates the volunteer_profiles row.
      // Extended fields (skills, district, availability) can be updated post-registration.
      saveSession({ token: result.access_token, role: result.role as AppRole, user_id: result.user_id });
      router.push(defaultPathForRole('volunteer'));
    } catch (err) {
      setError((err as Error).message || 'Unable to register volunteer.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = clsx(
    'rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5',
    'text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full',
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-500/30">
            <HeartHandshake className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Volunteer Registration</h1>
            <p className="text-sm text-slate-400">
              Join ResQNet as a first responder or field volunteer.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* ── Section: Personal Info ──────────────────────────────────── */}
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
              Personal Information
            </p>

            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              Full Name
              <input
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Rahul Verma"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="volunteer@example.com"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              Phone Number
              <input
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneErr) validatePhone(e.target.value);
                }}
                onBlur={() => validatePhone(phone)}
                className={clsx(inputCls, phoneErr && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
                placeholder="9876543210"
                maxLength={10}
              />
              {phoneErr && <span className="text-xs text-red-400">{phoneErr}</span>}
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              Password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
              />
              <span className="text-xs text-slate-500">Minimum 8 characters</span>
            </label>

            {/* ── Section: Volunteer Details ──────────────────────────────── */}
            <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-emerald-500">
              Volunteer Details
            </p>

            {/* District */}
            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              District / City
              <select
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className={clsx(inputCls, 'cursor-pointer')}
              >
                <option value="">Select your district…</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>

            {/* Availability */}
            <fieldset>
              <legend className="mb-2 text-sm text-slate-300">Availability</legend>
              <div className="flex gap-3 flex-wrap">
                {([
                  { val: 'full_time', label: 'Full-time' },
                  { val: 'part_time', label: 'Part-time' },
                  { val: 'on_call', label: 'On-call' },
                ] as const).map(({ val, label }) => (
                  <label
                    key={val}
                    className={clsx(
                      'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                      availability === val
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500',
                    )}
                  >
                    <input
                      type="radio"
                      name="availability"
                      value={val}
                      checked={availability === val}
                      onChange={() => setAvailability(val)}
                      className="hidden"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Experience */}
            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              Years of Experience
              <input
                type="number"
                min={0}
                max={50}
                value={experienceYears}
                onChange={(e) => setExperienceYears(Number(e.target.value))}
                className={inputCls}
                placeholder="0"
              />
            </label>

            {/* Skills */}
            <fieldset>
              <legend className="mb-3 text-sm text-slate-300">
                Skills{' '}
                <span className="text-slate-500">(select all that apply)</span>
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {SKILL_OPTIONS.map((skill) => {
                  const checked = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={clsx(
                        'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors',
                        checked
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500',
                      )}
                    >
                      <CheckSquare className={clsx('h-3.5 w-3.5 flex-shrink-0', checked ? 'text-emerald-400' : 'text-slate-600')} />
                      {skill}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Certifications (optional) */}
            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              Certifications{' '}
              <span className="text-slate-500">(optional)</span>
              <input
                type="text"
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                className={inputCls}
                placeholder="e.g. Red Cross First Aid, NDRF Basic Course"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={clsx(
                'mt-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors',
                'hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              {loading ? 'Registering…' : 'Register as Volunteer'}
            </button>

            <p className="text-center text-xs text-slate-500">
              Already registered?{' '}
              <Link href="/volunteer/login" className="text-emerald-400 hover:text-emerald-300">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
