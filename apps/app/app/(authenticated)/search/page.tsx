import { currentUser } from "@repo/auth/server";
import { database } from "@repo/database";
import { notFound, redirect } from "next/navigation";
import { Header } from "../components/header";

type SearchPageProperties = {
  searchParams: Promise<{
    q: string;
  }>;
};

export const generateMetadata = async ({
  searchParams,
}: SearchPageProperties) => {
  const { q } = await searchParams;

  return {
    title: `${q} - Search results`,
    description: `Search results for ${q}`,
  };
};

const SearchPage = async ({ searchParams }: SearchPageProperties) => {
  const user = await currentUser();

  if (!user) {
    notFound();
  }

  const { q } = await searchParams;

  if (!q) {
    redirect("/");
  }

  const words = await database.word.findMany({
    where: {
      userId: user.id,
      OR: [
        {
          english: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          spanish: {
            contains: q,
            mode: 'insensitive',
          },
        },
      ],
    },
    take: 50,
  });

  return (
    <>
      <Header page="Search" pages={["Vocabulary"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          {words.map((word) => (
            <div className="aspect-video rounded-xl bg-muted/50 p-4" key={word.id}>
              <div className="font-semibold">{word.english}</div>
              <div className="text-muted-foreground">{word.spanish}</div>
            </div>
          ))}
        </div>
        {words.length === 0 && (
          <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
            No words found matching "{q}"
          </div>
        )}
      </div>
    </>
  );
};

export default SearchPage;
