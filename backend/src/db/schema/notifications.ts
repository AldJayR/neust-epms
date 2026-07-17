import {
	boolean,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const notifications = pgTable(
	"notifications",
	{
		notificationId: uuid("notification_id").primaryKey().defaultRandom(),
		recipientId: uuid("recipient_id")
			.notNull()
			.references(() => users.userId),
		type: text("type").notNull(),
		dedupeKey: text("dedupe_key"),
		title: text("title").notNull(),
		message: text("message").notNull(),
		isRead: boolean("is_read").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		readAt: timestamp("read_at", { withTimezone: true }),
	},
	(table) => ({
		recipientIdx: index("notifications_recipient_id_idx").on(table.recipientId),
		dedupeKeyUnique: uniqueIndex("notifications_dedupe_key_unique").on(
			table.dedupeKey,
		),
	}),
);
