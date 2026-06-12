'use client';

import { useState } from 'react';
import { 
  Users, Video, Coins, Share2, FileSpreadsheet, Download 
} from 'lucide-react';

interface ReportCard {
  type: 'users' | 'editors' | 'credits' | 'publishing' | 'videos';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  columns: string[];
}

export default function AdminReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const reports: ReportCard[] = [
    {
      type: 'users',
      title: 'User Accounts Directory',
      description: 'Directory of all users registered on the platform, their role status, account status, wallet credits remaining, and storage allocations.',
      icon: Users,
      columns: ['User ID', 'Name', 'Email', 'Role', 'Status', 'Script/Voice/Video Credits', 'Storage Used/Limit', 'Total Projects'],
    },
    {
      type: 'editors',
      title: 'Editor Performance & Info',
      description: 'Profiles of all platform editors, their availability status, connected client counts, total assigned videos, and throughput metrics.',
      icon: Video,
      columns: ['Editor ID', 'Name', 'Email', 'Display Name', 'Skills', 'Availability', 'Connected Clients', 'Total Assignments'],
    },
    {
      type: 'credits',
      title: 'Credit Transaction Audit',
      description: 'Audit history of all credit wallet transaction records, including admin adjustments, top-ups, deductions, and user generations.',
      icon: Coins,
      columns: ['Transaction ID', 'User Name/Email', 'Credit Type', 'Amount (+/-)', 'Action Taken', 'Timestamp'],
    },
    {
      type: 'publishing',
      title: 'Social Media Publishing Logs',
      description: 'Historical records of all multi-platform published videos, platforms (YouTube/LinkedIn/Facebook/etc.), status codes, and external links.',
      icon: Share2,
      columns: ['Publish ID', 'Client Info', 'Video Title', 'Platform', 'Status', 'External Video ID', 'Published URL', 'Timestamp'],
    },
    {
      type: 'videos',
      title: 'Video Library Inventory',
      description: 'A complete inventory of all videos rendered by users on the platform, including their filenames, R2 file sizes, and duration counts.',
      icon: FileSpreadsheet,
      columns: ['Video ID', 'Client Name/Email', 'Title', 'R2 Storage Key', 'File Size (MB)', 'Duration (Seconds)', 'Rended At'],
    },
  ];

  const handleDownload = async (type: string) => {
    try {
      setDownloading(type);
      
      // Trigger a clean direct window navigation/download link
      const url = `/api/admin/reports?type=${type}`;
      
      // Create a temporary link element to prompt saving
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${type}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to trigger report export:', error);
      alert('Failed to download CSV report.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Title */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black">CSV Exports & Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Export relational system datasets to RFC 4180-compliant CSV files for spreadsheet auditing.</p>
        </div>
      </div>

      {/* Grid of Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          const isDownloading = downloading === report.type;

          return (
            <div 
              key={report.type} 
              className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 text-neutral-800">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-black">{report.title}</h3>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  {report.description}
                </p>

                {/* Columns preview */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Fields Included</span>
                  <div className="flex flex-wrap gap-1">
                    {report.columns.map((c) => (
                      <span key={c} className="bg-neutral-50 border border-neutral-100 text-gray-500 px-2 py-0.5 rounded text-[9px] font-semibold">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-50">
                <button
                  onClick={() => handleDownload(report.type)}
                  disabled={isDownloading}
                  className="w-full flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white rounded-xl py-2.5 text-xs font-bold disabled:opacity-50 transition-all"
                >
                  <Download className="h-4 w-4" />
                  {isDownloading ? 'Generating Report...' : 'Download CSV Report'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
