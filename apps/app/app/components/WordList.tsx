'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import type { Word, Group } from '@/lib/types';
import DeleteWordDialog from './DeleteWordDialog';

type SortKey = 'english' | 'spanish' | 'createdAt';
type SortOrder = 'asc' | 'desc';
type PageSize = 10 | 20 | 50;

interface WordListProps {
  words: Word[];
  groups: Group[];
  onEdit: (word: Word) => void;
  onDelete: (id: string) => void;
  onDeleteVoice: (id: string) => void;
  selectedWordIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onToggleStar: (wordId: string) => void;
}

function HighlightText({ text, search }: { text: string; search: string }) {
  if (!search.trim()) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function WordList({
  words,
  groups,
  onEdit,
  onDelete,
  onDeleteVoice,
  selectedWordIds,
  onSelectionChange,
  onToggleStar,
}: WordListProps) {
  const [deleteDialogWord, setDeleteDialogWord] = useState<Word | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [englishSearch, setEnglishSearch] = useState('');
  const [spanishSearch, setSpanishSearch] = useState('');
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStarred, setFilterStarred] = useState(false);

  // Get starred word IDs
  const starsGroup = groups.find(g => g.name === 'Stars');
  const starredWordIds = new Set(starsGroup?.wordIds || []);

  // Audio playback
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback((wordId: string, language: 'english' | 'spanish') => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const audio = new Audio(`/voices/${language}/${wordId}.mp3`);
    audioRef.current = audio;
    audio.play().catch(err => console.warn('Audio playback failed:', err));
  }, []);

  // Filter words based on search and starred filter
  const filteredWords = useMemo(() => {
    return words.filter(word => {
      const matchesEnglish = englishSearch
        ? word.english.toLowerCase().includes(englishSearch.toLowerCase())
        : true;
      const matchesSpanish = spanishSearch
        ? word.spanish.toLowerCase().includes(spanishSearch.toLowerCase())
        : true;
      const matchesStarred = filterStarred ? starredWordIds.has(word.id) : true;
      return matchesEnglish && matchesSpanish && matchesStarred;
    });
  }, [words, englishSearch, spanishSearch, filterStarred, starredWordIds]);

  // Sort filtered words
  const sortedWords = useMemo(() => {
    return [...filteredWords].sort((a, b) => {
      if (sortKey === 'createdAt') {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      }
      const aVal = a[sortKey].toLowerCase();
      const bVal = b[sortKey].toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredWords, sortKey, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedWords.length / pageSize);
  const paginatedWords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedWords.slice(start, start + pageSize);
  }, [sortedWords, currentPage, pageSize]);

  // Reset to page 1 when search or page size changes
  const handleSearchChange = (type: 'english' | 'spanish', value: string) => {
    if (type === 'english') {
      setEnglishSearch(value);
    } else {
      setSpanishSearch(value);
    }
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: PageSize) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString();
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const getWordGroups = (wordId: string): string[] => {
    const word = words.find(w => w.id === wordId);
    if (!word?.groupIds) return [];
    return groups
      .filter(g => word.groupIds!.includes(g.id))
      .map(g => g.name);
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedWordIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    onSelectionChange(newSelection);
  };

  const toggleAllOnPage = () => {
    const pageWordIds = paginatedWords.map(w => w.id);
    const allSelected = pageWordIds.every(id => selectedWordIds.has(id));

    const newSelection = new Set(selectedWordIds);
    if (allSelected) {
      pageWordIds.forEach(id => newSelection.delete(id));
    } else {
      pageWordIds.forEach(id => newSelection.add(id));
    }
    onSelectionChange(newSelection);
  };

  const SortIcon = ({ active, order }: { active: boolean; order: SortOrder }) => (
    <span className="ml-1 text-xs">
      {active ? (order === 'asc' ? '▲' : '▼') : '○'}
    </span>
  );

  const pageWordIds = paginatedWords.map(w => w.id);
  const allOnPageSelected = pageWordIds.length > 0 && pageWordIds.every(id => selectedWordIds.has(id));

  return (
    <div>
      {/* Search Bars */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Search English</label>
          <input
            type="text"
            value={englishSearch}
            onChange={e => handleSearchChange('english', e.target.value)}
            placeholder="Search English..."
            className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Search Spanish</label>
          <input
            type="text"
            value={spanishSearch}
            onChange={e => handleSearchChange('spanish', e.target.value)}
            placeholder="Search Spanish..."
            className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Results info */}
      {(englishSearch || spanishSearch) && (
        <p className="text-xs sm:text-sm text-gray-500 mb-2">
          Found {filteredWords.length} of {words.length} words
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full border-collapse min-w-[400px]">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="p-2 sm:p-3 text-left w-10 sm:w-12">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleAllOnPage}
                  className="w-4 h-4"
                  title="Select all on this page"
                />
              </th>
              <th
                className={`p-2 sm:p-3 text-left w-10 sm:w-12 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${filterStarred ? 'text-yellow-500' : ''}`}
                onClick={() => setFilterStarred(!filterStarred)}
                title={filterStarred ? 'Show all words' : 'Show starred only'}
              >
                ★
              </th>
              <th
                className="p-2 sm:p-3 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 text-sm sm:text-base"
                onClick={() => handleSort('english')}
              >
                English
                <SortIcon active={sortKey === 'english'} order={sortOrder} />
              </th>
              <th
                className="p-2 sm:p-3 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 text-sm sm:text-base"
                onClick={() => handleSort('spanish')}
              >
                Spanish
                <SortIcon active={sortKey === 'spanish'} order={sortOrder} />
              </th>
              <th
                className="hidden md:table-cell p-2 sm:p-3 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 text-sm sm:text-base"
                onClick={() => handleSort('createdAt')}
              >
                Added
                <SortIcon active={sortKey === 'createdAt'} order={sortOrder} />
              </th>
              <th className="hidden lg:table-cell p-2 sm:p-3 text-left text-sm sm:text-base">Groups</th>
              <th className="p-2 sm:p-3 text-right text-sm sm:text-base">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedWords.map(word => (
              <tr
                key={word.id}
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td className="p-2 sm:p-3">
                  <input
                    type="checkbox"
                    checked={selectedWordIds.has(word.id)}
                    onChange={() => toggleSelection(word.id)}
                    className="w-4 h-4"
                    title={`Select ${word.english}`}
                  />
                </td>
                <td className="p-2 sm:p-3">
                  <button
                    type="button"
                    onClick={() => onToggleStar(word.id)}
                    className={`text-base sm:text-lg hover:scale-110 transition-transform ${
                      starredWordIds.has(word.id)
                        ? 'text-yellow-500'
                        : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'
                    }`}
                    title={starredWordIds.has(word.id) ? 'Unstar' : 'Star'}
                  >
                    {starredWordIds.has(word.id) ? '★' : '☆'}
                  </button>
                </td>
                <td className="p-2 sm:p-3 text-sm sm:text-base">
                  <button
                    type="button"
                    onClick={() => playAudio(word.id, 'english')}
                    className="hover:underline cursor-pointer text-left"
                    title={`Play pronunciation: ${word.english}`}
                  >
                    <HighlightText text={word.english} search={englishSearch} />
                  </button>
                </td>
                <td className="p-2 sm:p-3 text-sm sm:text-base">
                  <button
                    type="button"
                    onClick={() => playAudio(word.id, 'spanish')}
                    className="hover:underline cursor-pointer text-left"
                    title={`Play pronunciation: ${word.spanish}`}
                  >
                    <HighlightText text={word.spanish} search={spanishSearch} />
                  </button>
                </td>
                <td className="hidden md:table-cell p-2 sm:p-3 text-xs sm:text-sm text-gray-500">{formatDate(word.createdAt)}</td>
                <td className="hidden lg:table-cell p-2 sm:p-3">
                  <div className="flex flex-wrap gap-1">
                    {getWordGroups(word.id).map(groupName => (
                      <span
                        key={groupName}
                        className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                      >
                        {groupName}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-2 sm:p-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onEdit(word)}
                    className="px-1.5 sm:px-2 py-1 text-xs sm:text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteDialogWord(word)}
                    className="px-1.5 sm:px-2 py-1 text-xs sm:text-sm text-red-600 hover:text-red-800 dark:text-red-400 ml-1 sm:ml-2"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {words.length === 0 && (
        <p className="text-center py-6 sm:py-8 text-sm sm:text-base text-gray-500">No words yet. Add some to get started!</p>
      )}

      {/* No results from search */}
      {words.length > 0 && filteredWords.length === 0 && (
        <p className="text-center py-6 sm:py-8 text-sm sm:text-base text-gray-500">No words match your search.</p>
      )}

      {/* Pagination */}
      {filteredWords.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-gray-500">Show:</span>
            {([10, 20, 50] as PageSize[]).map(size => (
              <button
                key={size}
                type="button"
                onClick={() => handlePageSizeChange(size)}
                className={`px-2 py-1 text-xs sm:text-sm rounded ${
                  pageSize === size
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600"
            >
              Prev
            </button>
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {deleteDialogWord && (
        <DeleteWordDialog
          word={deleteDialogWord}
          onDeleteVoice={(id) => {
            onDeleteVoice(id);
            setDeleteDialogWord(null);
          }}
          onDeleteBoth={(id) => {
            onDelete(id);
            setDeleteDialogWord(null);
          }}
          onCancel={() => setDeleteDialogWord(null)}
        />
      )}
    </div>
  );
}
