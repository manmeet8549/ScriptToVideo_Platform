'use client';

import { useAppStore } from '@/store/store';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Volume2, Video, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ActionCards() {
  const { setIsCreateModalOpen, setAuthView } = useAppStore();
  const { data: session } = useSession();
  const user = session?.user;

  const cards = [
    {
      title: 'Generate Script',
      description: 'Transform a simple prompt or rough idea into a structured, engaging video script.',
      icon: FileText,
      linkText: 'Start Writing',
      iconBg: 'bg-neutral-50 text-black border-neutral-100',
    },
    {
      title: 'Create Voiceover',
      description: 'Convert your script into studio-quality speech using advanced AI voice models.',
      icon: Volume2,
      linkText: 'Generate Audio',
      iconBg: 'bg-neutral-50 text-black border-neutral-100',
    },
    {
      title: 'Generate Video',
      description: 'Create a complete video featuring a lip-synced AI avatar and matching visuals.',
      icon: Video,
      linkText: 'Generate Video',
      iconBg: 'bg-neutral-50 text-black border-neutral-100',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-20">
      {!user && (
        <div className="mb-8 flex items-center gap-2.5 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-3.5 text-sm text-amber-800 font-medium">
          <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <span>
            Features are locked.{' '}
            <button
              onClick={() => setAuthView('login')}
              className="font-bold underline hover:text-amber-900 transition-colors"
            >
              Sign in
            </button>{' '}
            or{' '}
            <button
              onClick={() => setAuthView('signup')}
              className="font-bold underline hover:text-amber-900 transition-colors"
            >
              create an account
            </button>{' '}
            to get started.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * idx }}
              whileHover={{ y: -6 }}
              onClick={() => {
                if (!user) {
                  setAuthView('login');
                } else {
                  setIsCreateModalOpen(true);
                }
              }}
              className="cursor-pointer group relative"
            >
              <Card className={`h-full rounded-3xl border bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:shadow-neutral-100/60 duration-300 ${!user ? 'border-gray-100 opacity-75' : 'border-gray-100'}`}>
                <CardContent className="p-0 flex flex-col items-start justify-between h-full space-y-6">
                  
                  {/* Icon */}
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${card.iconBg}`}>
                    <Icon className="h-5.5 w-5.5" />
                  </div>

                  {/* Text Content */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold font-sans tracking-tight text-black">
                      {card.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-500 font-sans">
                      {card.description}
                    </p>
                  </div>

                  {/* Dynamic CTA Link */}
                  <div className="inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-black transition-colors group-hover:text-neutral-700">
                    <span>{user ? card.linkText : 'Sign in to access'}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
                  </div>

                </CardContent>
              </Card>

              {/* Lock overlay badge for unauthenticated users */}
              {!user && (
                <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-black/5 border border-black/8 px-2.5 py-1 text-[10px] font-semibold text-gray-500 pointer-events-none">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Login required
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
