import type { Config } from "drizzle-kit";

const fileProtocolPattern = /^file:/;

export default {
  out: "./drizzle",
  schema: "./src/lib/db/schema/index.ts",
  breakpoints: true,
  verbose: true,
  strict: true,
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL?.replace(fileProtocolPattern, "") as string,
  },
} satisfies Config;
