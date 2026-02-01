import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    server: {
      DATABASE_URL: z.string().min(1),
      DIRECT_URL: z.string().min(1),
    },
    runtimeEnv: {
      DATABASE_URL: process.env.DATABASE_URL,
      DIRECT_URL: process.env.DIRECT_URL,
    },
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  });
