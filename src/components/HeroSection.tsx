'use client';

import { useAppStore } from '@/store/store';
import { useSession } from 'next-auth/react';
import { Sparkles, ArrowRight, Video, FileText, Volume2, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

const pipelineSteps = [
  {
    id: 'idea',
    label: 'Idea',
    icon: Lightbulb,
    description: 'Input your raw text prompt or marketing concept.',
    color: 'text-amber-500 bg-amber-50',
  },
  {
    id: 'script',
    label: 'Script',
    icon: FileText,
    description: 'The AI expands the idea into a structured video script.',
    color: 'text-blue-500 bg-blue-50',
  },
  {
    id: 'voice',
    label: 'Voice',
    icon: Volume2,
    description: 'Accents are applied and realistic audio is generated.',
    color: 'text-purple-500 bg-purple-50',
  },
  {
    id: 'video',
    label: 'Video',
    icon: Video,
    description: 'Avatars lip-sync the audio and templates compile layout.',
    color: 'text-green-500 bg-green-50',
  },
];

export default function HeroSection() {
  const { setIsCreateModalOpen, setActiveTab, setAuthView } = useAppStore();
  const { data: session } = useSession();
  const user = session?.user;
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);

  return (
    <section className="relative flex flex-col items-center justify-center py-20 text-center px-6 lg:px-8">
      {/* Background gradient */}
      <div className="absolute top-1/2 left-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-neutral-100 to-neutral-50/20 blur-3xl opacity-60" />

      {/* Pulse Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-gray-200/80 bg-white px-3 py-1 text-xs font-medium text-gray-800 shadow-sm"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </span>
        AI Video Pipeline Active
      </motion.div>

      {/* Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="max-w-4xl text-5xl font-extrabold tracking-tight text-black sm:text-6xl md:text-7xl"
      >
        Turn Ideas Into Videos
      </motion.h1>

      {/* Subheading */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-gray-500"
      >
        Generate scripts, voiceovers, and avatar videos from a single workflow
        powered by AI. No complex editing required.
      </motion.p>

      {/* Step Flow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-10 mb-12 inline-flex items-center justify-center rounded-[32px] md:rounded-full border border-gray-100 bg-white px-6 py-4 md:py-3 shadow-md shadow-neutral-100/40 w-full max-w-lg md:w-auto"
      >
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full justify-center">
          {pipelineSteps.map((step, idx) => {
            const IconComponent = step.icon;
            return (
              <div key={step.id} className="flex flex-col sm:flex-row items-center">
                <div className="relative">
                  <button
                    onMouseEnter={() => setHoveredStep(step.id)}
                    onMouseLeave={() => setHoveredStep(null)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-black hover:bg-gray-50 transition-all cursor-pointer border border-transparent hover:border-gray-100"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    {step.label}
                  </button>

                  {/* Tooltip */}
                  {hoveredStep === step.id && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-xl border border-gray-100 bg-white p-3 shadow-lg z-50 text-left pointer-events-none">
                      <div className="flex items-center gap-1.5 font-semibold text-sm text-black mb-1">
                        <span className={`p-1 rounded-md ${step.color}`}>
                          <IconComponent className="h-3.5 w-3.5" />
                        </span>
                        {step.label} Step
                      </div>
                      <p className="text-xs text-gray-500 leading-normal">{step.description}</p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-b border-r border-gray-100 rotate-45 -mt-1" />
                    </div>
                  )}
                </div>

                {idx < pipelineSteps.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-gray-300 mx-1 rotate-90 sm:rotate-0 my-1 sm:my-0" />
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="flex flex-col items-center justify-center gap-4 sm:flex-row"
      >
        <button
          onClick={() => {
            if (!user) {
              setAuthView('login');
            } else {
              setIsCreateModalOpen(true);
            }
          }}
          className="group flex items-center gap-2 rounded-full bg-black text-sm font-semibold text-white hover:bg-neutral-800 px-6 h-12 shadow-lg shadow-black/10 hover:shadow-black/15 transition-all"
        >
          <Sparkles className="h-4 w-4 text-neutral-300 group-hover:text-white transition-colors" />
          {user ? 'Create New Project' : 'Get Started — Sign In'}
        </button>
        <button
          onClick={() => {
            if (!user) {
              setAuthView('signup');
            } else {
              setActiveTab('templates');
            }
          }}
          className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-black px-6 h-12 transition-all"
        >
          {user ? 'Browse Templates' : 'Create Free Account'}
        </button>
      </motion.div>
    </section>
  );
}
