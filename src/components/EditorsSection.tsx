'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { editorsApi, ConnectionDetails, NotificationItem } from '@/lib/api';
import { Loader2, Users, KeyRound, Bell, ExternalLink, XCircle } from 'lucide-react';

export default function EditorsSection() {
  const [connections, setConnections] = useState<ConnectionDetails[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Connect form state
  const [editorKey, setEditorKey] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);

  // Modal detail view state
  const [selectedEditor, setSelectedEditor] = useState<ConnectionDetails | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [connRes, notifRes] = await Promise.all([
        editorsApi.myEditors(),
        editorsApi.getNotifications(),
      ]);
      setConnections(connRes.connections || []);
      setNotifications(notifRes.notifications || []);
    } catch {
      setError('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!editorKey.trim()) return;

    try {
      setConnectLoading(true);
      const res = await editorsApi.connect(editorKey.trim());
      if (res.success) {
        setSuccess(res.message || 'Connected successfully!');
        setEditorKey('');
        fetchData();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to connect editor.');
      }
    } finally {
      setConnectLoading(false);
    }
  };

  const handleDisconnect = async (editorId: string) => {
    setError('');
    setSuccess('');
    if (!confirm('Are you sure you want to disconnect this editor?')) return;

    try {
      const res = await editorsApi.disconnect({ editorId });
      if (res.success) {
        setSuccess('Editor disconnected successfully.');
        fetchData();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to disconnect editor.');
      }
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      const res = await editorsApi.markNotificationsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch {
      console.error('Failed to mark notifications as read.');
    }
  };

  if (loading && connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-3" />
        <p className="text-sm text-gray-500 font-sans">Loading editor dashboard...</p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8 relative pb-28 font-sans">
      {/* Header */}
      <div className="space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200/60 px-3 py-1 text-xs font-bold text-neutral-600">
          <Users className="h-3.5 w-3.5 text-neutral-500" />
          Editors
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-black">
          Editor Management
        </h1>
        <p className="text-sm text-neutral-500 max-w-2xl leading-relaxed">
          Securely link and manage connections with professional video editors using authorization keys.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm animate-fade-in">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm animate-fade-in">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Connect & List */}
        <div className="lg:col-span-8 space-y-8">
          {/* Connect Editor Card */}
          <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-lg text-black flex items-center gap-2">
              <KeyRound className="h-4.5 w-4.5 text-neutral-500" />
              Connect Video Editor
            </h3>
            <p className="text-xs text-neutral-400">
              Enter the unique key provided by your editor (e.g. <span className="font-mono bg-neutral-50 px-1 py-0.5 rounded text-neutral-600 font-bold">EDT-XXXXX-XXXXX</span>) to link your accounts.
            </p>

            <form onSubmit={handleConnect} className="flex gap-3 items-center">
              <Input
                value={editorKey}
                onChange={(e) => setEditorKey(e.target.value)}
                placeholder="Paste Editor Key"
                className="rounded-xl border-neutral-200 h-11 focus:border-black focus:ring-black text-sm max-w-md"
              />
              <Button
                type="submit"
                disabled={connectLoading}
                className="bg-black text-white hover:bg-neutral-800 rounded-xl h-11 px-5 text-sm font-semibold disabled:opacity-50"
              >
                {connectLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Connecting
                  </>
                ) : (
                  'Connect Editor'
                )}
              </Button>
            </form>
          </Card>

          {/* Editors List Card */}
          <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6">
            <h3 className="font-bold text-lg text-black border-b border-neutral-50 pb-3 mb-4">
              My Editors
            </h3>

            {connections.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 text-sm">
                No connected editors found. Invite an editor or paste their key above to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-50 text-neutral-400 font-bold text-[10px] uppercase tracking-wider">
                      <th className="pb-3 pl-1">Name</th>
                      <th className="pb-3">Editor Key</th>
                      <th className="pb-3">Connected Date</th>
                      <th className="pb-3 text-center">Active Jobs</th>
                      <th className="pb-3">Availability</th>
                      <th className="pb-3 text-right pr-1">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {connections.map((c) => {
                      const editor = c.editor;
                      const profile = editor?.editorProfile;
                      const displayName = profile?.displayName || editor?.name || 'N/A';
                      const availability = profile?.availability || 'OFFLINE';
                      const keyString = c.connectionCode || profile?.editorKey || 'N/A';
                      const activeJobsCount = c.workload ?? 0;

                      return (
                        <tr key={c.id} className="hover:bg-neutral-50/30 group">
                          <td className="py-4 pl-1">
                            <div>
                              <button
                                onClick={() => setSelectedEditor(c)}
                                className="font-bold text-xs text-neutral-900 hover:underline text-left inline-flex items-center gap-1 leading-tight"
                              >
                                {displayName}
                                <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
                              </button>
                              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{editor?.email}</p>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="font-mono text-[10px] font-bold text-neutral-600 bg-neutral-50 border border-neutral-200/50 px-2 py-0.5 rounded">
                              {keyString}
                            </span>
                          </td>
                          <td className="py-4 text-xs font-bold text-neutral-600">
                            {new Date(c.connectedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-4 text-center">
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              activeJobsCount > 0 
                                ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                : 'bg-neutral-50 text-neutral-400 border border-neutral-100'
                            }`}>
                              {activeJobsCount} Active
                            </span>
                          </td>
                          <td className="py-4">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${
                                availability === 'AVAILABLE' ? 'bg-green-500 animate-pulse' :
                                availability === 'BUSY' ? 'bg-amber-500' :
                                'bg-neutral-300'
                              }`} />
                              <span className="text-xs font-bold text-neutral-600 capitalize">
                                {availability.toLowerCase()}
                              </span>
                            </span>
                          </td>
                          <td className="py-4 text-right pr-1">
                            {c.status === 'ACTIVE' && (
                              <button
                                onClick={() => handleDisconnect(c.editorId)}
                                className="text-red-500 hover:text-red-700 font-bold text-xs hover:underline"
                              >
                                Disconnect
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
          </Card>
        </div>

        {/* Right Side: Notifications & Activity */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-50 pb-3">
              <h3 className="font-bold text-base text-black flex items-center gap-2">
                <Bell className="h-4.5 w-4.5 text-neutral-500" />
                Inbox
                {unreadCount > 0 && (
                  <span className="bg-neutral-900 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                    {unreadCount}
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkNotificationsRead}
                  className="text-xs font-semibold text-neutral-400 hover:text-black transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-neutral-400 text-xs font-medium">
                  Inbox is empty.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      n.read
                        ? 'bg-neutral-50/50 border-neutral-100 text-neutral-500'
                        : 'bg-white border-neutral-200 text-black shadow-xs font-medium'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold">{n.title}</span>
                      <span className="text-[10px] text-neutral-400">
                        {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="leading-relaxed text-neutral-600">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Editor Details Modal */}
      {selectedEditor && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-250">
          <Card className="w-full max-w-md rounded-3xl border border-neutral-100 shadow-2xl bg-white overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-250">
            <div className="flex justify-between items-start border-b border-neutral-50 pb-3">
              <div>
                <h3 className="text-xl font-bold text-black">
                  {selectedEditor.editor?.editorProfile?.displayName || selectedEditor.editor?.name || 'Editor Profile'}
                </h3>
                <p className="text-xs text-neutral-400">{selectedEditor.editor?.email}</p>
              </div>
              <button
                onClick={() => setSelectedEditor(null)}
                className="text-neutral-400 hover:text-black transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Bio</span>
                <p className="text-neutral-700 leading-relaxed mt-1 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                  {selectedEditor.editor?.editorProfile?.bio || 'No bio provided.'}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Skills</span>
                {selectedEditor.editor?.editorProfile?.skills && selectedEditor.editor.editorProfile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {selectedEditor.editor.editorProfile.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="bg-neutral-100 text-neutral-800 text-[10px] font-bold px-2 py-0.5 rounded border border-neutral-200/50"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-400 mt-1 italic">No skills listed.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-neutral-50 pt-4">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Connected Since</span>
                  <span className="text-neutral-700 font-bold block mt-0.5">
                    {new Date(selectedEditor.connectedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Availability</span>
                  <span className="inline-flex items-center gap-1.5 mt-1">
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      selectedEditor.editor?.editorProfile?.availability === 'AVAILABLE' ? 'bg-green-500 animate-pulse' :
                      selectedEditor.editor?.editorProfile?.availability === 'BUSY' ? 'bg-amber-500' :
                      'bg-neutral-300'
                    }`} />
                    <span className="font-bold text-neutral-700 capitalize">
                      {(selectedEditor.editor?.editorProfile?.availability || 'OFFLINE').toLowerCase()}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
