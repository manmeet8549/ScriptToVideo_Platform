import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Try to load NVIDIA NIM API key
    const providerKey = await db.providerKey.findUnique({
      where: { userId_provider: { userId: session.user.id, provider: 'NVIDIA' } },
    });

    let nvidiaKey = '';
    if (providerKey) {
      try {
        nvidiaKey = decrypt(providerKey.value);
      } catch (e) {
        console.warn('Failed to decrypt NVIDIA API key, running mock generation', e);
      }
    }

    if (!nvidiaKey) {
      console.log('[GENERATE_METADATA] NVIDIA key not configured. Returning simulated mock metadata.');
      return NextResponse.json({
        title: `How to Master ${project.name || 'AI Content Creation'}`,
        description: `Looking to learn about ${project.name || 'AI content creation'}? \n\nThis video covers the core script:\n${project.scriptText || 'No script text generated yet.'}\n\nSubscribe for more AI tutorials and workflows!`,
        tags: ['AI', 'Video Generation', 'Automation', 'Social Media', project.name || 'AI Content'].filter(Boolean),
      });
    }

    // Call NVIDIA NIM Llama 3.1 70B
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nvidiaKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant helping a creator publish their video. Given the video script, generate a YouTube-optimized Title, Description, and Tags. Output the result ONLY as a valid JSON object with keys: title, description, tags (as an array of strings). Do not write any markdown wrappers, backticks, or introductory conversational text.',
          },
          {
            role: 'user',
            content: `Video Script:\n${project.scriptText || 'Write a video about ' + project.name}`,
          },
        ],
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`NVIDIA NIM returned ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? '';

    // Parse JSON
    try {
      const cleanJsonText = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
      const parsed = JSON.parse(cleanJsonText);
      return NextResponse.json({
        title: parsed.title || `Mastering ${project.name}`,
        description: parsed.description || `Script summary:\n\n${project.scriptText}`,
        tags: parsed.tags || ['AI', 'Automation'],
      });
    } catch (parseErr) {
      console.error('[GENERATE_METADATA] JSON parsing failed. raw text:', text, parseErr);
      // Fallback regex parsers
      const titleMatch = text.match(/"title"\s*:\s*"(.*?)"/);
      const descMatch = text.match(/"description"\s*:\s*"(.*?)"/);
      return NextResponse.json({
        title: titleMatch?.[1] || `How to master ${project.name}`,
        description: descMatch?.[1] || `Check out this video script:\n\n${project.scriptText}`,
        tags: ['AI', 'Automation', project.name],
      });
    }
  } catch (error) {
    console.error('[PUBLISH_GEN_METADATA] Error:', error);
    return NextResponse.json({ error: 'Metadata generation failed' }, { status: 500 });
  }
}
