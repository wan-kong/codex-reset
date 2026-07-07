import { createEnv } from "@t3-oss/env-core";
import { env as workerEnv } from "cloudflare:workers";
import * as z from "zod";

const runtimeEnv = {
  VITE_BASE_URL: workerEnv.VITE_BASE_URL,
  CRON_SECRET: workerEnv.CRON_SECRET,
  CHATGPT_USAGE_AUTHORIZATION: workerEnv.CHATGPT_USAGE_AUTHORIZATION,
  CHATGPT_USAGE_ENDPOINT: workerEnv.CHATGPT_USAGE_ENDPOINT,
  RESEND_API_KEY: workerEnv.RESEND_API_KEY,
  EMAIL_FROM: workerEnv.EMAIL_FROM,
  LOG_LEVEL: workerEnv.LOG_LEVEL,
};

export const env = createEnv({
  server: {
    VITE_BASE_URL: z.url().default("http://localhost:3000"),
    CRON_SECRET: z.string().optional(),
    CHATGPT_USAGE_AUTHORIZATION: z.string().optional(),
    CHATGPT_USAGE_ENDPOINT: z.url().default("https://chatgpt.com"),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    LOG_LEVEL: z.string().default("info"),
  },
  runtimeEnv,
});
