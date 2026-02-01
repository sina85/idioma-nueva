"use server";

import { currentUser } from "@repo/auth/server";
import { database } from "@repo/database";
import Fuse from "fuse.js";

export const searchUsers = async (
  query: string
): Promise<
  | {
      data: string[];
    }
  | {
      error: unknown;
    }
> => {
  try {
    const user = await currentUser();

    if (!user) {
      throw new Error("Not logged in");
    }

    const users = await database.user.findMany({
      take: 100,
    });

    const searchableUsers = users.map((user) => ({
      id: user.id,
      name: user.name ?? user.email,
    }));

    const fuse = new Fuse(searchableUsers, {
      keys: ["name"],
      minMatchCharLength: 1,
      threshold: 0.3,
    });

    const results = fuse.search(query);
    const data = results.map((result) => result.item.id);

    return { data };
  } catch (error) {
    return { error };
  }
};
