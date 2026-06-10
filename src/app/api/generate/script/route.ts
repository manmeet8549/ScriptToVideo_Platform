import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

export const maxDuration = 60; // Allow up to 60 seconds on Vercel (Hobby plan limit)

// System prompt that guides the LLM to produce a structured video script
const SYSTEM_PROMPT = `You are an expert YouTube video scriptwriter. Given a topic or idea, you produce a polished, engaging video script.

Format the script exactly as follows — no markdown headings, no extra commentary. Keep the structural tags (HOOK:, INTRO:, BODY:, CALL TO ACTION:) exactly in English as shown, but write the script content itself in the requested target language:

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

    let userPromptContent = `Write a video script about: ${project.prompt}`;
    try {
      if (project.prompt.startsWith('{') && project.prompt.endsWith('}')) {
        const parsed = JSON.parse(project.prompt);
        const language = parsed.language || 'english';
        
        let languageInstructions = '';
        if (language === 'hindi') {
          languageInstructions = `\n- Language: Hindi (हिंदी). Generate the entire script content in natural, conversational Hindi using standard Hindi vocabulary, Devanagari script (हिंदी), and proper sentence structure.`;
        } else if (language === 'hinglish') {
          languageInstructions = `\n- Language: Hinglish (Hindi + English). Generate the script in the way people naturally speak in India, using Hindi as the primary language while incorporating commonly used English words and phrases that are part of everyday conversation.
Hinglish Requirements:
1. The script should sound natural and human-like, not like a direct translation.
2. Use conversational Indian speech patterns.
3. Write using the Latin/Roman script (transliterated Hindi/Hinglish, e.g., "Dosto, aaj is video me hum baat karenge..."). Do not write in Devanagari characters.
4. Include commonly used English words that Indians naturally mix into Hindi conversations (e.g., "video", "content", "mobile", "internet", "problem", "idea", "project", "result", "update", etc.).
5. Avoid excessive or forced English usage.
6. Maintain proper grammar, flow, and readability.
7. The generated script should feel like it was written by an experienced Indian content creator, presenter, educator, or storyteller.`;
        } else {
          languageInstructions = `\n- Language: English. Generate the entire script content in natural, fluent English.`;
        }

        userPromptContent = `Write a video script based on the following details:
- Concept/Topic: ${parsed.concept || 'Not specified'}
- Target Audience: ${parsed.audience || 'General Public'}
- Tone/Style: ${parsed.tone || 'Engaging'}
- Estimated Duration: ${parsed.duration || 'Not specified'}${languageInstructions}`;
      }
    } catch {
      // Fallback to raw prompt
    }

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
          { role: 'user', content: userPromptContent },
        ],
        max_tokens: 1024,
        temperature: 0.75,
        top_p: 0.95,
      }),
    });

    if (!nimResponse.ok) {
      const errorBody = await nimResponse.json().catch(() => ({}));
      // NVIDIA NIM returns errors as { detail: "..." } OR { error: { message: "..." } }
      const errorMsg =
        errorBody?.detail ||
        errorBody?.error?.message ||
        `NVIDIA NIM returned ${nimResponse.status} ${nimResponse.statusText}`;

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
