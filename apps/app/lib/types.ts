export interface Word {
  id: string;
  english: string;
  spanish: string;
  createdAt: string;
  groupIds?: string[];
}

export interface Group {
  id: string;
  name: string;
  wordIds: string[];
}

export interface WordStats {
  seen: number;
  correct: number;
  incorrect: number;
}

export interface QuizResult {
  wordId: string;
  correct: boolean;
  attempts: number;
}

export interface QuizHistory {
  id: number;
  date: string;
  direction: QuizDirection;
  wordIds: string[];
  results: QuizResult[];
}

export interface Stats {
  wordStats: Record<string, WordStats>;
  quizHistory: QuizHistory[];
}

export type QuizDirection = 'en-to-es' | 'es-to-en' | 'alternating';

export interface QuizConfig {
  wordIds: string[];
  cardsPerSide: number;
  direction: QuizDirection;
  speechEnabled: boolean;
}

export interface WordsData {
  words: Word[];
}

export interface GroupsData {
  groups: Group[];
}
