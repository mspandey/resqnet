'use client';

/**
 * web/src/app/volunteer/profile/skills/page.tsx
 * Volunteer — self-reported skill set management (PRD §7).
 */

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { clsx } from 'clsx';
import { CheckSquare, Square, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ALL_SKILLS = [
  { id: 'first_aid', label: 'First Aid' },
  { id: 'cpr', label: 'CPR / AED' },
  { id: 'search_rescue', label: 'Search & Rescue' },
  { id: 'firefighting', label: 'Firefighting' },
  { id: 'swift_water', label: 'Swift Water Rescue' },
  { id: 'medical', label: 'Medical / Paramedic' },
  { id: 'heavy_equipment', label: 'Heavy Equipment Operation' },
  { id: 'communication', label: 'Communication / Radio' },
  { id: 'logistics', label: 'Logistics & Supply' },
  { id: 'mental_health', label: 'Mental Health Support' },
  { id: 'translation', label: 'Translation / Interpretation' },
  { id: 'driving', label: 'Driving (4WD / Off-road)' },
];

export default function VolunteerSkillsPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set(['first_aid', 'cpr']));
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      // PATCH /api/volunteer/skills (Sprint 2 endpoint)
      await new Promise((r) => setTimeout(r, 600));
      toast.success('Skills updated');
    } catch {
      toast.error('Failed to save skills');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell role="volunteer">
      <div className="mx-auto max-w-lg">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">My Skills</h1>
          <p className="text-sm text-slate-400">
            Skill tags improve your incident match quality.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ALL_SKILLS.map(({ id, label }) => {
              const active = selected.has(id);
              return (
                <li key={id}>
                  <button
                    onClick={() => toggle(id)}
                    aria-pressed={active}
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-700/50'
                        : 'border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200',
                    )}
                  >
                    {active ? (
                      <CheckSquare className="h-4 w-4 flex-shrink-0 text-blue-400" />
                    ) : (
                      <Square className="h-4 w-4 flex-shrink-0" />
                    )}
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {selected.size} skill{selected.size !== 1 ? 's' : ''} selected
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className={clsx(
                'flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white',
                'hover:bg-blue-500 transition-colors disabled:opacity-60',
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Skills
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
