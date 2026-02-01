import { defineConfig } from "prisma/config";
import { keys } from "./keys";
import "dotenv/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL for migrations (non-pooled connection)
    url: keys().DIRECT_URL,
  },
});
