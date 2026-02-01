'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Word, Group, QuizDirection } from '@/lib/types';
import WordList from '../components/WordList';
import WordForm from '../components/WordForm';
import GroupManager from '../components/GroupManager';
import QuizConfig from '../components/QuizConfig';
import QuickQuizConfig from '../components/QuickQuizConfig';
import VoiceManager from '../components/VoiceManager';
import { UserButton } from '@repo/auth/client';

export default function Home() {
  const router = useRouter();
  const [words, setWords] = useState<Word[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [showWordForm, setShowWordForm] = useState(false);
  const [showQuizConfig, setShowQuizConfig] = useState(false);
  const [showQuickQuizConfig, setShowQuickQuizConfig] = useState(false);
  const [showVoiceManager, setShowVoiceManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOrganizing, setIsOrganizing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [wordsRes, groupsRes] = await Promise.all([
        fetch('/api/words'),
        fetch('/api/groups'),
      ]);
      const wordsData = await wordsRes.json();
      const groupsData = await groupsRes.json();
      setWords(wordsData.words || []);

      // Ensure "Stars" group exists
      let loadedGroups: Group[] = groupsData.groups || [];
      const starsGroup = loadedGroups.find(g => g.name === 'Stars');
      if (!starsGroup) {
        const newStarsGroup: Group = {
          id: 'stars',
          name: 'Stars',
          wordIds: [],
        };
        await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newStarsGroup),
        });
        loadedGroups = [...loadedGroups, newStarsGroup];
      }
      setGroups(loadedGroups);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWord = async (word: Word, groupIds?: string[]) => {
    const isNew = !words.find(w => w.id === word.id);
    const method = isNew ? 'POST' : 'PUT';

    await fetch('/api/words', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(word),
    });

    // Generate TTS for new words (fire and forget, non-blocking)
    if (isNew) {
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordId: word.id,
          english: word.english,
          spanish: word.spanish,
        }),
      }).catch(err => console.warn('TTS generation failed:', err));
    }

    const wordWithGroups = { ...word, groupIds: groupIds || [] };
    if (isNew) {
      setWords([...words, wordWithGroups]);
    } else {
      setWords(words.map(w => (w.id === word.id ? wordWithGroups : w)));
    }

    // Update group memberships (for both new and edited words)
    if (groupIds) {
      const updatedGroups = groups.map(g => {
        // Skip Stars group
        if (g.name === 'Stars') return g;

        const shouldHaveWord = groupIds.includes(g.id);
        const hasWord = g.wordIds.includes(word.id);

        if (shouldHaveWord && !hasWord) {
          // Add word to group
          return { ...g, wordIds: [...g.wordIds, word.id] };
        } else if (!shouldHaveWord && hasWord) {
          // Remove word from group
          return { ...g, wordIds: g.wordIds.filter(id => id !== word.id) };
        }
        return g;
      });

      setGroups(updatedGroups);

      // Persist group updates for groups that changed
      const changedGroups = updatedGroups.filter((g, i) =>
        g.name !== 'Stars' && g.wordIds !== groups[i].wordIds
      );

      for (const group of changedGroups) {
        fetch('/api/groups', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(group),
        }).catch(err => console.warn('Group update failed:', err));
      }
    }

    setShowWordForm(false);
    setEditingWord(null);
  };

  const handleDeleteVoice = async (id: string) => {
    await fetch('/api/voices', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wordId: id }),
    });
  };

  const handleDeleteWord = async (id: string) => {
    // Delete voices first, then the word
    await handleDeleteVoice(id);
    await fetch(`/api/words?id=${id}`, { method: 'DELETE' });
    setWords(words.filter(w => w.id !== id));
    setSelectedWordIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleCreateGroup = async (name: string) => {
    const group: Group = {
      id: crypto.randomUUID(),
      name,
      wordIds: [],
    };

    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    });

    setGroups([...groups, group]);
  };

  const handleUpdateGroup = async (group: Group) => {
    await fetch('/api/groups', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    });

    setGroups(groups.map(g => (g.id === group.id ? group : g)));
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;

    await fetch(`/api/groups?id=${id}`, { method: 'DELETE' });
    setGroups(groups.filter(g => g.id !== id));
  };

  const handleSelectGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setSelectedWordIds(new Set(group.wordIds));
    }
  };

  const ungroupedCount = useMemo(() => {
    return words.filter(w => !w.groupIds || w.groupIds.length === 0).length;
  }, [words]);

  const handleOrganize = async () => {
    setIsOrganizing(true);
    try {
      const response = await fetch('/api/words/organize', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        await loadData();
        const message =
          data.summary.wordsAssigned > 0
            ? `Organized ${data.summary.wordsAssigned} words.${data.summary.newGroupsCreated.length > 0 ? ` Created ${data.summary.newGroupsCreated.length} new group(s): ${data.summary.newGroupsCreated.join(', ')}` : ''}`
            : data.message || 'All words are already organized.';
        alert(message);
      } else {
        alert(data.error || 'Failed to organize words');
      }
    } catch (error) {
      console.error('Organize error:', error);
      alert('Failed to organize words. Please try again.');
    } finally {
      setIsOrganizing(false);
    }
  };

  const handleToggleStar = async (wordId: string) => {
    const starsGroup = groups.find(g => g.name === 'Stars');
    if (!starsGroup) return;

    const isStarred = starsGroup.wordIds.includes(wordId);
    const updatedGroup = {
      ...starsGroup,
      wordIds: isStarred
        ? starsGroup.wordIds.filter(id => id !== wordId)
        : [...starsGroup.wordIds, wordId],
    };

    await fetch('/api/groups', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedGroup),
    });

    setGroups(groups.map(g => (g.id === starsGroup.id ? updatedGroup : g)));
  };

  const handleQuickQuizStart = (config: { wordIds: string[]; cardsPerSide: number; direction: QuizDirection; speechEnabled: boolean }) => {
    sessionStorage.setItem('quizConfig', JSON.stringify(config));
    setShowQuickQuizConfig(false);
    router.push('/quiz');
  };

  const handleStartQuiz = (cardsPerSide: number, direction: QuizDirection, speechEnabled: boolean) => {
    const config = {
      wordIds: Array.from(selectedWordIds),
      cardsPerSide,
      direction,
      speechEnabled,
    };
    sessionStorage.setItem('quizConfig', JSON.stringify(config));
    router.push('/quiz');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-4 py-4 sm:py-8">
        <header className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Spanish Vocabulary Trainer
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
              Learn Spanish with flashcard quizzes
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowVoiceManager(true)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Voices
            </button>
            <button
              type="button"
              onClick={() => router.push('/stats')}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              View Stats
            </button>
            <UserButton />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Word List */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">Vocabulary ({words.length})</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingWord(null);
                    setShowWordForm(true);
                  }}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Add Word
                </button>
                <button
                  onClick={() => setShowQuizConfig(true)}
                  disabled={selectedWordIds.size < 2}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Quiz ({selectedWordIds.size})
                </button>
              </div>
            </div>

            <WordList
              words={words}
              groups={groups}
              onEdit={word => {
                setEditingWord(word);
                setShowWordForm(true);
              }}
              onDelete={handleDeleteWord}
              onDeleteVoice={handleDeleteVoice}
              selectedWordIds={selectedWordIds}
              onSelectionChange={setSelectedWordIds}
              onToggleStar={handleToggleStar}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Quiz */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Quick Quiz</h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                Select words by count or date range
              </p>
              <button
                type="button"
                onClick={() => setShowQuickQuizConfig(true)}
                disabled={words.length < 2}
                className="w-full px-4 py-2 text-sm sm:text-base bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Select Words...
              </button>
            </div>

            {/* Groups */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
              <GroupManager
                groups={groups}
                words={words}
                onCreateGroup={handleCreateGroup}
                onUpdateGroup={handleUpdateGroup}
                onDeleteGroup={handleDeleteGroup}
                onSelectGroup={handleSelectGroup}
                onOrganize={handleOrganize}
                isOrganizing={isOrganizing}
                ungroupedCount={ungroupedCount}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showWordForm && (
        <WordForm
          word={editingWord}
          words={words}
          groups={groups}
          onSave={handleSaveWord}
          onCancel={() => {
            setShowWordForm(false);
            setEditingWord(null);
          }}
        />
      )}

      {showQuizConfig && (
        <QuizConfig
          selectedCount={selectedWordIds.size}
          onStartQuiz={handleStartQuiz}
          onCancel={() => setShowQuizConfig(false)}
        />
      )}

      {showQuickQuizConfig && (
        <QuickQuizConfig
          words={words}
          groups={groups}
          onStartQuiz={handleQuickQuizStart}
          onCancel={() => setShowQuickQuizConfig(false)}
        />
      )}

      {showVoiceManager && (
        <VoiceManager onClose={() => setShowVoiceManager(false)} />
      )}
    </div>
  );
}
