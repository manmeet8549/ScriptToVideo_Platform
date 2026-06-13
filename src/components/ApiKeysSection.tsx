'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Key, Lock, Shield, Check, Eye, EyeOff,
  Loader2, ArrowRight, CheckCircle2, AlertCircle
} from 'lucide-react';
import {
  useProviderKeys,
  useSaveProviderKey,
  useTestProviderKey
} from '@/hooks/useProviderKeys';

type ProviderName = 'OPENAI' | 'NVIDIA' | 'ELEVENLABS' | 'HEYGEN' | 'ZERNIO';

export default function ApiKeysSection() {
  const { data: keys, isLoading, refetch } = useProviderKeys();
  const saveMutation = useSaveProviderKey();
  const testMutation = useTestProviderKey();

  const [editing, setEditing] = useState<Record<ProviderName, boolean>>({
    OPENAI: false,
    NVIDIA: false,
    ELEVENLABS: false,
    HEYGEN: false,
    ZERNIO: false,
  });

  const [inputs, setInputs] = useState<Record<ProviderName, string>>({
    OPENAI: '',
    NVIDIA: '',
    ELEVENLABS: '',
    HEYGEN: '',
    ZERNIO: '',
  });

  const [showKey, setShowKey] = useState<Record<ProviderName, boolean>>({
    OPENAI: false,
    NVIDIA: false,
    ELEVENLABS: false,
    HEYGEN: false,
    ZERNIO: false,
  });

  const [statusMsg, setStatusMsg] = useState<Record<ProviderName, { text: string; type: 'success' | 'error' } | null>>({
    OPENAI: null,
    NVIDIA: null,
    ELEVENLABS: null,
    HEYGEN: null,
    ZERNIO: null,
  });

  const [testing, setTesting] = useState<Record<ProviderName, boolean>>({
    OPENAI: false,
    NVIDIA: false,
    ELEVENLABS: false,
    HEYGEN: false,
    ZERNIO: false,
  });

  useEffect(() => {
    if (keys) {
      setInputs({
        OPENAI: keys.OPENAI?.connected ? `${keys.OPENAI.prefix}••••••••••••••••${keys.OPENAI.lastFour}` : '',
        NVIDIA: keys.NVIDIA?.connected ? `${keys.NVIDIA.prefix}••••••••••••••••${keys.NVIDIA.lastFour}` : '',
        ELEVENLABS: keys.ELEVENLABS?.connected ? `${keys.ELEVENLABS.prefix}••••••••••••••••${keys.ELEVENLABS.lastFour}` : '',
        HEYGEN: keys.HEYGEN?.connected ? `${keys.HEYGEN.prefix}••••••••••••••••${keys.HEYGEN.lastFour}` : '',
        ZERNIO: keys.ZERNIO?.connected ? `${keys.ZERNIO.prefix}••••••••••••••••${keys.ZERNIO.lastFour}` : '',
      });
      setEditing({
        OPENAI: false,
        NVIDIA: false,
        ELEVENLABS: false,
        HEYGEN: false,
        ZERNIO: false,
      });
    }
  }, [keys]);

  const handleInputChange = (provider: ProviderName, value: string) => {
    setInputs((prev) => ({ ...prev, [provider]: value }));
    if (statusMsg[provider]) {
      setStatusMsg((prev) => ({ ...prev, [provider]: null }));
    }
  };

  const startEditing = (provider: ProviderName) => {
    setEditing((prev) => ({ ...prev, [provider]: true }));
    setInputs((prev) => ({ ...prev, [provider]: '' }));
    setStatusMsg((prev) => ({ ...prev, [provider]: null }));
  };

  const cancelEditing = (provider: ProviderName) => {
    setEditing((prev) => ({ ...prev, [provider]: false }));
    const keyDetail = keys?.[provider];
    setInputs((prev) => ({
      ...prev,
      [provider]: keyDetail?.connected ? `${keyDetail.prefix}••••••••••••••••${keyDetail.lastFour}` : '',
    }));
    setStatusMsg((prev) => ({ ...prev, [provider]: null }));
  };

  const handleTestConnection = async (provider: ProviderName) => {
    setTesting((prev) => ({ ...prev, [provider]: true }));
    setStatusMsg((prev) => ({ ...prev, [provider]: null }));

    const isCurrentlyEditing = editing[provider];
    const inputValue = inputs[provider];
    const keyToTest = isCurrentlyEditing ? inputValue : undefined;

    try {
      const result = await testMutation.mutateAsync({
        provider,
        key: keyToTest,
      });

      if (result.success) {
        setStatusMsg((prev) => ({
          ...prev,
          [provider]: { text: 'Connection verified successfully!', type: 'success' },
        }));
      } else {
        setStatusMsg((prev) => ({
          ...prev,
          [provider]: { text: result.message || 'Verification failed. Check your API key.', type: 'error' },
        }));
      }
    } catch (err) {
      const error = err as Error;
      setStatusMsg((prev) => ({
        ...prev,
        [provider]: { text: error.message || 'Network error during validation.', type: 'error' },
      }));
    } finally {
      setTesting((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handleSaveKey = async (provider: ProviderName) => {
    setStatusMsg((prev) => ({ ...prev, [provider]: null }));
    const value = inputs[provider];

    if (!value.trim()) {
      setStatusMsg((prev) => ({
        ...prev,
        [provider]: { text: 'API key cannot be empty.', type: 'error' },
      }));
      return;
    }

    try {
      const result = await saveMutation.mutateAsync({
        provider,
        key: value,
      });

      if (result.success) {
        setStatusMsg((prev) => ({
          ...prev,
          [provider]: { text: 'API Key saved successfully.', type: 'success' },
        }));
        setEditing((prev) => ({ ...prev, [provider]: false }));
        refetch();
      }
    } catch (err) {
      const error = err as Error;
      setStatusMsg((prev) => ({
        ...prev,
        [provider]: { text: error.message || 'Failed to save key.', type: 'error' },
      }));
    }
  };

  const handleDisconnect = async (provider: ProviderName) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return;

    setStatusMsg((prev) => ({ ...prev, [provider]: null }));

    try {
      const result = await saveMutation.mutateAsync({
        provider,
        key: '', // sending empty string triggers deletion
      });

      if (result.success) {
        setStatusMsg((prev) => ({
          ...prev,
          [provider]: { text: 'Provider disconnected.', type: 'success' },
        }));
        setEditing((prev) => ({ ...prev, [provider]: false }));
        refetch();
      }
    } catch (err) {
      const error = err as Error;
      setStatusMsg((prev) => ({
        ...prev,
        [provider]: { text: error.message || 'Failed to disconnect.', type: 'error' },
      }));
    }
  };

  const toggleKeyVisibility = (provider: ProviderName) => {
    setShowKey((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-3" />
        <p className="text-sm text-gray-500 font-sans">Loading credentials...</p>
      </div>
    );
  }

  const getFormattedDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const providersConfig = [
    {
      id: 'OPENAI' as const,
      name: 'OpenAI (Priority)',
      purpose: 'Script Generation (gpt-4o) — Highest Priority',
      placeholder: 'sk-proj-...',
      helpText: (
        <>
          Get your API key from your{' '}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-600 underline font-semibold hover:text-black transition-colors"
          >
            OpenAI Dashboard
          </a>.
        </>
      ),
    },
    {
      id: 'NVIDIA' as const,
      name: 'NVIDIA NIM (Fallback)',
      purpose: 'Script Generation (Llama 3.1) — Fallback Engine',
      placeholder: 'nvapi-...',
      helpText: (
        <>
          Get your API key from your{' '}
          <a
            href="https://build.nvidia.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-600 underline font-semibold hover:text-black transition-colors"
          >
            NVIDIA Build Console
          </a>.
        </>
      ),
    },
    {
      id: 'ELEVENLABS' as const,
      name: 'ElevenLabs',
      purpose: 'Voice Synthesis & Realistic Audio',
      placeholder: 'sk_...',
      helpText: (
        <>
          Get your API key from your{' '}
          <a
            href="https://elevenlabs.io/app/settings/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-600 underline font-semibold hover:text-black transition-colors"
          >
            ElevenLabs Settings
          </a>.
        </>
      ),
    },
    {
      id: 'HEYGEN' as const,
      name: 'HeyGen',
      purpose: 'AI Avatar Video Generation',
      placeholder: 'heygen_...',
      helpText: (
        <>
          Get your API key from your{' '}
          <a
            href="https://app.heygen.com/settings"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-600 underline font-semibold hover:text-black transition-colors"
          >
            HeyGen Settings
          </a>.
        </>
      ),
    },
    {
      id: 'ZERNIO' as const,
      name: 'Zernio',
      purpose: 'Social Media Multi-Platform Publishing',
      placeholder: 'zr-...',
      helpText: (
        <>
          Get your API key from your{' '}
          <a
            href="https://zernio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-600 underline font-semibold hover:text-black transition-colors"
          >
            Zernio Account
          </a>.
        </>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Top Tag Pill & Header */}
      <div className="space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200/60 px-3 py-1 text-xs font-bold text-neutral-600">
          <Key className="h-3.5 w-3.5 text-neutral-500" />
          API Keys
        </span>
        <h1 className="text-4xl font-extrabold font-sans tracking-tight text-black">
          Connect Your AI Providers
        </h1>
        <p className="text-sm text-neutral-500 font-sans max-w-2xl leading-relaxed">
          ScriptForge uses your own API keys to generate scripts, voiceovers and videos. Your keys
          remain private, encrypted at rest, and are only used during active generation sessions.
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Workflow & Provider cards */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card 1: The Generation Workflow */}
          <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5 text-gray-500">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  <h3 className="font-bold text-base text-black font-sans leading-tight">
                    The Generation Workflow
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
                  <Lock className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Encrypted Connection</span>
                </div>
              </div>

              {/* Workflow Flowchart row */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-neutral-50/50 rounded-2xl p-5 border border-neutral-100">
                <div className="text-center space-y-1.5 flex-1">
                  <span className="font-bold text-sm text-black block">OpenAI / NVIDIA</span>
                  <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                    Script Generator
                  </span>
                </div>
                <div className="flex justify-center shrink-0">
                  <ArrowRight className="h-4 w-4 text-neutral-300 rotate-90 sm:rotate-0" />
                </div>
                <div className="text-center space-y-1.5 flex-1">
                  <span className="font-bold text-sm text-black block">ElevenLabs</span>
                  <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                    Voiceover Engine
                  </span>
                </div>
                <div className="flex justify-center shrink-0">
                  <ArrowRight className="h-4 w-4 text-neutral-300 rotate-90 sm:rotate-0" />
                </div>
                <div className="text-center space-y-1.5 flex-1">
                  <span className="font-bold text-sm text-black block">HeyGen</span>
                  <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                    Avatar Video
                  </span>
                </div>
                <div className="flex justify-center shrink-0">
                  <ArrowRight className="h-4 w-4 text-neutral-300 rotate-90 sm:rotate-0" />
                </div>
                <div className="text-center space-y-1.5 flex-1">
                  <span className="font-bold text-sm text-black block">Zernio</span>
                  <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                    Multi-Pub Auto
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Providers list */}
          {providersConfig.map((p) => {
            const isConnected = keys?.[p.id]?.connected;
            const isEditing = editing[p.id];
            const inputValue = inputs[p.id];
            const showPassword = showKey[p.id];
            const msg = statusMsg[p.id];
            const isTesting = testing[p.id];

            return (
              <Card key={p.id} className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-black font-sans leading-tight">{p.name}</h3>
                      <p className="text-xs text-neutral-400 font-sans mt-0.5">
                        Purpose: {p.purpose}
                      </p>
                    </div>
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200/60 px-3 py-1 text-xs font-bold text-neutral-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
                        Not Connected
                      </span>
                    )}
                  </div>

                  {/* Input section */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                      API Key
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                        <Key className="h-4 w-4" />
                      </div>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={p.placeholder}
                        value={inputValue}
                        disabled={isConnected && !isEditing}
                        onChange={(e) => handleInputChange(p.id, e.target.value)}
                        className="pl-10 pr-10 rounded-xl border-neutral-200 h-11 focus:border-black focus:ring-black text-sm bg-neutral-50/20 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:border-neutral-100 font-mono"
                      />
                      {(inputValue || isEditing) && (
                        <button
                          type="button"
                          onClick={() => toggleKeyVisibility(p.id)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                        </button>
                      )}
                    </div>
                    {/* Help text */}
                    {(!isConnected || isEditing) && p.helpText && (
                      <p className="text-[11px] text-neutral-400 font-sans mt-1">
                        {p.helpText}
                      </p>
                    )}
                  </div>

                  {/* Status Alert Msg */}
                  {msg && (
                    <div
                      className={`flex items-start gap-2 text-xs rounded-xl p-3 border ${
                        msg.type === 'success'
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                          : 'bg-red-50 border-red-100 text-red-700'
                      }`}
                    >
                      {msg.type === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      )}
                      <span>{msg.text}</span>
                    </div>
                  )}

                  {/* Footer controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <span className="text-[11px] text-neutral-400 font-sans font-medium">
                      {isConnected && !isEditing && keys?.[p.id]?.updatedAt
                        ? `Last Verified: ${getFormattedDate(keys[p.id].updatedAt)}`
                        : ''}
                    </span>

                    <div className="flex flex-wrap gap-2 justify-end">
                      {isConnected && !isEditing ? (
                        <>
                          <Button
                            variant="outline"
                            disabled={isTesting}
                            onClick={() => handleTestConnection(p.id)}
                            className="border-neutral-200 text-black hover:bg-neutral-50 rounded-xl px-4 h-10 text-xs font-semibold bg-white"
                          >
                            {isTesting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : null}
                            Test Connection
                          </Button>
                          <Button
                            onClick={() => startEditing(p.id)}
                            className="bg-black text-white hover:bg-neutral-800 rounded-xl px-4 h-10 text-xs font-semibold"
                          >
                            Update Key
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => handleDisconnect(p.id)}
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
                              onClick={() => cancelEditing(p.id)}
                              className="border-neutral-200 text-black hover:bg-neutral-50 rounded-xl px-4 h-10 text-xs font-semibold bg-white"
                            >
                              Cancel
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            disabled={isTesting || !inputValue}
                            onClick={() => handleTestConnection(p.id)}
                            className="border-neutral-200 text-black hover:bg-neutral-50 rounded-xl px-4 h-10 text-xs font-semibold bg-white"
                          >
                            {isTesting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : null}
                            Test Connection
                          </Button>
                          <Button
                            disabled={saveMutation.isPending || !inputValue}
                            onClick={() => handleSaveKey(p.id)}
                            className="bg-black text-white hover:bg-neutral-800 rounded-xl px-5 h-10 text-xs font-semibold"
                          >
                            {saveMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              'Save Key'
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

        </div>

        {/* Right Column: Security & Privacy panel */}
        <div className="lg:col-span-4">
          <Card className="rounded-3xl border border-neutral-100 shadow-sm bg-white overflow-hidden p-6 space-y-6">
            <div className="space-y-4">
              {/* Security Shield Icon Header */}
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-50 border border-neutral-100 text-neutral-800">
                <Shield className="h-5 w-5 text-black" />
              </div>
              <h3 className="font-bold text-lg text-black font-sans leading-tight">
                Security & Privacy
              </h3>
              <p className="text-sm text-neutral-500 font-sans leading-relaxed">
                Your trust is paramount. We employ enterprise-grade security to ensure your credentials are safe.
              </p>
            </div>

            {/* Checklist */}
            <ul className="space-y-3.5 pt-2 border-t border-neutral-50">
              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white border border-neutral-800 mt-0.5">
                  <Check className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium text-neutral-600 font-sans leading-tight">
                  AES-256 encrypted storage at rest.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white border border-neutral-800 mt-0.5">
                  <Check className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium text-neutral-600 font-sans leading-tight">
                  Keys never visible after saving.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white border border-neutral-800 mt-0.5">
                  <Check className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium text-neutral-600 font-sans leading-tight">
                  You maintain full ownership of your accounts.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white border border-neutral-800 mt-0.5">
                  <Check className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium text-neutral-600 font-sans leading-tight">
                  Used exclusively during active generation.
                </span>
              </li>
            </ul>

            {/* Bottom link */}
            <div className="pt-4 border-t border-neutral-50">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="inline-flex items-center justify-between w-full text-xs font-bold text-black hover:opacity-70 transition-opacity"
              >
                <span>Read our full Security Policy</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
