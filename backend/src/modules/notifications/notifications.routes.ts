import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import { notifications } from "@/db/schema/notifications.js";
import { ApiError, installApiErrorHandler } from "@/lib/errors.js";
import { ErrorSchema } from "@/lib/schemas.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

// ── Schemas ──

const NotificationSchema = z
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

// ── All routes require authentication ──
app.use("/notifications", authMiddleware);
app.use("/notifications/*", authMiddleware);

// ── GET /notifications ──
const listNotificationsRoute = createRoute({
	method: "get",
	path: "/notifications",
	tags: ["Notifications"],
	summary: "Get current user's notifications",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.array(NotificationSchema),
				},
			},
			description: "List of notifications",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
	},
});

app.openapi(listNotificationsRoute, async (c) => {
	const user = c.get("user");

	const rows = await db
		.select()
		.from(notifications)
		.where(eq(notifications.recipientId, user.userId))
		.orderBy(desc(notifications.createdAt))
		.limit(20);

	return c.json(
		rows.map((r) => ({
			...r,
			createdAt: r.createdAt.toISOString(),
			readAt: r.readAt?.toISOString() ?? null,
		})),
		200,
	);
});

// ── GET /notifications/unread-count ──
const unreadCountRoute = createRoute({
	method: "get",
	path: "/notifications/unread-count",
	tags: ["Notifications"],
	summary: "Get unread notification count",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({ count: z.number() }),
				},
			},
			description: "Unread count",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
	},
});

app.openapi(unreadCountRoute, async (c) => {
	const user = c.get("user");

	const [result] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(notifications)
		.where(
			and(
				eq(notifications.recipientId, user.userId),
				eq(notifications.isRead, false),
			),
		);

	return c.json({ count: result?.count ?? 0 }, 200);
});

// ── PATCH /notifications/:id/read ──
const markReadRoute = createRoute({
	method: "patch",
	path: "/notifications/{id}/read",
	tags: ["Notifications"],
	summary: "Mark a notification as read",
	security: [{ Bearer: [] }],
	request: {
		params: z.object({
			id: z.string().uuid(),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({ ok: z.literal(true) }),
				},
			},
			description: "Notification marked as read",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Notification not found",
		},
	},
});

app.openapi(markReadRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");

	const [updated] = await db
		.update(notifications)
		.set({ isRead: true, readAt: new Date() })
		.where(
			and(
				eq(notifications.notificationId, id),
				eq(notifications.recipientId, user.userId),
			),
		)
		.returning();

	if (!updated) {
		throw new ApiError(404, "NOT_FOUND", "Notification not found");
	}

	return c.json({ ok: true as const }, 200);
});

// ── POST /notifications/read-all ──
const markAllReadRoute = createRoute({
	method: "post",
	path: "/notifications/read-all",
	tags: ["Notifications"],
	summary: "Mark all notifications as read for the current user",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({ ok: z.literal(true) }),
				},
			},
			description: "All notifications marked as read",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
	},
});

app.openapi(markAllReadRoute, async (c) => {
	const user = c.get("user");

	await db
		.update(notifications)
		.set({ isRead: true, readAt: new Date() })
		.where(
			and(
				eq(notifications.recipientId, user.userId),
				eq(notifications.isRead, false),
			),
		);

	return c.json({ ok: true as const }, 200);
});

export default app;
