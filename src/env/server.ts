import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().optional(),
    SQLITE_PATH: z.string().optional(),
    VITE_BASE_URL: z.url().default("http://localhost:3000"),
    CRON_SECRET: z.string().optional(),
    CHATGPT_USAGE_AUTHORIZATION: z.string().optional(),
    CHATGPT_USAGE_ENDPOINT: z.url().default("https://chatgpt.com"),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    LOG_LEVEL: z.string().default("info"),
    LOG_DIR: z.string().default("logs"),
  },
  runtimeEnv: process.env,
});
