'use client';

import ApprovalQueueSection from '@/components/ApprovalQueueSection';
import ContentCalendarSection from '@/components/ContentCalendarSection';

export default function AdminPublishingPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
          Publishing Operations
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          Manage the content organization approvals queue and content release calendar.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-4">
          <h2 className="text-xl font-bold text-black font-sans">Approvals Queue</h2>
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs min-h-[400px]">
            <ApprovalQueueSection />
          </div>
        </div>

        <div className="lg:col-span-6 space-y-4">
          <h2 className="text-xl font-bold text-black font-sans">Content Calendar</h2>
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs min-h-[400px]">
            <ContentCalendarSection />
          </div>
        </div>
      </div>
    </div>
  );
}
