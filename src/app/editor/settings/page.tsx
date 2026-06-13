'use client';

import EditorProfileSection from '@/components/EditorProfileSection';

export default function EditorSettingsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
          Editor Profile Settings
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          Manage your availability preferences, display name, profile bio, and skills list.
        </p>
      </div>
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
        <EditorProfileSection />
      </div>
    </div>
  );
}
