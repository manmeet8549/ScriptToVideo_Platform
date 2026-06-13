import React from 'react';

export default function AdminLoading() {
  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center pb-5 border-b border-gray-100">
        <div className="space-y-2 flex-1">
          <div className="h-8 bg-gray-100 rounded-2xl w-48" />
          <div className="h-4 bg-gray-100 rounded-xl w-96" />
        </div>
        <div className="h-10 w-10 bg-gray-100 rounded-xl shrink-0" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-[24px] border border-gray-100 bg-white p-6 h-28 flex flex-col justify-between">
            <div className="h-3.5 bg-gray-100 rounded w-16" />
            <div className="h-7 bg-gray-100 rounded w-12" />
            <div className="h-3 bg-gray-100 rounded w-20" />
          </div>
        ))}
      </div>

      {/* Main Content Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 rounded-[24px] border border-gray-100 bg-white p-8 h-80 space-y-4">
          <div className="h-5 bg-gray-100 rounded w-32" />
          <div className="space-y-3 pt-4">
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-5/6" />
            <div className="h-3 bg-gray-100 rounded w-4/5" />
          </div>
        </div>
        <div className="lg:col-span-8 rounded-[24px] border border-gray-100 bg-white p-8 h-80 space-y-4">
          <div className="h-5 bg-gray-100 rounded w-32" />
          <div className="space-y-3 pt-4">
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}
