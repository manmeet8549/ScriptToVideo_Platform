'use client';

import CalendarModule from '@/components/CalendarModule';

export default function AdminCalendarPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto bg-[#fcfcfc]">
      <CalendarModule role="ADMIN" />
    </div>
  );
}
