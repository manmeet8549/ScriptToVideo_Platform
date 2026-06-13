'use client';

import VideoLibrary from '@/components/VideoLibrary';

export default function AdminVideoLibraryPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
          Video Library
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          Oversight and management of all completed generated video renders.
        </p>
      </div>
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
        <VideoLibrary />
      </div>
    </div>
  );
}
