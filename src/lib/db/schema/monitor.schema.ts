import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usageSnapshots = sqliteTable(
  "usage_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventType: text("event_type", {
      enum: ["baseline", "no_change", "reset"],
    })
      .notNull()
      .default("reset"),
    secondaryResetAt: integer("secondary_reset_at").notNull(),
    primaryResetAt: integer("primary_reset_at"),
    requestedAt: integer("requested_at").notNull(),
    accountHash: text("account_hash"),
    accountEmailMasked: text("account_email_masked"),
    planType: text("plan_type"),
    rawJson: text("raw_json").notNull(),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("usage_snapshots_secondary_reset_at_idx").on(table.secondaryResetAt),
    index("usage_snapshots_event_type_idx").on(table.eventType),
  ],
);

export const resetCredits = sqliteTable(
  "reset_credits",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    creditId: text("credit_id").notNull().unique(),
    eventType: text("event_type", { enum: ["baseline", "new_credit"] }).notNull(),
    resetType: text("reset_type").notNull(),
    isSupportedByPlan: integer("is_supported_by_plan", { mode: "boolean" }).notNull(),
    status: text("status").notNull(),
    grantedAt: integer("granted_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
    redeemStartedAt: integer("redeem_started_at"),
    redeemedAt: integer("redeemed_at"),
    profileImageUrl: text("profile_image_url"),
    profileUserId: text("profile_user_id"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    detectedAt: integer("detected_at").notNull(),
    rawJson: text("raw_json").notNull(),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("reset_credits_event_type_idx").on(table.eventType),
    index("reset_credits_granted_at_idx").on(table.grantedAt),
  ],
);

export const creditMonitorState = sqliteTable("credit_monitor_state", {
  id: integer("id").primaryKey(),
  lastCheckedAt: integer("last_checked_at").notNull(),
  lastAvailableCount: integer("last_available_count").notNull(),
});

export const subscribers = sqliteTable(
  "subscribers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull().unique(),
    locale: text("locale", { enum: ["zh", "en"] })
      .notNull()
      .default("zh"),
    status: text("status", { enum: ["active", "unsubscribed"] })
      .notNull()
      .default("active"),
    unsubscribeToken: text("unsubscribe_token").notNull().unique(),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch())`),
    unsubscribedAt: integer("unsubscribed_at"),
  },
  (table) => [
    index("subscribers_status_idx").on(table.status),
    index("subscribers_locale_idx").on(table.locale),
  ],
);

export const jobRuns = sqliteTable(
  "job_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    startedAt: integer("started_at").notNull(),
    completedAt: integer("completed_at"),
    status: text("status", {
      enum: ["success", "baseline", "no_change", "reset", "error"],
    }).notNull(),
    triggeredReset: integer("triggered_reset", { mode: "boolean" }).notNull().default(false),
    observedSecondaryResetAt: integer("observed_secondary_reset_at"),
    snapshotId: integer("snapshot_id").references(() => usageSnapshots.id),
    resetCreditId: integer("reset_credit_id").references(() => resetCredits.id),
    observedAvailableCount: integer("observed_available_count"),
    message: text("message"),
    error: text("error"),
  },
  (table) => [
    index("job_runs_started_at_idx").on(table.startedAt),
    index("job_runs_status_idx").on(table.status),
    index("job_runs_reset_credit_id_idx").on(table.resetCreditId),
  ],
);

export const emailDeliveries = sqliteTable(
  "email_deliveries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    snapshotId: integer("snapshot_id").references(() => usageSnapshots.id),
    resetCreditId: integer("reset_credit_id").references(() => resetCredits.id),
    subscriberId: integer("subscriber_id").references(() => subscribers.id),
    email: text("email").notNull(),
    locale: text("locale", { enum: ["zh", "en"] }).notNull(),
    status: text("status", { enum: ["sent", "failed", "skipped"] }).notNull(),
    provider: text("provider").notNull().default("resend"),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    attemptedAt: integer("attempted_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("email_deliveries_snapshot_id_idx").on(table.snapshotId),
    index("email_deliveries_subscriber_id_idx").on(table.subscriberId),
    index("email_deliveries_status_idx").on(table.status),
    index("email_deliveries_reset_credit_id_idx").on(table.resetCreditId),
  ],
);

export type UsageSnapshot = typeof usageSnapshots.$inferSelect;
export type ResetCredit = typeof resetCredits.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
export type JobRun = typeof jobRuns.$inferSelect;
export type EmailDelivery = typeof emailDeliveries.$inferSelect;
