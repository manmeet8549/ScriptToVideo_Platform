'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, Users, Check, X, Copy, KeyRound, AlertCircle, RefreshCw, 
  Search, Calendar, Mail, FileVideo, Shield, Info, ArrowUpRight 
} from 'lucide-react';

interface ConnectionItem {
  id: string;
  userId: string;
  editorId: string;
  connectionCode: string;
  status: 'ACTIVE' | 'DISCONNECTED' | 'BLOCKED';
  createdAt: string;
  connectedAt: string;
  disconnectedAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  activeProjects: number;
}

interface VideoAssignment {
  id: string;
  status: string;
  progress: number;
  createdAt: string;
  video: {
    title: string;
  };
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [editorKey, setEditorKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [selectedClient, setSelectedClient] = useState<ConnectionItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const [projectsClient, setProjectsClient] = useState<ConnectionItem | null>(null);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [clientProjects, setClientProjects] = useState<VideoAssignment[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      // Get connections
      const connRes = await fetch('/api/editors/my-users');
      if (!connRes.ok) throw new Error('Failed to load connections.');
      const connData = await connRes.json();
      setConnections(connData.connections || []);

      // Get profile for key
      const profileRes = await fetch('/api/editors/profile');
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setEditorKey(profileData.profile?.editorKey || '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve connection details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDisconnect = async (connectionId: string, clientName: string) => {
    if (!confirm(`Are you sure you want to disconnect ${clientName}? You will no longer receive assignments from them.`)) return;
    setActionLoading(connectionId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/editors/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || 'Disconnected successfully.');
        fetchData();
        if (showDetailsModal && selectedClient?.id === connectionId) {
          setShowDetailsModal(false);
        }
      } else {
        setError(data.error || 'Failed to disconnect.');
      }
    } catch {
      setError('An error occurred disconnecting connection.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyKey = () => {
    if (!editorKey) return;
    navigator.clipboard.writeText(editorKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openProjectsModal = async (client: ConnectionItem) => {
    setProjectsClient(client);
    setShowProjectsModal(true);
    setProjectsLoading(true);
    try {
      const res = await fetch('/api/assignments/editor');
      if (res.ok) {
        const data = await res.json();
        const allAssignments: VideoAssignment[] = data.assignments || [];
        // Filter by userId of client
        const filtered = allAssignments.filter((a: any) => a.userId === client.userId);
        setClientProjects(filtered);
      }
    } catch (err) {
      console.error('Error fetching client projects:', err);
    } finally {
      setProjectsLoading(false);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  // Filter connections by search query
  const filteredConnections = connections.filter((c) => {
    const name = c.user.name?.toLowerCase() || '';
    const email = c.user.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center pb-5 border-b border-gray-100">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-800 border border-neutral-200/55">
            <Users className="h-3.5 w-3.5 text-neutral-500" />
            Workspace
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 mt-2">
            Connections
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Review linked creator accounts, inspect active assignments, and manage your incoming pipeline.
          </p>
        </div>
        <button 
          onClick={fetchData}
          className="p-2.5 text-gray-500 hover:text-black hover:bg-neutral-50 rounded-xl transition-all border border-gray-150 bg-white"
          title="Refresh Data"
        >
          <RefreshCw className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Share Key Widget */}
      <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs">
        <CardContent className="p-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-neutral-800 flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-neutral-500" />
              My Connection Key
            </h3>
            <p className="text-xs text-neutral-400">
              Share this key with creators. They can enter it in their dashboard to instantly establish an active connection.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {loading ? (
              <div className="h-11 w-48 bg-neutral-100 rounded-xl animate-pulse" />
            ) : (
              <div className="flex bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden w-full sm:w-auto items-center">
                <span className="font-mono text-xs font-bold text-neutral-600 px-4 py-3 select-all">
                  {editorKey || 'NO_KEY_GENERATED'}
                </span>
                <button
                  onClick={handleCopyKey}
                  className="bg-black hover:bg-neutral-800 text-white px-4 py-3 text-xs font-bold transition-colors border-l border-neutral-200 flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connection Management Table/Grid */}
      <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs overflow-hidden">
        <CardContent className="p-0 space-y-6">
          {/* Top filter section */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between border-b border-gray-50 pb-4">
            <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
              Connected Creators
              <span className="bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded-full text-xs font-bold border border-neutral-200/50">
                {connections.length}
              </span>
            </h2>
            <div className="relative w-full sm:w-72">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="pl-10 pr-4 py-2 w-full rounded-xl border border-neutral-200 text-xs font-medium focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-sm font-medium">
              {searchQuery ? 'No creators found matching your search query.' : 'No active connected creators.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
                    <th className="pb-3 pl-1">Creator / User</th>
                    <th className="pb-3">Connected Since</th>
                    <th className="pb-3 text-center">Active Projects</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-1">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredConnections.map((c) => (
                    <tr key={c.id} className="group hover:bg-neutral-50/50 transition-colors">
                      <td className="py-4 pl-1">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-xs font-bold">
                            {getInitials(c.user.name, c.user.email)}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-neutral-900 leading-tight">
                              {c.user.name || 'Anonymous User'}
                            </p>
                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                              {c.user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-xs font-bold text-neutral-600">
                        {new Date(c.connectedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`inline-flex items-center justify-center h-6 px-2.5 rounded-full text-xs font-bold ${
                          c.activeProjects > 0 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                            : 'bg-neutral-50 text-neutral-400 border border-neutral-100'
                        }`}>
                          {c.activeProjects} Active
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50/80 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {c.status}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-1">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedClient(c);
                              setShowDetailsModal(true);
                            }}
                            className="h-8 px-2.5 rounded-lg text-xs font-bold border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                          >
                            Details
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => openProjectsModal(c)}
                            className="h-8 px-2.5 rounded-lg text-xs font-bold border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                          >
                            Projects
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleDisconnect(c.id, c.user.name || c.user.email)}
                            disabled={actionLoading === c.id}
                            className="h-8 px-2.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 border-none shadow-none"
                          >
                            {actionLoading === c.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : 'Disconnect'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      {showDetailsModal && selectedClient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-neutral-100 shadow-2xl p-6 w-full max-w-md space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowDetailsModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-neutral-50 text-gray-400 hover:text-black transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-sm font-bold">
                  {getInitials(selectedClient.user.name, selectedClient.user.email)}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-neutral-900 leading-tight">
                    {selectedClient.user.name || 'Anonymous Creator'}
                  </h3>
                  <p className="text-xs text-gray-400 font-semibold mt-0.5 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {selectedClient.user.email}
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-400 font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    Connected Date
                  </span>
                  <span className="font-bold text-neutral-800">
                    {new Date(selectedClient.connectedAt).toLocaleDateString(undefined, {
                      dateStyle: 'medium'
                    })}
                  </span>
                </div>

                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-400 font-semibold flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-gray-400" />
                    Connection Code Used
                  </span>
                  <span className="font-mono font-bold text-neutral-700 bg-neutral-50 border border-neutral-200/50 px-2 py-0.5 rounded text-[10px]">
                    {selectedClient.connectionCode}
                  </span>
                </div>

                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-400 font-semibold flex items-center gap-1.5">
                    <FileVideo className="h-3.5 w-3.5 text-gray-400" />
                    Active assignments
                  </span>
                  <span className="font-bold text-neutral-800">
                    {selectedClient.activeProjects}
                  </span>
                </div>

                <div className="flex justify-between items-center py-0.5">
                  <span className="text-gray-400 font-semibold flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-gray-400" />
                    Current Link status
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {selectedClient.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetailsModal(false);
                  openProjectsModal(selectedClient);
                }}
                className="flex-1 h-10 rounded-xl text-xs font-bold border-neutral-250 hover:bg-neutral-50 text-neutral-800 flex items-center justify-center gap-1.5"
              >
                <FileVideo className="h-4 w-4" />
                View Projects
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDisconnect(selectedClient.id, selectedClient.user.name || selectedClient.user.email)}
                disabled={actionLoading === selectedClient.id}
                className="flex-1 h-10 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 border-none shadow-none"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Projects Modal */}
      {showProjectsModal && projectsClient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-neutral-100 shadow-2xl p-6 w-full max-w-xl space-y-6 relative animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <button 
              onClick={() => {
                setShowProjectsModal(false);
                setClientProjects([]);
              }}
              className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-neutral-50 text-gray-400 hover:text-black transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-neutral-900 leading-tight">
                Projects: {projectsClient.user.name || 'Anonymous Creator'}
              </h3>
              <p className="text-xs text-gray-400 font-semibold">
                Showing assigned editing assignments from this creator.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[200px] pr-1">
              {projectsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                </div>
              ) : clientProjects.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs font-semibold">
                  No projects have been assigned to you by this creator yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {clientProjects.map((p) => (
                    <div 
                      key={p.id}
                      className="p-4 border border-neutral-100 hover:border-neutral-200 bg-white rounded-2xl flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-xs text-neutral-900 leading-tight">
                          {p.video.title}
                        </p>
                        <p className="text-[10px] text-gray-400 font-semibold flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          Assigned on {new Date(p.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                          p.status === 'COMPLETED' || p.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                          {p.status}
                        </span>
                        
                        <span className="text-[10px] font-bold text-gray-500">
                          {p.progress}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-50 flex justify-end">
              <Button
                onClick={() => {
                  setShowProjectsModal(false);
                  setClientProjects([]);
                }}
                className="bg-black text-white hover:bg-neutral-800 rounded-xl px-5 h-10 text-xs font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
