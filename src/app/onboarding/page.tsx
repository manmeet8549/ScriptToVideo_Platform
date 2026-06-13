'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn } from 'next-auth/react';
import { 
  Building, CreditCard, Shield, Users, Sparkles, Paintbrush, 
  ArrowRight, ArrowLeft, Loader2, Check, HelpCircle, AlertCircle, 
  Play, Volume2, FileText, Lightbulb
} from 'lucide-react';
import ThinkNextLogo from '@/components/ThinkNextLogo';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const STEPS = [
  { id: 'org', label: 'Company' },
  { id: 'plan', label: 'Plan' },
  { id: 'template', label: 'Template' },
  { id: 'branding', label: 'Branding' },
  { id: 'admin', label: 'Administrator' },
  { id: 'invites', label: 'Invite Team' }
];

const PLANS = [
  { id: 'FREE', name: 'Free Tier', price: 0, credits: '2 renders', storage: '2 GB', features: ['2 Team Members', '1 Editor Connection', '5 AI Scripts'] },
  { id: 'STARTER', name: 'Starter', price: 29, credits: '20 renders', storage: '10 GB', features: ['5 Team Members', '2 Editor Connections', '50 AI Scripts'] },
  { id: 'PRO', name: 'Professional', price: 79, credits: '100 renders', storage: '50 GB', features: ['15 Team Members', '5 Editor Connections', '200 AI Scripts', 'Branding Customize'] },
  { id: 'BUSINESS', name: 'Business', price: 249, credits: '500 renders', storage: '200 GB', features: ['50 Team Members', '15 Editor Connections', '500 AI Scripts', 'Custom Domain'] },
  { id: 'ENTERPRISE', name: 'Enterprise', price: 999, credits: '5000 renders', storage: '1 TB', features: ['Unlimited Members', 'Unlimited Editors', '10k AI Scripts', 'Dedicated Support'] }
];

const TEMPLATES = [
  { id: 'marketing', name: 'Marketing Agency', desc: 'Preconfigured for ad campaigns, socials, and promotional reels.', primary: '#0f766e', secondary: '#f0fdfa' },
  { id: 'youtube', name: 'YouTube Content Creator', desc: 'Preconfigured for video publishing, long drafts, and editors.', primary: '#e11d48', secondary: '#fff1f2' },
  { id: 'realestate', name: 'Real Estate Brokerage', desc: 'Preconfigured for virtual home tours, voiceovers, and quick exports.', primary: '#1d4ed8', secondary: '#eff6ff' },
  { id: 'education', name: 'Education & Training', desc: 'Preconfigured for online course materials, slides, and scripts.', primary: '#7c3aed', secondary: '#f5f3ff' },
  { id: 'custom', name: 'Custom Branding', desc: 'Start with a clean slate and configure colors manually.', primary: '#000000', secondary: '#ffffff' }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Core Form State
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('PRO');
  const [selectedTemplate, setSelectedTemplate] = useState('marketing');
  const [primaryColor, setPrimaryColor] = useState('#0f766e');
  const [secondaryColor, setSecondaryColor] = useState('#f0fdfa');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [currentInviteEmail, setCurrentInviteEmail] = useState('');

  // Handle Organization Name change auto-generating the slug
  const handleOrgNameChange = (val: string) => {
    setOrgName(val);
    const slug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setOrgSlug(slug);
  };

  const handleTemplateSelect = (id: string, primary: string, secondary: string) => {
    setSelectedTemplate(id);
    if (id !== 'custom') {
      setPrimaryColor(primary);
      setSecondaryColor(secondary);
    }
  };

  const handleAddInvite = () => {
    if (currentInviteEmail.trim() && !inviteEmails.includes(currentInviteEmail.trim())) {
      setInviteEmails([...inviteEmails, currentInviteEmail.trim()]);
      setCurrentInviteEmail('');
    }
  };

  const handleRemoveInvite = (index: number) => {
    setInviteEmails(inviteEmails.filter((_, i) => i !== index));
  };

  const nextStep = () => {
    setErrorMsg(null);
    if (activeStepIndex === 0) {
      if (!orgName.trim()) {
        setErrorMsg('Organization name is required.');
        return;
      }
      if (!orgSlug.trim()) {
        setErrorMsg('Subdomain slug is required.');
        return;
      }
    }
    if (activeStepIndex === 4) {
      if (!adminName.trim()) {
        setErrorMsg('Administrator name is required.');
        return;
      }
      if (!adminEmail.trim()) {
        setErrorMsg('Administrator email is required.');
        return;
      }
      if (adminPassword.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
    }
    setActiveStepIndex(prev => Math.min(STEPS.length - 1, prev + 1));
  };

  const prevStep = () => {
    setErrorMsg(null);
    setActiveStepIndex(prev => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/organizations/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName,
          orgSlug,
          plan: selectedPlan,
          primaryColor,
          secondaryColor,
          adminName,
          adminEmail,
          adminPassword,
          invites: inviteEmails
        })
      });

      const body = await res.json();
      if (!res.ok) {
        setErrorMsg(body.error ?? 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      // Auto login
      const result = await signIn('credentials', {
        email: adminEmail,
        password: adminPassword,
        redirect: false
      });

      if (result?.error) {
        router.push('/');
      } else {
        // Redirect to the tenant subdomain or path
        const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000';
        // If testing on localhost, we can redirect to path or subdomain
        if (mainDomain.includes('localhost')) {
          // Path fallback or subdomain mapping
          router.push(`/?tab=dashboard`);
        } else {
          window.location.href = `${window.location.protocol}//${orgSlug}.${mainDomain}`;
        }
      }
    } catch (err) {
      setErrorMsg('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-black flex flex-col justify-between font-sans">
      {/* Header bar */}
      <header className="border-b border-gray-150 bg-white/80 backdrop-blur-md px-8 py-4 sticky top-0 flex items-center justify-between z-40">
        <ThinkNextLogo variant="full" size="sm" />
        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider">
          <Shield className="h-4 w-4 text-neutral-400" />
          <span>Tenant Configuration Wizard</span>
        </div>
      </header>

      {/* Main wizard frame */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center items-center">
        
        {/* Step progress indicators */}
        <div className="w-full flex justify-between items-center mb-8 max-w-md">
          {STEPS.map((step, idx) => {
            const isActive = idx === activeStepIndex;
            const isCompleted = idx < activeStepIndex;
            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                <div 
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    isActive 
                      ? 'bg-black text-white ring-4 ring-black/10' 
                      : isCompleted 
                        ? 'bg-neutral-950 text-white' 
                        : 'bg-white border border-gray-250 text-gray-400'
                  }`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 ${isCompleted ? 'bg-black' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Wizard Panel */}
        <Card className="rounded-[32px] border border-gray-100/80 shadow-2xl bg-white w-full max-w-2xl overflow-hidden p-8 md:p-12 min-h-[460px] flex flex-col justify-between relative">
          
          <AnimatePresence mode="wait">
            
            {/* STEP 1: ORGANIZATION CREATION */}
            {activeStepIndex === 0 && (
              <motion.div
                key="step-org"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 flex-1 flex flex-col justify-center"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-widest flex items-center gap-1">
                    <Building className="h-3 w-3" /> Step 1: Create Organization
                  </span>
                  <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
                    Let&apos;s start with your company profile
                  </h2>
                  <p className="text-sm text-gray-500 max-w-lg leading-relaxed">
                    Set up your secure, isolated database partition. Pick a name and subdomain slug for your team workspace.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Company / Organization Name</label>
                    <Input
                      placeholder="e.g. Acme Video Studio"
                      value={orgName}
                      onChange={(e) => handleOrgNameChange(e.target.value)}
                      className="rounded-xl border-gray-200 h-11 focus:ring-black focus:border-black text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Workspace Subdomain URL</label>
                    <div className="flex rounded-xl overflow-hidden border border-gray-200 focus-within:ring-1 focus-within:ring-black focus-within:border-black bg-white items-center">
                      <input
                        type="text"
                        placeholder="acme-studio"
                        value={orgSlug}
                        onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                        className="pl-3.5 pr-2 py-2.5 text-sm outline-none bg-transparent font-semibold flex-grow text-neutral-800"
                      />
                      <span className="bg-gray-50 text-gray-400 px-4 py-2.5 text-xs font-bold border-l border-gray-150 uppercase tracking-wider">
                        .localhost:3000
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      Lowercase letters, numbers, and hyphens only. No spaces.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: CHOOSE PLAN */}
            {activeStepIndex === 1 && (
              <motion.div
                key="step-plan"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 flex-1 flex flex-col justify-center"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-widest flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Step 2: Choose Subscription Plan
                  </span>
                  <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
                    Select a resource limit
                  </h2>
                  <p className="text-xs text-gray-500 leading-normal">
                    Billing quotas define allowable seats, editor integrations, and monthly AI credits pool.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {PLANS.map((plan) => {
                    const isSelected = selectedPlan === plan.id;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`rounded-2xl border p-4 transition-all duration-200 cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-black bg-white ring-1 ring-black shadow-md'
                            : 'border-gray-150 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-black bg-black text-white' : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-black flex items-center gap-2">
                              {plan.name}
                              {plan.id === 'PRO' && (
                                <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase">
                                  Popular
                                </span>
                              )}
                            </h4>
                            <span className="text-[10px] text-gray-400 block mt-0.5">
                              {plan.credits} • {plan.storage} storage • {plan.features[0]}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-lg font-black text-black">${plan.price}</span>
                          <span className="text-[9px] text-gray-400 block font-bold">/ month</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 3: CHOOSE TEMPLATE */}
            {activeStepIndex === 2 && (
              <motion.div
                key="step-template"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 flex-1 flex flex-col justify-center"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Step 3: Choose Agency Template
                  </span>
                  <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
                    Preconfigure workspace
                  </h2>
                  <p className="text-xs text-gray-500 leading-normal">
                    Templates customize workspace colors, configure starting credit structures, and select avatars layout.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {TEMPLATES.map((tpl) => {
                    const isSelected = selectedTemplate === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => handleTemplateSelect(tpl.id, tpl.primary, tpl.secondary)}
                        className={`rounded-2xl border p-3.5 transition-all duration-200 cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-black bg-white ring-1 ring-black shadow-sm'
                            : 'border-gray-150 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="min-w-0 flex-grow pr-3">
                          <h4 className="font-extrabold text-sm text-black truncate flex items-center gap-2">
                            {tpl.name}
                          </h4>
                          <span className="text-[10px] text-gray-400 block mt-0.5 leading-normal">
                            {tpl.desc}
                          </span>
                        </div>

                        {tpl.id !== 'custom' && (
                          <div className="flex gap-1 shrink-0">
                            <span className="h-5 w-5 rounded-full border border-gray-200" style={{ backgroundColor: tpl.primary }} />
                            <span className="h-5 w-5 rounded-full border border-gray-200" style={{ backgroundColor: tpl.secondary }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 4: BRANDING SETUP */}
            {activeStepIndex === 3 && (
              <motion.div
                key="step-branding"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 flex-1 flex flex-col justify-center"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-widest flex items-center gap-1">
                    <Paintbrush className="h-3 w-3" /> Step 4: Configure Branding Customizer
                  </span>
                  <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
                    Setup white-label colors
                  </h2>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-lg">
                    Customize your company colors. Standard components, logins, and settings views will dynamically adapt.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 items-end">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 block">Primary Brand Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-10 border border-gray-200 rounded-lg overflow-hidden p-0.5 cursor-pointer shrink-0"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="rounded-xl border-gray-200 h-10 font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 block">Secondary Background Accent</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="h-10 w-10 border border-gray-200 rounded-lg overflow-hidden p-0.5 cursor-pointer shrink-0"
                      />
                      <Input
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="rounded-xl border-gray-200 h-10 font-mono text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview Button */}
                <div className="border border-neutral-100 rounded-2xl p-4 bg-gray-50/50 flex flex-col gap-2 items-center text-center">
                  <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block">
                    Real-time button color render preview
                  </span>
                  <button
                    type="button"
                    className="rounded-xl font-bold text-xs px-8 py-3 transition-colors shadow-sm"
                    style={{ backgroundColor: primaryColor, color: secondaryColor }}
                  >
                    Generate Video with {orgName || 'Studio'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: CREATE ADMIN */}
            {activeStepIndex === 4 && (
              <motion.div
                key="step-admin"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 flex-1 flex flex-col justify-center"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-widest flex items-center gap-1">
                    <Users className="h-3 w-3" /> Step 5: Setup Admin Account
                  </span>
                  <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
                    Create your Admin User profile
                  </h2>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-lg">
                    This account will be assigned the `ORG_ADMIN` role, allowing full team control, subscriptions management, and credits allocation.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold text-gray-700">Full Name</label>
                    <Input
                      placeholder="e.g. Jane Doe"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="rounded-xl border-gray-200 h-11 focus:ring-black focus:border-black text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Corporate Email</label>
                    <Input
                      type="email"
                      placeholder="jane@acme.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="rounded-xl border-gray-200 h-11 focus:ring-black focus:border-black text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Account Password</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="rounded-xl border-gray-200 h-11 focus:ring-black focus:border-black text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 6: INVITE TEAM */}
            {activeStepIndex === 5 && (
              <motion.div
                key="step-invites"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 flex-1 flex flex-col justify-center"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-widest flex items-center gap-1">
                    <Users className="h-3 w-3" /> Step 6: Invite Team Members
                  </span>
                  <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
                    Invite your crew to join
                  </h2>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-lg">
                    Send email invitation tokens to video editors or team users. Invitees can register instantly.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="colleague@acme.com"
                      value={currentInviteEmail}
                      onChange={(e) => setCurrentInviteEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddInvite(); } }}
                      className="rounded-xl border-gray-200 h-11 flex-grow focus:ring-black focus:border-black text-sm"
                    />
                    <Button
                      type="button"
                      onClick={handleAddInvite}
                      className="rounded-xl bg-black text-white px-5 h-11 text-xs font-bold hover:bg-neutral-800 shrink-0"
                    >
                      Add Tag
                    </Button>
                  </div>

                  {/* List of emails */}
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                    {inviteEmails.length === 0 ? (
                      <span className="text-xs text-gray-400 italic font-medium">No team members added yet.</span>
                    ) : (
                      inviteEmails.map((email, idx) => (
                        <span key={email} className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-100 border border-neutral-200 rounded-full text-xs font-bold text-neutral-800">
                          {email}
                          <button
                            type="button"
                            onClick={() => handleRemoveInvite(idx)}
                            className="text-neutral-400 hover:text-red-600 text-sm font-black focus:outline-none ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Form validation error display */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs text-rose-700 mt-6 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Wizard Footer buttons */}
          <div className="flex justify-between items-center border-t border-gray-100 pt-6 mt-8 shrink-0">
            {activeStepIndex > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={loading}
                className="rounded-2xl border-gray-250 hover:bg-gray-50 h-11 px-5 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <div />
            )}

            {activeStepIndex < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="rounded-2xl bg-black text-white hover:bg-neutral-800 h-11 px-6 text-xs font-bold transition-all flex items-center gap-1.5 ml-auto"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
                className="rounded-2xl bg-black text-white hover:bg-neutral-800 h-11 px-8 text-xs font-bold transition-all flex items-center gap-1.5 ml-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    Launching Workspace...
                  </>
                ) : (
                  <>
                    Create & Launch Workspace <Sparkles className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>

        </Card>
      </main>

      {/* Footer bar */}
      <footer className="border-t border-gray-150 bg-white/40 px-8 py-5 text-center text-xs text-gray-400 font-medium font-sans">
        © 2026 ScriptForge Technologies Inc. All Rights Reserved. Secure AES-256 cloud encryption active.
      </footer>
    </div>
  );
}
