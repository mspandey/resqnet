'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ShieldCheck, UserCog, FileText, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { AdminUser, createAdminUser, deleteAdminUser, getAdminUsers } from '@/lib/api';

const actions = [
  {
    title: 'Invite new admins',
    description: 'Create new administrator accounts with admin-level access.',
    icon: ShieldCheck,
  },
  {
    title: 'Manage user roles',
    description: 'Review and update role assignments for citizens, volunteers, authority, and admins.',
    icon: UserCog,
  },
  {
    title: 'View audit logs',
    description: 'Inspect recent administrative and system actions for security and compliance.',
    icon: FileText,
  },
  {
    title: 'Platform health',
    description: 'Monitor overall system health and dispatch activity from a single pane.',
    icon: BarChart3,
  },
];

const roleOptions = [
  { value: 'admin', label: 'Administrator' },
  { value: 'authority', label: 'Authority' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'citizen', label: 'Citizen' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'authority' | 'volunteer' | 'citizen'>('admin');
  const [preferredLanguage, setPreferredLanguage] = useState('en');

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err) {
      setError((err as Error).message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await createAdminUser({
        email,
        password,
        name,
        phone,
        role,
        preferred_language: preferredLanguage,
      });
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setPreferredLanguage('en');
      await loadUsers();
    } catch (err) {
      setError((err as Error).message || 'Unable to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteAdminUser(userId);
      await loadUsers();
    } catch (err) {
      setError((err as Error).message || 'Unable to delete user.');
    }
  };

  const roleCount = useMemo(
    () =>
      users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    [users],
  );

  return (
    <AppShell role="admin">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Account Management</h1>
          <p className="mt-2 text-slate-400">Create and manage platform users, roles, and administrator access.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {actions.map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-violet-400" />
                <h2 className="text-lg font-semibold text-white">{item.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">Users</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Platform user directory</h2>
              </div>
              <div className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-300">
                {users.length} users
              </div>
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl bg-rose-950/80 p-4 text-sm text-rose-200">{error}</div>
            ) : null}

            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                <thead className="bg-slate-950/70 text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        Loading users…
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-950/80">
                        <td className="px-4 py-4 text-white">{user.name}</td>
                        <td className="px-4 py-4 text-slate-300">{user.email ?? '—'}</td>
                        <td className="px-4 py-4 text-slate-300">{user.role}</td>
                        <td className="px-4 py-4 text-slate-400">{new Date(user.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(user.id)}
                            className="rounded-full border border-rose-500 px-3 py-1 text-sm text-rose-200 transition hover:bg-rose-500/10"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {Object.entries(roleCount).map(([roleName, count]) => (
                <div key={roleName} className="rounded-3xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
                  <p className="font-semibold text-white">{roleName}</p>
                  <p>{count} accounts</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">Create user</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Add a new account</h2>
            <p className="mt-2 text-sm text-slate-400">Create a citizen, volunteer, authority, or admin account from the hidden admin portal.</p>

            <form className="mt-6 space-y-4" onSubmit={handleCreate}>
              <div>
                <label className="block text-sm font-medium text-slate-300">Full name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
                  placeholder="Alex Morgan"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
                  placeholder="admin@resqnet.dev"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Phone number</label>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
                  placeholder="+1 555 0100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
                  placeholder="Strong password"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300">Role</label>
                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value as typeof role)}
                    className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Preferred language</label>
                  <input
                    value={preferredLanguage}
                    onChange={(event) => setPreferredLanguage(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
                    placeholder="en"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:pointer-events-none disabled:opacity-60"
              >
                {submitting ? 'Creating…' : 'Create account'}
              </button>
            </form>

            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
              <p className="font-medium text-white">Admin portal actions</p>
              <p className="mt-2">Use this panel to manage platform users and onboarding. Admin registration via the public signup page remains gated by environment settings.</p>
            </div>
          </section>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
          <p className="text-sm leading-6">
            This admin page now connects to the API gateway and can create accounts as well as display the current user directory.
          </p>
          <div className="mt-4 text-sm">
            <Link href="/admin/dashboard" className="font-medium text-blue-400 hover:text-blue-300">
              Return to Admin Dashboard
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
