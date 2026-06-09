import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

// System prompt that guides the LLM to produce a structured video script
const SYSTEM_PROMPT = `You are an expert YouTube video scriptwriter. Given a topic or idea, you produce a polished, engaging video script.

Format the script exactly as follows — no markdown headings, no extra commentary:

HOOK:
[A compelling opening line or question that grabs attention in the first 5 seconds]

INTRO:
[A brief 2-3 sentence setup that explains what the video will cover]

BODY:
[The main content broken into 3-5 clear talking points. Use natural, conversational language as if speaking directly to the camera. Each point should flow into the next.]

CALL TO ACTION:
[A direct, friendly close that asks viewers to like, subscribe, or take the next step]

Keep the total script between 200-400 words. Write as if you are the presenter speaking aloud — no bullet points, no headers, just natural speech.`;

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

    // 1. Load the project (verify ownership + get prompt)
    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 2. Retrieve & decrypt the NVIDIA NIM API key
    const providerKey = await db.providerKey.findUnique({
      where: { userId_provider: { userId: session.user.id, provider: 'NVIDIA' } },
    });

    if (!providerKey) {
      return NextResponse.json(
        { error: 'NVIDIA NIM API key not configured. Please add it in API Keys settings.' },
        { status: 400 }
      );
    }

    let nvidiaKey: string;
    try {
      nvidiaKey = decrypt(providerKey.value);
    } catch {
      return NextResponse.json({ error: 'Failed to decrypt NVIDIA API key' }, { status: 500 });
    }

    // 3. Mark project as generating
    await db.project.update({
      where: { id: projectId },
      data: { status: 'SCRIPTING' },
    });

    // Log start
    const historyEntry = await db.generationHistory.create({
      data: {
        type: 'SCRIPT',
        status: 'IN_PROGRESS',
        metadata: { prompt: project.prompt },
        projectId,
        userId: session.user.id,
      },
    });

    // 4. Call NVIDIA NIM
    const nimResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nvidiaKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Write a video script about: ${project.prompt}` },
        ],
        max_tokens: 1024,
        temperature: 0.75,
        top_p: 0.95,
      }),
    });

    if (!nimResponse.ok) {
      const errorBody = await nimResponse.json().catch(() => ({}));
      const errorMsg = errorBody?.error?.message || `NVIDIA NIM returned ${nimResponse.status}`;

      // Mark failed
      await db.generationHistory.update({
        where: { id: historyEntry.id },
        data: { status: 'FAILED', metadata: { error: errorMsg, prompt: project.prompt } },
      });
      await db.project.update({
        where: { id: projectId },
        data: { status: 'FAILED' },
      });

      return NextResponse.json({ error: errorMsg }, { status: 502 });
    }

    const nimData = await nimResponse.json();
    const scriptText: string = nimData.choices?.[0]?.message?.content ?? '';

    if (!scriptText.trim()) {
      return NextResponse.json({ error: 'NVIDIA NIM returned an empty script' }, { status: 502 });
    }

    // 5. Save the script + advance project state
    const [script] = await db.$transaction([
      db.script.create({
        data: {
          content: scriptText,
          version: 1,
          projectId,
        },
      }),
      db.project.update({
        where: { id: projectId },
        data: {
          scriptText,
          step: 'SCRIPT',
          status: 'DRAFT',
        },
      }),
      db.generationHistory.update({
        where: { id: historyEntry.id },
        data: {
          status: 'COMPLETED',
          metadata: {
            prompt: project.prompt,
            tokensUsed: nimData.usage?.total_tokens ?? null,
            model: nimData.model ?? 'meta/llama-3.1-70b-instruct',
          },
        },
      }),
    ]);

    return NextResponse.json({ script: script.content, scriptId: script.id });
  } catch (error) {
    console.error('[GENERATE/SCRIPT] Error:', error);
    return NextResponse.json({ error: 'Script generation failed' }, { status: 500 });
  }
}
