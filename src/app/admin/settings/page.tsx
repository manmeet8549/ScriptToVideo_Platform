'use client';

import OrgSettingsSection from '@/components/OrgSettingsSection';
import SecurityAccountSection from '@/components/SecurityAccountSection';

export default function AdminSettingsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
          Organization Branding Settings
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          Customize organization logos, color schemes, custom subdomains, and white-labeling preferences.
        </p>
      </div>
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
        <OrgSettingsSection />
      </div>
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
        <SecurityAccountSection />
      </div>
    </div>
  );
}
