'use client';

import { motion } from 'framer-motion';
import { FileText, Volume2, Video, Share2, Users, ArrowRight, Check, Star, Quote } from 'lucide-react';
import Link from 'next/link';

export function FeaturesSection() {
  const features = [
    {
      title: 'AI Script Generation',
      description: 'Transform short prompts or full outlines into structured, high-performing video scripts instantly.',
      icon: FileText,
      color: 'from-amber-500/10 to-amber-500/20 text-amber-600',
    },
    {
      title: 'Voice Generation',
      description: 'Convert scripts to lifelike, studio-grade voices with full speed, stability, and accent control.',
      icon: Volume2,
      color: 'from-purple-500/10 to-purple-500/20 text-purple-600',
    },
    {
      title: 'Avatar Video Creation',
      description: 'Render precise lip-synced AI avatars over premium templates and dynamic layouts in minutes.',
      icon: Video,
      color: 'from-emerald-500/10 to-emerald-500/20 text-emerald-600',
    },
    {
      title: 'Social Media Publishing',
      description: 'Schedule, queue, and publish your videos directly to TikTok, YouTube, Instagram, and LinkedIn.',
      icon: Share2,
      color: 'from-blue-500/10 to-blue-500/20 text-blue-600',
    },
    {
      title: 'Editor Collaboration',
      description: 'Connect with expert editors using keys to delegate complex edits, review versions, and approve final files.',
      icon: Users,
      color: 'from-rose-500/10 to-rose-500/20 text-rose-600',
    },
  ];

  return (
    <section id="features" className="py-24 bg-[#fbfbfb] border-t border-gray-100">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400">Everything you need</h2>
          <h3 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl font-sans">
            Streamlined Production Pipeline
          </h3>
          <p className="text-base text-gray-500 font-sans leading-relaxed">
            ScriptForge brings together all critical steps of modern video creation into one seamless, AI-accelerated workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                whileHover={{ y: -5 }}
                className="group relative bg-white border border-gray-100 p-8 rounded-3xl shadow-xs transition-all hover:shadow-xl hover:shadow-neutral-100/50 duration-300 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center border border-white/40 shadow-sm`}>
                    <Icon className="h-5.5 w-5.5" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-black font-sans tracking-tight">{item.title}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed font-sans">{item.description}</p>
                  </div>
                </div>
                <div className="pt-6">
                  <Link 
                    href="/signup"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-black group-hover:text-neutral-700 transition-colors"
                  >
                    <span>Learn more</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 duration-200" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  const steps = [
    {
      step: 'Step 1',
      title: 'Create Script',
      description: 'Input your raw topic, blog link, or product description. The AI generates a structured, high-conversion script in seconds.',
      icon: FileText,
    },
    {
      step: 'Step 2',
      title: 'Generate Voice',
      description: 'Select from lifelike neural voices. Tune stability, similarity boost, speed, and pacing to perfect the narration.',
      icon: Volume2,
    },
    {
      step: 'Step 3',
      title: 'Generate Video',
      description: 'Select your aspect ratio and layouts. Choose an AI avatar that will precisely lip-sync your audio over matching media.',
      icon: Video,
    },
    {
      step: 'Step 4',
      title: 'Publish',
      description: 'Instantly download your completed video or schedule and publish directly to TikTok, YouTube Shorts, and Instagram Reels.',
      icon: Share2,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white border-t border-gray-100">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400">Simple 4-Step Process</h2>
          <h3 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl font-sans">
            How ScriptForge Works
          </h3>
          <p className="text-base text-gray-500 font-sans leading-relaxed">
            Go from concept to a polished, ready-to-post video in four intuitive, automated stages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="relative bg-neutral-50/50 border border-neutral-100 rounded-3xl p-8 space-y-6 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 bg-neutral-100 px-2.5 py-1 rounded-full">
                      {item.step}
                    </span>
                    <Icon className="h-5 w-5 text-neutral-400" />
                  </div>
                  <h4 className="text-lg font-bold text-black font-sans leading-none">{item.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed font-sans">{item.description}</p>
                </div>
                {idx < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 -translate-y-1/2 z-10">
                    <ArrowRight className="h-4 w-4 text-neutral-300" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PricingSection() {
  const plans = [
    {
      name: 'Starter',
      price: '$19',
      period: '/month',
      description: 'Ideal for creators starting their content journey.',
      features: [
        '10 video credits per month',
        'Standard AI voice models',
        '720p output resolution',
        'Basic rendering queue priority',
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: 'Professional',
      price: '$49',
      period: '/month',
      description: 'Perfect for marketers and high-volume brand channels.',
      features: [
        '50 video credits per month',
        'Premium ElevenLabs voices',
        '1080p full-HD rendering',
        'Direct social publishing connections',
        'Connected editors pipeline access',
        'Priority rendering queue',
      ],
      cta: 'Go Professional',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'Tailored for agencies and media teams.',
      features: [
        'Unlimited rendering options',
        'Custom brand avatars & voice clones',
        '4K Ultra-HD resolution output',
        'Full administrator dashboard controls',
        'Custom API integration & webhooks',
        '24/7 Dedicated account support',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-[#fbfbfb] border-t border-gray-100">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400">Flexible Plans</h2>
          <h3 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl font-sans">
            Simple, Scaleable Pricing
          </h3>
          <p className="text-base text-gray-500 font-sans leading-relaxed">
            Choose the volume that matches your growth. All plans include script writing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`relative bg-white border rounded-3xl p-8 shadow-xs flex flex-col justify-between ${
                plan.popular ? 'border-neutral-900 ring-1 ring-neutral-900 shadow-lg' : 'border-gray-100'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-black text-white px-3.5 py-1 text-[9px] font-black rounded-full uppercase tracking-wider">
                  Most Popular
                </span>
              )}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xl font-bold text-black font-sans leading-none">{plan.name}</h4>
                  <p className="text-xs text-gray-400 mt-2 font-sans">{plan.description}</p>
                </div>

                <div className="flex items-baseline">
                  <span className="text-4xl font-black text-black tracking-tight">{plan.price}</span>
                  <span className="text-sm text-gray-400 font-bold ml-1">{plan.period}</span>
                </div>

                <ul className="space-y-3.5 text-xs text-gray-500 font-medium font-sans border-t border-neutral-50 pt-6">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2.5">
                      <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-neutral-50 text-black border border-neutral-100 shrink-0">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="leading-tight">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  href="/signup"
                  className={`block w-full text-center py-3 px-6 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
                    plan.popular
                      ? 'bg-black text-white hover:bg-neutral-800'
                      : 'bg-neutral-50 text-black border border-neutral-100 hover:bg-neutral-100'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  const testimonials = [
    {
      quote: "ScriptForge completely transformed our content workflow. We went from posting once a week to publishing daily shorts across three channels, and our views increased by over 400%.",
      author: "Sarah Jenkins",
      role: "Head of Marketing at Elevate Digital",
      avatar: "SJ",
    },
    {
      quote: "The realistic voices and automated avatar lip-syncing are incredible. Our tutorials look and sound like they were filmed in a professional studio, but at a fraction of the cost.",
      author: "Marcus Vance",
      role: "Founder of LearnCode",
      avatar: "MV",
    },
  ];

  return (
    <section id="testimonials" className="py-24 bg-white border-t border-gray-100 pb-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400">Testimonials</h2>
          <h3 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl font-sans">
            Loved by Modern Content Creators
          </h3>
          <p className="text-base text-gray-500 font-sans leading-relaxed">
            See how social media managers, founders, and marketing teams save time and drive metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {testimonials.map((item, idx) => (
            <motion.div
              key={item.author}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-neutral-50/50 border border-neutral-100 rounded-3xl p-8 flex flex-col justify-between relative shadow-xs"
            >
              <Quote className="absolute top-6 right-6 h-8 w-8 text-neutral-150 pointer-events-none" />
              <div className="space-y-6">
                <div className="flex gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4.5 w-4.5 fill-current" />
                  ))}
                </div>
                <p className="text-sm italic text-gray-600 leading-relaxed font-sans">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>
              <div className="flex items-center gap-3 pt-6 border-t border-neutral-100 mt-6">
                <div className="h-10 w-10 rounded-full bg-neutral-950 text-white font-bold flex items-center justify-center text-xs">
                  {item.avatar}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-black font-sans leading-none">{item.author}</h5>
                  <span className="text-[10px] text-gray-400 font-medium block mt-1 font-sans">{item.role}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
