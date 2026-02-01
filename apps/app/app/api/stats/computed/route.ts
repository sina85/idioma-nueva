import { NextResponse } from 'next/server';
import { auth } from '@repo/auth/server';
import { getWords, getQuizHistory } from '@/lib/db';
import type { Word } from '@/lib/types';

export interface TroubleWord {
  wordId: string;
  english: string;
  spanish: string;
  seen: number;
  totalAttempts: number;
  timesWithMistakes: number;
  mistakeRate: number;
}

export interface LeastPracticedWord {
  wordId: string;
  english: string;
  spanish: string;
  seen: number;
}

interface QuizHistoryResult {
  wordId: string;
  correct: boolean;
  attempts: number;
}

interface QuizHistoryItem {
  id: number;
  date: string;
  direction: string;
  wordIds: string[];
  results: QuizHistoryResult[];
}

export interface ComputedStats {
  troubleWords: TroubleWord[];
  leastPracticed: LeastPracticedWord[];
  overall: {
    totalQuizzes: number;
    totalWordsPracticed: number;
    totalAttempts: number;
    perfectAnswers: number;
    overallAccuracy: number;
  };
  coverage: {
    practiced: number;
    total: number;
    neverSeen: string[];
  };
  recentQuizzes: Array<{
    id: number;
    date: string;
    wordCount: number;
    accuracy: number;
  }>;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [words, quizHistory] = await Promise.all([
    getWords(userId),
    getQuizHistory(userId) as Promise<QuizHistoryItem[]>,
  ]);

  const wordMap = new Map<string, Word>(words.map((w: Word) => [w.id, w]));

  // Compute per-word stats from quizHistory using attempts
  const wordStatsMap = new Map<string, { seen: number; totalAttempts: number; timesWithMistakes: number }>();

  for (const quiz of quizHistory) {
    for (const result of quiz.results) {
      const existing = wordStatsMap.get(result.wordId) || { seen: 0, totalAttempts: 0, timesWithMistakes: 0 };
      existing.seen++;
      existing.totalAttempts += result.attempts;
      if (result.attempts > 1) {
        existing.timesWithMistakes++;
      }
      wordStatsMap.set(result.wordId, existing);
    }
  }

  // Build trouble words list (words with attempts > 1 at least once)
  const troubleWords: TroubleWord[] = [];
  for (const [wordId, wordStat] of wordStatsMap.entries()) {
    if (wordStat.timesWithMistakes === 0) continue;

    const word = wordMap.get(wordId);
    if (!word) continue;

    troubleWords.push({
      wordId,
      english: word.english,
      spanish: word.spanish,
      seen: wordStat.seen,
      totalAttempts: wordStat.totalAttempts,
      timesWithMistakes: wordStat.timesWithMistakes,
      mistakeRate: wordStat.timesWithMistakes / wordStat.seen,
    });
  }

  // Sort by mistake rate (highest first), then by times with mistakes
  troubleWords.sort((a, b) => {
    if (b.mistakeRate !== a.mistakeRate) return b.mistakeRate - a.mistakeRate;
    return b.timesWithMistakes - a.timesWithMistakes;
  });

  // Build least practiced list (all words sorted by seen count ascending)
  const allWordStats: LeastPracticedWord[] = words.map((word: Word) => {
    const wordStat = wordStatsMap.get(word.id);
    return {
      wordId: word.id,
      english: word.english,
      spanish: word.spanish,
      seen: wordStat?.seen || 0,
    };
  });

  // Sort by seen (ascending) - least practiced first
  allWordStats.sort((a, b) => a.seen - b.seen);

  // Compute overall stats
  let totalAttempts = 0;
  let perfectAnswers = 0;
  for (const wordStat of wordStatsMap.values()) {
    totalAttempts += wordStat.totalAttempts;
    perfectAnswers += wordStat.seen - wordStat.timesWithMistakes;
  }

  // Compute coverage
  const practicedWordIds = new Set(wordStatsMap.keys());
  const neverSeen = words
    .filter((w: Word) => !practicedWordIds.has(w.id))
    .map((w: Word) => w.id);

  // Compute recent quizzes (last 5) - accuracy = first-try success rate
  const recentQuizzes = quizHistory
    .slice(-5)
    .reverse()
    .map((quiz: QuizHistoryItem) => {
      const perfectCount = quiz.results.filter((r: QuizHistoryResult) => r.attempts === 1).length;
      return {
        id: quiz.id,
        date: quiz.date,
        wordCount: quiz.results.length,
        accuracy: quiz.results.length > 0 ? perfectCount / quiz.results.length : 0,
      };
    });

  const totalSeen = Array.from(wordStatsMap.values()).reduce((sum, w) => sum + w.seen, 0);

  const computed: ComputedStats = {
    troubleWords,
    leastPracticed: allWordStats,
    overall: {
      totalQuizzes: quizHistory.length,
      totalWordsPracticed: practicedWordIds.size,
      totalAttempts,
      perfectAnswers,
      overallAccuracy: totalSeen > 0 ? perfectAnswers / totalSeen : 0,
    },
    coverage: {
      practiced: practicedWordIds.size,
      total: words.length,
      neverSeen,
    },
    recentQuizzes,
  };

  return NextResponse.json(computed);
}
