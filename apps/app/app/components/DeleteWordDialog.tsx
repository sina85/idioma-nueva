'use client';

import type { Word } from '@/lib/types';

interface DeleteWordDialogProps {
  word: Word;
  onDeleteVoice: (wordId: string) => void;
  onDeleteBoth: (wordId: string) => void;
  onCancel: () => void;
}

export default function DeleteWordDialog({
  word,
  onDeleteVoice,
  onDeleteBoth,
  onCancel,
}: DeleteWordDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <h3 className="text-lg font-semibold mb-2">Delete Word</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          What would you like to delete for &quot;{word.english}&quot; / &quot;{word.spanish}&quot;?
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onDeleteVoice(word.id)}
            className="w-full px-4 py-2 text-left rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <span className="font-medium">Delete Voice</span>
            <span className="block text-sm text-gray-500 dark:text-gray-400">
              Remove audio files only, keep the word
            </span>
          </button>

          <button
            type="button"
            onClick={() => onDeleteBoth(word.id)}
            className="w-full px-4 py-2 text-left rounded-lg border border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
          >
            <span className="font-medium">Delete Both</span>
            <span className="block text-sm text-red-500 dark:text-red-400">
              Remove both the word and audio files
            </span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full px-4 py-2 mt-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
