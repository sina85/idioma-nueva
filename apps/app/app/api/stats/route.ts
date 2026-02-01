import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth/server';
import { getWordStats, recordQuizResult, getQuizHistory, ensureUser } from '@/lib/db';
import { currentUser } from '@repo/auth/server';
import type { QuizResult } from '@/lib/types';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [wordStats, quizHistory] = await Promise.all([
    getWordStats(userId),
    getQuizHistory(userId),
  ]);

  return NextResponse.json({ wordStats, quizHistory });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure user exists in database
  const user = await currentUser();
  if (user) {
    await ensureUser(userId, user.email || '', user.user_metadata?.name);
  }

  const { action, data } = await request.json();

  if (action === 'recordQuiz') {
    const { direction, results } = data as { direction: string; results: QuizResult[] };
    await recordQuizResult(userId, direction, results);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
