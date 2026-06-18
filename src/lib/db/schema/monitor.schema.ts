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
    message: text("message"),
    error: text("error"),
  },
  (table) => [
    index("job_runs_started_at_idx").on(table.startedAt),
    index("job_runs_status_idx").on(table.status),
  ],
);

export const emailDeliveries = sqliteTable(
  "email_deliveries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    snapshotId: integer("snapshot_id")
      .notNull()
      .references(() => usageSnapshots.id),
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
  ],
);

export type UsageSnapshot = typeof usageSnapshots.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
export type JobRun = typeof jobRuns.$inferSelect;
export type EmailDelivery = typeof emailDeliveries.$inferSelect;
