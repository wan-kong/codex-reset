import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { normalizeLocale } from "#/lib/i18n/routing";
import { logger } from "#/lib/logger.server";
import { createOrReactivateSubscriber, unsubscribeByToken } from "#/lib/subscribers.server";

export interface SubscribeState {
  message?: string;
  status?: "success" | "duplicate" | "invalid" | "error";
}

const subscribeInputSchema = z.object({
  email: z.string().optional(),
  locale: z.unknown().optional(),
});

const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
});

export const $subscribe = createServerFn({ method: "POST" })
  .validator(subscribeInputSchema)
  .handler(async ({ data }): Promise<SubscribeState> => {
    const locale = normalizeLocale(data.locale);
    const parsed = subscribeSchema.safeParse({
      email: data.email,
    });

    if (!parsed.success) {
      logger.warn("subscribe_action.invalid_email", { locale });
      return { status: "invalid" };
    }

    try {
      const result = await createOrReactivateSubscriber(parsed.data.email, locale);

      if (result.status === "duplicate") {
        logger.info("subscribe_action.duplicate", { locale });
        return { status: "duplicate" };
      }

      logger.info("subscribe_action.completed", {
        locale,
        status: result.status,
      });
      return { status: "success" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("subscribe_action.failed", {
        error: message,
        locale,
      });
      return {
        message,
        status: "error",
      };
    }
  });

const unsubscribeInputSchema = z.object({
  token: z.string(),
});

export const $unsubscribe = createServerFn({ method: "POST" })
  .validator(unsubscribeInputSchema)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const ok = await unsubscribeByToken(data.token);
    logger.info("unsubscribe_action.completed", { success: ok });
    return { ok };
  });
