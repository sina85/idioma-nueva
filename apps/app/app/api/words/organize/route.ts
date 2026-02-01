import { NextResponse } from 'next/server';
import { auth } from '@repo/auth/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getWords, getGroups, createGroup, updateGroup } from '@/lib/db';
import { models } from '@repo/ai/lib/models';

const categorizationSchema = z.object({
  categorizations: z.array(
    z.object({
      wordIndex: z.number().describe('The index of the word in the provided list'),
      groupName: z.string().describe('The group name to assign this word to'),
      isNewGroup: z
        .boolean()
        .describe('True if this requires creating a new group, false if using an existing group'),
    })
  ),
});

export async function POST() {
  console.log('[Organize] Starting organize request');

  const { userId } = await auth();
  console.log('[Organize] Auth check - userId:', userId ? 'present' : 'missing');

  if (!userId) {
    console.log('[Organize] Unauthorized - no userId');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Organize] Fetching groups and words...');
    const [groups, words] = await Promise.all([getGroups(userId), getWords(userId)]);
    console.log('[Organize] Found', groups.length, 'groups and', words.length, 'words');

    // Filter ungrouped words (exclude Stars from consideration)
    const ungroupedWords = words.filter(w => !w.groupIds || w.groupIds.length === 0);
    console.log('[Organize] Ungrouped words:', ungroupedWords.length);

    if (ungroupedWords.length === 0) {
      console.log('[Organize] No ungrouped words, returning early');
      return NextResponse.json({
        success: true,
        summary: {
          totalUngroupedWords: 0,
          wordsAssigned: 0,
          newGroupsCreated: [],
          assignments: [],
        },
        message: 'All words are already organized into groups.',
      });
    }

    // Build existing groups list (exclude Stars)
    const existingGroups = groups.filter(g => g.name !== 'Stars');
    const existingGroupNames = existingGroups.map(g => g.name);
    console.log('[Organize] Existing group names:', existingGroupNames);

    // Format words for prompt
    const wordsList = ungroupedWords.map((w, i) => `${i}. ${w.english} / ${w.spanish}`).join('\n');
    console.log('[Organize] Sending', ungroupedWords.length, 'words to AI for categorization...');

    // AI categorization
    const { object: aiResult } = await generateObject({
      model: models.chat,
      schema: categorizationSchema,
      system: `You are a vocabulary categorization assistant for a Spanish-English learning app.
Your task is to categorize vocabulary words into thematic groups.

Guidelines:
- Assign each word to the MOST appropriate existing group when possible
- Only suggest a new group if no existing group is a good fit
- New group names should be concise (1-3 words), descriptive, and in English
- Consider semantic meaning, not just word form
- Common thematic categories include: Food, Animals, Colors, Numbers, Verbs, Adjectives,
  Household, Body Parts, Clothing, Travel, Time, Weather, Emotions, Family, Nature, etc.`,
      prompt: `Existing groups: ${JSON.stringify(existingGroupNames)}

Ungrouped words to categorize:
${wordsList}

For each word, categorize it into an existing group OR suggest a new group name if none fit well.`,
    });
    console.log('[Organize] AI categorization complete, got', aiResult.categorizations.length, 'categorizations');

    // Process results - build a map of group names to group objects
    const groupMap = new Map(existingGroups.map(g => [g.name.toLowerCase(), g]));
    const newGroupsToCreate = new Set<string>();
    const assignments: Array<{
      wordId: string;
      english: string;
      spanish: string;
      groupName: string;
      isNewGroup: boolean;
    }> = [];

    // First pass: identify new groups needed
    for (const cat of aiResult.categorizations) {
      if (cat.isNewGroup && !groupMap.has(cat.groupName.toLowerCase())) {
        newGroupsToCreate.add(cat.groupName);
      }
    }

    // Create new groups
    const createdGroupNames: string[] = [];
    for (const name of newGroupsToCreate) {
      const newGroup = await createGroup(userId, name);
      groupMap.set(name.toLowerCase(), newGroup);
      createdGroupNames.push(name);
    }

    // Second pass: build group updates
    const groupUpdates = new Map<string, string[]>();

    // Initialize with existing word IDs for each group that will be updated
    for (const cat of aiResult.categorizations) {
      const word = ungroupedWords[cat.wordIndex];
      if (!word) continue;

      const group = groupMap.get(cat.groupName.toLowerCase());
      if (!group) continue;

      if (!groupUpdates.has(group.id)) {
        // Start with existing wordIds for this group
        groupUpdates.set(group.id, [...group.wordIds]);
      }
      groupUpdates.get(group.id)!.push(word.id);

      assignments.push({
        wordId: word.id,
        english: word.english,
        spanish: word.spanish,
        groupName: cat.groupName,
        isNewGroup: cat.isNewGroup,
      });
    }

    // Apply updates to database
    for (const [groupId, wordIds] of groupUpdates) {
      const uniqueWordIds = [...new Set(wordIds)];
      await updateGroup(userId, groupId, { wordIds: uniqueWordIds });
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalUngroupedWords: ungroupedWords.length,
        wordsAssigned: assignments.length,
        newGroupsCreated: createdGroupNames,
        assignments,
      },
    });
  } catch (error) {
    console.error('Auto-organize error:', error);
    return NextResponse.json({ error: 'Failed to organize words' }, { status: 500 });
  }
}
