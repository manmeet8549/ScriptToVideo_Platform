'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/store';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Play, Search, Plus, Video, GraduationCap, 
  TrendingUp, Smartphone, Rocket, Lightbulb
} from 'lucide-react';

export default function TemplatesList() {
  const { setIsCreateModalOpen, setPrefilledProjectData } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | string>('ALL');

  // Hardcoded Figma Categories
  const categories = [
    'ALL',
    'YouTube Shorts',
    'Educational',
    'Marketing',
    'Product Demo',
    'Social Media',
    'Business',
    'Storytelling',
    'Explainer',
    'News'
  ];

  // Hardcoded Popular Templates from Figma
  const popularTemplates = [
    {
      title: 'YouTube Shorts',
      duration: '60s',
      description: 'High-engagement vertical format perfect for quick storytelling.',
      category: 'YouTube Shorts',
      imageUrl: '/images/ai_shorts_thumbnail.png',
      prefillPrompt: 'Generate a high-engagement vertical formatting script for YouTube Shorts focusing on a fast-paced, interesting fact or quick storytelling concept.',
      prefillRatio: '9:16' as const,
      prefillVoice: 'US Female - Emily'
    },
    {
      title: 'Product Demo',
      duration: '2m',
      description: 'Showcase features clearly and present key value propositions.',
      category: 'Product Demo',
      imageUrl: '/images/product_demo_thumbnail.png',
      prefillPrompt: 'Create a clean explainer script showing key features and benefits of a new software product, highlighting the ease of use and user interface.',
      prefillRatio: '16:9' as const,
      prefillVoice: 'US Male - Arthur'
    },
    {
      title: 'Explainer Video',
      duration: '90s',
      description: 'Simplify complex concepts using engaging analogies and explanations.',
      category: 'Explainer',
      imageUrl: '/images/explainer_video_thumbnail.png',
      prefillPrompt: 'A detailed explainer video script simplifying a complex concept, focusing on educational clarity, diagrams, and easy-to-understand analogies.',
      prefillRatio: '16:9' as const,
      prefillVoice: 'UK Female - Charlotte'
    }
  ];

  // Hardcoded All Templates Grid from Figma
  const allTemplates = [
    {
      title: 'Product Launch',
      duration: '30-60 sec',
      icon: Video,
      badges: ['Easy', 'Creator Friendly'],
      category: 'Marketing',
      imageUrl: '/images/product_launch_thumbnail.png',
      prefillPrompt: 'Generate a product launch teaser script introducing a new, innovative product. Focus on excitement, problem-solution format, and key features.',
      prefillRatio: '16:9' as const,
      prefillVoice: 'US Male - Arthur'
    },
    {
      title: 'Educational Lesson',
      duration: '3-5 min',
      icon: GraduationCap,
      badges: ['Medium'],
      category: 'Educational',
      imageUrl: '/images/educational_lesson_thumbnail.png',
      prefillPrompt: 'Create an educational lecture script explaining a scientific concept. Keep the tone engaging, clear, and easy for students to follow.',
      prefillRatio: '16:9' as const,
      prefillVoice: 'UK Male - George'
    },
    {
      title: 'Business Presentation',
      duration: '5-10 min',
      icon: TrendingUp,
      badges: ['Advanced'],
      category: 'Business',
      imageUrl: '/images/business_presentation_thumbnail.png',
      prefillPrompt: 'Generate a professional corporate presentation script summarizing quarterly achievements, strategy overview, and future target metrics.',
      prefillRatio: '16:9' as const,
      prefillVoice: 'UK Male - George'
    },
    {
      title: 'Social Media Reel',
      duration: '15-30 sec',
      icon: Smartphone,
      badges: ['Easy', 'Creator Friendly'],
      category: 'Social Media',
      imageUrl: '/images/social_media_reel_thumbnail.png',
      prefillPrompt: 'Create a highly engaging, fast-paced portrait aspect ratio script for Instagram/TikTok reels showcasing a daily vlog or tips.',
      prefillRatio: '9:16' as const,
      prefillVoice: 'US Female - Emily'
    },
    {
      title: 'Startup Pitch',
      duration: '2-3 min',
      icon: Rocket,
      badges: ['Medium'],
      category: 'Business',
      imageUrl: '/images/startup_pitch_thumbnail.png',
      prefillPrompt: 'Create a compelling elevator pitch script for investors. Introduce the startup problem, unique solution, market size, and business model.',
      prefillRatio: '16:9' as const,
      prefillVoice: 'US Male - Arthur'
    },
    {
      title: 'AI Tool Review',
      duration: '3-5 min',
      icon: Lightbulb,
      badges: ['Medium', 'Creator Friendly'],
      category: 'Explainer',
      imageUrl: '/images/ai_tool_review_thumbnail.png',
      prefillPrompt: 'Write a script review of a brand new AI tool, covering its key functionalities, real-world usefulness, pricing, and pros/cons.',
      prefillRatio: '16:9' as const,
      prefillVoice: 'UK Female - Charlotte'
    }
  ];

  const handleUseTemplate = (template: {
    title: string;
    prefillPrompt: string;
    prefillRatio: '16:9' | '9:16' | '1:1';
    prefillVoice: string;
  }) => {
    setPrefilledProjectData({
      name: `${template.title} - Draft`,
      prompt: template.prefillPrompt,
      videoRatio: template.prefillRatio,
      voiceAccent: template.prefillVoice,
    });
    setIsCreateModalOpen(true);
  };

  // Filter templates logic
  const filteredPopular = popularTemplates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || t.category.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCat;
  });

  const filteredAll = allTemplates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || t.category.toLowerCase().includes(selectedCategory.toLowerCase()) || 
                       (selectedCategory === 'Social Media' && t.category === 'Social Media');
    return matchesSearch && matchesCat;
  });

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-10 pb-24 space-y-10">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 border border-neutral-200/50 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
            Templates
          </span>
          <h2 className="text-3xl font-extrabold font-sans tracking-tight text-black">
            Video Templates
          </h2>
          <p className="text-sm text-gray-500 font-sans max-w-xl mt-0.5">
            Choose a template and start creating professional AI videos in minutes.
          </p>
        </div>

        <button
          onClick={() => {
            setPrefilledProjectData(null);
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-bold px-5 py-3 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create From Scratch
        </button>
      </div>

      {/* 2. Search & Category Pills */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 rounded-full border-gray-200 focus:border-black focus:ring-black h-10 text-sm bg-white"
          />
        </div>

        {/* Categories wrap pills */}
        <div className="flex flex-wrap gap-2 pt-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200 ${
                  isSelected
                    ? 'bg-black text-white border-black'
                    : 'bg-gray-50 border-gray-100 text-gray-500 hover:text-black hover:bg-white'
                }`}
              >
                {cat === 'ALL' ? 'All' : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Section: Popular Templates */}
      {filteredPopular.length > 0 && (
        <div className="space-y-6">
          <h3 className="font-extrabold text-xl text-black font-sans leading-tight">
            Popular Templates
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredPopular.map((t) => (
              <Card 
                key={t.title}
                className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-between h-full space-y-5"
              >
                {/* Visual Preview Container */}
                <div className="relative h-44 rounded-2xl overflow-hidden bg-neutral-100 group border border-neutral-100">
                  <img 
                    src={t.imageUrl} 
                    alt={t.title} 
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="h-12 w-12 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-black shadow-md border border-neutral-100/20 backdrop-blur-sm transition-all transform scale-90 group-hover:scale-100 duration-300">
                      <Play className="h-5 w-5 fill-black stroke-none ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 flex-grow flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-base text-black font-sans">{t.title}</h4>
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">{t.duration}</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-normal font-sans">
                      {t.description}
                    </p>
                  </div>

                  <Button
                    onClick={() => handleUseTemplate(t)}
                    className="w-full rounded-full bg-neutral-100 text-black hover:bg-neutral-200 border border-neutral-200/40 text-xs font-bold h-10 transition-colors"
                  >
                    Use Template
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 4. Section: All Templates */}
      {filteredAll.length > 0 && (
        <div className="space-y-6">
          <h3 className="font-extrabold text-xl text-black font-sans leading-tight">
            All Templates
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredAll.map((t) => {
              return (
                <Card 
                  key={t.title}
                  className="rounded-[32px] border border-gray-100 bg-white p-5 shadow-sm flex flex-col justify-between h-full space-y-4 animate-in fade-in-50 duration-300"
                >
                  {/* Top rounded container with image preview + play button */}
                  <div className="relative h-36 rounded-2xl overflow-hidden bg-neutral-100 group border border-neutral-100/60">
                    <img 
                      src={t.imageUrl} 
                      alt={t.title} 
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-black shadow-md border border-neutral-100/20 backdrop-blur-sm transition-all transform scale-90 group-hover:scale-100 duration-300">
                        <Play className="h-4 w-4 fill-black stroke-none ml-0.5" />
                      </div>
                    </div>
                    <span className="absolute bottom-3 right-3 text-[9px] font-bold text-gray-700 bg-white border border-gray-100 rounded-md px-1.5 py-0.5 z-10 shadow-sm">
                      {t.duration}
                    </span>
                  </div>

                  {/* Info details */}
                  <div className="space-y-3 flex-grow flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-sm text-black font-sans">{t.title}</h4>
                      <div className="flex flex-wrap gap-1">
                        {t.badges.map((badge) => (
                          <span 
                            key={badge}
                            className="bg-gray-50 border border-gray-100 text-gray-400 rounded-md px-1.5 py-0.5 text-[9px] font-bold"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1.5">
                      <Button
                        onClick={() => handleUseTemplate(t)}
                        variant="outline"
                        className="flex-1 rounded-full border-gray-200 text-black hover:bg-gray-50 text-[11px] font-bold h-9 px-3"
                      >
                        Preview
                      </Button>
                      <Button
                        onClick={() => handleUseTemplate(t)}
                        className="flex-1 rounded-full bg-black text-white hover:bg-neutral-800 text-[11px] font-bold h-9 px-3 transition-colors"
                      >
                        Use
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty Search Result Fallback */}
      {filteredPopular.length === 0 && filteredAll.length === 0 && (
        <div className="flex flex-col items-center justify-center p-16 rounded-[32px] border border-dashed border-gray-200 bg-white text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-50 border border-neutral-100 text-gray-400 mb-4">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-lg text-black font-sans">No templates found</h3>
          <p className="text-sm text-gray-500 max-w-xs mt-1 font-sans">
            We couldn&apos;t find any templates matching your search criteria. Try a different tag or prompt.
          </p>
        </div>
      )}
      
    </div>
  );
}

