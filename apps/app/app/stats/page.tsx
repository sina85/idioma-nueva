'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TroubleWord {
  wordId: string;
  english: string;
  spanish: string;
  seen: number;
  timesWithMistakes: number;
  mistakeRate: number;
}

interface RecentQuiz {
  id: number;
  date: string;
  wordCount: number;
  accuracy: number;
}

interface ComputedStats {
  overall: {
    totalQuizzes: number;
    overallAccuracy: number;
  };
  coverage: {
    total: number;
    practiced: number;
    neverSeen: string[];
  };
  troubleWords: TroubleWord[];
  recentQuizzes: RecentQuiz[];
  leastPracticed: Array<{
    wordId: string;
    english: string;
    spanish: string;
    seen: number;
  }>;
}

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<ComputedStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/stats/computed');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePracticeTroubleWords = () => {
    if (!stats || stats.troubleWords.length === 0) return;

    // Select up to 10 trouble words
    const troubleWordIds = stats.troubleWords.slice(0, 10).map(w => w.wordId);

    const config = {
      wordIds: troubleWordIds,
      cardsPerSide: Math.min(5, troubleWordIds.length),
      direction: 'alternating',
      speechEnabled: true,
    };
    sessionStorage.setItem('quizConfig', JSON.stringify(config));
    router.push('/quiz');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500">Loading stats...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-red-500">Failed to load stats</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-4 py-4 sm:py-8 max-w-6xl">
        <header className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Quiz Statistics
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
              Track your progress and identify words to practice
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="self-start sm:self-auto px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            &larr; Back
          </button>
        </header>

        {/* Overall Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard
            label="Quizzes Completed"
            value={stats.overall.totalQuizzes}
          />
          <StatCard
            label="Words Practiced"
            value={`${stats.coverage.practiced} / ${stats.coverage.total}`}
          />
          <StatCard
            label="Overall Accuracy"
            value={`${(stats.overall.overallAccuracy * 100).toFixed(1)}%`}
            color={stats.overall.overallAccuracy >= 0.8 ? 'green' : stats.overall.overallAccuracy >= 0.6 ? 'yellow' : 'red'}
          />
          <StatCard
            label="Trouble Words"
            value={stats.troubleWords.length}
            color={stats.troubleWords.length > 10 ? 'red' : stats.troubleWords.length > 5 ? 'yellow' : 'green'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Trouble Words */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                Trouble Words
              </h2>
              {stats.troubleWords.length > 0 && (
                <button
                  type="button"
                  onClick={handlePracticeTroubleWords}
                  className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Practice These
                </button>
              )}
            </div>

            {stats.troubleWords.length === 0 ? (
              <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">
                No trouble words yet. Keep practicing!
              </p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-xs sm:text-sm min-w-[400px]">
                  <thead>
                    <tr className="text-left text-gray-500 border-b dark:border-gray-700">
                      <th className="pb-2 px-2 sm:px-0">English</th>
                      <th className="pb-2">Spanish</th>
                      <th className="pb-2 text-center hidden sm:table-cell">Seen</th>
                      <th className="pb-2 text-center hidden sm:table-cell">Mistakes</th>
                      <th className="pb-2 text-center">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.troubleWords.map(word => (
                      <tr
                        key={word.wordId}
                        className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="py-2 px-2 sm:px-0 text-gray-900 dark:text-white">
                          {word.english}
                        </td>
                        <td className="py-2 text-gray-700 dark:text-gray-300">
                          {word.spanish}
                        </td>
                        <td className="py-2 text-center text-gray-500 hidden sm:table-cell">
                          {word.seen}
                        </td>
                        <td className="py-2 text-center text-red-600 hidden sm:table-cell">
                          {word.timesWithMistakes}
                        </td>
                        <td className="py-2 text-center">
                          <span
                            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-medium ${
                              word.mistakeRate <= 0.2
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : word.mistakeRate <= 0.5
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}
                          >
                            {(word.mistakeRate * 100).toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Quizzes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Recent Quizzes
            </h2>

            {stats.recentQuizzes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No quizzes yet. Start practicing!
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentQuizzes.map(quiz => (
                  <div
                    key={quiz.id}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(quiz.date).toLocaleDateString()}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          quiz.accuracy >= 0.8
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : quiz.accuracy >= 0.6
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {(quiz.accuracy * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      {quiz.wordCount} words
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Coverage Summary */}
            <div className="mt-6 pt-6 border-t dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Coverage
              </h3>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${(stats.coverage.practiced / stats.coverage.total) * 100}%`,
                  }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {stats.coverage.practiced} of {stats.coverage.total} words practiced
                {stats.coverage.neverSeen.length > 0 && (
                  <span className="block text-xs mt-1">
                    {stats.coverage.neverSeen.length} words never seen
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`text-lg sm:text-2xl font-bold ${
          color ? colorClasses[color] : 'text-gray-900 dark:text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
