import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const moas = pgTable(
  "moas",
  {
    moaId: uuid("moa_id").primaryKey().defaultRandom(),
    partnerName: varchar("partner_name", { length: 255 }).notNull(),
    partnerType: varchar("partner_type", { length: 100 }).notNull(),
    storagePath: varchar("storage_path", { length: 500 }),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
    isExpired: boolean("is_expired").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => ({
    validUntilIdx: index("moas_valid_until_idx").on(table.validUntil),
    activeIdx: index("moas_active_idx")
      .on(table.validUntil)
      .where(sql`${table.archivedAt} IS NULL`),
    notExpiredIdx: index("moas_not_expired_idx")
      .on(table.isExpired)
      .where(sql`${table.archivedAt} IS NULL`),
  }),
);
