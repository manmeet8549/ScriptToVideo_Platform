'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { editorsApi, EditorProfileDetails } from '@/lib/api';
import { Loader2, User, Copy, Check, Save } from 'lucide-react';

export default function EditorProfileSection() {
  const [profile, setProfile] = useState<EditorProfileDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  // Form local state
  const [form, setForm] = useState({
    displayName: '',
    bio: '',
    skillsString: '',
    availability: 'AVAILABLE' as 'AVAILABLE' | 'BUSY' | 'OFFLINE',
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await editorsApi.getProfile();
      if (res.profile) {
        setProfile(res.profile);
        setForm({
          displayName: res.profile.displayName || '',
          bio: res.profile.bio || '',
          skillsString: (res.profile.skills || []).join(', '),
          availability: res.profile.availability || 'AVAILABLE',
        });
      }
    } catch {
      setError('Failed to load editor profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleCopyKey = () => {
    if (!profile?.editorKey) return;
    navigator.clipboard.writeText(profile.editorKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // Split skills by comma
      const skills = form.skillsString
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await editorsApi.updateProfile({
        displayName: form.displayName.trim() || undefined,
        bio: form.bio.trim() || undefined,
        skills,
        availability: form.availability,
      });

      if (res.success) {
        setSuccess('Profile updated successfully!');
        setProfile(res.profile);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update profile.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-3" />
        <p className="text-sm text-gray-500 font-sans">Loading profile details...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8 relative pb-28 font-sans">
      {/* Header */}
      <div className="space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200/60 px-3 py-1 text-xs font-bold text-neutral-600">
          <User className="h-3.5 w-3.5 text-neutral-500" />
          Profile
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-black">
          Editor Profile
        </h1>
        <p className="text-sm text-neutral-500 max-w-2xl leading-relaxed">
          Configure your professional profile, skills tags, and toggle your current availability status.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm animate-fade-in">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm animate-fade-in">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form */}
        <form onSubmit={handleSave} className="lg:col-span-8 space-y-8">
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-black border-b border-neutral-50 pb-2">
              Profile Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                  Display Name
                </label>
                <Input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="e.g. Raj Singh"
                  className="rounded-xl border-neutral-200 h-11 focus:border-black focus:ring-black text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                  Bio / Overview
                </label>
                <textarea
                  rows={4}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Tell clients about your background, video style, editing software, and experience..."
                  className="w-full rounded-xl border border-neutral-200 p-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm resize-none"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                  Skills (comma separated)
                </label>
                <Input
                  value={form.skillsString}
                  onChange={(e) => setForm({ ...form, skillsString: e.target.value })}
                  placeholder="e.g. Video Editing, Shorts Editing, Motion Graphics, DaVinci Resolve"
                  className="rounded-xl border-neutral-200 h-11 focus:border-black focus:ring-black text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <h3 className="text-lg font-bold text-black border-b border-neutral-50 pb-2">
              Availability Status
            </h3>

            <div className="inline-flex bg-neutral-100/80 border border-neutral-200/40 p-1 rounded-2xl gap-1">
              {[
                { id: 'AVAILABLE' as const, label: 'Available', dotColor: 'bg-green-500' },
                { id: 'BUSY' as const, label: 'Busy', dotColor: 'bg-amber-500' },
                { id: 'OFFLINE' as const, label: 'Offline', dotColor: 'bg-neutral-300' },
              ].map((opt) => {
                const isSelected = form.availability === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setForm({ ...form, availability: opt.id })}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                      isSelected
                        ? 'bg-white text-black shadow-sm'
                        : 'text-neutral-500 hover:text-black'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${opt.dotColor}`} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="bg-black text-white hover:bg-neutral-800 rounded-xl h-11 px-6 text-sm font-semibold flex items-center gap-1.5"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </form>

        {/* Right Info Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Key Card */}
          <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-base text-black border-b border-neutral-50 pb-2">
              My Authorization Key
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Clients need this key to connect with you. Copy it and share it with them.
            </p>

            <div className="flex gap-2 items-center bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
              <span className="font-mono text-sm font-extrabold text-black select-all flex-1 tracking-wider overflow-x-auto truncate">
                {profile?.editorKey || 'Generating...'}
              </span>
              <button
                type="button"
                onClick={handleCopyKey}
                className="h-8 w-8 rounded-lg flex items-center justify-center bg-white border border-neutral-200 text-neutral-500 hover:text-black shadow-xs shrink-0 transition-colors"
                title="Copy Key"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
