/* eslint-disable @typescript-eslint/no-explicit-any */
import { database } from "@repo/database";
import type { Word, Group, QuizResult } from "./types";

// ============ WORDS ============

export async function getWords(userId: string): Promise<Word[]> {
  const words = await database.word.findMany({
    where: { userId },
    include: { groups: true },
    orderBy: { createdAt: "desc" },
  });

  return words.map((w: any) => ({
    id: w.id,
    english: w.english,
    spanish: w.spanish,
    createdAt: w.createdAt.toISOString(),
    groupIds: w.groups.map((gw: any) => gw.groupId),
  }));
}

export async function createWord(
  userId: string,
  data: { english: string; spanish: string }
): Promise<Word> {
  const word = await database.word.create({
    data: {
      english: data.english,
      spanish: data.spanish,
      userId,
    },
  });

  return {
    id: word.id,
    english: word.english,
    spanish: word.spanish,
    createdAt: word.createdAt.toISOString(),
  };
}

export async function updateWord(
  userId: string,
  wordId: string,
  data: { english: string; spanish: string }
): Promise<Word | null> {
  const word = await database.word.updateMany({
    where: { id: wordId, userId },
    data: {
      english: data.english,
      spanish: data.spanish,
    },
  });

  if (word.count === 0) return null;

  const updated = await database.word.findUnique({ where: { id: wordId } });
  if (!updated) return null;

  return {
    id: updated.id,
    english: updated.english,
    spanish: updated.spanish,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function deleteWord(userId: string, wordId: string): Promise<boolean> {
  const result = await database.word.deleteMany({
    where: { id: wordId, userId },
  });
  return result.count > 0;
}

// ============ GROUPS ============

export async function getGroups(userId: string): Promise<Group[]> {
  const groups = await database.group.findMany({
    where: { userId },
    include: { words: true },
    orderBy: { createdAt: "desc" },
  });

  return groups.map((g: any) => ({
    id: g.id,
    name: g.name,
    wordIds: g.words.map((gw: any) => gw.wordId),
  }));
}

export async function createGroup(userId: string, name: string): Promise<Group> {
  const group = await database.group.create({
    data: {
      name,
      userId,
    },
  });

  return {
    id: group.id,
    name: group.name,
    wordIds: [],
  };
}

export async function updateGroup(
  userId: string,
  groupId: string,
  data: { name?: string; wordIds?: string[] }
): Promise<Group | null> {
  // First verify ownership
  const existing = await database.group.findFirst({
    where: { id: groupId, userId },
  });

  if (!existing) return null;

  // Update name if provided
  if (data.name !== undefined) {
    await database.group.update({
      where: { id: groupId },
      data: { name: data.name },
    });
  }

  // Update word associations if provided
  if (data.wordIds !== undefined) {
    // Remove all existing associations
    await database.groupWord.deleteMany({
      where: { groupId },
    });

    // Add new associations
    if (data.wordIds.length > 0) {
      await database.groupWord.createMany({
        data: data.wordIds.map((wordId) => ({
          groupId,
          wordId,
        })),
      });
    }
  }

  // Fetch updated group
  const updated = await database.group.findUnique({
    where: { id: groupId },
    include: { words: true },
  });

  if (!updated) return null;

  return {
    id: updated.id,
    name: updated.name,
    wordIds: (updated as any).words.map((gw: any) => gw.wordId),
  };
}

export async function deleteGroup(userId: string, groupId: string): Promise<boolean> {
  const result = await database.group.deleteMany({
    where: { id: groupId, userId },
  });
  return result.count > 0;
}

// ============ STATS ============

export async function getWordStats(userId: string) {
  const stats = await database.wordStat.findMany({
    where: { userId },
  });

  const result: Record<string, { seen: number; correct: number; incorrect: number }> = {};
  for (const s of stats) {
    result[s.wordId] = {
      seen: s.seen,
      correct: s.correct,
      incorrect: s.incorrect,
    };
  }
  return result;
}

export async function recordQuizResult(
  userId: string,
  direction: string,
  results: QuizResult[]
): Promise<void> {
  // Create quiz record
  const quiz = await database.quiz.create({
    data: {
      direction,
      userId,
    },
  });

  // Create quiz results
  await database.quizResult.createMany({
    data: results.map((r) => ({
      quizId: quiz.id,
      wordId: r.wordId,
      correct: r.correct,
      attempts: r.attempts,
    })),
  });

  // Update word stats
  for (const result of results) {
    const existing = await database.wordStat.findUnique({
      where: { wordId: result.wordId },
    });

    if (existing) {
      await database.wordStat.update({
        where: { wordId: result.wordId },
        data: {
          seen: existing.seen + 1,
          correct: result.correct ? existing.correct + 1 : existing.correct,
          incorrect: !result.correct ? existing.incorrect + 1 : existing.incorrect,
        },
      });
    } else {
      await database.wordStat.create({
        data: {
          wordId: result.wordId,
          userId,
          seen: 1,
          correct: result.correct ? 1 : 0,
          incorrect: !result.correct ? 1 : 0,
        },
      });
    }
  }
}

export async function getQuizHistory(userId: string) {
  const quizzes = await database.quiz.findMany({
    where: { userId },
    include: { results: true },
    orderBy: { date: "desc" },
    take: 50,
  });

  return quizzes.map((q: any) => ({
    id: q.id,
    date: q.date.toISOString(),
    direction: q.direction,
    wordIds: q.results.map((r: any) => r.wordId),
    results: q.results.map((r: any) => ({
      wordId: r.wordId,
      correct: r.correct,
      attempts: r.attempts,
    })),
  }));
}

export async function getComputedStats(userId: string, words: Word[]) {
  const wordStats = await getWordStats(userId);

  // Calculate least practiced words
  const wordsWithStats = words.map((word) => ({
    wordId: word.id,
    english: word.english,
    spanish: word.spanish,
    seen: wordStats[word.id]?.seen || 0,
  }));

  // Sort by seen count (ascending) - least practiced first
  wordsWithStats.sort((a, b) => a.seen - b.seen);

  return {
    leastPracticed: wordsWithStats,
    wordStats,
  };
}

// ============ USER ============

export async function ensureUser(
  userId: string,
  email: string,
  name?: string
): Promise<void> {
  const existing = await database.user.findUnique({
    where: { id: userId },
  });

  if (!existing) {
    await database.user.create({
      data: {
        id: userId,
        email,
        name,
      },
    });
  }
}
