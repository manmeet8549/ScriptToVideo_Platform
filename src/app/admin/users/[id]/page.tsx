'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface UserDetails {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    accountStatus: string;
    createdAt: string;
    lastLoginAt: string | null;
  };
  projects: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
  }>;
  videos: Array<{
    id: string;
    title: string;
    status: string;
    fileSize: number | null;
    createdAt: string;
  }>;
  publishingActivity: Array<{
    id: string;
    title: string;
    platform: string;
    status: string;
    createdAt: string;
  }>;
  storageUsageBytes: number;
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/users/${params.id}`);
        const data = await res.json();
        if (res.ok) {
          setDetails(data);
        } else {
          setError(data.error || 'Failed to load user details.');
        }
      } catch {
        setError('An error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [params.id]);

  if (loading) {
    return <div className="p-12 text-center text-gray-500 font-sans">Loading user details...</div>;
  }

  if (error || !details) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-4 font-sans">
        <Link href="/admin/users" className="text-sm font-bold text-gray-600 hover:text-black">&larr; Back to List</Link>
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error || 'User details not found.'}</div>
      </div>
    );
  }

  const { user, projects, videos, publishingActivity, storageUsageBytes } = details;
  const storageMB = (storageUsageBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <Link href="/admin/users" className="text-xs font-bold text-gray-400 hover:text-black block mb-1">&larr; BACK TO USERS</Link>
          <h1 className="text-3xl font-extrabold text-black">{user.name || 'User Details'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{user.email}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
          user.accountStatus === 'ACTIVE' ? 'bg-green-50 text-green-700' :
          user.accountStatus === 'PAUSED' ? 'bg-amber-50 text-amber-700' :
          'bg-red-50 text-red-700'
        }`}>
          Status: {user.accountStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Details Card */}
        <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4 md:col-span-1">
          <h2 className="text-lg font-bold text-black border-b pb-2">Profile Overview</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Role</span>
              <span className="font-semibold text-black">{user.role}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Created Date</span>
              <span className="text-gray-700">{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Last Login</span>
              <span className="text-gray-700">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Storage Used</span>
              <span className="font-bold text-neutral-800">{storageMB} MB</span>
            </div>
          </div>
        </div>

        {/* User Activity & Content Cards */}
        <div className="md:col-span-2 space-y-6">
          {/* Projects and Videos Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-gray-50/50 border border-gray-100 rounded-2xl text-center">
              <span className="text-2xl font-extrabold text-black block">{projects.length}</span>
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Projects Created</span>
            </div>
            <div className="p-5 bg-gray-50/50 border border-gray-100 rounded-2xl text-center">
              <span className="text-2xl font-extrabold text-black block">{videos.length}</span>
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Videos Generated</span>
            </div>
          </div>

          {/* Video List */}
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-base font-bold text-black">Generated Videos</h3>
            {videos.length === 0 ? (
              <p className="text-sm text-gray-400">No videos generated yet.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto divide-y">
                {videos.map((v) => (
                  <div key={v.id} className="py-2.5 flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-800 truncate max-w-[250px]">{v.title}</span>
                    <span className="text-gray-400 text-xs">{new Date(v.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Publishing Activity Log */}
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-base font-bold text-black">Publishing Activity</h3>
            {publishingActivity.length === 0 ? (
              <p className="text-sm text-gray-400">No videos published yet.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto divide-y">
                {publishingActivity.map((log) => (
                  <div key={log.id} className="py-2.5 flex justify-between items-center text-sm">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-800">{log.title}</span>
                      <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{log.platform}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.status === 'Published' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>{log.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
