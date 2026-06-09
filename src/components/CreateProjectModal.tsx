'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppStore } from '@/store/store';
import { useCreateProject } from '@/hooks/useProjects';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2 } from 'lucide-react';

const ratioMap: Record<string, 'RATIO_16_9' | 'RATIO_9_16' | 'RATIO_1_1'> = {
  '16:9': 'RATIO_16_9',
  '9:16': 'RATIO_9_16',
  '1:1': 'RATIO_1_1',
};

const createProjectSchema = z.object({
  name: z.string().min(3, { message: 'Project name must be at least 3 characters.' }),
  prompt: z.string().min(10, { message: 'Video prompt must be at least 10 characters.' }),
  voiceAccent: z.string().min(1, { message: 'Please select a voice accent.' }),
  videoRatio: z.enum(['16:9', '9:16', '1:1'] as const),
});

type FormData = z.infer<typeof createProjectSchema>;

export default function CreateProjectModal() {
  const { isCreateModalOpen, setIsCreateModalOpen } = useAppStore();
  const createProject = useCreateProject();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      prompt: '',
      voiceAccent: 'US Female - Emily',
      videoRatio: '16:9',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createProject.mutateAsync({
        name: data.name,
        prompt: data.prompt,
        videoRatio: ratioMap[data.videoRatio],
      });
      setIsCreateModalOpen(false);
      reset();
    } catch (error) {
      // Error is handled by the mutation's onError — form stays open
      console.error('[CreateProjectModal] Failed:', error);
    }
  };

  return (
    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl p-6 border border-gray-100 bg-white shadow-2xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold font-sans tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-black" />
            Create Video Project
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 font-sans">
            Configure your video details to kickstart the automated AI pipeline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-3">
          {/* Project Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-gray-700">Project Name</Label>
            <Input
              id="name"
              placeholder="e.g. Product Launch Teaser"
              {...register('name')}
              className="rounded-xl border-gray-200 focus:border-black focus:ring-black h-10 text-sm"
            />
            {errors.name && (
              <p className="text-xs font-medium text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Prompt */}
          <div className="space-y-1.5">
            <Label htmlFor="prompt" className="text-xs font-semibold text-gray-700">Video Prompt / Concept</Label>
            <textarea
              id="prompt"
              rows={3}
              placeholder="e.g. Generate a promotional reel highlighting our new coffee brand features."
              {...register('prompt')}
              className="flex w-full rounded-xl border border-gray-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black resize-none font-sans"
            />
            {errors.prompt && (
              <p className="text-xs font-medium text-red-500">{errors.prompt.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Voice Accent */}
            <div className="space-y-1.5">
              <Label htmlFor="voiceAccent" className="text-xs font-semibold text-gray-700">Voice Persona</Label>
              <select
                id="voiceAccent"
                {...register('voiceAccent')}
                className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black font-sans"
              >
                <option value="US Female - Emily">US Female - Emily</option>
                <option value="US Male - Arthur">US Male - Arthur</option>
                <option value="UK Male - George">UK Male - George</option>
                <option value="UK Female - Charlotte">UK Female - Charlotte</option>
              </select>
              {errors.voiceAccent && (
                <p className="text-xs font-medium text-red-500">{errors.voiceAccent.message}</p>
              )}
            </div>

            {/* Video Ratio */}
            <div className="space-y-1.5">
              <Label htmlFor="videoRatio" className="text-xs font-semibold text-gray-700">Aspect Ratio</Label>
              <select
                id="videoRatio"
                {...register('videoRatio')}
                className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black font-sans"
              >
                <option value="16:9">Landscape (16:9)</option>
                <option value="9:16">Portrait (9:16)</option>
                <option value="1:1">Square (1:1)</option>
              </select>
              {errors.videoRatio && (
                <p className="text-xs font-medium text-red-500">{errors.videoRatio.message}</p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {createProject.isError && (
            <p className="text-xs font-medium text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {createProject.error?.message ?? 'Failed to create project. Please try again.'}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              disabled={createProject.isPending}
              onClick={() => { setIsCreateModalOpen(false); reset(); }}
              className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 font-sans"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createProject.isPending}
              className="rounded-xl bg-black text-white hover:bg-neutral-800 font-sans flex items-center gap-1.5 px-4"
            >
              {createProject.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Start Pipeline'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
