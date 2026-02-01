'use client';

import { useState } from 'react';
import type { QuizDirection } from '@/lib/types';

interface QuizConfigProps {
  selectedCount: number;
  onStartQuiz: (cardsPerSide: number, direction: QuizDirection, speechEnabled: boolean) => void;
  onCancel: () => void;
}

export default function QuizConfig({
  selectedCount,
  onStartQuiz,
  onCancel,
}: QuizConfigProps) {
  const [cardsPerSide, setCardsPerSide] = useState(4);
  const [direction, setDirection] = useState<QuizDirection>('alternating');
  const [speechEnabled, setSpeechEnabled] = useState(true);

  const maxCards = Math.min(10, selectedCount);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4">Quiz Settings</h2>

        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">
            {selectedCount} word{selectedCount !== 1 ? 's' : ''} selected
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Cards per side: {cardsPerSide}
          </label>
          <input
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

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Direction</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="direction"
                value="en-to-es"
                checked={direction === 'en-to-es'}
                onChange={() => setDirection('en-to-es')}
                className="w-4 h-4"
              />
              <span>English → Spanish</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="direction"
                value="es-to-en"
                checked={direction === 'es-to-en'}
                onChange={() => setDirection('es-to-en')}
                className="w-4 h-4"
              />
              <span>Spanish → English</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="direction"
                value="alternating"
                checked={direction === 'alternating'}
                onChange={() => setDirection('alternating')}
                className="w-4 h-4"
              />
              <span>Alternating (changes each round)</span>
            </label>
          </div>
        </div>

        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={speechEnabled}
              onChange={(e) => setSpeechEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Enable speech mode</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Play audio when clicking cards
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => onStartQuiz(cardsPerSide, direction, speechEnabled)}
            disabled={selectedCount < 2}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Quiz
          </button>
        </div>

        {selectedCount < 2 && (
          <p className="mt-4 text-sm text-red-500 text-center">
            Select at least 2 words to start a quiz
          </p>
        )}
      </div>
    </div>
  );
}
