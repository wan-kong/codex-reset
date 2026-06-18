// Runtime SQLite migration runner for deployment (Docker entrypoint).
// Uses drizzle-orm's built-in migrator so it only needs production deps
// (better-sqlite3 + drizzle-orm), not drizzle-kit.
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const fileProtocolPattern = /^file:/;

const configured = process.env.DATABASE_URL ?? process.env.SQLITE_PATH;
const rawPath = configured?.replace(fileProtocolPattern, "") || "data/codex-reset-record.sqlite";
const dbPath = resolve(process.cwd(), rawPath);
const migrationsFolder = resolve(process.cwd(), "drizzle");

mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);
migrate(db, { migrationsFolder });
sqlite.close();

console.log(`[migrate] applied migrations from ${migrationsFolder} -> ${dbPath}`);
