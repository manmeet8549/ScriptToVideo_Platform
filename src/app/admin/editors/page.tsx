'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Copy, Download, Mail, Check, AlertCircle } from 'lucide-react';

interface EditorItem {
  id: string;
  name: string | null;
  email: string;
  phoneNumber: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  editorKey: string | null;
  editorId: string | null;
  specialization: string | null;
}

export default function AdminEditorsPage() {
  const [editors, setEditors] = useState<EditorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create editor form state
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    specialization: '',
  });

  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState<{
    email: string;
    temporaryPassword?: string;
    editorKey?: string;
    editorId?: string;
  } | null>(null);

  const fetchEditors = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/editors');
      const data = await res.json();
      if (res.ok) {
        setEditors(data.editors || []);
      } else {
        setError(data.error || 'Failed to load editors.');
      }
    } catch {
      setError('An error occurred while fetching editors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEditors();
  }, []);

  const handleCreateEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreateResult(null);
    if (!form.fullName || !form.email) return;

    try {
      setCreateLoading(true);
      const res = await fetch('/api/admin/editors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phoneNumber: form.phoneNumber || undefined,
          specialization: form.specialization || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateResult({
          email: data.editor.email,
          temporaryPassword: data.editor.temporaryPassword,
          editorKey: data.editor.editorKey,
          editorId: data.editor.editorId,
        });
        setForm({ fullName: '', email: '', phoneNumber: '', specialization: '' });
        fetchEditors();
      } else {
        setError(data.error || 'Failed to create editor.');
      }
    } catch {
      setError('Failed to create editor.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'PAUSED' | 'ACTIVE' | 'STOPPED' | 'DELETE' | 'RESET') => {
    setError('');
    setCreateResult(null);
    try {
      let url = `/api/admin/users/${id}`; // Status/Deletion actions reuse user API endpoints
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
            email: data.email || 'N/A',
            temporaryPassword: data.temporaryPassword,
            editorId: data.editorId || 'N/A',
            editorKey: data.editorKey || 'N/A',
          });
        } else {
          fetchEditors();
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
Role: Video Editor
Editor ID: ${createResult.editorId || 'N/A'}
Email: ${createResult.email}
Editor Connection Key: ${createResult.editorKey || 'N/A'}
Temporary Password: ${createResult.temporaryPassword || 'N/A'}
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
    element.download = `credentials_editor_${createResult?.email}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black">Editor Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage content editors, view specialized fields, and authorization keys.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/admin/connections" className="text-sm font-bold text-gray-600 hover:text-black">
            Manage Connections
          </Link>
          <Link href="/admin/assignments" className="text-sm font-bold text-gray-600 hover:text-black">
            Manage Assignments
          </Link>
          <Link href="/admin/users" className="text-sm font-bold text-gray-600 hover:text-black">
            &larr; Manage Users
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
        {/* Create Editor Section */}
        <div className="lg:col-span-2 p-6 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-black border-b pb-3">Create Editor Account</h2>
          <form onSubmit={handleCreateEditor} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="e.g. Alex Smith"
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
                  placeholder="e.g. alex@example.com"
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
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Specialization (Optional)</label>
                <input
                  type="text"
                  value={form.specialization}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                  placeholder="e.g. Color Grading, Sound Design"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-black font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={createLoading}
              className="w-full bg-black text-white hover:bg-neutral-800 rounded-xl py-3 text-sm font-bold disabled:opacity-50 transition-colors"
            >
              {createLoading ? 'Creating Editor...' : 'Create Editor Account'}
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
                  <p className="text-[11px] text-neutral-400">Provide the details below to the editor.</p>
                </div>
              </div>

              <div className="space-y-4 pt-2 text-xs">
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <span className="text-neutral-400 font-medium">Role:</span>
                  <span className="font-bold text-emerald-400">Video Editor</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <span className="text-neutral-400 font-medium">Editor ID:</span>
                  <span className="font-mono font-bold text-neutral-100 select-all">{createResult.editorId}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <span className="text-neutral-400 font-medium">Email:</span>
                  <span className="font-bold text-neutral-100 select-all">{createResult.email}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <span className="text-neutral-400 font-medium">Editor Key:</span>
                  <span className="font-mono font-bold text-neutral-100 select-all">{createResult.editorKey}</span>
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
                Create an editor account to generate temporary credentials.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Editors Table */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Loading editors...</div>
        ) : editors.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No editors found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-wider">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email / Phone</th>
                  <th className="p-4">Connection Key</th>
                  <th className="p-4">Assigned Users</th>
                  <th className="p-4">Assigned Projects</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {editors.map((e: any) => (
                  <tr key={e.id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-semibold text-black">
                      <Link href={`/admin/editors/${e.id}`} className="hover:underline">
                        {e.name || 'N/A'}
                      </Link>
                    </td>
                    <td className="p-4 space-y-0.5">
                      <div className="text-gray-900 font-medium">{e.email}</div>
                      {e.phoneNumber && <div className="text-xs text-gray-400">{e.phoneNumber}</div>}
                    </td>
                    <td className="p-4 font-mono text-xs font-semibold text-gray-700 bg-gray-50/50 rounded px-2 py-1 select-all">
                      {e.editorKey || 'N/A'}
                    </td>
                    <td className="p-4 text-gray-500 font-semibold">
                      {e.assignedUsersCount ?? 0} Clients
                    </td>
                    <td className="p-4 text-gray-500 font-semibold">
                      {e.assignedProjectsCount ?? 0} Projects
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        e.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' :
                        e.status === 'PAUSED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Link href={`/admin/editors/${e.id}`} className="text-neutral-600 hover:underline text-xs font-bold mr-2">View</Link>
                      {e.status === 'ACTIVE' ? (
                        <button onClick={() => handleAction(e.id, 'PAUSED')} className="text-amber-600 hover:underline text-xs font-bold">Pause</button>
                      ) : (
                        <button onClick={() => handleAction(e.id, 'ACTIVE')} className="text-green-600 hover:underline text-xs font-bold">Resume</button>
                      )}
                      {e.status !== 'STOPPED' && (
                        <button onClick={() => handleAction(e.id, 'STOPPED')} className="text-red-500 hover:underline text-xs font-bold">Stop</button>
                      )}
                      <button onClick={() => handleAction(e.id, 'RESET')} className="text-blue-600 hover:underline text-xs font-bold">Reset</button>
                      <button onClick={() => handleAction(e.id, 'DELETE')} className="text-red-700 hover:underline text-xs font-bold">Delete</button>
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
