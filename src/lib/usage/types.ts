import { z } from "zod";

export const WEEKLY_WINDOW_SECONDS = 7 * 24 * 60 * 60;

const usageWindowSchema = z.object({
  used_percent: z.number().optional().nullable(),
  limit_window_seconds: z.number().optional().nullable(),
  reset_after_seconds: z.number().optional().nullable(),
  reset_at: z.number(),
});

export const usageResponseSchema = z.object({
  user_id: z.string().optional().nullable(),
  account_id: z.string().optional().nullable(),
  email: z.email().optional().nullable(),
  plan_type: z.string().optional().nullable(),
  rate_limit: z.object({
    allowed: z.boolean().optional().nullable(),
    limit_reached: z.boolean().optional().nullable(),
    primary_window: usageWindowSchema.optional().nullable(),
    secondary_window: usageWindowSchema.optional().nullable(),
  }),
});

export type UsageResponse = z.infer<typeof usageResponseSchema>;

export function getWeeklyUsageWindow(usage: UsageResponse) {
  const { primary_window: primaryWindow, secondary_window: secondaryWindow } = usage.rate_limit;
  const window = [primaryWindow, secondaryWindow].find(
    (candidate) => candidate?.limit_window_seconds === WEEKLY_WINDOW_SECONDS,
  );
  const fallbackWindow = secondaryWindow ?? primaryWindow;

  if (window) {
    return window;
  }

  if (!fallbackWindow) {
    throw new Error("Usage response does not contain a rate-limit window");
  }

  return fallbackWindow;
}
