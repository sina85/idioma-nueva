import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth/server';
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';

const openai = new OpenAI();

const VOICES_DIR = path.join(process.cwd(), 'public', 'voices');
const ENGLISH_VOICE = 'nova';
const SPANISH_VOICE = 'nova';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { wordId, english, spanish } = await request.json();

    if (!wordId || !english || !spanish) {
      return NextResponse.json(
        { error: 'wordId, english, and spanish are required' },
        { status: 400 }
      );
    }

    // Ensure directories exist
    await fs.mkdir(path.join(VOICES_DIR, 'english'), { recursive: true });
    await fs.mkdir(path.join(VOICES_DIR, 'spanish'), { recursive: true });

    const englishPath = path.join(VOICES_DIR, 'english', `${wordId}.mp3`);
    const spanishPath = path.join(VOICES_DIR, 'spanish', `${wordId}.mp3`);

    // Generate English audio
    const englishAudio = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: ENGLISH_VOICE,
      input: english,
      instructions: 'You are generating speech for pronunciation of English words.',
      response_format: 'mp3',
    });
    const englishBuffer = Buffer.from(await englishAudio.arrayBuffer());
    await fs.writeFile(englishPath, englishBuffer);

    // Generate Spanish audio
    const spanishAudio = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: SPANISH_VOICE,
      input: spanish,
      instructions: 'You are generating speech for pronunciation of Spanish words. Use an accent from Bogotá, Colombia.',
      response_format: 'mp3',
    });
    const spanishBuffer = Buffer.from(await spanishAudio.arrayBuffer());
    await fs.writeFile(spanishPath, spanishBuffer);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('TTS generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: 500 }
    );
  }
}
