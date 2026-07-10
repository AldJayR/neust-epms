import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db/client.js";
import {
	MOCK_USERS,
	mockMutationChain,
	mockSelectChain,
	setMockUser,
} from "../../../test/helpers.js";
import app from "./admin.routes.js";
import { installApiErrorHandler } from "@/lib/errors.js";

installApiErrorHandler(app);

beforeEach(() => {
	setMockUser(MOCK_USERS.superAdmin);
});

describe("GET /admin/stats", () => {
	it("should return administrator dashboard statistics", async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(mockSelectChain([{ value: 12 }]) as never)
			.mockReturnValueOnce(mockSelectChain([{ value: 3 }]) as never)
			.mockReturnValueOnce(mockSelectChain([{ value: 3 }]) as never);

		const res = await app.request("/admin/stats");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({
			totalAccounts: 12,
			pendingApproval: 3,
			deactivated: 3,
		});
	});
});

describe("GET /admin/users", () => {
	it("should return paginated users", async () => {
		const user = {
			userId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
			firstName: "Faculty",
			middleName: null,
			lastName: "User",
			nameSuffix: null,
			academicRank: "Instructor",
			email: "faculty@neust.edu.ph",
			roleName: "Faculty",
			campusName: "Main",
			departmentName: "CICT",
			isActive: true,
			avatarUrl: null,
			hasCompletedOnboarding: false,
		};

		vi.mocked(db.select)
			.mockReturnValueOnce(mockSelectChain([{ value: 1 }]) as never)
			.mockReturnValueOnce(mockSelectChain([user]) as never);

		const res = await app.request("/admin/users?page=1&pageSize=10");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({
			users: [user],
			total: 1,
			page: 1,
			pageSize: 10,
		});
	});
});

describe("PATCH /admin/users/status", () => {
	it("should reject self-deactivation", async () => {
		const res = await app.request("/admin/users/status", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				userIds: [MOCK_USERS.superAdmin.userId],
				isActive: false,
			}),
		});

		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error.code).toBe("FORBIDDEN");
	});

	it("should update other users", async () => {
		vi.mocked(db.update).mockReturnValue(
			mockMutationChain([{ userId: MOCK_USERS.faculty.userId }]) as never,
		);

		const res = await app.request("/admin/users/status", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				userIds: [MOCK_USERS.faculty.userId],
				isActive: true,
			}),
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ success: true, updatedCount: 1 });
	});
});

describe("PATCH /admin/users/approve", () => {
	it("should handle an empty approval list", async () => {
		const res = await app.request("/admin/users/approve", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ users: [] }),
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ success: true, updatedCount: 0 });
	});
});

describe("PATCH /admin/users/:id/reject", () => {
	it("should return 404 when the user does not exist", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request(
			"/admin/users/aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa/reject",
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ reason: "Duplicate" }),
			},
		);

		expect(res.status).toBe(404);
	});
});

describe("POST /admin/users", () => {
	it("should reject non-Super Admin users", async () => {
		setMockUser(MOCK_USERS.faculty);

		const res = await app.request("/admin/users", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				firstName: "Director",
				lastName: "User",
				email: "director@neust.edu.ph",
				academicRank: "Professor",
			}),
		});

		expect(res.status).toBe(403);
	});
});

describe("PATCH /admin/users/:id", () => {
	it("should return 404 when the user does not exist", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request(
			"/admin/users/aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ firstName: "Updated" }),
			},
		);

		expect(res.status).toBe(404);
	});
});
