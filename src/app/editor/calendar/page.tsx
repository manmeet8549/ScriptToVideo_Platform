'use client';

import dynamic from 'next/dynamic';
const CalendarModule = dynamic(() => import('@/components/CalendarModule'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-white border border-gray-100 rounded-3xl animate-pulse" />
});

export default function EditorCalendarPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto bg-[#fcfcfc]">
      <CalendarModule role="EDITOR" />
    </div>
  );
}
