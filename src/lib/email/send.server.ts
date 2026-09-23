import "@tanstack/react-start/server-only";
import { render } from "emailmd";
import { Resend } from "resend";

import { env } from "#/env/server";
import { db } from "#/lib/db";
import type { ResetCredit } from "#/lib/db/schema";
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

export interface FailureNoticeSummary {
  error?: string;
  providerMessageId?: string | null;
  sent: boolean;
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

function formatNoticeTime(value: number) {
  return new Intl.DateTimeFormat("zh", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(value * 1000));
}

function failureNoticeMarkdown(error: string, startedAt: number, completedAt: number) {
  return `---
preheader: "Codex reset credit check failed"
theme: dark
---

::: header
# Codex Reset Monitor
:::

# Reset credit check failed

The scheduled reset credit check failed. This is often caused by an expired ChatGPT token.

| Field | Value |
| --- | --- |
| Started at | ${formatNoticeTime(startedAt)} |
| Failed at | ${formatNoticeTime(completedAt)} |
| Likely action | Refresh CHATGPT_USAGE_AUTHORIZATION |

\`\`\`
${error}
\`\`\`

::: footer
Codex Reset Monitor | [Open dashboard](${getAppBaseUrl()})
:::
`;
}

export async function sendUsageCheckFailureNotice(
  error: string,
  startedAt: number,
): Promise<FailureNoticeSummary> {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  const to = env.NOTICE_USER_MAIL?.trim();
  logger.info("usage_failure_notice.started", {
    hasRecipient: Boolean(to),
    startedAt,
  });

  if (!(apiKey && from && to)) {
    const configError = "RESEND_API_KEY, EMAIL_FROM and NOTICE_USER_MAIL are required";
    logger.warn("usage_failure_notice.skipped_missing_config", {
      hasApiKey: Boolean(apiKey),
      hasFrom: Boolean(from),
      hasRecipient: Boolean(to),
    });
    return { error: configError, sent: false, skipped: true };
  }

  const completedAt = Math.floor(Date.now() / 1000);
  const { html, text } = await render(failureNoticeMarkdown(error, startedAt, completedAt));
  const result = await new Resend(apiKey).emails.send({
    from,
    html,
    subject: "Codex usage check failed",
    text,
    to,
  });

  if (result.error) {
    logger.warn("usage_failure_notice.failed", {
      email: maskEmail(to),
      error: result.error.message,
    });
    return { error: result.error.message, sent: false, skipped: false };
  }

  logger.info("usage_failure_notice.sent", {
    email: maskEmail(to),
    providerMessageId: result.data?.id ?? null,
  });
  return {
    providerMessageId: result.data?.id ?? null,
    sent: true,
    skipped: false,
  };
}

export async function sendResetEmails(
  recipients: Recipient[],
  credit: ResetCredit,
): Promise<EmailSendSummary> {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  logger.info("email_send.started", {
    recipientCount: recipients.length,
    resetCreditId: credit.id,
  });

  if (!(apiKey && from)) {
    logger.warn("email_send.skipped_missing_config", {
      recipientCount: recipients.length,
      resetCreditId: credit.id,
    });
    if (recipients.length > 0) {
      const skippedDeliveries: (typeof emailDeliveries.$inferInsert)[] = recipients.map(
        (recipient) => ({
          email: recipient.email,
          error: "RESEND_API_KEY and EMAIL_FROM are required to send email",
          locale: recipient.locale,
          resetCreditId: credit.id,
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
        resetCreditId: credit.id,
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
          credit,
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
          resetCreditId: credit.id,
          subscriberId: recipient.subscriberId,
        });
        await db.insert(emailDeliveries).values({
          email: recipient.email,
          error: result.error.message,
          locale: recipient.locale,
          resetCreditId: credit.id,
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
        resetCreditId: credit.id,
        status: "sent",
        subscriberId: recipient.subscriberId,
      });

      summary.sent += 1;
      logger.info("email_send.recipient_sent", {
        email: maskedEmail,
        providerMessageId: result.data?.id ?? null,
        resetCreditId: credit.id,
        subscriberId: recipient.subscriberId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("email_send.recipient_error", {
        email: maskEmail(recipient.email),
        error: message,
        resetCreditId: credit.id,
        subscriberId: recipient.subscriberId,
      });
      await db.insert(emailDeliveries).values({
        email: recipient.email,
        error: message,
        locale: recipient.locale,
        resetCreditId: credit.id,
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
    resetCreditId: credit.id,
  });

  return summary;
}
