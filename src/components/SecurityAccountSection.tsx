'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function SecurityAccountSection() {
  const [securityData, setSecurityData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchSecurityData = async () => {
    try {
      const res = await fetch('/api/user/settings');
      if (res.ok) {
        const data = await res.json();
        setSecurityData(data.security);
      }
    } catch (err) {
      console.error('Failed to load security dates', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ text: 'New password must be at least 8 characters long.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'New password and confirmation password do not match.', type: 'error' });
      return;
    }

    try {
      setFormLoading(true);
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: 'Your password was updated successfully!', type: 'success' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        fetchSecurityData();
      } else {
        setMessage({ text: data.error || 'Failed to update password.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const getFormattedDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-100 pb-3">
        <h3 className="text-lg font-bold text-black font-sans leading-tight flex items-center gap-2">
          <Shield className="h-5 w-5 text-neutral-800" />
          Security & Account
        </h3>
        <p className="text-xs text-gray-400 mt-1 font-sans">
          Manage your credentials, audit session logins, and change password.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-start gap-2.5 border text-xs font-semibold ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-600" /> : <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-600" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Change Password Form */}
        <form onSubmit={handlePasswordChange} className="lg:col-span-8 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
              Current Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="h-4 w-4" />
              </span>
              <Input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 rounded-xl border-neutral-200 h-11 focus:border-black focus:ring-black text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
              New Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="h-4 w-4" />
              </span>
              <Input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="pl-10 rounded-xl border-neutral-200 h-11 focus:border-black focus:ring-black text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
              Confirm New Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="h-4 w-4" />
              </span>
              <Input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="pl-10 rounded-xl border-neutral-200 h-11 focus:border-black focus:ring-black text-sm"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={formLoading}
            className="bg-black text-white hover:bg-neutral-800 rounded-xl h-11 px-6 text-sm font-semibold flex items-center gap-1.5"
          >
            {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </form>

        {/* Right Side: Account Activity Audit Dates */}
        <div className="lg:col-span-4">
          <Card className="rounded-3xl border border-neutral-100 bg-neutral-50/50 p-5 space-y-4">
            <h4 className="font-bold text-xs text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-neutral-400" />
              Account Activity Audit
            </h4>

            {securityData && (
              <div className="space-y-3.5 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Account Created
                  </span>
                  <span className="font-bold text-neutral-800 block">
                    {getFormattedDate(securityData.createdAt)}
                  </span>
                </div>

                <div className="space-y-0.5 border-t border-neutral-200/50 pt-3">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Last Password Change
                  </span>
                  <span className="font-bold text-neutral-800 block">
                    {getFormattedDate(securityData.passwordChangedAt)}
                  </span>
                </div>

                <div className="space-y-0.5 border-t border-neutral-200/50 pt-3">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Last Logged In
                  </span>
                  <span className="font-bold text-neutral-800 block">
                    {getFormattedDate(securityData.lastLoginAt)}
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
