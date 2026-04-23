import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const systemSettings = pgTable("system_settings", {
  settingKey: varchar("setting_key", { length: 100 }).primaryKey(),
  settingValue: text("setting_value"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
