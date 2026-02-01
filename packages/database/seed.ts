import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

// JSON file paths
const DATA_DIR = "/Users/cena/vocab-drill/data";
const WORDS_FILE = path.join(DATA_DIR, "words.json");
const GROUPS_FILE = path.join(DATA_DIR, "groups.json");
const STATS_FILE = path.join(DATA_DIR, "stats.json");

// User email to associate data with
const USER_EMAIL = "cna80naeemi@gmail.com";

interface WordJson {
  id: string;
  english: string;
  spanish: string;
  createdAt: string;
}

interface GroupJson {
  id: string;
  name: string;
  wordIds: string[];
}

interface WordStatJson {
  seen: number;
  correct: number;
  incorrect: number;
}

async function main() {
  // Create Prisma client
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Reading JSON files...");

    // Read JSON files
    const wordsData = JSON.parse(fs.readFileSync(WORDS_FILE, "utf-8"));
    const groupsData = JSON.parse(fs.readFileSync(GROUPS_FILE, "utf-8"));
    const statsData = JSON.parse(fs.readFileSync(STATS_FILE, "utf-8"));

    const words: WordJson[] = wordsData.words;
    const groups: GroupJson[] = groupsData.groups;
    const wordStats: Record<string, WordStatJson> = statsData.wordStats;

    console.log(`Found ${words.length} words, ${groups.length} groups, ${Object.keys(wordStats).length} stats`);

    // Find user by email
    console.log(`Looking up user: ${USER_EMAIL}...`);
    let user = await prisma.user.findUnique({
      where: { email: USER_EMAIL },
    });

    if (!user) {
      console.log("User not found, creating new user...");
      user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: USER_EMAIL,
          name: "Vocab User",
        },
      });
      console.log(`Created user with ID: ${user.id}`);
    } else {
      console.log(`Found user with ID: ${user.id}`);
    }

    const userId = user.id;

    // Clear existing data for this user (optional - comment out to append)
    console.log("Clearing existing data for user...");
    await prisma.wordStat.deleteMany({ where: { userId } });
    await prisma.groupWord.deleteMany({
      where: { group: { userId } },
    });
    await prisma.group.deleteMany({ where: { userId } });
    await prisma.word.deleteMany({ where: { userId } });

    // Insert words
    console.log("Inserting words...");
    for (const word of words) {
      await prisma.word.create({
        data: {
          id: word.id,
          english: word.english,
          spanish: word.spanish,
          createdAt: new Date(word.createdAt),
          userId,
        },
      });
    }
    console.log(`Inserted ${words.length} words`);

    // Insert groups
    console.log("Inserting groups...");
    for (const group of groups) {
      await prisma.group.create({
        data: {
          id: group.id,
          name: group.name,
          userId,
        },
      });
    }
    console.log(`Inserted ${groups.length} groups`);

    // Insert group-word relationships
    console.log("Inserting group-word relationships...");
    let relationCount = 0;
    for (const group of groups) {
      for (const wordId of group.wordIds) {
        // Check if word exists before creating relationship
        const wordExists = await prisma.word.findUnique({
          where: { id: wordId },
        });
        if (wordExists) {
          await prisma.groupWord.create({
            data: {
              groupId: group.id,
              wordId,
            },
          });
          relationCount++;
        } else {
          console.warn(`Warning: Word ${wordId} not found for group ${group.id}`);
        }
      }
    }
    console.log(`Inserted ${relationCount} group-word relationships`);

    // Insert word stats
    console.log("Inserting word stats...");
    let statsCount = 0;
    for (const [wordId, stat] of Object.entries(wordStats)) {
      // Check if word exists before creating stat
      const wordExists = await prisma.word.findUnique({
        where: { id: wordId },
      });
      if (wordExists) {
        await prisma.wordStat.create({
          data: {
            wordId,
            seen: stat.seen,
            correct: stat.correct,
            incorrect: stat.incorrect,
            userId,
          },
        });
        statsCount++;
      } else {
        console.warn(`Warning: Word ${wordId} not found for stats`);
      }
    }
    console.log(`Inserted ${statsCount} word stats`);

    console.log("\nSeed completed successfully!");
    console.log(`Summary:`);
    console.log(`  - User: ${userId}`);
    console.log(`  - Words: ${words.length}`);
    console.log(`  - Groups: ${groups.length}`);
    console.log(`  - Group-Word relations: ${relationCount}`);
    console.log(`  - Word stats: ${statsCount}`);
  } catch (error) {
    console.error("Error during seed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
