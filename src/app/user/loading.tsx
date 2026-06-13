import React from 'react';

export default function UserLoading() {
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

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-[24px] border border-gray-100 bg-white p-6 h-40 flex flex-col justify-between">
            <div className="h-10 w-10 bg-gray-100 rounded-xl" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-100 rounded w-24" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
            <div className="h-3 bg-gray-100 rounded w-16" />
          </div>
        ))}
      </div>

      {/* Projects Grid */}
      <div className="space-y-6">
        <div className="h-6 bg-gray-100 rounded w-36" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-[24px] border border-gray-100 bg-white p-5 h-44 flex flex-col justify-between">
              <div className="h-12 bg-gray-100 rounded-xl w-full" />
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded w-12" />
                <div className="h-3.5 bg-gray-100 rounded w-20" />
                <div className="h-2.5 bg-gray-100 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
