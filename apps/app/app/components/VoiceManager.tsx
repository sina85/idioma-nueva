'use client';

import { useState, useEffect } from 'react';

interface MissingWord {
  id: string;
  english: string;
  spanish: string;
}

interface VoiceManagerProps {
  onClose: () => void;
}

export default function VoiceManager({ onClose }: VoiceManagerProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [missingWords, setMissingWords] = useState<MissingWord[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [result, setResult] = useState<{ generated: number; failed: number } | null>(null);

  useEffect(() => {
    checkMissingVoices();
  }, []);

  const checkMissingVoices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/voices/missing');
      const data = await res.json();
      setMissingWords(data.words || []);
      setTotalWords(data.total || 0);
    } catch (error) {
      console.error('Failed to check missing voices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVoices = async () => {
    if (missingWords.length === 0) return;

    setGenerating(true);
    setResult(null);

    try {
      const res = await fetch('/api/voices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordIds: missingWords.map(w => w.id) }),
      });
      const data = await res.json();
      setResult({ generated: data.generated, failed: data.failed });

      // Refresh the missing count
      await checkMissingVoices();
    } catch (error) {
      console.error('Failed to generate voices:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4">Voice Manager</h2>

        {loading ? (
          <div className="py-8 text-center text-gray-500">
            Checking voice files...
          </div>
        ) : (
          <>
            <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {missingWords.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  words missing voices (of {totalWords} total)
                </p>
              </div>
            </div>

            {missingWords.length > 0 && (
              <div className="mb-4 max-h-48 overflow-y-auto">
                <p className="text-sm font-medium mb-2">Missing voices for:</p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {missingWords.slice(0, 10).map(word => (
                    <li key={word.id} className="truncate">
                      {word.english} / {word.spanish}
                    </li>
                  ))}
                  {missingWords.length > 10 && (
                    <li className="text-gray-400">
                      ...and {missingWords.length - 10} more
                    </li>
                  )}
                </ul>
              </div>
            )}

            {result && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-sm">
                <p className="text-green-800 dark:text-green-200">
                  Generated {result.generated} voice{result.generated !== 1 ? 's' : ''}.
                  {result.failed > 0 && ` ${result.failed} failed.`}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={handleGenerateVoices}
                disabled={missingWords.length === 0 || generating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? 'Generating...' : `Generate ${missingWords.length} Voice${missingWords.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
