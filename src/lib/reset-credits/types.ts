import { z } from "zod";

export const resetCreditSchema = z.object({
  id: z.string().min(1),
  reset_type: z.string().min(1),
  is_supported_by_plan: z.boolean(),
  status: z.string().min(1),
  granted_at: z.iso.datetime({ offset: true }),
  expires_at: z.iso.datetime({ offset: true }),
  redeem_started_at: z.iso.datetime({ offset: true }).nullable(),
  redeemed_at: z.iso.datetime({ offset: true }).nullable(),
  profile_image_url: z.url().nullable(),
  profile_user_id: z.string().nullable(),
  title: z.string(),
  description: z.string(),
});

export const resetCreditsResponseSchema = z.object({
  credits: z.array(resetCreditSchema),
  available_count: z.number().int().nonnegative(),
  total_earned_count: z.number().int().nonnegative(),
  immediate_reset_purchase_eligible: z.boolean(),
  history_enabled: z.boolean(),
});

export type ResetCreditResponseItem = z.infer<typeof resetCreditSchema>;
export type ResetCreditsResponse = z.infer<typeof resetCreditsResponseSchema>;
