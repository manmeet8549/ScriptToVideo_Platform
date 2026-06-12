'use client';

import { useState, useEffect } from 'react';
import { History, Search, FileCode } from 'lucide-react';

interface ActivityLog {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  targetUserId: string | null;
  targetUserName: string | null;
  targetUserEmail: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/activity');
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
      } else {
        setError(data.error || 'Failed to load activity logs.');
      }
    } catch {
      setError('An error occurred while fetching activity logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const term = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.actorName.toLowerCase().includes(term) ||
      log.actorEmail.toLowerCase().includes(term) ||
      (log.targetUserName || '').toLowerCase().includes(term) ||
      (log.targetUserEmail || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Title */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black">System Audit Log</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time security auditing and configuration state logs across SCRIPT-AI.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-white border border-gray-100 p-4 rounded-2xl shadow-xs">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Filter by action, actor, or target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-black"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold bg-neutral-50 px-3 py-1.5 rounded-lg border">
          <History className="h-3.5 w-3.5 text-black" />
          <span>Real-time Event Stream</span>
        </div>
      </div>

      {/* Audit Log Timeline */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-6">
        {loading && logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm animate-pulse">Loading system events...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No matching audit events recorded.</div>
        ) : (
          <div className="relative pl-6 border-l border-gray-100 space-y-6">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div key={log.id} className="relative space-y-2">
                  {/* Timeline point */}
                  <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white border border-gray-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-black" />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 text-xs">
                    <div className="space-y-1">
                      <p className="font-bold text-black text-sm">
                        {log.action}
                      </p>
                      <p className="text-gray-500">
                        Actor: <span className="font-semibold text-black">{log.actorName}</span>{' '}
                        <span className="text-gray-400">({log.actorRole})</span>
                        {log.targetUserName && (
                          <>
                            {' '}
                            &rarr; Target:{' '}
                            <span className="font-semibold text-black">{log.targetUserName}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 font-semibold shrink-0 sm:pt-1">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {log.metadata && (
                    <div className="pt-1">
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-500 hover:text-black transition-colors"
                      >
                        <FileCode className="h-3.5 w-3.5" />
                        {isExpanded ? 'Hide Event Context' : 'View Event Context'}
                      </button>

                      {isExpanded && (
                        <pre className="mt-2 p-3 bg-neutral-900 text-neutral-300 font-mono text-[10px] rounded-xl overflow-x-auto border border-neutral-800 leading-normal max-h-48">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
