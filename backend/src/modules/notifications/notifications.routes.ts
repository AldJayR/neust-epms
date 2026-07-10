import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { ErrorSchema } from "@/lib/schemas.js";
import type { AuthEnv } from "@/middleware/auth.js";
import { authMiddleware } from "@/middleware/auth.js";
import {
	MarkReadParamsSchema,
	NotificationSchema,
	OkResponseSchema,
	UnreadCountSchema,
} from "./notifications.schema.js";
import {
	getUnreadNotificationCount,
	listNotifications,
	markAllNotificationsRead,
	markNotificationRead,
} from "./notifications.service.js";

const app = new OpenAPIHono<AuthEnv>();

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
	const result = await listNotifications(user.userId);
	return c.json(result, 200);
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
					schema: UnreadCountSchema,
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
	const count = await getUnreadNotificationCount(user.userId);
	return c.json({ count }, 200);
});

// ── PATCH /notifications/:id/read ──
const markReadRoute = createRoute({
	method: "patch",
	path: "/notifications/{id}/read",
	tags: ["Notifications"],
	summary: "Mark a notification as read",
	security: [{ Bearer: [] }],
	request: {
		params: MarkReadParamsSchema,
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: OkResponseSchema,
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
	await markNotificationRead(user.userId, id);
	return c.json({ ok: true as const }, 200);
});

// ── PATCH /notifications/read-all ──
const markAllReadRoute = createRoute({
	method: "patch",
	path: "/notifications/read-all",
	tags: ["Notifications"],
	summary: "Mark all notifications as read for the current user",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: {
				"application/json": {
					schema: OkResponseSchema,
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
	await markAllNotificationsRead(user.userId);
	return c.json({ ok: true as const }, 200);
});

export default app;
