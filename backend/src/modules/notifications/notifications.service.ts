import type { z } from "@hono/zod-openapi";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import { notifications } from "@/db/schema/notifications.js";
import { ApiError } from "@/lib/errors.js";
import type { NotificationSchema } from "./notifications.schema.js";

type Notification = z.infer<typeof NotificationSchema>;

export async function listNotifications(
	userId: string,
): Promise<Notification[]> {
	const rows = await db
		.select()
		.from(notifications)
		.where(eq(notifications.recipientId, userId))
		.orderBy(desc(notifications.createdAt))
		.limit(20);

	return rows.map((r) => ({
		...r,
		createdAt: r.createdAt.toISOString(),
		readAt: r.readAt?.toISOString() ?? null,
	}));
}

export async function getUnreadNotificationCount(
	userId: string,
): Promise<number> {
	const [result] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(notifications)
		.where(
			and(
				eq(notifications.recipientId, userId),
				eq(notifications.isRead, false),
			),
		);

	return result?.count ?? 0;
}

export async function markNotificationRead(
	userId: string,
	id: string,
): Promise<void> {
	const [updated] = await db
		.update(notifications)
		.set({ isRead: true, readAt: new Date() })
		.where(
			and(
				eq(notifications.notificationId, id),
				eq(notifications.recipientId, userId),
			),
		)
		.returning();

	if (!updated) {
		throw new ApiError(404, "NOT_FOUND", "Notification not found");
	}
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
	await db
		.update(notifications)
		.set({ isRead: true, readAt: new Date() })
		.where(
			and(
				eq(notifications.recipientId, userId),
				eq(notifications.isRead, false),
			),
		);
}
