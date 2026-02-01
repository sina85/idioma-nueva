import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// User email to associate data with
const USER_EMAIL = "cna80naeemi@gmail.com";

interface WordInput {
  english: string;
  spanish: string;
}

async function main() {
  // Get words from command line argument
  const wordsArg = process.argv[2];
  if (!wordsArg) {
    console.error("Usage: npx tsx bulk-import.ts '[{\"english\":\"hello\",\"spanish\":\"hola\"},...]'");
    process.exit(1);
  }

  let words: WordInput[];
  try {
    words = JSON.parse(wordsArg);
  } catch {
    console.error("Invalid JSON. Expected array of {english, spanish} objects.");
    process.exit(1);
  }

  if (!Array.isArray(words) || words.length === 0) {
    console.error("Expected non-empty array of words.");
    process.exit(1);
  }

  // Validate structure
  for (const word of words) {
    if (!word.english || !word.spanish) {
      console.error(`Invalid word entry: ${JSON.stringify(word)}`);
      process.exit(1);
    }
  }

  // Create Prisma client
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Find user by email
    console.log(`Looking up user: ${USER_EMAIL}...`);
    const user = await prisma.user.findUnique({
      where: { email: USER_EMAIL },
    });

    if (!user) {
      console.error(`User not found: ${USER_EMAIL}`);
      process.exit(1);
    }

    console.log(`Found user with ID: ${user.id}`);
    console.log(`Importing ${words.length} words...`);

    // Insert words
    let inserted = 0;
    let skipped = 0;

    for (const word of words) {
      // Check if word already exists (by english OR spanish + userId)
      const existingByEnglish = await prisma.word.findFirst({
        where: {
          english: word.english.trim(),
          userId: user.id,
        },
      });

      if (existingByEnglish) {
        console.log(`  Skipped (english exists): "${word.english}"`);
        skipped++;
        continue;
      }

      const existingBySpanish = await prisma.word.findFirst({
        where: {
          spanish: word.spanish.trim(),
          userId: user.id,
        },
      });

      if (existingBySpanish) {
        console.log(`  Skipped (spanish exists): "${word.spanish}"`);
        skipped++;
        continue;
      }

      await prisma.word.create({
        data: {
          id: crypto.randomUUID(),
          english: word.english.trim(),
          spanish: word.spanish.trim(),
          userId: user.id,
        },
      });
      console.log(`  Added: "${word.english}" -> "${word.spanish}"`);
      inserted++;
    }

    console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}`);
  } catch (error) {
    console.error("Error during import:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
