'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Word, Group } from '@/lib/types';

type PageSize = 10 | 20 | 50;

interface GroupManagerProps {
  groups: Group[];
  words: Word[];
  onCreateGroup: (name: string) => void;
  onUpdateGroup: (group: Group) => void;
  onDeleteGroup: (id: string) => void;
  onSelectGroup: (groupId: string) => void;
  onOrganize: () => Promise<void>;
  isOrganizing: boolean;
  ungroupedCount: number;
}

export default function GroupManager({
  groups,
  words,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onSelectGroup,
  onOrganize,
  isOrganizing,
  ungroupedCount,
}: GroupManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editingWordIds, setEditingWordIds] = useState<Set<string>>(new Set());

  // Modal search/pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName.trim());
      setNewGroupName('');
      setIsCreating(false);
    }
  };

  const startEditingGroup = (group: Group) => {
    setEditingGroup(group);
    setEditingWordIds(new Set(group.wordIds));
    // Reset modal state
    setSearchTerm('');
    setCurrentPage(1);
    setPageSize(10);
  };

  // Filter, sort, and paginate words for the modal
  const filteredWords = useMemo(() => {
    if (!searchTerm.trim()) return words;
    const term = searchTerm.toLowerCase();
    return words.filter(
      word =>
        word.english.toLowerCase().includes(term) ||
        word.spanish.toLowerCase().includes(term)
    );
  }, [words, searchTerm]);

  const sortedWords = useMemo(() => {
    // Separate words into selected (in group) and unselected
    const selectedWords = filteredWords.filter(w => editingWordIds.has(w.id));
    const unselectedWords = filteredWords.filter(w => !editingWordIds.has(w.id));

    // Sort each group by createdAt descending (most recent first)
    const sortByDate = (a: Word, b: Word) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    selectedWords.sort(sortByDate);
    unselectedWords.sort(sortByDate);

    // Selected words first, then unselected
    return [...selectedWords, ...unselectedWords];
  }, [filteredWords, editingWordIds]);

  const totalPages = Math.ceil(sortedWords.length / pageSize);

  const paginatedWords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedWords.slice(start, start + pageSize);
  }, [sortedWords, currentPage, pageSize]);

  // Reset to page 1 when search or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const toggleWordInGroup = (wordId: string) => {
    const newSet = new Set(editingWordIds);
    if (newSet.has(wordId)) {
      newSet.delete(wordId);
    } else {
      newSet.add(wordId);
    }
    setEditingWordIds(newSet);
  };

  const saveGroupChanges = () => {
    if (editingGroup) {
      onUpdateGroup({
        ...editingGroup,
        wordIds: Array.from(editingWordIds),
      });
      setEditingGroup(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold">Word Groups</h3>
        <div className="flex gap-2">
          {ungroupedCount > 0 && (
            <button
              type="button"
              onClick={onOrganize}
              disabled={isOrganizing}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Auto-organize ${ungroupedCount} ungrouped words using AI`}
            >
              {isOrganizing ? 'Organizing...' : `Auto-Organize (${ungroupedCount})`}
            </button>
          )}
          {!isCreating && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              + New
            </button>
          )}
        </div>
      </div>

      {isCreating && (
        <div className="mb-4 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder="Group name"
            className="flex-1 px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateGroup}
              className="flex-1 sm:flex-none px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setNewGroupName('');
              }}
              className="flex-1 sm:flex-none px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {groups.map(group => (
          <div
            key={group.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded"
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm sm:text-base font-medium truncate">{group.name}</span>
              <span className="ml-2 text-xs sm:text-sm text-gray-500">
                ({group.wordIds.length})
              </span>
            </div>
            <div className="flex gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => onSelectGroup(group.id)}
                className="px-2 py-1 text-xs sm:text-sm text-green-600 hover:text-green-800 dark:text-green-400"
              >
                Select
              </button>
              <button
                type="button"
                onClick={() => startEditingGroup(group)}
                className="px-2 py-1 text-xs sm:text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDeleteGroup(group.id)}
                className="px-2 py-1 text-xs sm:text-sm text-red-600 hover:text-red-800 dark:text-red-400"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="text-center py-4 text-sm text-gray-500">No groups yet.</p>
        )}
      </div>

      {/* Edit Group Modal */}
      {editingGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-semibold mb-4">
              Edit Group: {editingGroup.name}
            </h3>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search words..."
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Word count */}
            <p className="text-sm text-gray-500 mb-2">
              {searchTerm
                ? `Showing ${sortedWords.length} of ${words.length} words`
                : `${words.length} words (sorted by recently added)`}
            </p>

            {/* Page size selector */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-500">Show:</span>
              {([10, 20, 50] as PageSize[]).map(size => (
                <button
                  key={size}
                  onClick={() => setPageSize(size)}
                  className={`px-2 py-1 text-sm rounded ${
                    pageSize === size
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            {/* Word list */}
            <div className="space-y-2 mb-4 overflow-y-auto flex-1 min-h-0">
              {paginatedWords.map(word => (
                <label
                  key={word.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={editingWordIds.has(word.id)}
                    onChange={() => toggleWordInGroup(word.id)}
                    className="w-4 h-4"
                  />
                  <span>{word.english}</span>
                  <span className="text-gray-500">→</span>
                  <span>{word.spanish}</span>
                </label>
              ))}
              {paginatedWords.length === 0 && (
                <p className="text-center py-4 text-gray-500">No words found.</p>
              )}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
              <button
                onClick={() => setEditingGroup(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={saveGroupChanges}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
