import "@tanstack/react-start/server-only";
import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "#/lib/db";
import { subscribers } from "#/lib/db/schema";
import type { Locale } from "#/lib/i18n/routing";
import { logger, maskEmail } from "#/lib/logger.server";

export async function createOrReactivateSubscriber(email: string, locale: Locale) {
  const normalizedEmail = email.trim().toLowerCase();
  logger.info("subscriber.upsert_started", {
    email: maskEmail(normalizedEmail),
    locale,
  });
  const existing = await db.query.subscribers.findFirst({
    where: eq(subscribers.email, normalizedEmail),
  });

  if (existing?.status === "active") {
    logger.info("subscriber.duplicate", {
      email: maskEmail(normalizedEmail),
      subscriberId: existing.id,
    });
    return { status: "duplicate" };
  }

  if (existing) {
    await db
      .update(subscribers)
      .set({
        locale,
        status: "active",
        unsubscribedAt: null,
        unsubscribeToken: randomBytes(24).toString("hex"),
      })
      .where(eq(subscribers.id, existing.id));
    logger.info("subscriber.reactivated", {
      email: maskEmail(normalizedEmail),
      locale,
      subscriberId: existing.id,
    });
    return { status: "reactivated" };
  }

  await db.insert(subscribers).values({
    email: normalizedEmail,
    locale,
    unsubscribeToken: randomBytes(24).toString("hex"),
  });
  logger.info("subscriber.created", {
    email: maskEmail(normalizedEmail),
    locale,
  });

  return { status: "created" };
}

export async function unsubscribeByToken(token: string) {
  logger.info("subscriber.unsubscribe_started", {
    hasToken: token.length > 0,
  });
  const existing = await db.query.subscribers.findFirst({
    where: eq(subscribers.unsubscribeToken, token),
  });

  if (!existing) {
    logger.warn("subscriber.unsubscribe_invalid_token");
    return false;
  }
  if (existing.status === "unsubscribed") {
    logger.info("subscriber.unsubscribe_already_inactive", {
      subscriberId: existing.id,
    });
    return false;
  }

  await db
    .update(subscribers)
    .set({
      status: "unsubscribed",
      unsubscribedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(subscribers.id, existing.id));
  logger.info("subscriber.unsubscribed", {
    subscriberId: existing.id,
  });

  return true;
}
