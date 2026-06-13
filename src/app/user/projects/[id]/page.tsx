'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/store';
import ProjectPipeline from '@/components/ProjectPipeline';

export default function UserProjectDetailPage({ params }: { params: { id: string } }) {
  const { setSelectedProjectId, setActiveTab } = useAppStore();

  useEffect(() => {
    if (params.id) {
      setSelectedProjectId(params.id);
      setActiveTab('pipeline');
    }
  }, [params.id, setSelectedProjectId, setActiveTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
        <ProjectPipeline />
      </div>
    </div>
  );
}
