'use client';

import { useState, useEffect } from 'react';
import { Search, Coins, Plus, Minus, History } from 'lucide-react';

interface Wallet {
  id: string;
  userId: string;
  scriptCredits: number;
  voiceCredits: number;
  videoCredits: number;
  publishCredits: number;
  storageLimitGB: number;
  storageUsedGB: number;
}

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  accountStatus: string;
  creditWallet: Wallet;
}

interface Transaction {
  id: string;
  userId: string;
  creditType: string;
  amount: number;
  action: string;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
}

export default function AdminCreditsPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [modalAction, setModalAction] = useState<'ADD' | 'REMOVE'>('ADD');
  const [creditType, setCreditType] = useState<'SCRIPT' | 'VOICE' | 'VIDEO' | 'PUBLISH'>('SCRIPT');
  const [amount, setAmount] = useState<number>(1);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchCreditsData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/credits');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setTransactions(data.transactions || []);
      } else {
        setError(data.error || 'Failed to load credits dashboard.');
      }
    } catch {
      setError('An error occurred while fetching credits data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditsData();
  }, []);

  const handleOpenModal = (user: UserItem, action: 'ADD' | 'REMOVE') => {
    setSelectedUser(user);
    setModalAction(action);
    setAmount(1);
    setCreditType('SCRIPT');
    setIsModalOpen(true);
  };

  const handleAdjustCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || amount <= 0) return;

    try {
      setModalLoading(true);
      const endpoint = modalAction === 'ADD' ? '/api/admin/credits/add' : '/api/admin/credits/remove';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          type: creditType,
          amount,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchCreditsData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update credits.');
      }
    } catch {
      alert('Failed to update credits.');
    } finally {
      setModalLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black">Credits Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Audit transactions and adjust credit balances for scripts, voices, and video production.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-white border border-gray-100 p-4 rounded-2xl shadow-xs">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by client or editor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-black"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold bg-neutral-50 px-3 py-1.5 rounded-lg border">
          <Coins className="h-3.5 w-3.5 text-black" />
          <span>Centralized Token Wallet Economy</span>
        </div>
      </div>

      {/* Wallets Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm animate-pulse">Loading credit wallets...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No credit wallets found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-wider">
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 text-center">Scripts</th>
                  <th className="p-4 text-center">Voices</th>
                  <th className="p-4 text-center">Videos</th>
                  <th className="p-4 text-center">Publish</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredUsers.map((u) => {
                  const w = u.creditWallet;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <p className="font-bold text-black">{u.name || 'Workspace User'}</p>
                        <p className="text-gray-400 text-[10px]">{u.email}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700' :
                          u.role === 'EDITOR' ? 'bg-blue-50 text-blue-700' :
                          'bg-neutral-100 text-neutral-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-black">{w?.scriptCredits ?? 0}</td>
                      <td className="p-4 text-center font-mono font-bold text-black">{w?.voiceCredits ?? 0}</td>
                      <td className="p-4 text-center font-mono font-bold text-black">{w?.videoCredits ?? 0}</td>
                      <td className="p-4 text-center font-mono font-bold text-black">{w?.publishCredits ?? 0}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenModal(u, 'ADD')}
                          className="inline-flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all"
                        >
                          <Plus className="h-3 w-3" /> Top Up
                        </button>
                        <button
                          onClick={() => handleOpenModal(u, 'REMOVE')}
                          className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 hover:bg-rose-100 px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all"
                        >
                          <Minus className="h-3 w-3" /> Deduct
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

      {/* Transaction Logs Audit Section */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-2 border-b pb-4">
          <History className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-bold text-black">Audit Logs: Recent Transactions</h2>
        </div>

        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No transactions recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center text-xs p-3 bg-neutral-50 border border-neutral-100 rounded-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-black">{tx.user.name || tx.user.email}</span>
                    <span className="text-[10px] font-medium text-gray-400">({tx.user.email})</span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {tx.creditType} • {tx.action} • {new Date(tx.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`font-mono font-bold text-sm ${
                  tx.amount > 0 ? 'text-green-600' : 'text-rose-600'
                }`}>
                  {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals: Credit Adjustments */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-gray-100 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-6 animate-in fade-in-50 zoom-in-95 duration-150">
            <div>
              <h3 className="text-lg font-bold text-black">
                {modalAction === 'ADD' ? 'Top-Up User Wallet' : 'Deduct User Credits'}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Adjusting credits for <span className="font-bold text-black">{selectedUser.name || selectedUser.email}</span>
              </p>
            </div>

            <form onSubmit={handleAdjustCredits} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Credit Category</label>
                <select
                  value={creditType}
                  onChange={(e) => setCreditType(e.target.value as 'SCRIPT' | 'VOICE' | 'VIDEO' | 'PUBLISH')}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-black bg-white"
                >
                  <option value="SCRIPT">Script Generation</option>
                  <option value="VOICE">Voice Generation</option>
                  <option value="VIDEO">Video Production</option>
                  <option value="PUBLISH">Social Publishing</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Token Amount</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value) || 1)}
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
                  {modalLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
