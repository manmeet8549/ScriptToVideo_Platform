'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Settings as SettingsIcon, Check, Loader2,
  Monitor, Sun, Moon
} from 'lucide-react';
import { useUserSettings, useSaveUserSettings } from '@/hooks/useUserSettings';

export default function SettingsSection() {
  const { data: userData, isLoading, refetch } = useUserSettings();
  const saveMutation = useSaveUserSettings();


  // Form local state
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    bio: '',
    defaultLanguage: 'English (US)',
    defaultDuration: '30 Seconds',
    defaultTone: 'Professional',
    theme: 'System' as 'System' | 'Light' | 'Dark',
  });

  // Keep track of initially loaded settings to detect unsaved changes
  const [initialForm, setInitialForm] = useState({
    fullName: '',
    username: '',
    bio: '',
    defaultLanguage: 'English (US)',
    defaultDuration: '30 Seconds',
    defaultTone: 'Professional',
    theme: 'System' as 'System' | 'Light' | 'Dark',
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Sync loaded user settings into form state
  useEffect(() => {
    if (userData) {
      const initial = {
        fullName: userData.fullName || '',
        username: userData.settings?.username || '',
        bio: userData.settings?.bio || '',
        defaultLanguage: userData.settings?.defaultLanguage || 'English (US)',
        defaultDuration: userData.settings?.defaultDuration || '30 Seconds',
        defaultTone: userData.settings?.defaultTone || 'Professional',
        theme: (userData.settings?.theme as 'System' | 'Light' | 'Dark') || 'System',
      };
      setForm(initial);
      setInitialForm(initial);
    }
  }, [userData]);

  // Check if form has changed from initial values
  useEffect(() => {
    const isDifferent = JSON.stringify(form) !== JSON.stringify(initialForm);
    setHasChanges(isDifferent);
  }, [form, initialForm]);

  const handleInputChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDiscard = () => {
    setForm(initialForm);
  };

  const handleSave = async () => {
    try {
      const result = await saveMutation.mutateAsync(form);
      if (result.success) {
        const updated = {
          fullName: result.fullName || '',
          username: result.settings?.username || '',
          bio: result.settings?.bio || '',
          defaultLanguage: result.settings?.defaultLanguage || 'English (US)',
          defaultDuration: result.settings?.defaultDuration || '30 Seconds',
          defaultTone: result.settings?.defaultTone || 'Professional',
          theme: (result.settings?.theme as 'System' | 'Light' | 'Dark') || 'System',
        };
        setForm(updated);
        setInitialForm(updated);
        refetch();
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  if (isLoading || !userData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-3" />
        <p className="text-sm text-gray-500 font-sans">Loading preferences...</p>
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8 relative pb-28">
      {/* Top Header & Tag */}
      <div className="space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200/60 px-3 py-1 text-xs font-bold text-neutral-600">
          <SettingsIcon className="h-3.5 w-3.5 text-neutral-500" />
          Settings
        </span>
        <h1 className="text-4xl font-extrabold font-sans tracking-tight text-black animate-fade-in">
          Account Settings
        </h1>
        <p className="text-sm text-neutral-500 font-sans max-w-2xl leading-relaxed">
          Manage your profile, preferences, and workspace settings to tailor ScriptForge AI to your workflow.
        </p>
      </div>


      {/* Main Settings Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column - General Settings Inputs */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Profile Information Block */}
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-black font-sans border-b border-neutral-50 pb-2">
              Profile Information
            </h3>

            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Profile Image Avatar */}
              <div className="relative group shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop"
                  alt="Profile Avatar"
                  className="h-20 w-20 rounded-full border-2 border-neutral-100 object-cover shadow-sm"
                />
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    Full Name
                  </label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="rounded-xl border-neutral-200 h-11 focus:border-black focus:ring-black text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    Username
                  </label>
                  <Input
                    value={form.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="e.g. janedoe_sf"
                    className="rounded-xl border-neutral-200 h-11 focus:border-black focus:ring-black text-sm"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <Input
                    value={userData.email}
                    disabled
                    readOnly
                    className="rounded-xl border-neutral-100 h-11 bg-neutral-50 text-neutral-400 border-neutral-100 text-sm cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    Bio
                  </label>
                  <textarea
                    rows={3}
                    value={form.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="A brief description about yourself..."
                    className="w-full rounded-xl border border-neutral-200 p-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm font-sans resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Workspace Preferences Block */}
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-black font-sans border-b border-neutral-50 pb-2">
              Workspace Preferences
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                  Default Language
                </label>
                <select
                  value={form.defaultLanguage}
                  onChange={(e) => handleInputChange('defaultLanguage', e.target.value)}
                  className="w-full h-11 rounded-xl border border-neutral-200 px-3 bg-white text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-sans cursor-pointer"
                >
                  <option>English (US)</option>
                  <option>Spanish (ES)</option>
                  <option>French (FR)</option>
                  <option>German (DE)</option>
                  <option>Japanese (JP)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                  Default Video Duration
                </label>
                <select
                  value={form.defaultDuration}
                  onChange={(e) => handleInputChange('defaultDuration', e.target.value)}
                  className="w-full h-11 rounded-xl border border-neutral-200 px-3 bg-white text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-sans cursor-pointer"
                >
                  <option>30 Seconds</option>
                  <option>60 Seconds</option>
                  <option>90 Seconds</option>
                  <option>2 Minutes</option>
                  <option>5 Minutes</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                  Default Output Tone
                </label>
                <select
                  value={form.defaultTone}
                  onChange={(e) => handleInputChange('defaultTone', e.target.value)}
                  className="w-full h-11 rounded-xl border border-neutral-200 px-3 bg-white text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-sans cursor-pointer"
                >
                  <option>Professional</option>
                  <option>Casual</option>
                  <option>Humorous</option>
                  <option>Dramatic</option>
                  <option>Educational</option>
                </select>
              </div>
            </div>
          </div>

          {/* Interface Theme Block */}
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-black font-sans border-b border-neutral-50 pb-2">
              Interface Theme
            </h3>

            <div className="inline-flex bg-neutral-100/80 border border-neutral-200/40 p-1 rounded-2xl gap-1">
              {[
                { id: 'System', label: 'System', icon: Monitor },
                { id: 'Light', label: 'Light', icon: Sun },
                { id: 'Dark', label: 'Dark', icon: Moon },
              ].map((themeOpt) => {
                const Icon = themeOpt.icon;
                const isSelected = form.theme === themeOpt.id;
                return (
                  <button
                    key={themeOpt.id}
                    onClick={() => handleInputChange('theme', themeOpt.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
                      isSelected
                        ? 'bg-white text-black shadow-sm'
                        : 'text-neutral-500 hover:text-black'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {themeOpt.label}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column - Account Summary & Upgrade details */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card: Account Summary */}
          <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6 space-y-5">
            <h3 className="font-bold text-base text-black font-sans border-b border-neutral-50 pb-2">
              Account Summary
            </h3>

            <div className="space-y-4 font-sans text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-400 font-semibold">Member Since</span>
                <span className="font-bold text-neutral-800">{userData.stats?.memberSince || 'Oct 2023'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-400 font-semibold">Projects Created</span>
                <span className="font-bold text-neutral-800">{userData.stats?.projectsCreated ?? 0}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-400 font-semibold">Connected Providers</span>
                <span className="font-bold text-neutral-800">{userData.stats?.connectedProviders ?? 0}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-400 font-semibold">Current Plan</span>
                <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-600 border border-neutral-200/50">
                  Free Tier
                </span>
              </div>
            </div>
          </Card>

          {/* Card: Plan Upgrade */}
          <Card className="rounded-3xl border border-neutral-900 bg-neutral-950 text-white p-6 space-y-5 shadow-md relative overflow-hidden">
            {/* Absolute accent glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl" />

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-neutral-100">
                ⚡ Free Plan
              </span>
              <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
                Bring Your Own Key (BYOK) enabled. Pay only for what you generate.
              </p>
            </div>

            <ul className="space-y-3 pt-2">
              <li className="flex items-center gap-2.5">
                <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-white text-black">
                  <Check className="h-3 w-3 text-black stroke-[3px]" />
                </div>
                <span className="text-[11px] font-bold text-neutral-300 font-sans">
                  Unlimited projects
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-white text-black">
                  <Check className="h-3 w-3 text-black stroke-[3px]" />
                </div>
                <span className="text-[11px] font-bold text-neutral-300 font-sans">
                  OpenAI & Anthropic BYOK
                </span>
              </li>
            </ul>

            <button className="w-full bg-white text-black hover:opacity-90 transition-all font-extrabold text-xs py-3 rounded-2xl mt-4 font-sans tracking-wide">
              Upgrade Plan
            </button>
          </Card>

        </div>

      </div>

      {/* Floating Unsaved Changes Bottom Banner */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border border-neutral-100 shadow-2xl rounded-2xl py-3 px-5 flex items-center justify-between gap-8 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 w-full max-w-lg">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 font-sans">
            <span className="h-2 w-2 rounded-full bg-neutral-900 animate-pulse" />
            <span>You have unsaved changes</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDiscard}
              className="text-xs font-bold text-neutral-500 hover:text-black transition-colors font-sans"
            >
              Discard
            </button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-black text-white hover:bg-neutral-800 rounded-xl px-4 py-2 h-9 text-xs font-semibold"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : null}
              Save Changes
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
