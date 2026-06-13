'use client';

import PublishSection from '@/components/PublishSection';

export default function UserPublishPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
          Social Publishing
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          Connect social accounts and schedule/publish completed video reels.
        </p>
      </div>
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
        <PublishSection />
      </div>
    </div>
  );
}
