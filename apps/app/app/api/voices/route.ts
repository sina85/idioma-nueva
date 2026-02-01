import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth/server';
import { promises as fs } from 'fs';
import path from 'path';

const VOICES_DIR = path.join(process.cwd(), 'public', 'voices');

export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { wordId } = await request.json();

    if (!wordId) {
      return NextResponse.json(
        { error: 'wordId is required' },
        { status: 400 }
      );
    }

    const englishPath = path.join(VOICES_DIR, 'english', `${wordId}.mp3`);
    const spanishPath = path.join(VOICES_DIR, 'spanish', `${wordId}.mp3`);

    // Delete both voice files, ignore errors if they don't exist
    await fs.unlink(englishPath).catch(() => {});
    await fs.unlink(spanishPath).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Voice deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete voice files' },
      { status: 500 }
    );
  }
}
