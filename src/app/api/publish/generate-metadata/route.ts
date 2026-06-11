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
      console.log('[GENERATE_METADATA] NVIDIA key not configured. Returning simulated mock multi-platform metadata.');
      const tags = ['AI', 'Video Generation', 'Automation', 'Social Media', project.name || 'AI Content'].filter(Boolean);
      return NextResponse.json({
        youtube: {
          title: `How to Master ${project.name || 'AI Content Creation'}`,
          description: `Looking to learn about ${project.name || 'AI content creation'}? \n\nThis video covers the core script:\n${project.scriptText || 'No script text generated yet.'}\n\nSubscribe for more AI tutorials and workflows!`,
          tags,
        },
        linkedin: {
          postText: `🚀 Excited to share our latest video on ${project.name || 'AI Content Creation'}!\n\nHere is a sneak peek into the script:\n"${project.scriptText ? project.scriptText.substring(0, 150) + '...' : 'Innovative AI workflows'}"\n\nHow are you using AI in your pipeline? Let's discuss in the comments below! 👇\n\n#AI #Automation #Innovation`,
        },
        facebook: {
          caption: `Transforming ideas into reality with Studio AI. Check out this overview of ${project.name || 'our latest project'}. Let us know your thoughts! 🎬✨ #AI #VideoCreator`,
        },
        instagram: {
          caption: `Creating high-quality videos in seconds. 🎥 Here's the roadmap for ${project.name || 'our next launch'}.`,
          hashtags: ['AI', 'VideoEditing', 'Shorts', 'Reels', 'Tech', 'Creativity'],
        },
        twitter: {
          tweetText: `Tired of manual video editing? 🤖 Check out how we automate scripts and voices for ${project.name || 'Studio AI'}. Watch here:`,
        }
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
            content: 'You are an AI assistant helping a creator publish their video. Given the video script, generate optimized metadata for YouTube, LinkedIn, Facebook, Instagram, and Twitter. Output the result ONLY as a valid JSON object matching the following structure: { youtube: { title, description, tags: ["tag1", "tag2"] }, linkedin: { postText }, facebook: { caption }, instagram: { caption, hashtags: ["tag1", "tag2"] }, twitter: { tweetText } }. Do not write any markdown wrappers, backticks, or introductory conversational text.',
          },
          {
            role: 'user',
            content: `Video Script:\n${project.scriptText || 'Write a video about ' + project.name}`,
          },
        ],
        max_tokens: 1024,
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
      return NextResponse.json(parsed);
    } catch (parseErr) {
      console.error('[GENERATE_METADATA] JSON parsing failed. raw text:', text, parseErr);
      
      // Basic fallback structure if parsing fails
      return NextResponse.json({
        youtube: {
          title: `How to Master ${project.name}`,
          description: `Script summary:\n\n${project.scriptText}`,
          tags: ['AI', 'Automation'],
        },
        linkedin: {
          postText: `Check out our new video about ${project.name}!\n\n#AI #Automation`,
        },
        facebook: {
          caption: `Creating videos with AI. Project: ${project.name}`,
        },
        instagram: {
          caption: `Publishing new Reels for ${project.name}`,
          hashtags: ['AI', 'Reels'],
        },
        twitter: {
          tweetText: `Check out our new AI-generated video for ${project.name}`,
        }
      });
    }
  } catch (error) {
    console.error('[PUBLISH_GEN_METADATA] Error:', error);
    return NextResponse.json({ error: 'Metadata generation failed' }, { status: 500 });
  }
}
