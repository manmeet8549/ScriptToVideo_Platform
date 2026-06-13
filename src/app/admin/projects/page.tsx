'use client';

import ProjectsList from '@/components/ProjectsList';

export default function AdminProjectsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
          Platform Projects
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          Monitor all ongoing video creation pipelines and draft projects across the platform.
        </p>
      </div>
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
        <ProjectsList />
      </div>
    </div>
  );
}
