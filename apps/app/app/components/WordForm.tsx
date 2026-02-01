'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { Word, Group } from '@/lib/types';

interface WordFormProps {
  word: Word | null;
  words: Word[];
  groups: Group[];
  onSave: (word: Word, groupIds?: string[]) => void;
  onCancel: () => void;
}

// Generate next sequential word ID (w001, w002, etc.)
function generateNextWordId(words: Word[]): string {
  const maxNum = words.reduce((max, w) => {
    const match = w.id.match(/^w(\d+)$/);
    if (match) {
      return Math.max(max, parseInt(match[1], 10));
    }
    return max;
  }, 0);
  return `w${String(maxNum + 1).padStart(3, '0')}`;
}

export default function WordForm({ word, words, groups, onSave, onCancel }: WordFormProps) {
  const [english, setEnglish] = useState('');
  const [spanish, setSpanish] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter out "Stars" group from selection
  const availableGroups = useMemo(() =>
    groups.filter(g => g.name !== 'Stars'),
    [groups]
  );

  // Filter groups by search term
  const filteredGroups = useMemo(() =>
    availableGroups.filter(g =>
      g.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
    ),
    [availableGroups, groupSearchTerm]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowGroupDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleGroup = (groupId: string) => {
    const newSet = new Set(selectedGroupIds);
    if (newSet.has(groupId)) {
      newSet.delete(groupId);
    } else {
      newSet.add(groupId);
    }
    setSelectedGroupIds(newSet);
  };

  const removeGroup = (groupId: string) => {
    const newSet = new Set(selectedGroupIds);
    newSet.delete(groupId);
    setSelectedGroupIds(newSet);
  };

  useEffect(() => {
    if (word) {
      setEnglish(word.english);
      setSpanish(word.spanish);
      // Pre-populate with current groups when editing
      const currentGroups = groups
        .filter(g => g.wordIds.includes(word.id) && g.name !== 'Stars')
        .map(g => g.id);
      setSelectedGroupIds(new Set(currentGroups));
    } else {
      setEnglish('');
      setSpanish('');
      setSelectedGroupIds(new Set());
    }
    setGroupSearchTerm('');
    setShowGroupDropdown(false);
  }, [word, groups]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!english.trim() || !spanish.trim()) return;

    const wordData = {
      id: word?.id || generateNextWordId(words),
      english: english.trim(),
      spanish: spanish.trim(),
      createdAt: word?.createdAt || new Date().toISOString(),
    };

    // Always pass group IDs (for both new and edited words)
    const groupIds = Array.from(selectedGroupIds);

    onSave(wordData, groupIds);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4">
          {word ? 'Edit Word' : 'Add New Word'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">English</label>
            <input
              type="text"
              value={english}
              onChange={e => setEnglish(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter English word"
              autoFocus
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Spanish</label>
            <input
              type="text"
              value={spanish}
              onChange={e => setSpanish(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Spanish translation"
            />
          </div>

          {/* Group Selection - show for both new and editing words */}
          {availableGroups.length > 0 && (
            <div className="mb-6" ref={dropdownRef}>
              <label className="block text-sm font-medium mb-1">Groups (optional)</label>
              <div className="relative">
                <input
                  type="text"
                  value={groupSearchTerm}
                  onChange={e => setGroupSearchTerm(e.target.value)}
                  onFocus={() => setShowGroupDropdown(true)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search groups..."
                />
                {showGroupDropdown && filteredGroups.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredGroups.map(group => (
                      <label
                        key={group.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.has(group.id)}
                          onChange={() => toggleGroup(group.id)}
                          className="w-4 h-4"
                        />
                        <span>{group.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {/* Selected groups as chips */}
              {selectedGroupIds.size > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {Array.from(selectedGroupIds).map(id => {
                    const group = groups.find(g => g.id === id);
                    if (!group) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                      >
                        {group.name}
                        <button
                          type="button"
                          onClick={() => removeGroup(id)}
                          className="hover:text-blue-600 dark:hover:text-blue-100"
                        >
                          &times;
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {word ? 'Save Changes' : 'Add Word'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
