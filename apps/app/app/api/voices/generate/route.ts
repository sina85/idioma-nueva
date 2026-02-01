import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth/server';
import { database } from '@repo/database';
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';

const openai = new OpenAI();

const VOICES_DIR = path.join(process.cwd(), 'public', 'voices');
const ENGLISH_VOICE = 'nova';
const SPANISH_VOICE = 'nova';

export async function POST(request: NextRequest) {
  console.log('[VoiceGenerate] Starting voice generation request');

  const { userId } = await auth();
  console.log('[VoiceGenerate] Auth check - userId:', userId ? 'present' : 'missing');

  if (!userId) {
    console.log('[VoiceGenerate] Unauthorized - no userId');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { wordIds } = await request.json();
    console.log('[VoiceGenerate] Received wordIds:', wordIds?.length || 0);

    if (!wordIds || !Array.isArray(wordIds) || wordIds.length === 0) {
      console.log('[VoiceGenerate] Invalid wordIds array');
      return NextResponse.json(
        { error: 'wordIds array is required' },
        { status: 400 }
      );
    }

    // Get words from database (verify they belong to user)
    console.log('[VoiceGenerate] Fetching words from database...');
    const words = await database.word.findMany({
      where: {
        id: { in: wordIds },
        userId,
      },
      select: { id: true, english: true, spanish: true },
    });
    console.log('[VoiceGenerate] Found', words.length, 'words in database');

    if (words.length === 0) {
      console.log('[VoiceGenerate] No valid words found');
      return NextResponse.json(
        { error: 'No valid words found' },
        { status: 404 }
      );
    }

    // Ensure directories exist
    console.log('[VoiceGenerate] Creating voice directories at:', VOICES_DIR);
    await fs.mkdir(path.join(VOICES_DIR, 'english'), { recursive: true });
    await fs.mkdir(path.join(VOICES_DIR, 'spanish'), { recursive: true });

    let generated = 0;
    let failed = 0;
    const errors: string[] = [];

    console.log('[VoiceGenerate] Starting generation for', words.length, 'words');

    for (const word of words) {
      console.log(`[VoiceGenerate] Processing: "${word.english}" / "${word.spanish}"`);
      try {
        const englishPath = path.join(VOICES_DIR, 'english', `${word.id}.mp3`);
        const spanishPath = path.join(VOICES_DIR, 'spanish', `${word.id}.mp3`);

        // Generate English audio
        console.log(`[VoiceGenerate] Generating English audio for "${word.english}"...`);
        const englishAudio = await openai.audio.speech.create({
          model: 'gpt-4o-mini-tts',
          voice: ENGLISH_VOICE,
          input: word.english,
          instructions: 'You are generating speech for pronunciation of English words.',
          response_format: 'mp3',
        });
        const englishBuffer = Buffer.from(await englishAudio.arrayBuffer());
        await fs.writeFile(englishPath, englishBuffer);
        console.log(`[VoiceGenerate] English audio saved to ${englishPath}`);

        // Generate Spanish audio
        // Handle words with /a pattern (e.g., "rubio/a" -> "rubio, rubia")
        let spanishInput = word.spanish;
        let spanishInstructions = 'You are generating speech for pronunciation of Spanish words. Use an accent from Bogotá, Colombia.';

        if (word.spanish.endsWith('/a')) {
          // Transform "rubio/a" to "rubio, rubia"
          const baseWord = word.spanish.slice(0, -2); // Remove "/a"
          spanishInput = `${baseWord}, ${baseWord.slice(0, -1)}a`;
          spanishInstructions = 'You are generating speech for pronunciation of Spanish words. Use an accent from Bogotá, Colombia. Say both the masculine and feminine forms clearly with a brief pause between them.';
        }

        console.log(`[VoiceGenerate] Generating Spanish audio for "${spanishInput}"...`);
        const spanishAudio = await openai.audio.speech.create({
          model: 'gpt-4o-mini-tts',
          voice: SPANISH_VOICE,
          input: spanishInput,
          instructions: spanishInstructions,
          response_format: 'mp3',
        });
        const spanishBuffer = Buffer.from(await spanishAudio.arrayBuffer());
        await fs.writeFile(spanishPath, spanishBuffer);
        console.log(`[VoiceGenerate] Spanish audio saved to ${spanishPath}`);

        generated++;
        console.log(`[VoiceGenerate] Successfully generated voices for "${word.english}" (${generated}/${words.length})`);
      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${word.english}: ${errorMsg}`);
        console.error(`[VoiceGenerate] Failed to generate voice for "${word.english}":`, error);
      }
    }

    console.log(`[VoiceGenerate] Complete! Generated: ${generated}, Failed: ${failed}`);

    return NextResponse.json({
      success: true,
      generated,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[VoiceGenerate] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to generate voices' },
      { status: 500 }
    );
  }
}
