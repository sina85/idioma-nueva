'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Word, QuizDirection, QuizResult } from '@/lib/types';

interface QuizGameProps {
  words: Word[];
  cardsPerSide: number;
  direction: QuizDirection;
  speechEnabled: boolean;
  onComplete: (results: QuizResult[]) => void;
  onStarWord: (wordId: string) => void;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function QuizGame({
  words,
  cardsPerSide,
  direction,
  speechEnabled,
  onComplete,
  onStarWord,
}: QuizGameProps) {
  // Queue of words to go through
  const [queue, setQueue] = useState<Word[]>([]);

  // Menu state for three-dot menu
  const [menuOpenIndex, setMenuOpenIndex] = useState<number | null>(null);

  // Fixed slots for left side (index 0,1,2,3 for 4 cards)
  const [leftSlots, setLeftSlots] = useState<(Word | null)[]>([]);
  // Fixed slots for right side - shuffled once at start, then only individual slots change
  const [rightSlots, setRightSlots] = useState<(Word | null)[]>([]);

  // Track wrong answers: wordId -> count of wrong attempts
  const [wrongAnswers, setWrongAnswers] = useState<Map<string, number>>(new Map());

  // Completed words (got right and removed from game)
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());

  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  // For alternating: 'en-to-es' first, then 'es-to-en'
  const [currentDirection, setCurrentDirection] = useState<'en-to-es' | 'es-to-en'>(
    direction === 'alternating' ? 'en-to-es' : direction
  );
  const [phase, setPhase] = useState<1 | 2>(1); // Phase 1 = first direction, Phase 2 = second direction

  const [totalWords] = useState(words.length);
  const isInitialized = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio playback function
  const playAudio = useCallback((wordId: string, language: 'english' | 'spanish') => {
    if (!speechEnabled) return;

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const audioPath = `/voices/${language}/${wordId}.mp3`;
    const audio = new Audio(audioPath);
    audioRef.current = audio;

    audio.play().catch(err => {
      console.warn('Audio playback failed:', err);
    });
  }, [speechEnabled]);

  // Initialize game
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const shuffled = shuffleArray([...words]);

    // Take first cardsPerSide for display
    const initialWords = shuffled.slice(0, cardsPerSide);
    const remaining = shuffled.slice(cardsPerSide);

    // Left slots: in order
    setLeftSlots([...initialWords]);

    // Right slots: shuffled differently
    setRightSlots(shuffleArray([...initialWords]));

    setQueue(remaining);
  }, [words, cardsPerSide]);

  const getLeftText = useCallback(
    (word: Word) => (currentDirection === 'en-to-es' ? word.english : word.spanish),
    [currentDirection]
  );

  const getRightText = useCallback(
    (word: Word) => (currentDirection === 'en-to-es' ? word.spanish : word.english),
    [currentDirection]
  );

  const handleLeftClick = (slotIndex: number) => {
    if (feedback) return;
    const word = leftSlots[slotIndex];
    if (!word) return;

    // Play audio for language shown on left side
    const language = currentDirection === 'en-to-es' ? 'english' : 'spanish';
    playAudio(word.id, language);

    setSelectedLeft(slotIndex);

    if (selectedRight !== null) {
      checkMatch(slotIndex, selectedRight);
    }
  };

  const handleRightClick = (slotIndex: number) => {
    if (feedback) return;
    const word = rightSlots[slotIndex];
    if (!word) return;

    // Play audio for language shown on right side
    const language = currentDirection === 'en-to-es' ? 'spanish' : 'english';
    playAudio(word.id, language);

    setSelectedRight(slotIndex);

    if (selectedLeft !== null) {
      checkMatch(selectedLeft, slotIndex);
    }
  };

  const checkMatch = (leftSlotIndex: number, rightSlotIndex: number) => {
    const leftWord = leftSlots[leftSlotIndex];
    const rightWord = rightSlots[rightSlotIndex];

    if (!leftWord || !rightWord) return;

    if (leftWord.id === rightWord.id) {
      // CORRECT MATCH
      setFeedback('correct');

      setTimeout(() => {
        // Mark as completed
        setCompletedWords(prev => new Set(prev).add(leftWord.id));

        // Get next word from queue (if any)
        const newQueue = [...queue];
        const nextWord = newQueue.shift() ?? null;
        setQueue(newQueue);

        // Replace ONLY the matched slots
        setLeftSlots(prev => {
          const updated = [...prev];
          updated[leftSlotIndex] = nextWord;
          return updated;
        });

        setRightSlots(prev => {
          const updated = [...prev];
          updated[rightSlotIndex] = nextWord;
          return updated;
        });

        setSelectedLeft(null);
        setSelectedRight(null);
        setFeedback(null);
      }, 500);
    } else {
      // INCORRECT MATCH
      // Track wrong answer for the LEFT word (the one user was trying to match)
      setWrongAnswers(prev => {
        const updated = new Map(prev);
        const currentCount = updated.get(leftWord.id) || 0;
        updated.set(leftWord.id, currentCount + 1);
        return updated;
      });

      setFeedback('incorrect');

      setTimeout(() => {
        // Add the wrong LEFT word back to end of queue
        const newQueue = [...queue, leftWord];

        // Pop next word to replace the left slot
        const nextWord = newQueue.shift() ?? null;
        setQueue(newQueue);

        // Replace ONLY the left slot (where the mistake was made)
        setLeftSlots(prev => {
          const updated = [...prev];
          updated[leftSlotIndex] = nextWord;
          return updated;
        });

        // Also need to update the right slot that had this same word
        setRightSlots(prev => {
          const updated = [...prev];
          const rightIndex = updated.findIndex(w => w?.id === leftWord.id);
          if (rightIndex !== -1) {
            updated[rightIndex] = nextWord;
          }
          return updated;
        });

        setSelectedLeft(null);
        setSelectedRight(null);
        setFeedback(null);
      }, 800);
    }
  };

  // Check for phase/quiz completion
  useEffect(() => {
    // Check if current phase is done (all slots empty and queue empty)
    const allSlotsEmpty = leftSlots.length > 0 && leftSlots.every(s => s === null);
    const queueEmpty = queue.length === 0;

    if (allSlotsEmpty && queueEmpty && leftSlots.length > 0) {
      if (direction === 'alternating' && phase === 1) {
        // Start phase 2: Spanish → English with all words again
        setPhase(2);
        setCurrentDirection('es-to-en');

        // Reset for phase 2
        const shuffled = shuffleArray([...words]);
        const initialWords = shuffled.slice(0, cardsPerSide);
        const remaining = shuffled.slice(cardsPerSide);

        setLeftSlots([...initialWords]);
        setRightSlots(shuffleArray([...initialWords]));
        setQueue(remaining);
        setCompletedWords(new Set());
      } else {
        // Quiz complete
        // wrongAnswers map only contains words that had at least 1 wrong attempt
        // For those words: attempts = wrongCount + 1 (the final correct one)
        // For words not in the map: attempts = 1 (got it right first try)
        const results: QuizResult[] = words.map(w => {
          const wrongCount = wrongAnswers.get(w.id) || 0;
          const attempts = wrongCount + 1; // +1 for the final correct match
          return {
            wordId: w.id,
            correct: true, // All words are eventually matched correctly
            attempts,
          };
        });
        onComplete(results);
      }
    }
  }, [leftSlots, queue, direction, phase, words, cardsPerSide, wrongAnswers, onComplete]);

  const completedCount = completedWords.size;
  const phaseTotal = totalWords;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 gap-1">
          <span>
            {direction === 'alternating' && `Phase ${phase}/2 • `}
            Progress: {completedCount} / {phaseTotal}
          </span>
          <span>
            {currentDirection === 'en-to-es' ? 'English → Spanish' : 'Spanish → English'}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / phaseTotal) * 100}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {queue.length} words in queue
        </div>
      </div>

      {/* Game Board */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:gap-8">
        {/* Left Column */}
        <div className="space-y-2 sm:space-y-3">
          <h3 className="text-center text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-4">
            {currentDirection === 'en-to-es' ? 'English' : 'Spanish'}
          </h3>
          {leftSlots.map((word, index) => (
            word ? (
              <button
                key={`left-${index}`}
                type="button"
                onClick={() => handleLeftClick(index)}
                className={`w-full p-2 sm:p-3 md:p-4 text-sm sm:text-base md:text-lg rounded-lg border-2 transition-all min-h-[44px] ${
                  selectedLeft === index
                    ? feedback === 'correct'
                      ? 'border-green-500 bg-green-100 dark:bg-green-900'
                      : feedback === 'incorrect'
                      ? 'border-red-500 bg-red-100 dark:bg-red-900'
                      : 'border-blue-500 bg-blue-100 dark:bg-blue-900'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-400'
                }`}
              >
                {getLeftText(word)}
              </button>
            ) : (
              <div key={`left-${index}`} className="w-full p-2 sm:p-3 md:p-4 text-sm sm:text-base md:text-lg rounded-lg border-2 border-transparent min-h-[44px]" />
            )
          ))}
        </div>

        {/* Right Column */}
        <div className="space-y-2 sm:space-y-3">
          <h3 className="text-center text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-4">
            {currentDirection === 'en-to-es' ? 'Spanish' : 'English'}
          </h3>
          {rightSlots.map((word, index) => (
            word ? (
              <div key={`right-${index}`} className="relative">
                <button
                  type="button"
                  onClick={() => handleRightClick(index)}
                  className={`w-full p-2 sm:p-3 md:p-4 text-sm sm:text-base md:text-lg rounded-lg border-2 transition-all min-h-[44px] ${
                    selectedRight === index
                      ? feedback === 'correct'
                        ? 'border-green-500 bg-green-100 dark:bg-green-900'
                        : feedback === 'incorrect'
                        ? 'border-red-500 bg-red-100 dark:bg-red-900'
                        : 'border-blue-500 bg-blue-100 dark:bg-blue-900'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-400'
                  }`}
                >
                  {getRightText(word)}
                </button>
                {/* Three-dot menu */}
                <div className="absolute top-0.5 sm:top-1 right-0.5 sm:right-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenIndex(menuOpenIndex === index ? null : index);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm sm:text-base"
                  >
                    ⋮
                  </button>
                  {menuOpenIndex === index && (
                    <div className="absolute right-0 mt-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded shadow-lg z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStarWord(word.id);
                          setMenuOpenIndex(null);
                        }}
                        className="px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-100 dark:hover:bg-gray-600 whitespace-nowrap"
                      >
                        ★ Star it
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div key={`right-${index}`} className="w-full p-2 sm:p-3 md:p-4 text-sm sm:text-base md:text-lg rounded-lg border-2 border-transparent min-h-[44px]" />
            )
          ))}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`fixed bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-white text-sm sm:text-base font-medium ${
            feedback === 'correct' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {feedback === 'correct' ? 'Correct!' : 'Try again!'}
        </div>
      )}
    </div>
  );
}
