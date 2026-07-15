import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db/client.js";
import {
	setMockUser,
	MOCK_USERS,
	mockSelectChain,
} from "../../../test/helpers.js";
import app from "./audit.routes.js";
import { installApiErrorHandler } from "@/lib/errors.js";

installApiErrorHandler(app);

beforeEach(() => {
	setMockUser(MOCK_USERS.superAdmin);
	vi.clearAllMocks();
});

describe("GET /audit-logs/stats", () => {
	it("should return stats response shape", async () => {
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([{ value: 10 }]) as never,
		);

		const res = await app.request("/audit-logs/stats");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveProperty("totalActionsToday");
		expect(body).toHaveProperty("uniqueUsersActive");
		expect(body).toHaveProperty("accountChanges");
		expect(body).toHaveProperty("failedLogins");
		expect(typeof body.totalActionsToday).toBe("number");
		expect(typeof body.uniqueUsersActive).toBe("number");
		expect(typeof body.accountChanges).toBe("number");
		expect(typeof body.failedLogins).toBe("number");
	});

	it("should reject non-Super Admin users", async () => {
		setMockUser(MOCK_USERS.faculty);
		const res = await app.request("/audit-logs/stats");
		expect(res.status).toBe(403);
	});
});

describe("GET /audit-logs", () => {
	it("should allow Super Admin to view audit logs", async () => {
		const mockLog = {
			logId: "aaa",
			userId: "bbb",
			action: "test",
			tableAffected: "users",
			oldValue: { isActive: false },
			newValue: { isActive: true },
			ipAddress: null,
			createdAt: new Date(),
			actorName: "John Doe",
			actorRole: "Faculty",
		};
		vi.mocked(db.select).mockReturnValue(mockSelectChain([mockLog]) as never);
		const res = await app.request("/audit-logs?page=1&limit=10");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.items).toHaveLength(1);
		expect(body).toHaveProperty("total");
		expect(body.items[0]).toMatchObject({
			oldValue: { isActive: false },
			newValue: { isActive: true },
		});
	});

	it("should reject non-Super Admin users", async () => {
		setMockUser(MOCK_USERS.faculty);
		const res = await app.request("/audit-logs?page=1&limit=10");
		expect(res.status).toBe(403);
	});

	it("should handle empty results", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);
		const res = await app.request("/audit-logs?page=1&limit=10");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.items).toHaveLength(0);
		expect(body.total).toBe(0);
	});

	it("should serialize createdAt as ISO string", async () => {
		const now = new Date();
		const mockLog = {
			logId: "aaa",
			userId: "bbb",
			action: "test",
			tableAffected: "users",
			ipAddress: null,
			createdAt: now,
			actorName: "John Doe",
			actorRole: "Faculty",
		};
		vi.mocked(db.select).mockReturnValue(mockSelectChain([mockLog]) as never);
		const res = await app.request("/audit-logs?page=1&limit=10");
		const body = await res.json();
		expect(body.items[0].createdAt).toBe(now.toISOString());
	});

	it("should include search parameter in audit action", async () => {
		const mockLog = {
			logId: "aaa",
			userId: "bbb",
			action: "test",
			tableAffected: "users",
			ipAddress: null,
			createdAt: new Date(),
			actorName: "John Doe",
			actorRole: "Faculty",
		};
		vi.mocked(db.select).mockReturnValue(mockSelectChain([mockLog]) as never);
		const res = await app.request("/audit-logs?page=1&limit=10&search=test");
		expect(res.status).toBe(200);
	});

	it("should handle action text without UUIDs", async () => {
		const mockLog = {
			logId: "aaa",
			userId: "11111111-1111-1111-1111-111111111111",
			action: "Viewed audit logs (page 1, limit 10)",
			tableAffected: "audit_logs",
			ipAddress: "127.0.0.1",
			createdAt: new Date(),
			actorName: "John Doe",
			actorRole: "Super Admin",
		};
		vi.mocked(db.select).mockReturnValue(mockSelectChain([mockLog]) as never);
		const res = await app.request("/audit-logs?page=1&limit=10");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.items).toHaveLength(1);
		expect(body.items[0].action).toBe("Viewed audit logs (page 1, limit 10)");
	});

	it("should handle pagination parameters", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);
		const res = await app.request("/audit-logs?page=2&limit=20");
		expect(res.status).toBe(200);
	});

	it("should handle invalid page parameter", async () => {
		const res = await app.request("/audit-logs?page=0&limit=10");
		expect(res.status).toBe(400);
	});

	it("should handle invalid limit parameter", async () => {
		const res = await app.request("/audit-logs?page=1&limit=0");
		expect(res.status).toBe(400);
	});

	it("should reject limit over 100", async () => {
		const res = await app.request("/audit-logs?page=1&limit=101");
		expect(res.status).toBe(400);
	});
});
