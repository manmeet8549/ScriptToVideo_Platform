'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Building, Globe, Users, Mail, Settings, CreditCard, Download,
  Plus, Key, Lock, CheckCircle2, AlertCircle, Trash2, Eye, EyeOff,
  Loader2, Link2, Copy, Check, Shield
} from 'lucide-react';
import ThinkNextLogo from '@/components/ThinkNextLogo';

export default function OrgSettingsSection() {
  const { data: session } = useSession();
  const user = session?.user;

  // Active section inside Organization settings page
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'branding' | 'members' | 'billing' | 'integrations' | 'automation'>('profile');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Core organization details
  const [org, setOrg] = useState<any>(null);
  const [orgForm, setOrgForm] = useState({
    name: '',
    slug: '',
    logo: '',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    approvalRequired: false,
  });

  // Team members & invitations
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'USER' | 'EDITOR' | 'ORG_ADMIN'>('USER');

  // Billing & Invoices
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Custom Domains
  const [domains, setDomains] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null);

  // Integrations keys
  const [keys, setKeys] = useState<any>({
    NVIDIA: { connected: false, prefix: '', lastFour: '', updatedAt: null },
    ELEVENLABS: { connected: false, prefix: '', lastFour: '', updatedAt: null },
    HEYGEN: { connected: false, prefix: '', lastFour: '', updatedAt: null }
  });
  const [editingKey, setEditingKey] = useState<Record<string, boolean>>({
    NVIDIA: false,
    ELEVENLABS: false,
    HEYGEN: false
  });
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({
    NVIDIA: '',
    ELEVENLABS: '',
    HEYGEN: ''
  });
  const [showKey, setShowKey] = useState<Record<string, boolean>>({
    NVIDIA: false,
    ELEVENLABS: false,
    HEYGEN: false
  });
  const [keyTesting, setKeyTesting] = useState<Record<string, boolean>>({
    NVIDIA: false,
    ELEVENLABS: false,
    HEYGEN: false
  });
  const [keyStatus, setKeyStatus] = useState<Record<string, { text: string; type: 'success' | 'error' } | null>>({
    NVIDIA: null,
    ELEVENLABS: null,
    HEYGEN: null
  });

  // Notification / Alert banners
  const [alert, setAlert] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchOrgDetails = async () => {
    try {
      const res = await fetch('/api/organizations');
      if (res.ok) {
        const data = await res.json();
        setOrg(data.organization);
        setOrgForm({
          name: data.organization.name || '',
          slug: data.organization.slug || '',
          logo: data.organization.logo || '',
          primaryColor: data.organization.primaryColor || '#000000',
          secondaryColor: data.organization.secondaryColor || '#ffffff',
          approvalRequired: data.organization.approvalRequired || false,
        });
      }
    } catch (err) {
      console.error('Error fetching org:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/organizations/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const fetchInvitations = async () => {
    try {
      const res = await fetch('/api/invitations');
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error('Error fetching invitations:', err);
    }
  };

  const fetchBilling = async () => {
    try {
      const res = await fetch('/api/billing');
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
      }
      const invRes = await fetch('/api/invoices');
      if (invRes.ok) {
        const data = await invRes.json();
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error('Error fetching billing:', err);
    }
  };

  const fetchDomains = async () => {
    try {
      const res = await fetch('/api/domains');
      if (res.ok) {
        const data = await res.json();
        setDomains(data.domains || []);
      }
    } catch (err) {
      console.error('Error fetching domains:', err);
    }
  };

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/organizations/keys');
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || {});
        // Pre-populate input values with masked representations
        const newInputs: Record<string, string> = {};
        Object.keys(data.keys).forEach((provider) => {
          const detail = data.keys[provider];
          newInputs[provider] = detail.connected
            ? `${detail.prefix}••••••••••••••••${detail.lastFour}`
            : '';
        });
        setKeyInputs(newInputs);
      }
    } catch (err) {
      console.error('Error fetching keys:', err);
    }
  };

  // Automation rules state
  const [automationRules, setAutomationRules] = useState<any[]>([]);
  const [newRuleForm, setNewRuleForm] = useState({
    triggerEvent: 'VIDEO_APPROVED',
    actionType: 'SCHEDULE_TOMORROW_9AM',
  });
  const [creatingRule, setCreatingRule] = useState(false);

  const fetchAutomationRules = async () => {
    try {
      const res = await fetch('/api/organizations/automation-rules');
      if (res.ok) {
        const data = await res.json();
        setAutomationRules(data.rules || []);
      }
    } catch (err) {
      console.error('Error fetching automation rules:', err);
    }
  };

  const handleToggleApprovalRequired = async (checked: boolean) => {
    try {
      const res = await fetch('/api/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...orgForm, approvalRequired: checked })
      });
      const data = await res.json();
      if (res.ok) {
        setOrg(data.organization);
        setOrgForm((prev: any) => ({ ...prev, approvalRequired: checked }));
        triggerAlert(`Approval workflow ${checked ? 'enabled' : 'disabled'} successfully.`, 'success');
      } else {
        triggerAlert(data.error || 'Failed to update workflow policy.', 'error');
      }
    } catch (err) {
      triggerAlert('Network error saving workflow policy.', 'error');
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingRule(true);
    try {
      const res = await fetch('/api/organizations/automation-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRuleForm),
      });
      const data = await res.json();
      if (res.ok) {
        setAutomationRules(prev => [data.rule, ...prev]);
        triggerAlert('Automation rule created successfully.', 'success');
        setNewRuleForm({
          triggerEvent: 'VIDEO_APPROVED',
          actionType: 'SCHEDULE_TOMORROW_9AM',
        });
      } else {
        triggerAlert(data.error || 'Failed to create automation rule.', 'error');
      }
    } catch (err) {
      triggerAlert('Network error creating automation rule.', 'error');
    } finally {
      setCreatingRule(false);
    }
  };

  const handleToggleRuleActive = async (ruleId: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/organizations/automation-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ruleId, active: !currentActive }),
      });
      const data = await res.json();
      if (res.ok) {
        setAutomationRules(prev => prev.map(r => r.id === ruleId ? data.rule : r));
        triggerAlert(`Rule ${!currentActive ? 'activated' : 'deactivated'} successfully.`, 'success');
      } else {
        triggerAlert(data.error || 'Failed to update rule status.', 'error');
      }
    } catch (err) {
      triggerAlert('Network error updating rule status.', 'error');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return;
    try {
      const res = await fetch(`/api/organizations/automation-rules?id=${ruleId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAutomationRules(prev => prev.filter(r => r.id !== ruleId));
        triggerAlert('Automation rule deleted successfully.', 'success');
      } else {
        const data = await res.json();
        triggerAlert(data.error || 'Failed to delete automation rule.', 'error');
      }
    } catch (err) {
      triggerAlert('Network error deleting automation rule.', 'error');
    }
  };

  useEffect(() => {
    if (session?.user?.organizationId) {
      setLoading(true);
      Promise.all([
        fetchOrgDetails(),
        fetchMembers(),
        fetchInvitations(),
        fetchBilling(),
        fetchDomains(),
        fetchKeys(),
        fetchAutomationRules()
      ]).finally(() => setLoading(false));
    }
  }, [session]);

  const triggerAlert = (text: string, type: 'success' | 'error') => {
    setAlert({ text, type });
    setTimeout(() => setAlert(null), 5000);
  };

  // 1. Company Profile and Branding Updates
  const handleSaveProfileOrBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const res = await fetch('/api/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgForm)
      });
      const data = await res.json();
      if (res.ok) {
        setOrg(data.organization);
        triggerAlert('Organization settings saved successfully.', 'success');
      } else {
        triggerAlert(data.error || 'Failed to save settings.', 'error');
      }
    } catch (err) {
      triggerAlert('Network error saving settings.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  // 2. Team Management
  const handleUpdateMemberRole = async (userId: string, role: string) => {
    try {
      const res = await fetch('/api/organizations/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      });
      const data = await res.json();
      if (res.ok) {
        setMembers(prev => prev.map(m => m.id === userId ? { ...m, role } : m));
        triggerAlert('Member role updated successfully.', 'success');
      } else {
        triggerAlert(data.error || 'Failed to update member role.', 'error');
      }
    } catch (err) {
      triggerAlert('Error updating role.', 'error');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the organization?')) return;
    try {
      const res = await fetch(`/api/organizations/members?userId=${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== userId));
        triggerAlert('Member removed successfully.', 'success');
      } else {
        const data = await res.json();
        triggerAlert(data.error || 'Failed to remove member.', 'error');
      }
    } catch (err) {
      triggerAlert('Error removing member.', 'error');
    }
  };

  // 3. Team Invitations
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });
      const data = await res.json();
      if (res.ok) {
        setInvitations(prev => [data.invitation, ...prev]);
        setInviteEmail('');
        triggerAlert('Invitation created successfully.', 'success');
      } else {
        triggerAlert(data.error || 'Failed to create invitation.', 'error');
      }
    } catch (err) {
      triggerAlert('Error sending invitation.', 'error');
    }
  };

  const handleRevokeInvite = async (id: string) => {
    try {
      const res = await fetch(`/api/invitations?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInvitations(prev => prev.filter(i => i.id !== id));
        triggerAlert('Invitation revoked.', 'success');
      } else {
        const data = await res.json();
        triggerAlert(data.error || 'Failed to revoke invitation.', 'error');
      }
    } catch (err) {
      triggerAlert('Error revoking invitation.', 'error');
    }
  };

  const copyInviteLink = (token: string) => {
    const inviteLink = `${window.location.origin}/onboarding?invite=${token}`;
    navigator.clipboard.writeText(inviteLink);
    triggerAlert('Invitation link copied to clipboard.', 'success');
  };

  // 4. Domains
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain })
      });
      const data = await res.json();
      if (res.ok) {
        setDomains(prev => [data.domain, ...prev]);
        setNewDomain('');
        triggerAlert('Domain added successfully.', 'success');
      } else {
        triggerAlert(data.error || 'Failed to add domain.', 'error');
      }
    } catch (err) {
      triggerAlert('Error adding domain.', 'error');
    }
  };

  const handleVerifyDomain = async (id: string) => {
    setVerifyingDomainId(id);
    try {
      const res = await fetch('/api/domains/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (res.ok) {
        setDomains(prev => prev.map(d => d.id === id ? { ...d, verified: true } : d));
        triggerAlert('Domain verified successfully!', 'success');
      } else {
        triggerAlert(data.error || 'Verification failed. Make sure CNAME points to SCRIPT-AI.', 'error');
      }
    } catch (err) {
      triggerAlert('Verification service timed out.', 'error');
    } finally {
      setVerifyingDomainId(null);
    }
  };

  const handleDeleteDomain = async (id: string) => {
    try {
      const res = await fetch(`/api/domains?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDomains(prev => prev.filter(d => d.id !== id));
        triggerAlert('Domain removed successfully.', 'success');
      } else {
        const data = await res.json();
        triggerAlert(data.error || 'Failed to remove domain.', 'error');
      }
    } catch (err) {
      triggerAlert('Error deleting domain.', 'error');
    }
  };

  // 5. Billing Subscription Upgrade
  const handleUpgradePlan = async (plan: string) => {
    if (!confirm(`Are you sure you want to change subscription to the ${plan} plan?`)) return;
    try {
      const res = await fetch('/api/billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });
      const data = await res.json();
      if (res.ok) {
        setSubscription((prev: any) => ({ ...prev, ...data.subscription }));
        setInvoices(prev => [data.invoice, ...prev]);
        triggerAlert(data.message || 'Subscription plan updated.', 'success');
        fetchOrgDetails();
      } else {
        triggerAlert(data.error || 'Failed to update subscription.', 'error');
      }
    } catch (err) {
      triggerAlert('Error changing subscription plan.', 'error');
    }
  };

  // 6. Organization-level Integrations Keys
  const handleKeyInputChange = (provider: string, value: string) => {
    setKeyInputs(prev => ({ ...prev, [provider]: value }));
    if (keyStatus[provider]) {
      setKeyStatus(prev => ({ ...prev, [provider]: null }));
    }
  };

  const startEditingKey = (provider: string) => {
    setEditingKey(prev => ({ ...prev, [provider]: true }));
    setKeyInputs(prev => ({ ...prev, [provider]: '' }));
    setKeyStatus(prev => ({ ...prev, [provider]: null }));
  };

  const cancelEditingKey = (provider: string) => {
    setEditingKey(prev => ({ ...prev, [provider]: false }));
    const detail = keys[provider];
    setKeyInputs(prev => ({
      ...prev,
      [provider]: detail?.connected ? `${detail.prefix}••••••••••••••••${detail.lastFour}` : '',
    }));
    setKeyStatus(prev => ({ ...prev, [provider]: null }));
  };

  const handleTestKeyConnection = async (provider: string) => {
    setKeyTesting(prev => ({ ...prev, [provider]: true }));
    setKeyStatus(prev => ({ ...prev, [provider]: null }));

    const isEditing = editingKey[provider];
    const inputValue = keyInputs[provider];
    const keyToTest = isEditing ? inputValue : undefined;

    try {
      const res = await fetch('/api/organizations/keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key: keyToTest })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setKeyStatus(prev => ({
          ...prev,
          [provider]: { text: 'Connection verified successfully!', type: 'success' }
        }));
      } else {
        setKeyStatus(prev => ({
          ...prev,
          [provider]: { text: data.message || 'Verification failed. Check API key.', type: 'error' }
        }));
      }
    } catch (err) {
      setKeyStatus(prev => ({
        ...prev,
        [provider]: { text: 'Network validation error.', type: 'error' }
      }));
    } finally {
      setKeyTesting(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleSaveKey = async (provider: string) => {
    setKeyStatus(prev => ({ ...prev, [provider]: null }));
    const value = keyInputs[provider];

    if (!value.trim()) {
      setKeyStatus(prev => ({
        ...prev,
        [provider]: { text: 'API key cannot be empty.', type: 'error' }
      }));
      return;
    }

    try {
      const res = await fetch('/api/organizations/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key: value })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setKeyStatus(prev => ({
          ...prev,
          [provider]: { text: 'Key saved successfully at organization level.', type: 'success' }
        }));
        setEditingKey(prev => ({ ...prev, [provider]: false }));
        fetchKeys();
      } else {
        setKeyStatus(prev => ({
          ...prev,
          [provider]: { text: data.error || 'Failed to save key.', type: 'error' }
        }));
      }
    } catch (err) {
      setKeyStatus(prev => ({
        ...prev,
        [provider]: { text: 'Failed to write credential.', type: 'error' }
      }));
    }
  };

  const handleDisconnectKey = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider} organization-wide API key?`)) return;
    setKeyStatus(prev => ({ ...prev, [provider]: null }));

    try {
      const res = await fetch('/api/organizations/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key: '' }) // empty string disconnects
      });
      if (res.ok) {
        setKeyStatus(prev => ({
          ...prev,
          [provider]: { text: 'Provider disconnected.', type: 'success' }
        }));
        setEditingKey(prev => ({ ...prev, [provider]: false }));
        fetchKeys();
      } else {
        const data = await res.json();
        setKeyStatus(prev => ({
          ...prev,
          [provider]: { text: data.error || 'Failed to disconnect.', type: 'error' }
        }));
      }
    } catch (err) {
      setKeyStatus(prev => ({
        ...prev,
        [provider]: { text: 'Network failure disconnect error.', type: 'error' }
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-3" />
        <p className="text-sm text-gray-500 font-sans">Loading organization panel...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8 pb-20 relative">
      {/* Alert Banner */}
      {alert && (
        <div className={`fixed top-6 right-6 z-50 flex items-start gap-2.5 p-4 rounded-2xl shadow-2xl border text-xs max-w-sm animate-in fade-in slide-in-from-top-3 ${
          alert.type === 'success'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
            : 'bg-rose-50 border-rose-100 text-rose-700'
        }`}>
          {alert.type === 'success' ? <CheckCircle2 className="h-4.5 w-4.5 shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 shrink-0" />}
          <span className="font-semibold">{alert.text}</span>
        </div>
      )}

      {/* Top Banner Tag */}
      <div className="space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200/60 px-3 py-1 text-xs font-bold text-neutral-600">
          <Building className="h-3.5 w-3.5 text-neutral-500" />
          Tenant Workspace
        </span>
        <h1 className="text-4xl font-extrabold font-sans tracking-tight text-black">
          Organization Settings
        </h1>
        <p className="text-sm text-neutral-500 font-sans max-w-2xl leading-relaxed">
          Manage your organization credentials, branding customizers, team members list, custom domains, and subscription packages.
        </p>
      </div>

      {/* Sub tabs Navbar */}
      <div className="flex border-b border-neutral-100 gap-1 overflow-x-auto">
        {[
          { id: 'profile', label: 'Company Profile', icon: Building },
          { id: 'branding', label: 'White-Label Branding', icon: Globe },
          { id: 'members', label: 'Team & Invitations', icon: Users },
          { id: 'billing', label: 'Subscriptions & Billing', icon: CreditCard },
          { id: 'integrations', label: 'API Integrations', icon: Key },
          { id: 'automation', label: 'Approval & Automation', icon: Shield }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-xs transition-all tracking-wide shrink-0 ${
                isActive
                  ? 'border-black text-black font-extrabold'
                  : 'border-transparent text-gray-400 hover:text-black'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          
          {/* PROFILE SUB-TAB */}
          {activeSubTab === 'profile' && (
            <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6 space-y-6">
              <h3 className="text-lg font-bold text-black font-sans border-b border-neutral-50 pb-2">
                Company Profile
              </h3>
              <form onSubmit={handleSaveProfileOrBranding} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                      Organization Name
                    </label>
                    <Input
                      value={orgForm.name}
                      onChange={(e) => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Acme Studio"
                      className="rounded-xl border-neutral-200 h-11 text-sm focus:border-black focus:ring-black"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                      Subdomain Slug
                    </label>
                    <div className="relative">
                      <Input
                        value={orgForm.slug}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, slug: e.target.value }))}
                        placeholder="e.g. acme"
                        className="rounded-xl border-neutral-200 h-11 text-sm pr-20 focus:border-black focus:ring-black font-semibold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold bg-neutral-50 px-2 py-1 border rounded-lg border-neutral-100">
                        .localhost:3000
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={saveLoading}
                    className="bg-black text-white hover:bg-neutral-800 rounded-xl px-5 py-2.5 text-xs font-semibold shadow-sm"
                  >
                    {saveLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    Save Profile
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* BRANDING SUB-TAB */}
          {activeSubTab === 'branding' && (
            <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6 space-y-6">
              <h3 className="text-lg font-bold text-black font-sans border-b border-neutral-50 pb-2">
                White-Label Customization
              </h3>
              <form onSubmit={handleSaveProfileOrBranding} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                      Organization Logo URL
                    </label>
                    <div className="flex gap-4 items-center">
                      <Input
                        value={orgForm.logo}
                        onChange={(e) => setOrgForm(prev => ({ ...prev, logo: e.target.value }))}
                        placeholder="https://example.com/logo.png"
                        className="rounded-xl border-neutral-200 h-11 text-sm flex-1 focus:border-black focus:ring-black"
                      />
                      {orgForm.logo && (
                        <div className="h-11 w-11 border rounded-xl flex items-center justify-center p-1 bg-white relative">
                          <Image src={orgForm.logo} alt="Preview" className="max-h-full max-w-full object-contain" fill unoptimized />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                        Primary Accent Color
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={orgForm.primaryColor}
                          onChange={(e) => setOrgForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="h-11 w-11 border border-neutral-200 rounded-xl cursor-pointer p-0.5"
                        />
                        <Input
                          value={orgForm.primaryColor}
                          onChange={(e) => setOrgForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                          placeholder="#000000"
                          className="rounded-xl border-neutral-200 h-11 text-sm font-semibold max-w-[120px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                        Secondary Accent Color
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={orgForm.secondaryColor}
                          onChange={(e) => setOrgForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          className="h-11 w-11 border border-neutral-200 rounded-xl cursor-pointer p-0.5"
                        />
                        <Input
                          value={orgForm.secondaryColor}
                          onChange={(e) => setOrgForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          placeholder="#ffffff"
                          className="rounded-xl border-neutral-200 h-11 text-sm font-semibold max-w-[120px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-50 pt-4 flex justify-end">
                  <Button
                    type="submit"
                    disabled={saveLoading}
                    className="bg-black text-white hover:bg-neutral-800 rounded-xl px-5 py-2.5 text-xs font-semibold shadow-sm"
                  >
                    {saveLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    Save Branding
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* MEMBERS SUB-TAB */}
          {activeSubTab === 'members' && (
            <div className="space-y-8">
              {/* Add/Invite Member */}
              <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white p-6 space-y-6">
                <h3 className="text-lg font-bold text-black font-sans border-b border-neutral-50 pb-2 flex items-center gap-2">
                  <Mail className="h-4.5 w-4.5 text-neutral-500" />
                  Invite Team Member
                </h3>
                <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3">
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    required
                    className="rounded-xl border-neutral-200 h-11 text-sm flex-1 focus:border-black focus:ring-black"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="h-11 border border-neutral-200 rounded-xl px-3 bg-white text-xs font-semibold focus:outline-none focus:border-black"
                  >
                    <option value="USER">User (Standard)</option>
                    <option value="EDITOR">Editor (Collaborator)</option>
                    <option value="ORG_ADMIN">Organization Admin</option>
                  </select>
                  <Button
                    type="submit"
                    className="bg-black text-white hover:bg-neutral-800 rounded-xl px-5 h-11 text-xs font-semibold"
                  >
                    Send Invitation
                  </Button>
                </form>
              </Card>

              {/* Members lists */}
              <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6 space-y-6">
                <h3 className="text-lg font-bold text-black font-sans border-b border-neutral-50 pb-2">
                  Active Team Members
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-medium font-sans">
                    <thead>
                      <tr className="border-b border-neutral-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="pb-3">Name</th>
                        <th className="pb-3">Email</th>
                        <th className="pb-3">Role</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {members.map((member) => (
                        <tr key={member.id} className="hover:bg-neutral-50/20">
                          <td className="py-3 font-semibold text-black">{member.name || 'Invited User'}</td>
                          <td className="py-3 text-neutral-500 font-mono">{member.email}</td>
                          <td className="py-3">
                            {member.id === user?.id ? (
                              <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-bold text-neutral-800">
                                {member.role} (You)
                              </span>
                            ) : (
                              <select
                                value={member.role}
                                onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                                className="border border-neutral-200 rounded-lg bg-white p-1 text-[11px] font-semibold"
                              >
                                <option value="USER">USER</option>
                                <option value="EDITOR">EDITOR</option>
                                <option value="ORG_ADMIN">ORG_ADMIN</option>
                              </select>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={member.id === user?.id}
                              className="text-neutral-400 hover:text-red-600 transition-colors p-1.5 disabled:opacity-30"
                              title="Remove Member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Pending Invitations list */}
              {invitations.length > 0 && (
                <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6 space-y-6">
                  <h3 className="text-lg font-bold text-black font-sans border-b border-neutral-50 pb-2">
                    Pending Invitations
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-medium font-sans">
                      <thead>
                        <tr className="border-b border-neutral-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="pb-3">Email</th>
                          <th className="pb-3">Role</th>
                          <th className="pb-3">Expires</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50">
                        {invitations.map((invite) => (
                          <tr key={invite.id} className="hover:bg-neutral-50/20">
                            <td className="py-3 font-semibold text-black">{invite.email}</td>
                            <td className="py-3 text-neutral-500 font-bold">{invite.role}</td>
                            <td className="py-3 text-neutral-400">{new Date(invite.expiresAt).toLocaleDateString()}</td>
                            <td className="py-3 text-right space-x-1">
                              <button
                                onClick={() => copyInviteLink(invite.token)}
                                className="text-neutral-500 hover:text-black transition-colors p-1 bg-neutral-100 hover:bg-neutral-200 rounded-lg inline-flex items-center gap-1 text-[10px] font-bold"
                              >
                                <Copy className="h-3 w-3" />
                                Link
                              </button>
                              <button
                                onClick={() => handleRevokeInvite(invite.id)}
                                className="text-neutral-400 hover:text-red-600 transition-colors p-1.5"
                                title="Revoke Invitation"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* BILLING SUB-TAB */}
          {activeSubTab === 'billing' && (
            <div className="space-y-8">
              {/* Subscription Details & Interactive cards */}
              <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-neutral-50 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-black font-sans leading-tight">
                      Subscription & Plan Limits
                    </h3>
                    <p className="text-xs text-neutral-400 font-sans mt-0.5">
                      Your current plan and allotments
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 border border-neutral-800 px-3 py-1 text-xs font-black text-white">
                    <CreditCard className="h-3.5 w-3.5" />
                    {subscription?.planName || 'Free Tier'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Monthly Credits</span>
                    <span className="text-xl font-extrabold text-black mt-2">{subscription?.monthlyCredits || 100}</span>
                  </div>
                  <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Storage Cap</span>
                    <span className="text-xl font-extrabold text-black mt-2">{subscription?.storageLimit || 10} GB</span>
                  </div>
                  <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Team Seats</span>
                    <span className="text-xl font-extrabold text-black mt-2">{subscription?.usersLimit || 2}</span>
                  </div>
                  <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Status</span>
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 uppercase tracking-wider mt-2 w-max border border-emerald-100">
                      {subscription?.status || 'ACTIVE'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-neutral-50">
                  <h4 className="font-extrabold text-xs text-neutral-400 uppercase tracking-wider">
                    Plan Features
                  </h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-neutral-600 font-sans">
                    {subscription?.features?.map((f: string, i: number) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-neutral-900 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              {/* Upgrade Interactive Grid */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-black font-sans leading-tight">
                  Available Plans
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { id: 'STARTER', name: 'Starter', price: 29, video: '20 renders/mo', storage: '10GB', users: '5 seats' },
                    { id: 'PRO', name: 'Pro Professional', price: 79, video: '100 renders/mo', storage: '50GB', users: '15 seats' },
                    { id: 'BUSINESS', name: 'Business Enterprise', price: 249, video: '500 renders/mo', storage: '200GB', users: '50 seats' },
                  ].map((p) => {
                    const isCurrent = org?.subscriptionPlan === p.id;
                    return (
                      <Card key={p.id} className={`rounded-3xl border p-5 flex flex-col justify-between h-72 shadow-sm ${
                        isCurrent ? 'border-black bg-white ring-2 ring-black/5' : 'border-neutral-100 bg-white'
                      }`}>
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <h4 className="font-extrabold text-sm text-black">{p.name}</h4>
                            {isCurrent && (
                              <span className="bg-black text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-lg tracking-wider">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-1 pt-1">
                            <span className="text-3xl font-extrabold font-sans text-black">${p.price}</span>
                            <span className="text-[10px] text-gray-400 font-bold">/month</span>
                          </div>
                          <ul className="space-y-1.5 pt-3 text-[10px] font-semibold text-neutral-500 font-sans border-t border-neutral-50">
                            <li>• {p.video}</li>
                            <li>• {p.storage} quota</li>
                            <li>• {p.users}</li>
                          </ul>
                        </div>
                        <Button
                          disabled={isCurrent}
                          onClick={() => handleUpgradePlan(p.id)}
                          className={`w-full rounded-xl py-2 h-9 text-xs font-semibold ${
                            isCurrent
                              ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border'
                              : 'bg-black text-white hover:bg-neutral-800'
                          }`}
                        >
                          {isCurrent ? 'Active Plan' : 'Select Plan'}
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Invoices historical table */}
              <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6 space-y-6">
                <h3 className="text-lg font-bold text-black font-sans border-b border-neutral-50 pb-2">
                  Invoice Statements
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-medium font-sans">
                    <thead>
                      <tr className="border-b border-neutral-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="pb-3">Invoice ID</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-neutral-50/20">
                          <td className="py-3 font-semibold text-black">{inv.invoiceNumber}</td>
                          <td className="py-3 font-bold text-black">${inv.amount.toFixed(2)} {inv.currency}</td>
                          <td className="py-3 text-neutral-500">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                          <td className="py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : inv.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700 border-amber-100'
                                : 'bg-neutral-50 text-neutral-500 border-neutral-200'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="text-neutral-500 hover:text-black font-bold flex items-center gap-1 justify-end ml-auto text-[10px] bg-neutral-50 hover:bg-neutral-100 border px-2.5 py-1 rounded-lg transition-all"
                            >
                              <Download className="h-3.5 w-3.5" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* INTEGRATIONS SUB-TAB */}
          {activeSubTab === 'integrations' && (
            <div className="space-y-6">
              {[
                {
                  id: 'NVIDIA',
                  name: 'NVIDIA NIM',
                  desc: 'Used for extremely fast and high-quality script writing and ideas pipeline.',
                  help: 'NVIDIA NIM API key starts with nvapi-.'
                },
                {
                  id: 'ELEVENLABS',
                  name: 'ElevenLabs',
                  desc: 'Enables lifelike voice overs using advanced TTS generation models.',
                  help: 'xi-api-key available in ElevenLabs profile settings.'
                },
                {
                  id: 'HEYGEN',
                  name: 'HeyGen API',
                  desc: 'Enables generation of avatars and final high-quality videos.',
                  help: 'HeyGen X-Api-Key available in account integrations panel.'
                }
              ].map((prov) => {
                const keyDetail = keys[prov.id];
                const isEditing = editingKey[prov.id];
                const isTesting = keyTesting[prov.id];
                const status = keyStatus[prov.id];
                const inputVal = keyInputs[prov.id];

                return (
                  <Card key={prov.id} className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-base text-black">{prov.name}</h4>
                        <p className="text-xs text-neutral-400 font-sans mt-0.5 max-w-lg leading-relaxed">{prov.desc}</p>
                      </div>
                      {keyDetail?.connected ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Org Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200/60 px-3 py-1 text-xs font-bold text-neutral-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
                          Not Set
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                        Enterprise Key
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                          <Key className="h-4 w-4" />
                        </div>
                        <Input
                          type={showKey[prov.id] ? 'text' : 'password'}
                          value={inputVal}
                          disabled={keyDetail?.connected && !isEditing}
                          onChange={(e) => handleKeyInputChange(prov.id, e.target.value)}
                          placeholder={`${prov.id === 'NVIDIA' ? 'nvapi-' : prov.id === 'ELEVENLABS' ? 'sk_' : 'heygen_'}...`}
                          className="pl-10 pr-10 rounded-xl border-neutral-200 h-11 focus:border-black focus:ring-black text-sm font-mono disabled:bg-neutral-50 disabled:text-neutral-500 disabled:border-neutral-100"
                        />
                        {(inputVal || isEditing) && (
                          <button
                            type="button"
                            onClick={() => setShowKey(prev => ({ ...prev, [prov.id]: !prev[prov.id] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors"
                          >
                            {showKey[prov.id] ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-400 font-sans italic">{prov.help}</p>
                    </div>

                    {status && (
                      <div className={`flex items-start gap-2 text-xs rounded-xl p-3 border ${
                        status.type === 'success'
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                          : 'bg-rose-50 border-rose-100 text-rose-700'
                      }`}>
                        {status.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                        <span>{status.text}</span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-neutral-50">
                      <span className="text-[10px] text-neutral-400 font-sans font-medium">
                        {keyDetail?.connected && !isEditing && keyDetail.updatedAt
                          ? `Last Updated: ${new Date(keyDetail.updatedAt).toLocaleDateString()}`
                          : ''}
                      </span>

                      <div className="flex flex-wrap gap-2 justify-end">
                        {keyDetail?.connected && !isEditing ? (
                          <>
                            <Button
                              variant="outline"
                              disabled={isTesting}
                              onClick={() => handleTestKeyConnection(prov.id)}
                              className="border-neutral-200 text-black hover:bg-neutral-50 rounded-xl px-4 h-10 text-xs font-semibold"
                            >
                              {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                              Test Connection
                            </Button>
                            <Button
                              onClick={() => startEditingKey(prov.id)}
                              className="bg-black text-white hover:bg-neutral-800 rounded-xl px-4 h-10 text-xs font-semibold"
                            >
                              Change Key
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => handleDisconnectKey(prov.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl px-3 h-10 text-xs font-semibold"
                            >
                              Disconnect
                            </Button>
                          </>
                        ) : (
                          <>
                            {isEditing && (
                              <Button
                                variant="outline"
                                onClick={() => cancelEditingKey(prov.id)}
                                className="border-neutral-200 text-black hover:bg-neutral-50 rounded-xl px-4 h-10 text-xs font-semibold"
                              >
                                Cancel
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              disabled={isTesting || !inputVal}
                              onClick={() => handleTestKeyConnection(prov.id)}
                              className="border-neutral-200 text-black hover:bg-neutral-50 rounded-xl px-4 h-10 text-xs font-semibold"
                            >
                              {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                              Test Connection
                            </Button>
                            <Button
                              disabled={!inputVal}
                              onClick={() => handleSaveKey(prov.id)}
                              className="bg-black text-white hover:bg-neutral-800 rounded-xl px-5 h-10 text-xs font-semibold"
                            >
                              Save Org Key
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* APPROVAL & AUTOMATION SUB-TAB */}
          {activeSubTab === 'automation' && (
            <div className="space-y-6">
              {/* Approval Workflow Policy */}
              <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6 space-y-6">
                <div className="flex justify-between items-start border-b border-neutral-50 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-black font-sans">
                      Approval Workflows
                    </h3>
                    <p className="text-xs text-neutral-400 font-sans mt-0.5 leading-relaxed">
                      Enforce administrative review policies on newly scheduled publications.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200/60 px-3 py-1 text-xs font-bold text-neutral-600">
                    <Shield className="h-3.5 w-3.5 text-neutral-500" />
                    Security Policy
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                  <div className="space-y-0.5 max-w-md">
                    <p className="text-sm font-bold text-neutral-800 font-sans">Require Admin Approval</p>
                    <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                      When enabled, all videos submitted for scheduling by editors or standard users must be reviewed and approved by an Organization Admin before being published.
                    </p>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={orgForm.approvalRequired}
                      onChange={(e) => handleToggleApprovalRequired(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
              </Card>

              {/* Automation Rules */}
              <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6 space-y-6">
                <div className="border-b border-neutral-50 pb-4">
                  <h3 className="text-lg font-bold text-black font-sans">
                    Automation Triggers
                  </h3>
                  <p className="text-xs text-neutral-400 font-sans mt-0.5 leading-relaxed">
                    Set up triggers and rules (IF-THEN conditions) to automate post-publishing actions.
                  </p>
                </div>

                {/* Create Rule Form */}
                <form onSubmit={handleCreateRule} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-neutral-50/50 p-4 rounded-2xl border border-neutral-100/60">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      IF Trigger Event
                    </label>
                    <select
                      value={newRuleForm.triggerEvent}
                      onChange={(e) => setNewRuleForm(prev => ({ ...prev, triggerEvent: e.target.value }))}
                      className="w-full rounded-xl border border-neutral-200 bg-white h-10 px-3 text-xs focus:border-black focus:ring-black"
                    >
                      <option value="VIDEO_APPROVED">Video Approved</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      THEN Perform Action
                    </label>
                    <select
                      value={newRuleForm.actionType}
                      onChange={(e) => setNewRuleForm(prev => ({ ...prev, actionType: e.target.value }))}
                      className="w-full rounded-xl border border-neutral-200 bg-white h-10 px-3 text-xs focus:border-black focus:ring-black"
                    >
                      <option value="SCHEDULE_TOMORROW_9AM">Schedule for Tomorrow at 9:00 AM</option>
                    </select>
                  </div>

                  <Button
                    type="submit"
                    disabled={creatingRule}
                    className="bg-black text-white hover:bg-neutral-800 rounded-xl h-10 text-xs font-bold w-full"
                  >
                    {creatingRule ? 'Creating...' : 'Add Rule'}
                  </Button>
                </form>

                {/* Automation Rules List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Active Rules
                  </h4>
                  {automationRules.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/20">
                      <p className="text-xs text-neutral-400 italic">No automation rules configured for this organization.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-2xl bg-white overflow-hidden shadow-sm">
                      {automationRules.map((rule) => (
                        <div key={rule.id} className="flex items-center justify-between p-4 hover:bg-neutral-50/50 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-neutral-800">
                                IF {rule.triggerEvent.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-neutral-400">→</span>
                              <span className="text-xs font-bold text-black bg-neutral-100 border border-neutral-200/50 px-2 py-0.5 rounded-lg">
                                {rule.actionType === 'SCHEDULE_TOMORROW_9AM' ? 'Schedule for Tomorrow at 9:00 AM' : rule.actionType.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-400">
                              Created on {new Date(rule.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="relative inline-flex inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={rule.active}
                                onChange={() => handleToggleRuleActive(rule.id, rule.active)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                            </label>

                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="text-neutral-400 hover:text-red-600 p-1 hover:bg-neutral-100 rounded-lg transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: DOMAINS & SECURITY INFO */}
        <div className="lg:col-span-4 space-y-6">
          {/* Custom Domains Manager */}
          <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white p-6 space-y-5 overflow-hidden">
            <h3 className="font-bold text-base text-black font-sans border-b border-neutral-50 pb-2 flex items-center gap-2">
              <Globe className="h-4.5 w-4.5 text-neutral-500" />
              Custom Domains
            </h3>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              Route your verified custom domain names directly to this organization layout.
            </p>

            <form onSubmit={handleAddDomain} className="flex gap-2">
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="studio.acme.com"
                required
                className="rounded-xl border-neutral-200 h-10 text-xs focus:border-black focus:ring-black"
              />
              <Button
                type="submit"
                className="bg-black text-white hover:bg-neutral-800 rounded-xl px-3 h-10 text-xs font-semibold shrink-0"
              >
                Add
              </Button>
            </form>

            <div className="space-y-2 pt-2 border-t border-neutral-50">
              {domains.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic py-2 text-center">No domains added yet.</p>
              ) : (
                domains.map((dom) => (
                  <div key={dom.id} className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 bg-neutral-50/30 text-xs">
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-black truncate font-mono">{dom.domain}</span>
                      {dom.verified ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 mt-0.5">
                          <Check className="h-3 w-3 shrink-0" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-500 mt-0.5">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          Needs DNS Setup
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {!dom.verified && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={verifyingDomainId === dom.id}
                          onClick={() => handleVerifyDomain(dom.id)}
                          className="h-7 rounded-lg text-[9px] font-bold px-2 border-neutral-200"
                        >
                          {verifyingDomainId === dom.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Verify'}
                        </Button>
                      )}
                      <button
                        onClick={() => handleDeleteDomain(dom.id)}
                        className="text-neutral-400 hover:text-red-600 p-1 hover:bg-neutral-100 rounded-lg transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Security & Organization Panel Card */}
          <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white p-6 space-y-4">
            <h3 className="font-bold text-sm text-black font-sans border-b border-neutral-50 pb-2">
              SaaS Limits & Policies
            </h3>
            <div className="space-y-3 font-sans text-xs">
              <div className="flex justify-between py-0.5">
                <span className="text-neutral-400 font-semibold">Tenant Isolation</span>
                <span className="font-bold text-neutral-800">Strict Database Range</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-neutral-400 font-semibold">Branding Overrides</span>
                <span className="font-bold text-neutral-800">Active</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-neutral-400 font-semibold">Invite Tokens</span>
                <span className="font-bold text-neutral-800">7 Days Expiry</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Invoice Statements Details Modal (Simulated PDF download style) */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-neutral-100 shadow-2xl p-8 max-w-lg w-full space-y-6 relative animate-in zoom-in-95 duration-200">
            {/* Header info */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <ThinkNextLogo variant="compact" size="xs" />
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1.5">ThinkNEXT Video Platform</p>
              </div>
              <div className="text-right">
                <h2 className="text-base font-extrabold text-black uppercase tracking-tight">Invoice Receipt</h2>
                <span className="text-[11px] font-mono text-neutral-500 font-semibold block">{selectedInvoice.invoiceNumber}</span>
              </div>
            </div>

            {/* Bill details */}
            <div className="grid grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Billed To</span>
                <p className="font-bold text-black mt-1">{org?.name || 'Organization Tenant'}</p>
                <p className="text-neutral-500 mt-0.5">{org?.slug}.script-ai.com</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Issued On</span>
                <p className="font-bold text-black mt-1">{new Date(selectedInvoice.issuedAt).toLocaleDateString()}</p>
                <p className="text-neutral-500 mt-0.5">Paid via simulated Stripe gateway</p>
              </div>
            </div>

            {/* Items table */}
            <div className="border border-neutral-100 rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left font-sans">
                <thead>
                  <tr className="bg-neutral-50 font-bold border-b border-neutral-100 text-gray-500 uppercase tracking-wider text-[9px]">
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 font-semibold text-black">
                      Subscription Upgrade: {org?.subscriptionPlan} Plan
                      <span className="block text-[10px] text-neutral-400 font-normal mt-0.5">Recurring Monthly SaaS License Quotas</span>
                    </td>
                    <td className="p-3 text-right font-extrabold text-black">${selectedInvoice.amount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Receipt Summary */}
            <div className="flex justify-between items-center bg-neutral-900 text-white rounded-2xl p-4 font-sans text-xs">
              <span className="font-extrabold uppercase tracking-wider text-[10px]">Total Amount Paid</span>
              <span className="text-lg font-black">${selectedInvoice.amount.toFixed(2)} USD</span>
            </div>

            {/* Actions / Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedInvoice(null)}
                className="border-neutral-200 text-black hover:bg-neutral-50 rounded-xl px-4 h-10 text-xs font-semibold"
              >
                Close Statement
              </Button>
              <Button
                onClick={() => {
                  window.print();
                }}
                className="bg-black text-white hover:bg-neutral-800 rounded-xl px-5 h-10 text-xs font-semibold"
              >
                Print Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
