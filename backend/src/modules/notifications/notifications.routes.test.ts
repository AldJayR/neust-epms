import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db/client.js";
import {
	setMockUser,
	MOCK_USERS,
	mockSelectChain,
	mockMutationChain,
} from "../../../test/helpers.js";
import baseApp from "./notifications.routes.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import { authMiddleware } from "@/middleware/auth.js";
import { installApiErrorHandler } from "@/lib/errors.js";

const app = new OpenAPIHono();
app.use("*", authMiddleware);
app.route("/", baseApp);
installApiErrorHandler(app);

beforeEach(() => {
	setMockUser(MOCK_USERS.faculty);
	vi.clearAllMocks();
});

describe("GET /notifications", () => {
	it("should return formatted dates for notifications", async () => {
		const now = new Date();
		const mock = [
			{
				notificationId: "11111111-1111-1111-1111-111111111111",
				recipientId: MOCK_USERS.faculty.userId,
				type: "info",
				title: "Test",
				message: "Hello",
				isRead: false,
				createdAt: now,
				readAt: null,
			},
		];
		vi.mocked(db.select).mockReturnValue(mockSelectChain(mock) as never);

		const res = await app.request("/notifications");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveLength(1);
		expect(body[0].createdAt).toBe(now.toISOString());
		expect(body[0].readAt).toBeNull();
	});

	it("should serialize populated readAt values", async () => {
		const now = new Date();
		const readAt = new Date();
		const mock = [
			{
				notificationId: "11111111-1111-1111-1111-111111111111",
				recipientId: MOCK_USERS.faculty.userId,
				type: "info",
				title: "Test",
				message: "Hello",
				isRead: true,
				createdAt: now,
				readAt,
			},
		];
		vi.mocked(db.select).mockReturnValue(mockSelectChain(mock) as never);

		const res = await app.request("/notifications");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body[0].readAt).toBe(readAt.toISOString());
	});

	it("should return empty list when no notifications", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/notifications");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveLength(0);
	});
});

describe("GET /notifications/unread-count", () => {
	it("should return unread count", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([{ count: 5 }]) as never);

		const res = await app.request("/notifications/unread-count");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.count).toBe(5);
	});

	it("should fall back to 0 when no row returned", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/notifications/unread-count");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.count).toBe(0);
	});
});

describe("PATCH /notifications/:id/read", () => {
	const notificationId = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";

	it("should return 404 when notification not found", async () => {
		vi.mocked(db.update).mockReturnValue(mockMutationChain([]) as never);

		const res = await app.request(`/notifications/${notificationId}/read`, {
			method: "PATCH",
		});

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error.code).toBe("NOT_FOUND");
	});

	it("should mark notification as read successfully", async () => {
		const updated = { notificationId };
		vi.mocked(db.update).mockReturnValue(mockMutationChain([updated]) as never);

		const res = await app.request(`/notifications/${notificationId}/read`, {
			method: "PATCH",
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
	});

	it("should reject invalid UUID format", async () => {
		const res = await app.request("/notifications/not-a-uuid/read", {
			method: "PATCH",
		});

		expect(res.status).toBe(400);
	});
});

describe("POST /notifications/read-all", () => {
	it("should mark all notifications as read", async () => {
		vi.mocked(db.update).mockReturnValue(mockMutationChain([]) as never);

		const res = await app.request("/notifications/read-all", {
			method: "POST",
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
	});

	it("should succeed even when no unread notifications exist", async () => {
		vi.mocked(db.update).mockReturnValue(mockMutationChain([]) as never);

		const res = await app.request("/notifications/read-all", {
			method: "POST",
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
	});
});
