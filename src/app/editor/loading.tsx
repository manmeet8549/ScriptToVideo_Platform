import React from 'react';

export default function EditorLoading() {
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

      {/* Editor Details Summary Box */}
      <div className="rounded-[24px] border border-gray-100 bg-white p-6 h-36 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-4.5 bg-gray-100 rounded w-36" />
            <div className="h-3 bg-gray-100 rounded w-64" />
          </div>
          <div className="h-8 w-24 bg-gray-100 rounded-full" />
        </div>
        <div className="h-px bg-gray-50" />
        <div className="flex gap-4">
          <div className="h-3.5 bg-gray-100 rounded w-16" />
          <div className="h-3.5 bg-gray-100 rounded w-20" />
        </div>
      </div>

      {/* Main List Skeleton */}
      <div className="space-y-4">
        <div className="h-6 bg-gray-100 rounded w-32" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-[20px] border border-gray-100 bg-white p-5 h-20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gray-100 rounded-xl" />
                <div className="space-y-1.5">
                  <div className="h-3.5 bg-gray-100 rounded w-28" />
                  <div className="h-2.5 bg-gray-100 rounded w-16" />
                </div>
              </div>
              <div className="h-7 w-20 bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
