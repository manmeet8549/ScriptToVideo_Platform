'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Film, Play, Download, Loader2, Calendar } from 'lucide-react';

interface UploadedVideo {
  id: string;
  assignmentId: string;
  editedVideoUrl: string;
  version: number;
  uploadedAt: string;
  fileSize: number | null;
  assignment: {
    video: {
      title: string;
    };
    user: {
      name: string | null;
      email: string;
    };
  };
}

export default function EditorUploadsPage() {
  const [uploads, setUploads] = useState<UploadedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUploads = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/assignments/editor');
      if (res.ok) {
        const data = await res.json();
        const assignmentsList = data.assignments || [];
        
        // Flatten editedVideos from all assignments
        const flattenedUploads: UploadedVideo[] = [];
        assignmentsList.forEach((a: any) => {
          if (a.editedVideos && a.editedVideos.length > 0) {
            a.editedVideos.forEach((ev: any) => {
              flattenedUploads.push({
                ...ev,
                assignment: {
                  video: { title: a.video.title },
                  user: { name: a.user.name, email: a.user.email }
                }
              });
            });
          }
        });

        // Sort by uploadedAt descending
        flattenedUploads.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        setUploads(flattenedUploads);
      } else {
        setError('Failed to load uploads log.');
      }
    } catch {
      setError('Connection failure.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-3" />
        <p className="text-xs text-gray-500">Loading uploads log...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
          Uploads Log
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          Review history of all your uploaded video drafts and versions sent to clients.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {uploads.length === 0 ? (
        <Card className="rounded-3xl border border-gray-100 bg-white p-12 text-center text-gray-400 font-sans">
          <Film className="h-8 w-8 text-gray-200 mx-auto mb-3" />
          <p className="font-bold">No uploaded versions found.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {uploads.map((upload) => (
            <Card key={upload.id} className="rounded-3xl border border-gray-100 bg-white overflow-hidden shadow-xs">
              <div className="aspect-video bg-neutral-900 flex items-center justify-center relative group">
                <Play className="h-10 w-10 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                  Version {upload.version}
                </span>
              </div>
              <CardContent className="p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-black truncate">{upload.assignment.video.title}</h3>
                  <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                    Client: {upload.assignment.user.name || 'Client'}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold border-t border-gray-50 pt-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(upload.uploadedAt).toLocaleDateString()}</span>
                  </div>
                  <a
                    href={upload.editedVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-black hover:underline"
                  >
                    <Download className="h-3 w-3" />
                    Download Draft
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
