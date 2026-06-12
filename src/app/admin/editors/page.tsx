'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EditorItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  editorKey: string | null;
}

export default function AdminEditorsPage() {
  const [editors, setEditors] = useState<EditorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create editor form state
  const [form, setForm] = useState({ fullName: '', email: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState<{ email: string; temporaryPassword?: string; editorKey?: string } | null>(null);

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
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateResult({
          email: data.editor.email,
          temporaryPassword: data.editor.temporaryPassword,
          editorKey: data.editor.editorKey,
        });
        setForm({ fullName: '', email: '' });
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
          alert(`Temporary password generated: ${data.temporaryPassword}`);
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black">Editor Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage content editors and authorization keys.</p>
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
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Create Editor Section */}
      <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-black">Create Editor</h2>
        <form onSubmit={handleCreateEditor} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Full Name</label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="e.g. Alex Smith"
              className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-black"
            />
          </div>
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Email Address</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="e.g. alex@example.com"
              className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-black"
            />
          </div>
          <button
            type="submit"
            disabled={createLoading}
            className="bg-black text-white hover:bg-neutral-800 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {createLoading ? 'Creating...' : 'Create Editor'}
          </button>
        </form>

        {createResult && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm space-y-1.5 animate-in fade-in duration-300">
            <p className="font-bold">Editor created successfully!</p>
            <p>Email: <span className="font-semibold">{createResult.email}</span></p>
            <p>Editor Key: <span className="font-mono bg-white px-2 py-0.5 rounded border font-bold text-black select-all">{createResult.editorKey}</span></p>
            <p>Temporary Password: <span className="font-mono bg-white px-2 py-0.5 rounded border font-bold text-black select-all">{createResult.temporaryPassword}</span></p>
            <p className="text-xs text-amber-600">Please share this temporary password and editor key with the editor. They will be forced to change it on their next login.</p>
          </div>
        )}
      </div>

      {/* Editors Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
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
                  <th className="p-4">Email</th>
                  <th className="p-4">Editor Key</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {editors.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-semibold text-black">
                      <Link href={`/admin/editors/${e.id}`} className="hover:underline">
                        {e.name || 'N/A'}
                      </Link>
                    </td>
                    <td className="p-4 text-gray-500">{e.email}</td>
                    <td className="p-4 font-mono text-xs font-semibold text-gray-700 bg-gray-50/50 rounded px-2 py-1 select-all">{e.editorKey}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        e.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
                        e.status === 'PAUSED' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
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
