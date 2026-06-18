import { z } from "zod";

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
    secondary_window: usageWindowSchema,
  }),
});

export type UsageResponse = z.infer<typeof usageResponseSchema>;
