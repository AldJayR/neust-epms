import { z } from "@hono/zod-openapi";

export const NotificationSchema = z
	.object({
		notificationId: z.string().uuid(),
		recipientId: z.string().uuid(),
		type: z.string(),
		title: z.string(),
		message: z.string(),
		isRead: z.boolean(),
		createdAt: z.string(),
		readAt: z.string().nullable(),
	})
	.openapi("Notification");

export const UnreadCountSchema = z.object({ count: z.number() });

export const MarkReadParamsSchema = z.object({
	id: z.string().uuid(),
});

export const OkResponseSchema = z.object({ ok: z.literal(true) });
