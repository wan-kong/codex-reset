import "@tanstack/react-start/server-only";
import { eq, inArray } from "drizzle-orm";

import { db } from "#/lib/db";
import { creditMonitorState, jobRuns, resetCredits, subscribers } from "#/lib/db/schema";
import { sendResetEmails, sendUsageCheckFailureNotice } from "#/lib/email/send.server";
import { logger } from "#/lib/logger.server";
import { fetchResetCredits } from "#/lib/reset-credits/fetch.server";
import { toResetCreditInsert } from "#/lib/reset-credits/normalize.server";

const MONITOR_STATE_ID = 1;

async function updateMonitorState(lastCheckedAt: number, lastAvailableCount: number) {
  await db
    .insert(creditMonitorState)
    .values({ id: MONITOR_STATE_ID, lastAvailableCount, lastCheckedAt })
    .onConflictDoUpdate({
      target: creditMonitorState.id,
      set: { lastAvailableCount, lastCheckedAt },
    });
}

export async function checkResetCredits() {
  const startedAt = Math.floor(Date.now() / 1000);
  logger.info("reset_credit_check.started", { startedAt });

  try {
    const response = await fetchResetCredits();
    const monitorState = await db.query.creditMonitorState.findFirst({
      where: eq(creditMonitorState.id, MONITOR_STATE_ID),
    });

    if (!monitorState) {
      if (response.credits.length > 0) {
        await db
          .insert(resetCredits)
          .values(
            response.credits.map((credit) => toResetCreditInsert(credit, "baseline", startedAt)),
          )
          .onConflictDoNothing({ target: resetCredits.creditId });
      }
      await updateMonitorState(startedAt, response.available_count);

      const [jobRun] = await db
        .insert(jobRuns)
        .values({
          completedAt: Math.floor(Date.now() / 1000),
          message: `Initial reset-credit baseline recorded with ${response.credits.length} credit(s); notification skipped.`,
          observedAvailableCount: response.available_count,
          startedAt,
          status: "baseline",
          triggeredReset: false,
        })
        .returning();

      logger.info("reset_credit_check.baseline_recorded", {
        availableCount: response.available_count,
        creditCount: response.credits.length,
        jobRunId: jobRun.id,
      });
      return { jobRun, newCredits: [], status: "baseline" };
    }

    const observedIds = response.credits.map((credit) => credit.id);
    const knownCredits =
      observedIds.length > 0
        ? await db.query.resetCredits.findMany({
            columns: { creditId: true },
            where: inArray(resetCredits.creditId, observedIds),
          })
        : [];
    const knownIds = new Set(knownCredits.map((credit) => credit.creditId));
    const unseenCredits = response.credits.filter((credit) => !knownIds.has(credit.id));
    const insertedCredits =
      unseenCredits.length > 0
        ? await db
            .insert(resetCredits)
            .values(
              unseenCredits.map((credit) => toResetCreditInsert(credit, "new_credit", startedAt)),
            )
            .onConflictDoNothing({ target: resetCredits.creditId })
            .returning()
        : [];

    await updateMonitorState(startedAt, response.available_count);

    if (insertedCredits.length === 0) {
      const [jobRun] = await db
        .insert(jobRuns)
        .values({
          completedAt: Math.floor(Date.now() / 1000),
          message: "No new reset credit detected.",
          observedAvailableCount: response.available_count,
          startedAt,
          status: "no_change",
          triggeredReset: false,
        })
        .returning();

      logger.info("reset_credit_check.no_new_credit", {
        availableCount: response.available_count,
        creditCount: response.credits.length,
        jobRunId: jobRun.id,
      });
      return { jobRun, newCredits: [], status: "no_change" };
    }

    logger.info("reset_credit_check.new_credits_recorded", {
      availableCount: response.available_count,
      creditIds: insertedCredits.map((credit) => credit.creditId),
    });
    const activeSubscribers = await db.query.subscribers.findMany({
      where: eq(subscribers.status, "active"),
    });

    const emailSummaries = [];
    for (const credit of insertedCredits) {
      emailSummaries.push(
        await sendResetEmails(
          activeSubscribers.map((subscriber) => ({
            email: subscriber.email,
            locale: subscriber.locale,
            subscriberId: subscriber.id,
            unsubscribeToken: subscriber.unsubscribeToken,
          })),
          credit,
        ),
      );
    }
    const emailSummary = emailSummaries.reduce(
      (summary, current) => ({
        attempted: summary.attempted + current.attempted,
        errors: [...summary.errors, ...current.errors],
        failed: summary.failed + current.failed,
        sent: summary.sent + current.sent,
        skipped: summary.skipped || current.skipped,
      }),
      { attempted: 0, errors: [], failed: 0, sent: 0, skipped: false },
    );
    const newestCredit = insertedCredits.reduce((newest, credit) =>
      credit.grantedAt > newest.grantedAt ? credit : newest,
    );

    const [jobRun] = await db
      .insert(jobRuns)
      .values({
        completedAt: Math.floor(Date.now() / 1000),
        error: emailSummary.errors.join("\n") || null,
        message: `${insertedCredits.length} new reset credit(s) recorded. Email sent: ${emailSummary.sent}/${emailSummary.attempted}.`,
        observedAvailableCount: response.available_count,
        resetCreditId: newestCredit.id,
        startedAt,
        status: "reset",
        triggeredReset: true,
      })
      .returning();

    return { emailSummary, jobRun, newCredits: insertedCredits, status: "reset" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("reset_credit_check.failed", { error: message });
    const failureNotice = await sendUsageCheckFailureNotice(message, startedAt).catch(
      (noticeError: unknown) => {
        const noticeMessage =
          noticeError instanceof Error ? noticeError.message : String(noticeError);
        logger.error("reset_credit_check.failure_notice_error", { error: noticeMessage });
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
          ? "Reset credit check failed. Failure notice sent."
          : "Reset credit check failed. Failure notice not sent.",
        startedAt,
        status: "error",
        triggeredReset: false,
      })
      .returning();

    return { error: message, failureNotice, jobRun, newCredits: [], status: "error" };
  }
}
