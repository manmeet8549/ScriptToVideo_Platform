import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3, Download, Share2, Video, Loader2, Play, Info
} from 'lucide-react';

// Custom social brand SVG icons
const Youtube = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.522 3.5 12 3.5 12 3.5s-7.522 0-9.388.555A3.002 3.002 0 0 0 .503 6.163C0 8.03 0 12 0 12s0 3.97.503 5.837a3.003 3.003 0 0 0 2.11 2.108C5.113 20.5 12 20.5 12 20.5s7.522 0 9.388-.555a3.003 3.003 0 0 0 2.11-2.108C24 15.97 24 12 24 12s0-3.97-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const Linkedin = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const Facebook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const Twitter = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

interface SummaryData {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  bestPlatform: string;
  publishingFrequency: string;
  averageEngagementRate: string;
}

interface VideoMetric {
  id: string;
  title: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  publishedAt: string;
}

interface TrendPoint {
  date: string;
  views: number;
  likes: number;
}

interface PlatformBreakdown {
  platform: string;
  views: number;
  posts: number;
}

export default function KPIDashboardSection() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [mostSuccessful, setMostSuccessful] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<PlatformBreakdown[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [recent, setRecent] = useState<VideoMetric[]>([]);

  // Fetch KPI data
  const fetchKpis = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kpi/performance');
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setMostSuccessful(data.mostSuccessfulVideo);
        setBreakdown(data.platformBreakdown);
        setTrends(data.trends);
        setRecent(data.recentVideos || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
  }, []);

  const handleExport = (type: 'csv' | 'excel') => {
    window.open(`/api/kpi/performance?export=${type}`, '_blank');
  };

  // Icon Match Helpers
  const getPlatformIcon = (platform: string, className = "h-4 w-4") => {
    switch (platform.toLowerCase()) {
      case 'youtube': return <Youtube className={`${className} text-red-600`} />;
      case 'linkedin': return <Linkedin className={`${className} text-blue-600`} />;
      case 'facebook': return <Facebook className={`${className} text-indigo-600`} />;
      case 'instagram': return <Instagram className={`${className} text-pink-500`} />;
      case 'twitter': return <Twitter className={`${className} text-black`} />;
      default: return <Video className={`${className} text-gray-500`} />;
    }
  };

  if (loading || !summary) {
    return (
      <div className="min-h-96 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        <p className="text-xs text-neutral-500 font-sans">Compiling engagement stats...</p>
      </div>
    );
  }

  // Calculate SVG line/bar chart variables
  const maxViewsInTrend = Math.max(...trends.map(t => t.views), 1);
  const points = trends.map((t, idx) => {
    const x = 50 + idx * 80;
    const y = 160 - (t.views / maxViewsInTrend) * 110;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-1">
      {/* Title Header */}
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-black flex items-center gap-3">
            KPI Dashboard
          </h1>
          <p className="text-sm text-gray-500 font-sans mt-1">
            Track published content conversions, audience retention, and cross-platform averages.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleExport('csv')}
            className="rounded-xl border border-gray-200 bg-white hover:bg-neutral-50 text-xs font-bold text-gray-700 px-4 py-2 cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button
            onClick={() => handleExport('excel')}
            className="rounded-xl border border-gray-200 bg-white hover:bg-neutral-50 text-xs font-bold text-gray-700 px-4 py-2 cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* KPI Counters Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs font-sans">
        <Card className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xs flex flex-col justify-between h-28">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Video Views</span>
          <span className="text-3xl font-black text-black leading-none">{summary.totalViews.toLocaleString()}</span>
          <span className="text-[10px] text-gray-400 font-bold block">Aggregated social reach</span>
        </Card>
        <Card className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xs flex flex-col justify-between h-28">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Engagement Rate</span>
          <span className="text-3xl font-black text-indigo-600 leading-none">{summary.averageEngagementRate}</span>
          <span className="text-[10px] text-gray-400 font-bold block">Average likes + comments</span>
        </Card>
        <Card className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xs flex flex-col justify-between h-28">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Best Channel</span>
          <span className="text-3xl font-black text-black leading-none">{summary.bestPlatform}</span>
          <span className="text-[10px] text-gray-400 font-bold block">Highest average views</span>
        </Card>
        <Card className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xs flex flex-col justify-between h-28">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Frequency</span>
          <span className="text-2xl font-black text-black leading-none truncate">{summary.publishingFrequency}</span>
          <span className="text-[10px] text-gray-400 font-bold block">Completed publications</span>
        </Card>
      </div>

      {/* Analytics Charts & Most Successful Video */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-xs font-sans">
        {/* Left Column: Line Chart Trend */}
        <div className="lg:col-span-8">
          <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-neutral-800 uppercase tracking-wider">7-Day Engagement Trend</h3>
            
            {/* SVG Chart */}
            <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
              <svg viewBox="0 0 580 200" className="w-[580px] h-[200px]">
                {/* Horizontal Gridlines */}
                <line x1="40" y1="50" x2="550" y2="50" stroke="#f3f4f6" strokeWidth="1" />
                <line x1="40" y1="100" x2="550" y2="100" stroke="#f3f4f6" strokeWidth="1" />
                <line x1="40" y1="160" x2="550" y2="160" stroke="#e5e7eb" strokeWidth="1.5" />

                {/* Y-axis Labels */}
                <text x="15" y="54" className="text-[9px] font-bold fill-gray-400 font-sans">{(maxViewsInTrend * 0.75).toFixed(0)}</text>
                <text x="15" y="104" className="text-[9px] font-bold fill-gray-400 font-sans">{(maxViewsInTrend * 0.5).toFixed(0)}</text>
                <text x="15" y="164" className="text-[9px] font-bold fill-gray-400 font-sans">0</text>

                {/* X-axis Labels */}
                {trends.map((t, idx) => (
                  <text key={idx} x={42 + idx * 80} y="185" className="text-[9px] font-bold fill-gray-400 font-sans text-center">{t.date}</text>
                ))}

                {/* Engagement Line */}
                <polyline
                  fill="none"
                  stroke="black"
                  strokeWidth="2.5"
                  points={points}
                />

                {/* Data Points */}
                {trends.map((t, idx) => {
                  const cx = 50 + idx * 80;
                  const cy = 160 - (t.views / maxViewsInTrend) * 110;
                  return (
                    <g key={idx} className="group cursor-pointer">
                      <circle
                        cx={cx}
                        cy={cy}
                        r="4"
                        fill="white"
                        stroke="black"
                        strokeWidth="2"
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r="8"
                        fill="black"
                        opacity="0"
                        className="hover:opacity-10 transition-opacity"
                      />
                      {/* Tooltip */}
                      <title>{`Views: ${t.views.toLocaleString()}`}</title>
                    </g>
                  );
                })}
              </svg>
            </div>
          </Card>
        </div>

        {/* Right Column: Hero metrics & top platforms */}
        <div className="lg:col-span-4 space-y-6">
          {mostSuccessful ? (
            <Card className="rounded-3xl border border-gray-100 bg-neutral-900 text-white p-6 shadow-sm space-y-4">
              <div>
                <span className="text-[9px] font-black text-indigo-400 bg-indigo-950 border border-indigo-900 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Top Performer</span>
                <h4 className="font-extrabold text-sm text-white mt-2 hover:underline cursor-pointer">{mostSuccessful.title}</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-neutral-800 pt-4 text-xs font-sans">
                <div>
                  <span className="text-neutral-500 font-bold block text-[10px]">VIEWS</span>
                  <span className="text-xl font-black block mt-0.5">{mostSuccessful.views.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-neutral-500 font-bold block text-[10px]">ENGAGEMENT RATE</span>
                  <span className="text-xl font-black text-indigo-400 block mt-0.5">
                    {((mostSuccessful.likes / mostSuccessful.views) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center bg-neutral-800 border border-neutral-700/60 p-3 rounded-2xl">
                <span className="flex items-center gap-1.5 text-neutral-400 font-semibold">
                  {getPlatformIcon(mostSuccessful.platform, "h-3.5 w-3.5")}
                  {mostSuccessful.platform.toUpperCase()}
                </span>
                {mostSuccessful.videoUrl && (
                  <a
                    href={mostSuccessful.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold text-white hover:underline"
                  >
                    Watch Video
                  </a>
                )}
              </div>
            </Card>
          ) : (
            <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm text-center py-12">
              <Info className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 font-semibold">Generate views data to unlock top performer analytics.</p>
            </Card>
          )}

          {/* Platform distribution counts */}
          <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-3">
            <h4 className="font-extrabold text-xs text-neutral-800 uppercase tracking-wider">Platform Outlets</h4>
            <div className="space-y-2">
              {breakdown.map((b) => (
                <div key={b.platform} className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-neutral-600 font-semibold">
                    {getPlatformIcon(b.platform)}
                    {b.platform}
                  </span>
                  <div className="flex gap-2 font-bold text-neutral-800">
                    <span>{b.posts || 0} posts</span>
                    <span className="text-neutral-300">|</span>
                    <span className="text-neutral-500">{b.views ? b.views.toLocaleString() : 0} views</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Video Metrics Table */}
      <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <h3 className="font-extrabold text-sm text-neutral-800 uppercase tracking-wider">Publication Performance Feed</h3>
        <div className="overflow-x-auto rounded-2xl border border-neutral-100">
          <table className="w-full text-left font-sans text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-gray-400 font-extrabold border-b border-neutral-100">
                <th className="p-3">Title</th>
                <th className="p-3">Platform</th>
                <th className="p-3 text-right">Views</th>
                <th className="p-3 text-right">Likes</th>
                <th className="p-3 text-right">Comments</th>
                <th className="p-3 text-right">Shares</th>
                <th className="p-3">Published At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {recent.length > 0 ? (
                recent.map((v) => (
                  <tr key={v.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="p-3 font-bold text-black max-w-[280px] truncate" title={v.title}>{v.title}</td>
                    <td className="p-3 text-neutral-500 font-semibold">
                      <span className="flex items-center gap-1.5">
                        {getPlatformIcon(v.platform)}
                        {v.platform.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-black">{v.views.toLocaleString()}</td>
                    <td className="p-3 text-right text-gray-600">{v.likes.toLocaleString()}</td>
                    <td className="p-3 text-right text-gray-600">{v.comments.toLocaleString()}</td>
                    <td className="p-3 text-right text-gray-600">{v.shares.toLocaleString()}</td>
                    <td className="p-3 text-neutral-400 font-bold">{new Date(v.publishedAt).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400 font-semibold">No publications found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
