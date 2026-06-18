import "@tanstack/react-start/server-only";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "#/lib/db/schema";

const fileProtocolPattern = /^file:/;

const globalForDb = globalThis as typeof globalThis & {
  sqlite?: Database.Database;
};

function getDatabasePath() {
  const configured = process.env.DATABASE_URL ?? process.env.SQLITE_PATH;
  const fallback = "data/codex-reset-record.sqlite";
  const rawPath = configured?.replace(fileProtocolPattern, "") || fallback;
  return resolve(process.cwd(), rawPath);
}

function createSqliteConnection() {
  const path = getDatabasePath();
  mkdirSync(dirname(path), { recursive: true });

  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return sqlite;
}

const sqlite = globalForDb.sqlite ?? createSqliteConnection();

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
export { sqlite };
