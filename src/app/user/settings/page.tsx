'use client';

import SettingsSection from '@/components/SettingsSection';

export default function UserSettingsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
          Account Settings
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          Customize your creator preferences, languages, theme, and profile bio.
        </p>
      </div>
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
        <SettingsSection />
      </div>
    </div>
  );
}
