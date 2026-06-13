'use client';

import EditorDashboard from '@/components/EditorDashboard';

export default function EditorDashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
          Editor Dashboard
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          Manage assigned video rendering jobs, connect with users, and upload completed edited files.
        </p>
      </div>
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
        <EditorDashboard />
      </div>
    </div>
  );
}
