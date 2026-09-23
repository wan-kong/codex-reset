import "@tanstack/react-start/server-only";
import type { ResetCreditResponseItem } from "#/lib/reset-credits/types";

function toUnixTime(value: string | null) {
  return value ? Math.floor(new Date(value).getTime() / 1000) : null;
}

export function toResetCreditInsert(
  credit: ResetCreditResponseItem,
  eventType: "baseline" | "new_credit",
  detectedAt: number,
) {
  return {
    creditId: credit.id,
    eventType,
    resetType: credit.reset_type,
    isSupportedByPlan: credit.is_supported_by_plan,
    status: credit.status,
    grantedAt: toUnixTime(credit.granted_at) ?? detectedAt,
    expiresAt: toUnixTime(credit.expires_at) ?? detectedAt,
    redeemStartedAt: toUnixTime(credit.redeem_started_at),
    redeemedAt: toUnixTime(credit.redeemed_at),
    profileImageUrl: credit.profile_image_url,
    profileUserId: credit.profile_user_id,
    title: credit.title,
    description: credit.description,
    detectedAt,
    rawJson: JSON.stringify(credit),
  };
}
