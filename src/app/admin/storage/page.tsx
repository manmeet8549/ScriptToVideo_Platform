'use client';

import { useState, useEffect } from 'react';
import { HardDrive, Edit2, ShieldAlert } from 'lucide-react';

interface Consumer {
  id: string;
  name: string;
  email: string;
  storageUsedGB: number;
  storageLimitGB: number;
}

interface StorageData {
  totalUsedGB: number;
  totalLimitGB: number;
  remainingGB: number;
  consumers: Consumer[];
}

export default function AdminStoragePage() {
  const [data, setData] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Consumer | null>(null);
  const [newLimit, setNewLimit] = useState<number>(10);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchStorageData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/storage');
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        setError(json.error || 'Failed to load storage dashboard.');
      }
    } catch {
      setError('An error occurred while fetching storage statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageData();
  }, []);

  const handleOpenModal = (user: Consumer) => {
    setSelectedUser(user);
    setNewLimit(user.storageLimitGB);
    setIsModalOpen(true);
  };

  const handleUpdateLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || newLimit <= 0) return;

    try {
      setModalLoading(true);
      const res = await fetch('/api/admin/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          storageLimitGB: newLimit,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchStorageData();
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to update storage limit.');
      }
    } catch {
      alert('Failed to update storage limit.');
    } finally {
      setModalLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 text-center text-sm text-gray-500 font-sans">
        Loading storage metrics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto font-sans">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { totalUsedGB, totalLimitGB, remainingGB, consumers } = data;
  const percentUsed = totalLimitGB > 0 ? Math.round((totalUsedGB / totalLimitGB) * 100) : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Title */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black">Cloudflare R2 Storage</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor disk space allocations, dynamic usage, and increase storage quotas.</p>
        </div>
      </div>

      {/* Grid: Global Usage */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm space-y-4 md:col-span-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overall Storage Allocation</h3>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-black text-black">{totalUsedGB} GB</p>
              <p className="text-xs text-gray-400 mt-1">Used of {totalLimitGB} GB aggregate limit</p>
            </div>
            <span className="font-bold text-sm text-neutral-800">{percentUsed}% capacity</span>
          </div>
          {/* Main allocation bar */}
          <div className="bg-gray-100 h-3 rounded-full overflow-hidden">
            <div className="bg-neutral-900 h-full rounded-full" style={{ width: `${percentUsed}%` }} />
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Remaining Quota</h3>
            <p className="text-3xl font-black text-black mt-2">{remainingGB} GB</p>
            <p className="text-xs text-gray-400 mt-1">Available across client projects</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold bg-neutral-50 px-2 py-1 rounded border">
            <HardDrive className="h-3.5 w-3.5 text-black" />
            <span>Multi-region Cloudflare R2 bucket</span>
          </div>
        </div>
      </div>

      {/* Top Consumers Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-black font-sans">Storage Space Distribution</h2>
          <p className="text-gray-400 text-xs mt-1">Details of storage usage and limit metrics grouped by client.</p>
        </div>

        {consumers.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No storage users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-wider">
                  <th className="p-4">User</th>
                  <th className="p-4">Used Space</th>
                  <th className="p-4">Limit (GB)</th>
                  <th className="p-4">Usage Ratio</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {consumers.map((c) => {
                  const ratio = c.storageLimitGB > 0 ? Math.min(100, Math.round((c.storageUsedGB / c.storageLimitGB) * 100)) : 0;
                  const isOverLimit = c.storageUsedGB >= c.storageLimitGB;

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-bold text-black">{c.name}</p>
                            <p className="text-gray-400 text-[10px]">{c.email}</p>
                          </div>
                          {isOverLimit && (
                            <span className="flex items-center gap-0.5 bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-rose-100">
                              <ShieldAlert className="h-3 w-3" /> Exceeded
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-black">{c.storageUsedGB.toFixed(4)} GB</td>
                      <td className="p-4 font-semibold text-gray-500">{c.storageLimitGB} GB</td>
                      <td className="p-4 w-1/4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${
                              isOverLimit ? 'bg-rose-500' : 'bg-neutral-800'
                            }`} style={{ width: `${ratio}%` }} />
                          </div>
                          <span className="font-bold text-[10px] text-gray-400 shrink-0">{ratio}%</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenModal(c)}
                          className="inline-flex items-center gap-1 bg-neutral-50 text-neutral-800 hover:bg-neutral-100 px-2.5 py-1.5 rounded-lg font-bold text-[10px] border border-neutral-200 transition-all"
                        >
                          <Edit2 className="h-3 w-3" /> Adjust Limit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust limit modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-gray-100 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-6 animate-in fade-in-50 zoom-in-95 duration-150">
            <div>
              <h3 className="text-lg font-bold text-black">Adjust Storage Limit</h3>
              <p className="text-xs text-gray-400 mt-1">
                Configure maximum Cloudflare R2 allocation for <span className="font-bold text-black">{selectedUser.name}</span>
              </p>
            </div>

            <form onSubmit={handleUpdateLimit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Storage Limit (GB)</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  required
                  value={newLimit}
                  onChange={(e) => setNewLimit(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-black rounded-xl py-2.5 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 bg-black hover:bg-neutral-800 text-white rounded-xl py-2.5 text-xs font-bold disabled:opacity-50 transition-all"
                >
                  {modalLoading ? 'Saving...' : 'Update Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
