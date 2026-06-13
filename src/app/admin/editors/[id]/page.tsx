'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';

interface EditorDetails {
  editor: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    status: string;
    createdAt: string;
    lastLoginAt: string | null;
    editorKey: string | null;
  };
  assignedProjects: Array<{
    id: string;
    name: string;
    status: string;
    assignedAt: string;
  }>;
  completedProjects: Array<{
    id: string;
    name: string;
    completedAt: string;
  }>;
}

export default function EditorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [details, setDetails] = useState<EditorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/editors/${id}`);
        const data = await res.json();
        if (res.ok) {
          setDetails(data);
        } else {
          setError(data.error || 'Failed to load editor details.');
        }
      } catch {
        setError('An error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-gray-500 font-sans">Loading editor details...</div>;
  }

  if (error || !details) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-4 font-sans">
        <Link href="/admin/editors" className="text-sm font-bold text-gray-600 hover:text-black">&larr; Back to List</Link>
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error || 'Editor details not found.'}</div>
      </div>
    );
  }

  const { editor, assignedProjects, completedProjects } = details;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <Link href="/admin/editors" className="text-xs font-bold text-gray-400 hover:text-black block mb-1">&larr; BACK TO EDITORS</Link>
          <h1 className="text-3xl font-extrabold text-black">{editor.name || 'Editor Details'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{editor.email}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
          editor.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
          editor.status === 'PAUSED' ? 'bg-amber-50 text-amber-700' :
          'bg-red-50 text-red-700'
        }`}>
          Status: {editor.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4 md:col-span-1 text-sm">
          <h2 className="text-lg font-bold text-black border-b pb-2">Editor Profile</h2>
          <div className="space-y-3">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Editor Key</span>
              <span className="font-mono bg-gray-50 text-gray-800 px-2 py-0.5 rounded border border-gray-100 font-bold block select-all mt-0.5 text-xs truncate">{editor.editorKey || 'None'}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Created Date</span>
              <span className="text-gray-700">{new Date(editor.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Last Login</span>
              <span className="text-gray-700">{editor.lastLoginAt ? new Date(editor.lastLoginAt).toLocaleString() : 'Never'}</span>
            </div>
          </div>
        </div>

        {/* Assignments Cards */}
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-base font-bold text-black border-b pb-2">Assigned Projects ({assignedProjects.length})</h3>
            {assignedProjects.length === 0 ? (
              <p className="text-sm text-gray-400">No active project assignments found.</p>
            ) : (
              <div className="divide-y max-h-60 overflow-y-auto">
                {assignedProjects.map((p) => (
                  <div key={p.id} className="py-2 flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-800">{p.name}</span>
                    <span className="text-xs text-gray-400">Assigned: {new Date(p.assignedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-base font-bold text-black border-b pb-2">Completed Projects ({completedProjects.length})</h3>
            {completedProjects.length === 0 ? (
              <p className="text-sm text-gray-400">No completed project assignments found.</p>
            ) : (
              <div className="divide-y max-h-60 overflow-y-auto">
                {completedProjects.map((p) => (
                  <div key={p.id} className="py-2 flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-800">{p.name}</span>
                    <span className="text-xs text-gray-400">Completed: {new Date(p.completedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
