'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar, CheckSquare, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  type: 'MEETING' | 'TASK' | 'DEADLINE' | 'DELIVERY' | 'REVIEW' | 'ASSIGNMENT';
  startDate: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export default function DashboardCalendarWidget({ portal }: { portal: 'admin' | 'user' | 'editor' }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/calendar')
      .then(res => res.json())
      .then(data => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch calendar widgets:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-xs text-gray-400 font-semibold">Loading schedule widget...</span>
      </div>
    );
  }

  const now = new Date();

  // Upcoming Tasks: TASK or ASSIGNMENT, status not terminal, due date in future
  const upcomingTasks = events.filter(e => 
    ['TASK', 'ASSIGNMENT'].includes(e.type) &&
    !['COMPLETED', 'CANCELLED'].includes(e.status) &&
    new Date(e.dueDate) >= now
  ).slice(0, 5);

  // Upcoming Deadlines: DEADLINE or DELIVERY, status not terminal, due date in future
  const upcomingDeadlines = events.filter(e =>
    ['DEADLINE', 'DELIVERY'].includes(e.type) &&
    !['COMPLETED', 'CANCELLED'].includes(e.status) &&
    new Date(e.dueDate) >= now
  ).slice(0, 5);

  // Pending Events: status is PENDING, any type
  const pendingEvents = events.filter(e =>
    e.status === 'PENDING'
  ).slice(0, 5);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-amber-50';
      default: return 'bg-blue-500';
    }
  };

  const calendarLink = `/${portal}/calendar`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg text-black font-sans leading-tight">Calendar Operations Summary</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Quick overview of deadlines, meetings, and active tasks.</p>
        </div>
        <Link href={calendarLink} className="text-xs font-bold text-black hover:underline">
          Go to Calendar &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Column 1: Upcoming Tasks */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-neutral-800">
            <CheckSquare className="h-4.5 w-4.5 text-amber-500 shrink-0" />
            <span className="font-extrabold text-xs uppercase tracking-wider">Upcoming Tasks</span>
          </div>

          <div className="space-y-2.5">
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map(task => (
                <div key={task.id} className="p-2.5 bg-gray-50/50 hover:bg-gray-50 border rounded-xl flex items-center justify-between gap-3 transition-all">
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs text-black truncate">{task.title}</p>
                    <span className="text-[9px] text-gray-400 font-semibold block mt-0.5">
                      Due {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded-md uppercase border ${
                    task.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-gray-400 font-semibold py-4 text-center">No upcoming tasks.</p>
            )}
          </div>
        </div>

        {/* Column 2: Upcoming Deadlines */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-neutral-800">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0" />
            <span className="font-extrabold text-xs uppercase tracking-wider">Upcoming Deadlines</span>
          </div>

          <div className="space-y-2.5">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map(dl => (
                <div key={dl.id} className="p-2.5 bg-gray-50/50 hover:bg-gray-50 border rounded-xl flex items-center justify-between gap-3 transition-all">
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs text-black truncate">{dl.title}</p>
                    <span className="text-[9px] text-gray-450 font-bold block mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(dl.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded-md uppercase border ${
                    dl.priority === 'CRITICAL' || dl.priority === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {dl.type}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-gray-400 font-semibold py-4 text-center">No upcoming deadlines.</p>
            )}
          </div>
        </div>

        {/* Column 3: Pending Events */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-neutral-800">
            <Calendar className="h-4.5 w-4.5 text-blue-500 shrink-0" />
            <span className="font-extrabold text-xs uppercase tracking-wider">Pending Events</span>
          </div>

          <div className="space-y-2.5">
            {pendingEvents.length > 0 ? (
              pendingEvents.map(event => (
                <div key={event.id} className="p-2.5 bg-gray-50/50 hover:bg-gray-50 border rounded-xl flex items-center justify-between gap-3 transition-all">
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs text-black truncate">{event.title}</p>
                    <span className="text-[9px] text-gray-400 font-semibold block mt-0.5 uppercase tracking-wide font-mono">
                      {event.type}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 text-[8px] font-bold rounded-md uppercase bg-amber-50 text-amber-700 border border-amber-200">
                    Pending
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-gray-400 font-semibold py-4 text-center">No pending events.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
