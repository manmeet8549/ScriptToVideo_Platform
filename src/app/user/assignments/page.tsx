'use client';

import AssignmentsSection from '@/components/AssignmentsSection';

export default function UserAssignmentsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
          Editor Assignments
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          Assign video edit tasks to editors, track their status, and download final versions.
        </p>
      </div>
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
        <AssignmentsSection />
      </div>
    </div>
  );
}
