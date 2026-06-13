'use client';

import ProjectsList from '@/components/ProjectsList';

export default function UserProjectsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
          My Projects
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          Create, view, and trace your video generation pipelines.
        </p>
      </div>
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
        <ProjectsList />
      </div>
    </div>
  );
}
