'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminConnectionsApi, ConnectionDetails } from '@/lib/api';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function AdminConnectionsPage() {
  const [connections, setConnections] = useState<ConnectionDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchConnections = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminConnectionsApi.list();
      setConnections(res.connections || []);
    } catch {
      setError('Failed to retrieve editor connections list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleAction = async (id: string, action: 'DISCONNECT' | 'BLOCK' | 'RESTORE') => {
    if (!confirm(`Are you sure you want to perform this action: ${action.toLowerCase()} connection?`)) return;

    try {
      const res = await adminConnectionsApi.updateStatus(id, action);
      if (res.success) {
        fetchConnections();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Action failed.');
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-neutral-500" />
            Editor Connections
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage and audit secure relations between users and editors.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/admin/users" className="text-sm font-bold text-gray-600 hover:text-black">
            Manage Users
          </Link>
          <Link href="/admin/assignments" className="text-sm font-bold text-gray-600 hover:text-black">
            Manage Assignments
          </Link>
          <Link href="/admin/editors" className="text-sm font-bold text-gray-600 hover:text-black">
            Manage Editors
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm animate-fade-in">
          {error}
        </div>
      )}

      {/* Connections Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400 mb-2" />
            Loading connections...
          </div>
        ) : connections.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No connections found in the system.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-55 border-b border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-wider">
                  <th className="p-4">User</th>
                  <th className="p-4">Editor</th>
                  <th className="p-4">Auth Key</th>
                  <th className="p-4">Connected Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {connections.map((c) => {
                  const userName = c.user?.name || 'N/A';
                  const userEmail = c.user?.email || '';
                  const editorName = c.editor?.name || 'N/A';
                  const editorEmail = c.editor?.email || '';

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <div className="font-semibold text-black">{userName}</div>
                        <div className="text-xs text-gray-400">{userEmail}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-black">{editorName}</div>
                        <div className="text-xs text-gray-400">{editorEmail}</div>
                      </td>
                      <td className="p-4 font-mono text-xs font-semibold text-gray-700 select-all">
                        {c.editorKey}
                      </td>
                      <td className="p-4 text-gray-500 text-xs">
                        {new Date(c.connectedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          c.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-100' :
                          c.status === 'BLOCKED' ? 'bg-red-50 text-red-700 border border-red-100' :
                          'bg-neutral-100 text-neutral-500'
                        }`}>
                          {c.status === 'ACTIVE' ? 'Connected' : c.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {c.status === 'ACTIVE' ? (
                          <>
                            <button
                              onClick={() => handleAction(c.id, 'DISCONNECT')}
                              className="text-amber-600 hover:underline text-xs font-bold"
                            >
                              Disconnect
                            </button>
                            <button
                              onClick={() => handleAction(c.id, 'BLOCK')}
                              className="text-red-600 hover:underline text-xs font-bold"
                            >
                              Block
                            </button>
                          </>
                        ) : c.status === 'DISCONNECTED' ? (
                          <>
                            <button
                              onClick={() => handleAction(c.id, 'RESTORE')}
                              className="text-green-600 hover:underline text-xs font-bold"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handleAction(c.id, 'BLOCK')}
                              className="text-red-600 hover:underline text-xs font-bold"
                            >
                              Block
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleAction(c.id, 'RESTORE')}
                            className="text-green-600 hover:underline text-xs font-bold"
                          >
                            Unblock / Restore
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
