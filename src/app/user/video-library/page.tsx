'use client';

import VideoLibrary from '@/components/VideoLibrary';

export default function UserVideoLibraryPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
          My Videos
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          Access all your generated avatar presentations and edited videos.
        </p>
      </div>
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
        <VideoLibrary />
      </div>
    </div>
  );
}
