import "@tanstack/react-start/server-only";
import { desc, eq } from "drizzle-orm";

import { db } from "#/lib/db";
import { jobRuns, subscribers, usageSnapshots } from "#/lib/db/schema";
import { sendResetEmails, sendUsageCheckFailureNotice } from "#/lib/email/send.server";
import { logger } from "#/lib/logger.server";
import { fetchUsage } from "#/lib/usage/fetch.server";
import { toSnapshotInsert } from "#/lib/usage/normalize.server";
import { getWeeklyUsageWindow, WEEKLY_WINDOW_SECONDS } from "#/lib/usage/types";

export async function checkUsageReset() {
  const startedAt = Math.floor(Date.now() / 1000);
  logger.info("usage_check.started", { startedAt });

  try {
    const usage = await fetchUsage();
    const trackedWindow = getWeeklyUsageWindow(usage);
    const observedSecondaryResetAt = trackedWindow.reset_at;
    logger.info("usage_check.usage_fetched", { observedSecondaryResetAt });

    const latestSnapshot = await db.query.usageSnapshots.findFirst({
      orderBy: desc(usageSnapshots.secondaryResetAt),
    });
    logger.info("usage_check.latest_snapshot_loaded", {
      latestSecondaryResetAt: latestSnapshot?.secondaryResetAt,
    });

    if (!latestSnapshot) {
      const [snapshot] = await db
        .insert(usageSnapshots)
        .values(toSnapshotInsert(usage, "baseline"))
        .returning();
      logger.info("usage_check.baseline_recorded", {
        observedSecondaryResetAt,
        snapshotId: snapshot.id,
      });

      const [jobRun] = await db
        .insert(jobRuns)
        .values({
          completedAt: Math.floor(Date.now() / 1000),
          message: "Initial baseline recorded; notification skipped.",
          observedSecondaryResetAt,
          snapshotId: snapshot.id,
          startedAt,
          status: "baseline",
          triggeredReset: false,
        })
        .returning();

      return { jobRun, snapshot, status: "baseline" };
    }

    const secondaryWindowSeconds = trackedWindow.limit_window_seconds ?? WEEKLY_WINDOW_SECONDS;
    const secondaryResetMovement = observedSecondaryResetAt - latestSnapshot.secondaryResetAt;
    const isUnexpectedReset =
      secondaryResetMovement > 60 * 60 && secondaryResetMovement < secondaryWindowSeconds;

    if (!isUnexpectedReset) {
      const [snapshot] = await db
        .insert(usageSnapshots)
        .values(toSnapshotInsert(usage, "no_change"))
        .returning();
      logger.info("usage_check.no_reset_detected", {
        latestSecondaryResetAt: latestSnapshot.secondaryResetAt,
        observedSecondaryResetAt,
        secondaryResetMovement,
        secondaryWindowSeconds,
        snapshotId: snapshot.id,
      });
      const [jobRun] = await db
        .insert(jobRuns)
        .values({
          completedAt: Math.floor(Date.now() / 1000),
          message: "No unexpected secondary reset detected.",
          observedSecondaryResetAt,
          snapshotId: snapshot.id,
          startedAt,
          status: "no_change",
          triggeredReset: false,
        })
        .returning();

      return { jobRun, snapshot, status: "no_change" };
    }

    const [snapshot] = await db
      .insert(usageSnapshots)
      .values(toSnapshotInsert(usage, "reset"))
      .returning();
    logger.info("usage_check.reset_recorded", {
      observedSecondaryResetAt,
      secondaryResetMovement,
      secondaryWindowSeconds,
      snapshotId: snapshot.id,
    });

    const activeSubscribers = await db.query.subscribers.findMany({
      where: eq(subscribers.status, "active"),
    });
    logger.info("usage_check.active_subscribers_loaded", {
      activeSubscriberCount: activeSubscribers.length,
    });

    const emailSummary = await sendResetEmails(
      activeSubscribers.map((subscriber) => ({
        email: subscriber.email,
        locale: subscriber.locale,
        subscriberId: subscriber.id,
        unsubscribeToken: subscriber.unsubscribeToken,
      })),
      snapshot,
    );
    logger.info("usage_check.email_summary", {
      attempted: emailSummary.attempted,
      failed: emailSummary.failed,
      sent: emailSummary.sent,
      skipped: emailSummary.skipped,
    });

    const [jobRun] = await db
      .insert(jobRuns)
      .values({
        completedAt: Math.floor(Date.now() / 1000),
        error: emailSummary.errors.join("\n") || null,
        message: `Reset recorded. Email sent: ${emailSummary.sent}/${emailSummary.attempted}.`,
        observedSecondaryResetAt,
        snapshotId: snapshot.id,
        startedAt,
        status: "reset",
        triggeredReset: true,
      })
      .returning();

    return { emailSummary, jobRun, snapshot, status: "reset" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("usage_check.failed", { error: message });
    const failureNotice = await sendUsageCheckFailureNotice(message, startedAt).catch(
      (noticeError: unknown) => {
        const noticeMessage =
          noticeError instanceof Error ? noticeError.message : String(noticeError);
        logger.error("usage_check.failure_notice_error", { error: noticeMessage });
        return {
          error: noticeMessage,
          sent: false,
          skipped: false,
        };
      },
    );
    const [jobRun] = await db
      .insert(jobRuns)
      .values({
        completedAt: Math.floor(Date.now() / 1000),
        error: message,
        message: failureNotice.sent
          ? "Usage check failed. Failure notice sent."
          : "Usage check failed. Failure notice not sent.",
        startedAt,
        status: "error",
        triggeredReset: false,
      })
      .returning();

    return { error: message, failureNotice, jobRun, snapshot: null, status: "error" };
  }
}
