import "@tanstack/react-start/server-only";
import { count, desc, eq } from "drizzle-orm";

import { db } from "#/lib/db";
import { jobRuns, subscribers, usageSnapshots } from "#/lib/db/schema";

export async function getHomeData() {
  const [activeSubscribers] = await db
    .select({ value: count() })
    .from(subscribers)
    .where(eq(subscribers.status, "active"));

  const [resetCount] = await db
    .select({ value: count() })
    .from(usageSnapshots)
    .where(eq(usageSnapshots.eventType, "reset"));

  const latestReset = await db.query.usageSnapshots.findFirst({
    orderBy: desc(usageSnapshots.secondaryResetAt),
    where: eq(usageSnapshots.eventType, "reset"),
  });

  const latestSnapshot = await db.query.usageSnapshots.findFirst({
    orderBy: desc(usageSnapshots.secondaryResetAt),
  });

  const latestJob = await db.query.jobRuns.findFirst({
    orderBy: desc(jobRuns.startedAt),
  });

  const history = await db.query.usageSnapshots.findMany({
    orderBy: desc(usageSnapshots.requestedAt),
    limit: 30,
  });

  const detections = await db.query.usageSnapshots.findMany({
    where: eq(usageSnapshots.eventType, "reset"),
    orderBy: desc(usageSnapshots.requestedAt),
    limit: 3,
  });

  return {
    detections,
    history,
    latestJob,
    latestReset,
    latestSnapshot,
    resetCount: resetCount?.value ?? 0,
    subscriberCount: activeSubscribers?.value ?? 0,
  };
}
