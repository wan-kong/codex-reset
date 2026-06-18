import "@tanstack/react-start/server-only";
import { render } from "emailmd";
import { Resend } from "resend";

import { env } from "#/env/server";
import { db } from "#/lib/db";
import type { UsageSnapshot } from "#/lib/db/schema";
import { emailDeliveries } from "#/lib/db/schema";
import { resetEmailMarkdown, resetEmailSubject } from "#/lib/email/templates";
import type { Locale } from "#/lib/i18n/routing";
import { logger, maskEmail } from "#/lib/logger.server";

interface Recipient {
  email: string;
  locale: Locale;
  subscriberId: number;
  unsubscribeToken: string;
}

export interface EmailSendSummary {
  attempted: number;
  errors: string[];
  failed: number;
  sent: number;
  skipped: boolean;
}

function getAppBaseUrl() {
  return env.VITE_BASE_URL.replace(/\/$/, "");
}

function createUnsubscribeUrl(appUrl: string, token: string, locale: Locale) {
  const unsubscribeUrl = new URL(`/${locale}/unsubscribe`, appUrl);
  unsubscribeUrl.searchParams.set("token", token);
  return unsubscribeUrl.toString();
}

export async function sendResetEmails(
  recipients: Recipient[],
  snapshot: UsageSnapshot,
): Promise<EmailSendSummary> {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  logger.info("email_send.started", {
    recipientCount: recipients.length,
    snapshotId: snapshot.id,
  });

  if (!(apiKey && from)) {
    logger.warn("email_send.skipped_missing_config", {
      recipientCount: recipients.length,
      snapshotId: snapshot.id,
    });
    if (recipients.length > 0) {
      const skippedDeliveries: (typeof emailDeliveries.$inferInsert)[] = recipients.map(
        (recipient) => ({
          email: recipient.email,
          error: "RESEND_API_KEY and EMAIL_FROM are required to send email",
          locale: recipient.locale,
          snapshotId: snapshot.id,
          status: "skipped",
          subscriberId: recipient.subscriberId,
        }),
      );
      await db.insert(emailDeliveries).values(skippedDeliveries);
    }

    return {
      attempted: recipients.length,
      errors: ["RESEND_API_KEY and EMAIL_FROM are required to send email"],
      failed: recipients.length,
      sent: 0,
      skipped: true,
    };
  }

  const resend = new Resend(apiKey);
  const appUrl = getAppBaseUrl();
  const summary: EmailSendSummary = {
    attempted: recipients.length,
    errors: [],
    failed: 0,
    sent: 0,
    skipped: false,
  };

  for (const recipient of recipients) {
    try {
      const maskedEmail = maskEmail(recipient.email);
      logger.info("email_send.recipient_started", {
        email: maskedEmail,
        locale: recipient.locale,
        snapshotId: snapshot.id,
        subscriberId: recipient.subscriberId,
      });
      const unsubscribeUrl = createUnsubscribeUrl(
        appUrl,
        recipient.unsubscribeToken,
        recipient.locale,
      );
      const { html, text } = await render(
        resetEmailMarkdown({
          appUrl,
          locale: recipient.locale,
          snapshot,
          unsubscribeUrl,
        }),
      );

      const result = await resend.emails.send({
        from,
        html,
        subject: resetEmailSubject(recipient.locale),
        text,
        to: recipient.email,
      });

      if (result.error) {
        logger.warn("email_send.recipient_failed", {
          email: maskedEmail,
          error: result.error.message,
          snapshotId: snapshot.id,
          subscriberId: recipient.subscriberId,
        });
        await db.insert(emailDeliveries).values({
          email: recipient.email,
          error: result.error.message,
          locale: recipient.locale,
          snapshotId: snapshot.id,
          status: "failed",
          subscriberId: recipient.subscriberId,
        });

        summary.failed += 1;
        summary.errors.push(`${recipient.email}: ${result.error.message}`);
        continue;
      }

      await db.insert(emailDeliveries).values({
        email: recipient.email,
        locale: recipient.locale,
        providerMessageId: result.data?.id ?? null,
        snapshotId: snapshot.id,
        status: "sent",
        subscriberId: recipient.subscriberId,
      });

      summary.sent += 1;
      logger.info("email_send.recipient_sent", {
        email: maskedEmail,
        providerMessageId: result.data?.id ?? null,
        snapshotId: snapshot.id,
        subscriberId: recipient.subscriberId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("email_send.recipient_error", {
        email: maskEmail(recipient.email),
        error: message,
        snapshotId: snapshot.id,
        subscriberId: recipient.subscriberId,
      });
      await db.insert(emailDeliveries).values({
        email: recipient.email,
        error: message,
        locale: recipient.locale,
        snapshotId: snapshot.id,
        status: "failed",
        subscriberId: recipient.subscriberId,
      });
      summary.failed += 1;
      summary.errors.push(`${recipient.email}: ${message}`);
    }
  }

  logger.info("email_send.completed", {
    attempted: summary.attempted,
    failed: summary.failed,
    sent: summary.sent,
    skipped: summary.skipped,
    snapshotId: snapshot.id,
  });

  return summary;
}
