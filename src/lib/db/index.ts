import "@tanstack/react-start/server-only";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "#/lib/db/schema";

export const db = drizzle(env.DB, { schema });
