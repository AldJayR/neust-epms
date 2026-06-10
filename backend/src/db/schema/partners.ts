import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const partners = pgTable("partners", {
	partnerId: uuid("partner_id").primaryKey().defaultRandom(),
	partnerName: varchar("partner_name", { length: 255 }).notNull(),
	partnerType: varchar("partner_type", { length: 100 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
