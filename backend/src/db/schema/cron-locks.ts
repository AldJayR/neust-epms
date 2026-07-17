import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const cronLocks = pgTable("cron_locks", {
	jobName: text("job_name").primaryKey(),
	lockToken: uuid("lock_token").notNull(),
	lockedUntil: timestamp("locked_until", { withTimezone: true }).notNull(),
});
