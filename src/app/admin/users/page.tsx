'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Copy, Download, Mail, Check, AlertCircle } from 'lucide-react';

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  phoneNumber: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  projectsCount: number;
  videosCount: number;
  credits: {
    scriptCredits: number;
    voiceCredits: number;
    videoCredits: number;
    publishCredits: number;
  } | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create user form state
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    accountStatus: 'ACTIVE',
  });

  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState<{
    id: string;
    email: string;
    temporaryPassword: string;
    role: string;
  } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      } else {
        setError(data.error || 'Failed to load users.');
      }
    } catch {
      setError('An error occurred while fetching users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreateResult(null);
    if (!form.fullName || !form.email) return;

    try {
      setCreateLoading(true);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phoneNumber: form.phoneNumber || undefined,
          accountStatus: form.accountStatus,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateResult({
          id: data.user.id,
          email: data.user.email,
          temporaryPassword: data.user.temporaryPassword,
          role: data.user.role,
        });
        setForm({
          fullName: '',
          email: '',
          phoneNumber: '',
          accountStatus: 'ACTIVE',
        });
        fetchUsers();
      } else {
        setError(data.error || 'Failed to create user.');
      }
    } catch {
      setError('Failed to create user.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'PAUSED' | 'ACTIVE' | 'STOPPED' | 'DELETE' | 'RESET') => {
    setError('');
    setCreateResult(null);
    try {
      let url = `/api/admin/users/${id}`;
      let method = 'PATCH';
      let body: Record<string, unknown> | null = null;

      if (action === 'DELETE') {
        method = 'DELETE';
      } else if (action === 'RESET') {
        url = `/api/admin/users/${id}/reset-password`;
        method = 'POST';
      } else {
        body = { accountStatus: action };
      }

      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await res.json();

      if (res.ok) {
        if (action === 'RESET') {
          // Format credentials for reset result
          setCreateResult({
            id,
            email: data.email || 'N/A',
            temporaryPassword: data.temporaryPassword,
            role: 'USER',
          });
        } else {
          fetchUsers();
        }
      } else {
        setError(data.error || 'Action failed.');
      }
    } catch {
      setError('Action failed.');
    }
  };

  const getCredentialsText = () => {
    if (!createResult) return '';
    return `Platform Login Credentials
-----------------------------------
Role: User
User ID: ${createResult.id}
Email: ${createResult.email}
Temporary Password: ${createResult.temporaryPassword}
-----------------------------------
Sign-In URL: ${window.location.origin}
`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCredentialsText());
    alert('Credentials copied to clipboard!');
  };

  const handleDownload = () => {
    const text = getCredentialsText();
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `credentials_user_${createResult?.email}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage platform users, allocate credits, and monitor status.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/admin/connections" className="text-sm font-bold text-gray-600 hover:text-black">
            Manage Connections
          </Link>
          <Link href="/admin/assignments" className="text-sm font-bold text-gray-600 hover:text-black">
            Manage Assignments
          </Link>
          <Link href="/admin/editors" className="text-sm font-bold text-gray-600 hover:text-black">
            Manage Editors &rarr;
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Create Form on Left, Created Credentials on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create User Section */}
        <div className="lg:col-span-2 p-6 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-black border-b pb-3">Create User Account</h2>
          <form onSubmit={handleCreateUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-black font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. john@example.com"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-black font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  placeholder="e.g. +1 (555) 000-0000"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-black font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Account Status</label>
                <select
                  value={form.accountStatus}
                  onChange={(e) => setForm({ ...form, accountStatus: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-black bg-white font-sans"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                </select>
              </div>
            </div>



            <button
              type="submit"
              disabled={createLoading}
              className="w-full bg-black text-white hover:bg-neutral-800 rounded-xl py-3 text-sm font-bold disabled:opacity-50 transition-colors"
            >
              {createLoading ? 'Creating User...' : 'Create User Account'}
            </button>
          </form>
        </div>

        {/* Credentials Display Pane */}
        <div className="lg:col-span-1">
          {createResult ? (
            <div className="p-6 bg-neutral-900 border border-neutral-800 text-white rounded-3xl shadow-xl space-y-6 animate-in fade-in zoom-in duration-300 relative overflow-hidden">
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />

              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-neutral-100">Account Created Successfully</h3>
                  <p className="text-[11px] text-neutral-400">Provide the details below to the user.</p>
                </div>
              </div>

              <div className="space-y-4 pt-2 text-xs">
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <span className="text-neutral-400 font-medium">Role:</span>
                  <span className="font-bold text-emerald-400">User</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <span className="text-neutral-400 font-medium">User ID:</span>
                  <span className="font-mono font-bold text-neutral-100 select-all">{createResult.id}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <span className="text-neutral-400 font-medium">Email:</span>
                  <span className="font-bold text-neutral-100 select-all">{createResult.email}</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-neutral-800 pb-2">
                  <span className="text-neutral-400 font-medium">Temporary Password:</span>
                  <span className="font-mono bg-neutral-950 border border-neutral-800 px-2.5 py-1.5 rounded-lg font-bold text-emerald-400 text-[13px] text-center select-all block mt-1 tracking-wider">
                    {createResult.temporaryPassword}
                  </span>
                </div>
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl py-2.5 text-xs font-bold transition-all border border-neutral-750"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl py-2.5 text-xs font-bold transition-all border border-neutral-750"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>

              <button
                disabled
                className="w-full flex items-center justify-center gap-2 bg-neutral-800/40 text-neutral-500 border border-neutral-800/60 rounded-xl py-2.5 text-xs font-bold cursor-not-allowed"
              >
                <Mail className="h-3.5 w-3.5 text-neutral-600" />
                Send Via Email (Future Feature)
              </button>
            </div>
          ) : (
            <div className="p-6 border border-dashed border-gray-200 rounded-3xl h-full flex flex-col items-center justify-center text-center text-gray-400 p-8">
              <AlertCircle className="h-8 w-8 mb-2.5 text-gray-300" />
              <p className="text-sm font-semibold text-gray-500">No Credentials Displayed</p>
              <p className="text-xs text-gray-400 max-w-[200px] mt-1 leading-relaxed">
                Create a user account to generate temporary credentials.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-wider">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email / Phone</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4">Assigned Editor</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Projects</th>
                  <th className="p-4">Videos</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-semibold text-black">
                      <Link href={`/admin/users/${u.id}`} className="hover:underline">
                        {u.name || 'N/A'}
                      </Link>
                    </td>
                    <td className="p-4 space-y-0.5">
                      <div className="text-gray-900 font-medium">{u.email}</div>
                      {u.phoneNumber && <div className="text-xs text-gray-400">{u.phoneNumber}</div>}
                    </td>
                    <td className="p-4 text-gray-500 font-semibold">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-gray-600 font-semibold truncate max-w-[150px]">
                      {u.assignedEditors || 'None'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        u.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' :
                        u.status === 'PAUSED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {u.status}
                      </span>
                    </td>

                    <td className="p-4 text-gray-500 font-semibold">{u.projectsCount}</td>
                    <td className="p-4 text-gray-500 font-semibold">{u.videosCount}</td>
                    <td className="p-4 text-right space-x-2">
                      <Link href={`/admin/users/${u.id}`} className="text-neutral-600 hover:underline text-xs font-bold mr-2">View</Link>
                      {u.status === 'ACTIVE' ? (
                        <button onClick={() => handleAction(u.id, 'PAUSED')} className="text-amber-600 hover:underline text-xs font-bold">Pause</button>
                      ) : (
                        <button onClick={() => handleAction(u.id, 'ACTIVE')} className="text-green-600 hover:underline text-xs font-bold">Resume</button>
                      )}
                      {u.status !== 'STOPPED' && (
                        <button onClick={() => handleAction(u.id, 'STOPPED')} className="text-red-500 hover:underline text-xs font-bold">Stop</button>
                      )}
                      <button onClick={() => handleAction(u.id, 'RESET')} className="text-blue-600 hover:underline text-xs font-bold">Reset</button>
                      <button onClick={() => handleAction(u.id, 'DELETE')} className="text-red-700 hover:underline text-xs font-bold">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
