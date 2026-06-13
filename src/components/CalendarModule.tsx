'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Plus, 
  Trash2, Edit, AlertCircle, CheckCircle2, Loader2, Info, User,
  CalendarDays, Tag, Shield, Check
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UserSelectOption {
  id: string;
  name: string | null;
  email: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  type: 'MEETING' | 'TASK' | 'DEADLINE' | 'DELIVERY' | 'REVIEW' | 'ASSIGNMENT';
  startDate: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  userId: string | null;
  editorId: string | null;
  user?: UserSelectOption | null;
  editor?: UserSelectOption | null;
  createdAt: string;
}

export default function CalendarModule({ role }: { role: 'ADMIN' | 'USER' | 'EDITOR' }) {
  const { data: session } = useSession();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

  // Dropdown lists for Admins
  const [usersList, setUsersList] = useState<UserSelectOption[]>([]);
  const [editorsList, setEditorsList] = useState<UserSelectOption[]>([]);

  // Modals / Event creation states
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form states
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'TASK',
    startDate: '',
    startTime: '09:00',
    dueDate: '',
    dueTime: '18:00',
    priority: 'MEDIUM',
    status: 'PENDING',
    userId: '',
    editorId: '',
  });

  // Filter states
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  const isAdmin = role === 'ADMIN';

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/calendar');
      const data = await res.json();
      if (res.ok) {
        setEvents(data.events || []);
      } else {
        setError(data.error || 'Failed to load events.');
      }
    } catch (err) {
      setError('Error connecting to the server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminDropdowns = async () => {
    if (!isAdmin) return;
    try {
      const [uRes, eRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/editors'),
      ]);
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsersList(uData.users || []);
      }
      if (eRes.ok) {
        const eData = await eRes.json();
        setEditorsList(eData.editors || []);
      }
    } catch (err) {
      console.error('[CALENDAR_DROPDOWNS] Failed to fetch lists:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchAdminDropdowns();
  }, [role]);

  const handleOpenCreateModal = () => {
    setSelectedEvent(null);
    setIsEditMode(false);
    setForm({
      title: '',
      description: '',
      type: 'TASK',
      startDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '18:00',
      priority: 'MEDIUM',
      status: 'PENDING',
      userId: '',
      editorId: '',
    });
    setIsOpenModal(true);
  };

  const handleOpenDetailModal = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditMode(false);
    setForm({
      title: event.title,
      description: event.description || '',
      type: event.type,
      startDate: event.startDate.split('T')[0],
      startTime: new Date(event.startDate).toTimeString().substring(0, 5),
      dueDate: event.dueDate.split('T')[0],
      dueTime: new Date(event.dueDate).toTimeString().substring(0, 5),
      priority: event.priority,
      status: event.status,
      userId: event.userId || '',
      editorId: event.editorId || '',
    });
    setIsOpenModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);

    const startDateTime = new Date(`${form.startDate}T${form.startTime}:00`);
    const dueDateTime = new Date(`${form.dueDate}T${form.dueTime}:00`);

    const payload = {
      id: selectedEvent?.id,
      title: form.title,
      description: form.description,
      type: form.type,
      startDate: startDateTime.toISOString(),
      dueDate: dueDateTime.toISOString(),
      priority: form.priority,
      status: form.status,
      userId: form.userId || null,
      editorId: form.editorId || null,
    };

    try {
      const method = selectedEvent ? 'PATCH' : 'POST';
      const res = await fetch('/api/calendar', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setIsOpenModal(false);
        fetchEvents();
      } else {
        setError(data.error || 'Failed to save event.');
      }
    } catch {
      setError('An error occurred while saving.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setError('');
    try {
      const res = await fetch('/api/calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        if (selectedEvent) {
          setSelectedEvent(prev => prev ? { ...prev, status: newStatus as any } : null);
        }
        fetchEvents();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update status.');
      }
    } catch {
      setError('Failed to update status.');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    setError('');
    try {
      const res = await fetch(`/api/calendar?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsOpenModal(false);
        fetchEvents();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete event.');
      }
    } catch {
      setError('Failed to delete event.');
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'MEETING': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'TASK': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'DEADLINE': return 'bg-red-50 text-red-700 border-red-100';
      case 'DELIVERY': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'REVIEW': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'ASSIGNMENT': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-amber-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-250';
      case 'IN_PROGRESS': return 'bg-blue-50 text-blue-700 border-blue-250';
      case 'CANCELLED': return 'bg-neutral-100 text-neutral-500 border-neutral-250';
      default: return 'bg-amber-50 text-amber-700 border-amber-250';
    }
  };

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (filterType !== 'ALL' && e.type !== filterType) return false;
    if (filterPriority !== 'ALL' && e.priority !== filterPriority) return false;
    return true;
  });

  // Month Grid Calculation
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const blanks = Array(firstDay).fill(null);
  const daysNum = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const gridCells = [...blanks, ...daysNum];

  return (
    <div className="space-y-6 font-sans">
      {/* Header Area */}
      <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-black font-sans flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-neutral-900" />
            {isAdmin ? 'Operations Calendar' : 'My Schedule'}
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            {isAdmin 
              ? 'Schedule, assign, and track operations events, script reviews, and delivery deadlines.' 
              : 'View tasks, deadlines, and meetings assigned to you.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              onClick={handleOpenCreateModal}
              className="rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-bold px-4 py-2.5 cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Schedule Event
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-150 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Filters + Month Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar Filters */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs">
            <CardContent className="p-0 space-y-6">
              <h3 className="font-bold text-sm text-black uppercase tracking-wider">Filters</h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Event Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-gray-150 bg-white"
                  >
                    <option value="ALL">All Types</option>
                    <option value="MEETING">Meeting Requests</option>
                    <option value="TASK">Task Requests</option>
                    <option value="DEADLINE">Deadlines</option>
                    <option value="DELIVERY">Video Deliveries</option>
                    <option value="REVIEW">Script Reviews</option>
                    <option value="ASSIGNMENT">Editor Assignments</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Priority</label>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-gray-150 bg-white"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-xs font-semibold">
                <span className="text-gray-400">Total Matches</span>
                <span className="bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded-md font-bold">{filteredEvents.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Priority Color Legend */}
          <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs text-xs space-y-4">
            <h4 className="font-bold text-black uppercase tracking-wider">Legend</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-lg bg-red-500" />
                <span className="font-semibold text-gray-600">Critical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-lg bg-orange-500" />
                <span className="font-semibold text-gray-600">High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-lg bg-amber-500" />
                <span className="font-semibold text-gray-600">Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-lg bg-blue-500" />
                <span className="font-semibold text-gray-600">Low</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Calendar Main Board */}
        <div className="lg:col-span-9">
          <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs">
            {/* Calendar Controls */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black font-sans text-neutral-900">
                  {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex items-center border border-gray-150 rounded-xl overflow-hidden shadow-2xs bg-white">
                  <button onClick={prevMonth} className="p-2 hover:bg-neutral-50 border-r border-gray-150 transition-colors cursor-pointer">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={nextMonth} className="p-2 hover:bg-neutral-50 transition-colors cursor-pointer">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex border border-gray-150 rounded-xl overflow-hidden bg-white text-xs font-bold">
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-4 py-2 transition-all cursor-pointer border-r border-gray-150 ${viewMode === 'month' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:text-black'}`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 transition-all cursor-pointer ${viewMode === 'list' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:text-black'}`}
                >
                  List View
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-24 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="text-xs text-gray-500 font-semibold">Loading schedule...</span>
              </div>
            ) : viewMode === 'month' ? (
              <div className="grid grid-cols-7 gap-1 border border-gray-100 rounded-2xl overflow-hidden bg-gray-50">
                {/* Day Titles */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="bg-neutral-50/80 py-2.5 text-center text-xs font-extrabold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    {d}
                  </div>
                ))}

                {gridCells.map((dayNum, idx) => {
                  if (dayNum === null) {
                    return <div key={`blank-${idx}`} className="bg-gray-100/10 min-h-[110px] border-r border-b border-gray-100 last:border-r-0" />;
                  }

                  const dayEvents = filteredEvents.filter(e => {
                    const start = new Date(e.startDate);
                    return start.getDate() === dayNum && start.getMonth() === currentDate.getMonth() && start.getFullYear() === currentDate.getFullYear();
                  });

                  const isToday = new Date().getDate() === dayNum && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

                  return (
                    <div 
                      key={`day-${dayNum}`} 
                      className={`min-h-[115px] p-1.5 border-r border-b border-gray-100 flex flex-col justify-between relative group hover:bg-neutral-50/50 transition-colors ${isToday ? 'bg-indigo-50/10' : 'bg-white'}`}
                    >
                      <span className={`text-[10px] font-black self-end ${isToday ? 'bg-black text-white px-2 py-0.5 rounded-full' : 'text-gray-400'}`}>
                        {dayNum}
                      </span>
                      
                      {/* Render Day Events */}
                      <div className="flex-1 overflow-y-auto space-y-1 mt-1 scrollbar-thin">
                        {dayEvents.map(event => (
                          <div
                            key={event.id}
                            onClick={() => handleOpenDetailModal(event)}
                            className={`p-1 text-[9px] border rounded-lg font-bold truncate cursor-pointer transition-all flex items-center gap-1 ${getTypeColor(event.type)} hover:shadow-2xs`}
                            title={event.title}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${getPriorityColor(event.priority)}`} />
                            <span className="truncate flex-1">{event.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // List View
              <div className="border border-gray-100 rounded-3xl overflow-hidden divide-y divide-gray-50 bg-white">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map(event => (
                    <div 
                      key={event.id}
                      onClick={() => handleOpenDetailModal(event)}
                      className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-neutral-50/50 transition-colors cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${getPriorityColor(event.priority)}`} />
                        <div>
                          <p className="font-extrabold text-black">{event.title}</p>
                          <div className="flex flex-wrap items-center gap-2.5 mt-1 text-[10px] text-gray-400 font-semibold">
                            <span className={`px-2 py-0.5 border rounded-md uppercase font-bold text-[9px] ${getTypeColor(event.type)}`}>
                              {event.type}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(event.startDate).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                            {(event.user || event.editor) && (
                              <span>•</span>
                            )}
                            {event.user && (
                              <span className="bg-neutral-100 text-neutral-800 px-1.5 py-0.5 rounded-md font-bold">Client: {event.user.name || event.user.email}</span>
                            )}
                            {event.editor && (
                              <span className="bg-neutral-150 text-neutral-800 px-1.5 py-0.5 rounded-md font-bold">Editor: {event.editor.name || event.editor.email}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 border rounded-full text-[9px] font-extrabold tracking-wider uppercase ${getStatusBadge(event.status)}`}>
                          {event.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-gray-400 font-semibold">
                    No calendar events scheduled.
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Detail / Edit Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-neutral-150 shadow-2xl p-6 max-w-lg w-full relative animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            
            <div className="flex justify-between items-start border-b pb-4 mb-4">
              <div>
                <h3 className="text-lg font-black text-black">
                  {selectedEvent ? (isEditMode ? 'Edit Event' : 'Event Details') : 'Schedule Operations Event'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedEvent ? 'View or modify schedule details.' : 'Create an event and assign users/editors.'}
                </p>
              </div>
              <button onClick={() => setIsOpenModal(false)} className="text-gray-400 hover:text-black font-bold text-lg select-none">&times;</button>
            </div>

            {selectedEvent && !isEditMode ? (
              // Display Mode
              <div className="space-y-6 text-xs">
                
                {/* Event Header Block */}
                <div className="p-4 bg-gray-50 border rounded-2xl flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className={`px-2 py-0.5 border rounded-md uppercase font-bold text-[9px] ${getTypeColor(selectedEvent.type)}`}>
                      {selectedEvent.type}
                    </span>
                    <h4 className="text-sm font-black text-black mt-1.5">{selectedEvent.title}</h4>
                    <p className="text-gray-500 font-medium leading-relaxed">{selectedEvent.description || 'No description provided.'}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full border text-[9px] font-extrabold tracking-wider uppercase ${getStatusBadge(selectedEvent.status)}`}>
                    {selectedEvent.status}
                  </span>
                </div>

                {/* Details list */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Start Date/Time</span>
                    <span className="font-extrabold text-black block">{new Date(selectedEvent.startDate).toLocaleString()}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Due Date/Time</span>
                    <span className="font-extrabold text-black block">{new Date(selectedEvent.dueDate).toLocaleString()}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Priority</span>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${getPriorityColor(selectedEvent.priority)}`}>
                      {selectedEvent.priority}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Assigned User</span>
                    <span className="font-extrabold text-black block">
                      {selectedEvent.user ? `${selectedEvent.user.name || 'N/A'} (${selectedEvent.user.email})` : 'None'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Editor</span>
                    <span className="font-extrabold text-black block">
                      {selectedEvent.editor ? `${selectedEvent.editor.name || 'N/A'} (${selectedEvent.editor.email})` : 'None'}
                    </span>
                  </div>
                </div>

                {/* Actions Block */}
                <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-2 justify-between items-center">
                  
                  {/* Status Toggle for Assignees/Admins */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Update Status:</span>
                    <div className="flex gap-1">
                      {['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdateStatus(selectedEvent.id, st)}
                          className={`px-2 py-1 rounded-lg border text-[9px] font-bold transition-all ${
                            selectedEvent.status === st 
                              ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs' 
                              : 'bg-white hover:bg-neutral-50 text-gray-500'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    {isAdmin && (
                      <>
                        <Button
                          onClick={() => setIsEditMode(true)}
                          className="rounded-xl border border-gray-150 bg-white hover:bg-neutral-50 text-gray-600 font-bold px-3.5 py-2"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteEvent(selectedEvent.id)}
                          className="rounded-xl border border-rose-150 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold px-3.5 py-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>

                </div>

              </div>
            ) : (
              // Form Edit/Create Mode
              <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Event Title</label>
                    <Input
                      required
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Q3 Sync Review"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Description</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Details/notes about this schedule item..."
                      className="w-full min-h-[60px] border border-gray-200 focus:outline-none focus:border-black rounded-xl p-2.5"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Event Type</label>
                    <select
                      value={form.type}
                      onChange={e => setForm({ ...form, type: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-150 bg-white"
                    >
                      <option value="MEETING">Meeting Request</option>
                      <option value="TASK">Task Request</option>
                      <option value="DEADLINE">Deadline Request</option>
                      <option value="DELIVERY">Video Delivery Request</option>
                      <option value="REVIEW">Script Review Request</option>
                      <option value="ASSIGNMENT">Editor Assignment Request</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Priority</label>
                    <select
                      value={form.priority}
                      onChange={e => setForm({ ...form, priority: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-150 bg-white"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Start Date</label>
                    <Input
                      type="date"
                      required
                      value={form.startDate}
                      onChange={e => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Start Time</label>
                    <Input
                      type="time"
                      required
                      value={form.startTime}
                      onChange={e => setForm({ ...form, startTime: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Due Date</label>
                    <Input
                      type="date"
                      required
                      value={form.dueDate}
                      onChange={e => setForm({ ...form, dueDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Due Time</label>
                    <Input
                      type="time"
                      required
                      value={form.dueTime}
                      onChange={e => setForm({ ...form, dueTime: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Assign Client (User)</label>
                    <select
                      value={form.userId}
                      onChange={e => setForm({ ...form, userId: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-150 bg-white"
                    >
                      <option value="">-- No User --</option>
                      {usersList.map((u) => (
                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Assign Editor</label>
                    <select
                      value={form.editorId}
                      onChange={e => setForm({ ...form, editorId: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-150 bg-white"
                    >
                      <option value="">-- No Editor --</option>
                      {editorsList.map((ed) => (
                        <option key={ed.id} value={ed.id}>{ed.name || ed.email}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex gap-2 justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      if (selectedEvent) {
                        setIsEditMode(false);
                      } else {
                        setIsOpenModal(false);
                      }
                    }}
                    className="rounded-xl border border-gray-150 bg-white hover:bg-neutral-50 text-gray-500 font-bold px-4 py-2.5"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitLoading}
                    className="rounded-xl bg-black text-white hover:bg-neutral-800 font-bold px-5 py-2.5 flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {submitLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {selectedEvent ? 'Save Changes' : 'Schedule Event'}
                  </Button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
