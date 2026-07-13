import "@tanstack/react-start/server-only";
import { createHash } from "node:crypto";

import { getWeeklyUsageWindow, type UsageResponse } from "#/lib/usage/types";

export function maskUsageEmail(email: string | null | undefined) {
  if (!email) {
    return null;
  }

  const [name, domain] = email.split("@");
  if (!(name && domain)) {
    return null;
  }

  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(name.length - visible.length, 2))}@${domain}`;
}

export function hashAccount(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return createHash("sha256").update(value).digest("hex");
}

export function toSnapshotInsert(
  usage: UsageResponse,
  eventType: "baseline" | "no_change" | "reset",
) {
  const trackedWindow = getWeeklyUsageWindow(usage);

  return {
    eventType,
    secondaryResetAt: trackedWindow.reset_at,
    primaryResetAt: usage.rate_limit.primary_window?.reset_at ?? null,
    requestedAt: Math.floor(Date.now() / 1000),
    accountHash: hashAccount(usage.account_id ?? usage.user_id),
    accountEmailMasked: maskUsageEmail(usage.email),
    planType: usage.plan_type ?? null,
    rawJson: JSON.stringify(usage),
  };
}
