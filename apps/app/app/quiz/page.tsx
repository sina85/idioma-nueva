'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Word, QuizConfig, QuizResult } from '@/lib/types';
import QuizGame from '../components/QuizGame';

export default function QuizPage() {
  const router = useRouter();
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);

  useEffect(() => {
    const loadQuiz = async () => {
      // Get config from sessionStorage
      const storedConfig = sessionStorage.getItem('quizConfig');
      if (!storedConfig) {
        router.push('/');
        return;
      }

      const parsedConfig: QuizConfig = JSON.parse(storedConfig);
      setConfig(parsedConfig);

      // Fetch words
      const res = await fetch('/api/words');
      const data = await res.json();
      const quizWords = data.words.filter((w: Word) =>
        parsedConfig.wordIds.includes(w.id)
      );

      setWords(quizWords);
      setLoading(false);
    };

    loadQuiz();
  }, [router]);

  const handleComplete = async (quizResults: QuizResult[]) => {
    setResults(quizResults);
    setCompleted(true);

    // Record stats
    await fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'recordQuiz',
        data: {
          id: 0, // Will be assigned by server
          date: new Date().toISOString(),
          direction: config?.direction,
          wordIds: config?.wordIds,
          results: quizResults,
        },
      }),
    });
  };

  const handleStarWord = async (wordId: string) => {
    // Fetch current groups to find Stars group
    const groupsRes = await fetch('/api/groups');
    const groupsData = await groupsRes.json();
    const groups = groupsData.groups || [];

    let starsGroup = groups.find((g: { name: string }) => g.name === 'Stars');

    if (!starsGroup) {
      // Create Stars group if it doesn't exist
      starsGroup = { id: 'stars', name: 'Stars', wordIds: [] };
      await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(starsGroup),
      });
    }

    // Add word to Stars group if not already there
    if (!starsGroup.wordIds.includes(wordId)) {
      const updatedGroup = {
        ...starsGroup,
        wordIds: [...starsGroup.wordIds, wordId],
      };
      await fetch('/api/groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedGroup),
      });
    }
  };

  const getResultStats = () => {
    const correct = results.filter(r => r.correct && r.attempts === 1).length;
    const withRetries = results.filter(r => r.correct && r.attempts > 1).length;
    const incorrect = results.filter(r => !r.correct).length;
    return { correct, withRetries, incorrect };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading quiz...</p>
      </div>
    );
  }

  if (completed) {
    const stats = getResultStats();

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <h1 className="text-3xl font-bold text-green-600 mb-4">Quiz Complete!</h1>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/30 rounded">
              <span>Perfect matches:</span>
              <span className="font-bold text-green-600">{stats.correct}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded">
              <span>Matched with retries:</span>
              <span className="font-bold text-yellow-600">{stats.withRetries}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <span>Total words:</span>
              <span className="font-bold">{words.length}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setCompleted(false);
                setResults([]);
              }}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Play Again
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Vocabulary Quiz
          </h1>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
          >
            Exit
          </button>
        </div>

        <QuizGame
          words={words}
          cardsPerSide={config?.cardsPerSide || 4}
          direction={config?.direction || 'alternating'}
          speechEnabled={config?.speechEnabled || false}
          onComplete={handleComplete}
          onStarWord={handleStarWord}
        />
      </div>
    </div>
  );
}
