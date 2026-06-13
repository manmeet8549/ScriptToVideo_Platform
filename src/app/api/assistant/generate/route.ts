import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

// POST: AI Content Assistant helper (generates platform optimized copy)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const orgId = session.user.organizationId;

  try {
    const { platform, scriptText, topic } = await request.json();

    if (!platform || (!scriptText && !topic)) {
      return NextResponse.json({ error: 'platform and either scriptText or topic are required' }, { status: 400 });
    }

    // Load NVIDIA NIM Key
    let providerKey = null;
    if (orgId) {
      providerKey = await db.providerKey.findUnique({
        where: {
          organizationId_provider: {
            organizationId: orgId,
            provider: 'NVIDIA',
          },
        },
      });
    }
    if (!providerKey) {
      providerKey = await db.providerKey.findUnique({
        where: {
          userId_provider: {
            userId,
            provider: 'NVIDIA',
          },
        },
      });
    }

    let nvidiaKey = '';
    if (providerKey) {
      try {
        nvidiaKey = decrypt(providerKey.value);
      } catch (e) {
        console.warn('Failed to decrypt NVIDIA API key, running mock generation', e);
      }
    }

    let result = { title: '', description: '', hashtags: [] as string[], cta: '' };

    if (!nvidiaKey) {
      console.log('[AI_ASSISTANT] NVIDIA key not configured. Returning mock details.');
      const safeTopic = topic || 'AI Video Strategy';
      result = {
        title: `Ultimate Guide to ${safeTopic}!`,
        description: `This video breaks down the core concepts of ${safeTopic}. We explain how the process is automated from scratch to publishing. Watch this to optimize your workflow.`,
        hashtags: ['AI', 'VideoMarketing', 'Shorts', 'Reels', 'Innovation', 'ContentCreator'],
        cta: 'Subscribe to our channel and drop a comment on how you automate your pipeline!',
      };
    } else {
      // Call NVIDIA NIM Llama 3.1 70B
      try {
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
                content: `You are an expert Social Media Manager. Write engaging social copy for the specified platform.
Output the result ONLY as a JSON object, with no markdown wrappers, backticks, or intro/outro conversational text.
Structure matches:
{
  "title": "Optimized Title (short, clicky)",
  "description": "Engaging description or post copy text",
  "hashtags": ["tag1", "tag2", "tag3"],
  "cta": "Strong call to action"
}`,
              },
              {
                role: 'user',
                content: `Platform: ${platform}\nTopic/Title: ${topic || 'None'}\nScript Content: ${scriptText || 'None'}`,
              },
            ],
            max_tokens: 1024,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content ?? '';
          const cleanJsonText = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
          result = JSON.parse(cleanJsonText);
        } else {
          throw new Error('NVIDIA NIM returned error');
        }
      } catch (err) {
        console.error('[ASSISTANT_LLM_ERR] Fallback to mock:', err);
        const safeTopic = topic || 'AI Video Strategy';
        result = {
          title: `Ultimate Guide to ${safeTopic}!`,
          description: `This video breaks down the core concepts of ${safeTopic}. We explain how the process is automated from scratch to publishing. Watch this to optimize your workflow.`,
          hashtags: ['AI', 'VideoMarketing', 'Shorts', 'Reels', 'Innovation', 'ContentCreator'],
          cta: 'Subscribe to our channel and drop a comment on how you automate your pipeline!',
        };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ASSISTANT_ERR]:', error);
    return NextResponse.json({ error: 'Failed to generate assistant copy' }, { status: 500 });
  }
}
