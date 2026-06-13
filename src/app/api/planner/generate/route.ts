import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

// POST: Generate a 30-day content plan
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const orgId = session.user.organizationId;

  try {
    const { niche, targetAudience, frequency } = await request.json();

    if (!niche || !targetAudience || !frequency) {
      return NextResponse.json({ error: 'niche, targetAudience, and frequency are required' }, { status: 400 });
    }

    // Try to load NVIDIA NIM API key (check organization first, then user)
    let providerKey = null;
    if (orgId) {
      providerKey = await db.providerKey.findFirst({
        where: {
          organizationId: orgId,
          provider: 'NVIDIA',
        },
      });
    }
    if (!providerKey) {
      providerKey = await db.providerKey.findFirst({
        where: {
          userId,
          provider: 'NVIDIA',
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

    let items: Array<{ topic: string; hook: string; scriptIdea: string; dayIndex: number }> = [];

    // Frequency parsing
    let count = 4; // default
    if (frequency.toLowerCase().includes('3')) count = 12;
    else if (frequency.toLowerCase().includes('daily')) count = 30;
    else if (frequency.toLowerCase().includes('weekly')) count = 4;
    else if (frequency.toLowerCase().includes('5')) count = 20;

    if (!nvidiaKey) {
      console.log('[AI_PLANNER] NVIDIA key not configured. Returning mock content plan.');
      // Create high-quality mock data
      for (let i = 0; i < count; i++) {
        const dayOffset = Math.floor((30 / count) * i) + 1;
        items.push({
          dayIndex: dayOffset,
          topic: `Mastering ${niche} for ${targetAudience} - Day ${dayOffset}`,
          hook: `Are you a member of ${targetAudience} struggling with ${niche}? Here is the exact blueprint.`,
          scriptIdea: `1. Introduce the main bottleneck of ${niche}.\n2. Explain the solution targeting ${targetAudience}.\n3. Conclude with a solid call to action to follow for more.`,
        });
      }
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
                content: `You are an expert Content Strategy Planner. Generate a 30-day social media content plan.
The plan must contain exactly ${count} posts distributed across 30 days.
Output the result ONLY as a JSON array of objects, with no markdown backticks, conversational intro, or additional text.
Each object must match this schema:
{
  "dayIndex": number (between 1 and 30, representing the day of publication),
  "topic": "Engaging topic title",
  "hook": "An attention-grabbing first sentence/hook",
  "scriptIdea": "A brief script outline or core idea (3 bullet points)"
}`,
              },
              {
                role: 'user',
                content: `Niche: ${niche}\nTarget Audience: ${targetAudience}\nFrequency: ${frequency} (${count} posts total over 30 days)`,
              },
            ],
            max_tokens: 2048,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content ?? '';
          const cleanJsonText = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
          items = JSON.parse(cleanJsonText);
        } else {
          throw new Error(`NVIDIA NIM returned ${response.status}`);
        }
      } catch (err) {
        console.error('[AI_PLANNER_LLM_ERR] Fallback to mock:', err);
        // Fallback mock
        for (let i = 0; i < count; i++) {
          const dayOffset = Math.floor((30 / count) * i) + 1;
          items.push({
            dayIndex: dayOffset,
            topic: `Mastering ${niche} for ${targetAudience} - Day ${dayOffset}`,
            hook: `Are you a member of ${targetAudience} struggling with ${niche}? Here is the exact blueprint.`,
            scriptIdea: `1. Introduce the main bottleneck of ${niche}.\n2. Explain the solution targeting ${targetAudience}.\n3. Conclude with a solid call to action to follow for more.`,
          });
        }
      }
    }

    // Persist ContentPlan and Items
    const contentPlan = await db.contentPlan.create({
      data: {
        organizationId: orgId || 'default',
        niche,
        targetAudience,
        frequency,
      },
    });

    const persistedItems = [];
    const baseDate = new Date();

    for (const item of items) {
      const pubDate = new Date(baseDate);
      pubDate.setDate(baseDate.getDate() + item.dayIndex);
      pubDate.setHours(9, 0, 0, 0); // Publish at 9 AM

      const dbItem = await db.contentPlanItem.create({
        data: {
          contentPlanId: contentPlan.id,
          topic: item.topic,
          hook: item.hook,
          scriptIdea: item.scriptIdea,
          publishingDate: pubDate,
          status: 'PLANNED',
        },
      });
      persistedItems.push(dbItem);
    }

    return NextResponse.json({
      message: '30-Day Content Plan Generated successfully',
      contentPlanId: contentPlan.id,
      items: persistedItems,
    });
  } catch (error) {
    console.error('[PLANNER_GENERATE_ERR]:', error);
    return NextResponse.json({ error: 'Failed to generate content plan' }, { status: 500 });
  }
}
