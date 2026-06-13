'use client';

import { use, useEffect } from 'react';
import { useAppStore } from '@/store/store';
import dynamic from 'next/dynamic';
const ProjectPipeline = dynamic(() => import('@/components/ProjectPipeline'), {
  ssr: false,
  loading: () => (
    <div className="space-y-6 animate-pulse p-6">
      <div className="h-8 w-1/3 bg-gray-100 rounded-xl" />
      <div className="h-4 w-1/2 bg-gray-100 rounded-lg" />
      <div className="grid grid-cols-5 gap-4 pt-4">
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} className="h-10 bg-gray-100 rounded-xl" />
        ))}
      </div>
      <div className="h-80 bg-gray-50 border border-gray-100 rounded-3xl mt-6" />
    </div>
  )
});

export default function UserProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const setSelectedProjectId = useAppStore((state) => state.setSelectedProjectId);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  useEffect(() => {
    if (id) {
      setSelectedProjectId(id);
      setActiveTab('pipeline');
    }
  }, [id, setSelectedProjectId, setActiveTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
        <ProjectPipeline />
      </div>
    </div>
  );
}
