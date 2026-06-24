import { sql } from "drizzle-orm";
import {
	check,
	index,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { partners } from "./partners.js";

export const moas = pgTable(
	"moas",
	{
		moaId: uuid("moa_id").primaryKey().defaultRandom(),
		partnerId: uuid("partner_id")
			.notNull()
			.references(() => partners.partnerId),
		storagePath: varchar("storage_path", { length: 500 }),
		validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
		validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
	},
	(table) => ({
		partnerIdx: index("moas_partner_id_idx").on(table.partnerId),
		activeIdx: index("moas_active_idx")
			.on(table.validUntil)
			.where(sql`${table.archivedAt} IS NULL`),
		validPeriodCheck: check(
			"moas_valid_period_check",
			sql`(${table.validFrom} IS NULL OR ${table.validUntil} IS NULL OR ${table.validFrom} < ${table.validUntil})`,
		),
	}),
);
