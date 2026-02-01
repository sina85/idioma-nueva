import { NextResponse } from 'next/server';
import { auth } from '@repo/auth/server';
import { database } from '@repo/database';
import { promises as fs } from 'fs';
import path from 'path';

const VOICES_DIR = path.join(process.cwd(), 'public', 'voices');

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all words for user
    const words = await database.word.findMany({
      where: { userId },
      select: { id: true, english: true, spanish: true },
    });

    // Check which words are missing voice files
    const missingVoices: { id: string; english: string; spanish: string }[] = [];

    for (const word of words) {
      const englishPath = path.join(VOICES_DIR, 'english', `${word.id}.mp3`);
      const spanishPath = path.join(VOICES_DIR, 'spanish', `${word.id}.mp3`);

      let englishExists = false;
      let spanishExists = false;

      try {
        await fs.access(englishPath);
        englishExists = true;
      } catch {
        // File doesn't exist
      }

      try {
        await fs.access(spanishPath);
        spanishExists = true;
      } catch {
        // File doesn't exist
      }

      // If either voice is missing, include this word
      if (!englishExists || !spanishExists) {
        missingVoices.push({
          id: word.id,
          english: word.english,
          spanish: word.spanish,
        });
      }
    }

    return NextResponse.json({
      total: words.length,
      missing: missingVoices.length,
      words: missingVoices,
    });
  } catch (error) {
    console.error('Error checking missing voices:', error);
    return NextResponse.json(
      { error: 'Failed to check missing voices' },
      { status: 500 }
    );
  }
}
