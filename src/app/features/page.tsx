'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { FileText, Volume2, Video, Share2, Users } from 'lucide-react';

export default function FeaturesPage() {
  const featuresList = [
    {
      title: 'AI Script Generation',
      description: 'Generate high-converting, engaging scripts tailored to any video style or duration using context-aware AI models.',
      icon: FileText,
    },
    {
      title: 'Voice Generation',
      description: 'Convert scripts to studio-quality voices with fine-tuned parameters for stability, speed, accents, and style exaggerations.',
      icon: Volume2,
    },
    {
      title: 'Avatar Video Creation',
      description: 'Create high-fidelity avatar videos featuring precise lip-syncing, transitions, custom backgrounds, and layouts.',
      icon: Video,
    },
    {
      title: 'Social Media Publishing',
      description: 'Auto-schedule and post generated content directly to TikTok, YouTube, Instagram, and LinkedIn.',
      icon: Share2,
    },
    {
      title: 'Editor Collaboration',
      description: 'Seamlessly delegate video assignments, request revisions, and review final editor productions in a unified portal.',
      icon: Users,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-[#fcfcfc] py-20 px-6 max-w-5xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-black sm:text-5xl">Platform Features</h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Everything you need to produce professional content at scale in a single, unified workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuresList.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * idx }}
                className="bg-white border border-gray-100 p-8 rounded-3xl shadow-xs space-y-4"
              >
                <div className="h-12 w-12 rounded-2xl bg-neutral-50 flex items-center justify-center border border-neutral-100">
                  <Icon className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-lg font-bold text-black">{feat.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feat.description}</p>
              </motion.div>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
