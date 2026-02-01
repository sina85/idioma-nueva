'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Word, Group, QuizDirection } from '@/lib/types';

interface LeastPracticedWord {
  wordId: string;
  english: string;
  spanish: string;
  seen: number;
}

interface QuickQuizConfigProps {
  words: Word[];
  groups: Group[];
  onStartQuiz: (config: { wordIds: string[]; cardsPerSide: number; direction: QuizDirection; speechEnabled: boolean }) => void;
  onCancel: () => void;
}

type SelectionMode = 'group' | 'date' | 'recent' | 'random' | 'least-practiced';

export default function QuickQuizConfig({
  words,
  groups,
  onStartQuiz,
  onCancel,
}: QuickQuizConfigProps) {
  const [mode, setMode] = useState<SelectionMode>('recent');

  // Group mode state
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Date mode state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Recent/Random mode state
  const [count, setCount] = useState(10);

  // Least practiced mode state
  const [leastPracticedWords, setLeastPracticedWords] = useState<LeastPracticedWord[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Fetch least practiced words when mode changes
  useEffect(() => {
    if (mode === 'least-practiced' && leastPracticedWords.length === 0) {
      setLoadingStats(true);
      fetch('/api/stats/computed')
        .then(res => res.json())
        .then(data => {
          setLeastPracticedWords(data.leastPracticed || []);
        })
        .catch(err => console.error('Failed to load stats:', err))
        .finally(() => setLoadingStats(false));
    }
  }, [mode, leastPracticedWords.length]);

  // Quiz settings
  const [cardsPerSide, setCardsPerSide] = useState(4);
  const [direction, setDirection] = useState<QuizDirection>('alternating');
  const [speechEnabled, setSpeechEnabled] = useState(true);

  // Sort words by date for recent mode
  const sortedWords = useMemo(() => {
    return [...words].sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [words]);

  // Shuffle function for random mode
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const getSelectedWords = (): Word[] => {
    switch (mode) {
      case 'group': {
        const group = groups.find(g => g.id === selectedGroupId);
        if (!group) return [];
        return words.filter(w => group.wordIds.includes(w.id));
      }
      case 'date': {
        const start = startDate ? new Date(startDate).getTime() : 0;
        const end = endDate ? new Date(endDate + 'T23:59:59').getTime() : Infinity;
        return words.filter(w => {
          if (!w.createdAt) return false;
          const wordDate = new Date(w.createdAt).getTime();
          return wordDate >= start && wordDate <= end;
        });
      }
      case 'recent':
        return sortedWords.slice(0, Math.min(count, words.length));
      case 'random':
        return shuffleArray(words).slice(0, Math.min(count, words.length));
      case 'least-practiced': {
        const leastWordIds = leastPracticedWords.slice(0, Math.min(count, leastPracticedWords.length)).map(w => w.wordId);
        return words.filter(w => leastWordIds.includes(w.id));
      }
      default:
        return [];
    }
  };

  const selectedWords = getSelectedWords();
  const maxCards = Math.min(10, selectedWords.length);

  const handleStartQuiz = () => {
    if (selectedWords.length >= 2) {
      onStartQuiz({
        wordIds: selectedWords.map(w => w.id),
        cardsPerSide: Math.min(cardsPerSide, maxCards),
        direction,
        speechEnabled,
      });
    }
  };

  const formatDateForInput = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  };

  // Get date range from existing words
  const wordDates = words
    .filter(w => w.createdAt)
    .map(w => new Date(w.createdAt).getTime());
  const minDate = wordDates.length > 0 ? formatDateForInput(new Date(Math.min(...wordDates)).toISOString()) : '';
  const maxDate = wordDates.length > 0 ? formatDateForInput(new Date(Math.max(...wordDates)).toISOString()) : '';

  const modes: { id: SelectionMode; label: string }[] = [
    { id: 'group', label: 'Group' },
    { id: 'date', label: 'Date' },
    { id: 'recent', label: 'Recent' },
    { id: 'random', label: 'Random' },
    { id: 'least-practiced', label: 'Least' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Quick Quiz</h2>

        {/* Mode Selection Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          {modes.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${
                mode === m.id
                  ? 'bg-white dark:bg-gray-600 shadow text-purple-700 dark:text-purple-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Group Selection */}
        {mode === 'group' && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Select a group</label>
            {groups.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No groups created yet</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {groups.map(group => {
                  const wordCount = group.wordIds.filter(id => words.some(w => w.id === id)).length;
                  return (
                    <label
                      key={group.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedGroupId === group.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="group"
                          value={group.id}
                          checked={selectedGroupId === group.id}
                          onChange={() => setSelectedGroupId(group.id)}
                          className="w-4 h-4 text-purple-600"
                        />
                        <span className="font-medium">{group.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">{wordCount} words</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Date Range Selection */}
        {mode === 'date' && (
          <div className="mb-6 space-y-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium mb-1">From</label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                min={minDate}
                max={maxDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium mb-1">To</label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                min={startDate || minDate}
                max={maxDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            {minDate && (
              <p className="text-xs text-gray-500">
                Words available from {minDate} to {maxDate}
              </p>
            )}
          </div>
        )}

        {/* Recent Count Selection */}
        {mode === 'recent' && (
          <div className="mb-6">
            <label htmlFor="recent-count" className="block text-sm font-medium mb-2">
              Number of recent words: {Math.min(count, words.length)}
            </label>
            <input
              id="recent-count"
              type="range"
              min={2}
              max={Math.min(50, words.length)}
              value={Math.min(count, words.length)}
              onChange={e => setCount(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>2</span>
              <span>{Math.min(50, words.length)}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {[5, 10, 15, 20, 30].filter(n => n <= words.length).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={`px-3 py-1 text-sm rounded ${
                    count === n
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Random Count Selection */}
        {mode === 'random' && (
          <div className="mb-6">
            <label htmlFor="random-count" className="block text-sm font-medium mb-2">
              Number of random words: {Math.min(count, words.length)}
            </label>
            <input
              id="random-count"
              type="range"
              min={2}
              max={Math.min(50, words.length)}
              value={Math.min(count, words.length)}
              onChange={e => setCount(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>2</span>
              <span>{Math.min(50, words.length)}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {[5, 10, 15, 20, 30].filter(n => n <= words.length).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={`px-3 py-1 text-sm rounded ${
                    count === n
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Least Practiced Selection */}
        {mode === 'least-practiced' && (
          <div className="mb-6">
            {loadingStats ? (
              <p className="text-sm text-gray-500">Loading stats...</p>
            ) : (
              <>
                <label htmlFor="least-count" className="block text-sm font-medium mb-2">
                  Number of least practiced words: {Math.min(count, leastPracticedWords.length)}
                </label>
                <input
                  id="least-count"
                  type="range"
                  min={2}
                  max={Math.min(50, leastPracticedWords.length || words.length)}
                  value={Math.min(count, leastPracticedWords.length || words.length)}
                  onChange={e => setCount(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>2</span>
                  <span>{Math.min(50, leastPracticedWords.length || words.length)}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[5, 10, 15, 20, 30].filter(n => n <= (leastPracticedWords.length || words.length)).map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={`px-3 py-1 text-sm rounded ${
                        count === n
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Words you&apos;ve practiced the fewest times (or never)
                </p>
              </>
            )}
          </div>
        )}

        {/* Selection Summary */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm">
            <span className="font-medium">{selectedWords.length}</span> words selected
          </p>
          {selectedWords.length < 2 && (
            <p className="text-xs text-red-500 mt-1">
              Select at least 2 words to start a quiz
            </p>
          )}
        </div>

        {/* Quiz Settings */}
        {selectedWords.length >= 2 && (
          <div className="mb-6 border-t dark:border-gray-600 pt-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Quiz Settings</h3>

            {/* Cards per side */}
            <div className="mb-4">
              <label htmlFor="cards-per-side" className="block text-sm font-medium mb-2">
                Cards per side: {Math.min(cardsPerSide, maxCards)}
              </label>
              <input
                id="cards-per-side"
                type="range"
                min={2}
                max={maxCards}
                value={Math.min(cardsPerSide, maxCards)}
                onChange={e => setCardsPerSide(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>2</span>
                <span>{maxCards}</span>
              </div>
            </div>

            {/* Direction */}
            <div>
              <label className="block text-sm font-medium mb-2">Direction</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    value="en-to-es"
                    checked={direction === 'en-to-es'}
                    onChange={() => setDirection('en-to-es')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm">English → Spanish</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    value="es-to-en"
                    checked={direction === 'es-to-en'}
                    onChange={() => setDirection('es-to-en')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm">Spanish → English</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    value="alternating"
                    checked={direction === 'alternating'}
                    onChange={() => setDirection('alternating')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm">Alternating (changes each round)</span>
                </label>
              </div>
            </div>

            {/* Speech Mode */}
            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={speechEnabled}
                  onChange={(e) => setSpeechEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Enable speech mode</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Play audio when clicking cards
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStartQuiz}
            disabled={selectedWords.length < 2}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
