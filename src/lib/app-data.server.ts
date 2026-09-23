import "@tanstack/react-start/server-only";
import { count, desc, eq } from "drizzle-orm";

import { db } from "#/lib/db";
import { jobRuns, resetCredits, subscribers } from "#/lib/db/schema";

export async function getHomeData() {
  const [activeSubscribers] = await db
    .select({ value: count() })
    .from(subscribers)
    .where(eq(subscribers.status, "active"));

  const [resetCount] = await db
    .select({ value: count() })
    .from(resetCredits)
    .where(eq(resetCredits.eventType, "new_credit"));

  const latestReset = await db.query.resetCredits.findFirst({
    orderBy: desc(resetCredits.grantedAt),
    where: eq(resetCredits.eventType, "new_credit"),
  });

  const latestJob = await db.query.jobRuns.findFirst({
    orderBy: desc(jobRuns.startedAt),
  });

  const history = await db.query.resetCredits.findMany({
    orderBy: desc(resetCredits.detectedAt),
    limit: 30,
  });

  const detections = await db.query.resetCredits.findMany({
    where: eq(resetCredits.eventType, "new_credit"),
    orderBy: desc(resetCredits.grantedAt),
    limit: 3,
  });

  return {
    detections,
    history,
    latestJob,
    latestReset,
    resetCount: resetCount?.value ?? 0,
    subscriberCount: activeSubscribers?.value ?? 0,
  };
}
