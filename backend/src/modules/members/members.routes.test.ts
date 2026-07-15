import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db/client.js";
import {
	setMockUser,
	MOCK_USERS,
	mockSelectChain,
	mockMutationChain,
} from "../../../test/helpers.js";
import baseApp from "./members.routes.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import { authMiddleware } from "@/middleware/auth.js";
import { installApiErrorHandler } from "@/lib/errors.js";

const app = new OpenAPIHono();
app.use("*", authMiddleware);
app.route("/", baseApp);
installApiErrorHandler(app);

beforeEach(() => {
	setMockUser(MOCK_USERS.faculty);
});

describe("GET /proposals/:proposalId/members", () => {
	const proposalId = "eeeeeeee-5555-4555-8555-eeeeeeeeeeee";
	const proposal = {
		proposalId,
		campusId: MOCK_USERS.faculty.campusId,
		departmentId: MOCK_USERS.faculty.departmentId,
		archivedAt: null,
	};
	it("should return the member list", async () => {
		const mock = {
			memberId: "aaa",
			proposalId: "bbb",
			userId: "ccc",
			projectRole: "Researcher",
			addedAt: new Date(),
		};
		vi.mocked(db.select)
			.mockReturnValueOnce(mockSelectChain([proposal]) as never)
			.mockReturnValueOnce(mockSelectChain([mock]) as never);

		const res = await app.request(
			`/proposals/${proposalId}/members`,
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.items).toHaveLength(1);
	});

	it("should return empty list when no members", async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(mockSelectChain([proposal]) as never)
			.mockReturnValueOnce(mockSelectChain([]) as never);

		const res = await app.request(
			`/proposals/${proposalId}/members`,
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.items).toHaveLength(0);
	});

	it("should handle pagination parameters", async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(mockSelectChain([proposal]) as never)
			.mockReturnValueOnce(mockSelectChain([]) as never);

		const res = await app.request(
			`/proposals/${proposalId}/members?page=2&limit=10`,
		);
		expect(res.status).toBe(200);
	});
});

describe("POST /proposals/:proposalId/members", () => {
	const proposalId = "eeeeeeee-5555-4555-8555-eeeeeeeeeeee";
	const proposal = {
		proposalId,
		campusId: MOCK_USERS.faculty.campusId,
		departmentId: MOCK_USERS.faculty.departmentId,
		archivedAt: null,
	};

	it("should reject adding a member if proposal not found", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request(`/proposals/${proposalId}/members`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				userId: "new-user",
				projectRole: "Member",
			}),
		});

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error.code).toBe("NOT_FOUND");
	});

	it("should reject non-leader attempting to add member", async () => {
		// Mock isProjectLeader to return empty (user is NOT a leader)
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		// Mock transaction - proposal exists but isProjectLeader check fails
		vi.mocked(db.transaction).mockImplementation(async (callback) => {
			const tx = {
				select: vi
					.fn()
					.mockReturnValueOnce(mockSelectChain([proposal])),
				insert: vi.fn(() => mockMutationChain([])),
				update: vi.fn(() => mockMutationChain([])),
				delete: vi.fn(() => mockMutationChain([])),
			};
			return callback(tx as never);
		});

		const res = await app.request(`/proposals/${proposalId}/members`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				userId: "new-user",
				projectRole: "Member",
			}),
		});

		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error.code).toBe("NOT_LEADER");
	});

	it("should reject when target user not found", async () => {
		// Mock isProjectLeader to return truthy (user IS a leader)
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([{ memberId: "leader-m" }]) as never,
		);

		vi.mocked(db.transaction).mockImplementation(async (callback) => {
			const tx = {
				select: vi
					.fn()
					.mockReturnValueOnce(mockSelectChain([proposal]))
					.mockReturnValueOnce(mockSelectChain([])),
				insert: vi.fn(() => mockMutationChain([])),
				update: vi.fn(() => mockMutationChain([])),
				delete: vi.fn(() => mockMutationChain([])),
			};
			return callback(tx as never);
		});

		const res = await app.request(`/proposals/${proposalId}/members`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				userId: "nonexistent-user",
				projectRole: "Member",
			}),
		});

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error.code).toBe("USER_NOT_FOUND");
	});

	it("should reject duplicate membership", async () => {
		const targetUser = { userId: "existing-user" };
		const existing = { memberId: "m1" };

		// Mock isProjectLeader to return truthy (user IS a leader)
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([{ memberId: "leader-m" }]) as never,
		);

		vi.mocked(db.transaction).mockImplementation(async (callback) => {
			const tx = {
				select: vi
					.fn()
					.mockReturnValueOnce(mockSelectChain([proposal]))
					.mockReturnValueOnce(mockSelectChain([targetUser]))
					.mockReturnValueOnce(mockSelectChain([existing])),
				insert: vi.fn(() => mockMutationChain([])),
				update: vi.fn(() => mockMutationChain([])),
				delete: vi.fn(() => mockMutationChain([])),
			};
			return callback(tx as never);
		});

		const res = await app.request(`/proposals/${proposalId}/members`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				userId: "existing-user",
				projectRole: "Member",
			}),
		});

		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.error.code).toBe("DUPLICATE");
	});

	it("should enforce single project leader per proposal", async () => {
		const targetUser = { userId: "new-leader" };
		const existingLeader = { memberId: "existing-leader" };

		// Mock isProjectLeader to return truthy (user IS a leader)
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([{ memberId: "leader-m" }]) as never,
		);

		vi.mocked(db.transaction).mockImplementation(async (callback) => {
			const tx = {
				select: vi
					.fn()
					.mockReturnValueOnce(mockSelectChain([proposal]))
					.mockReturnValueOnce(mockSelectChain([targetUser]))
					.mockReturnValueOnce(mockSelectChain([]))
					.mockReturnValueOnce(mockSelectChain([existingLeader])),
				insert: vi.fn(() => mockMutationChain([])),
				update: vi.fn(() => mockMutationChain([])),
				delete: vi.fn(() => mockMutationChain([])),
			};
			return callback(tx as never);
		});

		const res = await app.request(`/proposals/${proposalId}/members`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				userId: "new-leader",
				projectRole: "Project Leader",
			}),
		});

		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.error.code).toBe("DUPLICATE_LEADER");
	});

	it("should add a member successfully", async () => {
		const targetUser = { userId: "new-u" };
		const created = {
			memberId: "new-m",
			proposalId,
			userId: "new-u",
			projectRole: "Member",
			addedAt: new Date(),
		};

		// Mock db.select for isProjectLeader check (returns truthy = user IS a leader)
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([{ memberId: "leader-m" }]) as never,
		);

		// Mock db.transaction with ordered tx.select calls
		vi.mocked(db.transaction).mockImplementation(async (callback) => {
			const tx = {
				select: vi
					.fn()
					.mockReturnValueOnce(mockSelectChain([proposal]))
					.mockReturnValueOnce(mockSelectChain([targetUser]))
					.mockReturnValueOnce(mockSelectChain([])),
				insert: vi.fn(() => mockMutationChain([created])),
				update: vi.fn(() => mockMutationChain([])),
				delete: vi.fn(() => mockMutationChain([])),
			};
			return callback(tx as never);
		});

		const res = await app.request(`/proposals/${proposalId}/members`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				userId: "new-u",
				projectRole: "Member",
			}),
		});

		expect(res.status).toBe(201);
	});
});

describe("DELETE /proposals/:proposalId/members/:memberId", () => {
	const proposalId = "eeeeeeee-5555-4555-8555-eeeeeeeeeeee";
	const memberId = "aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa";
	const proposal = {
		proposalId,
		campusId: MOCK_USERS.faculty.campusId,
		departmentId: MOCK_USERS.faculty.departmentId,
		archivedAt: null,
	};

	it("should reject removal if proposal not found", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);
		vi.mocked(db.transaction).mockImplementation(async (callback) => {
			const tx = {
				select: vi.fn(() => mockSelectChain([])),
				insert: vi.fn(() => mockMutationChain([])),
				update: vi.fn(() => mockMutationChain([])),
				delete: vi.fn(() => mockMutationChain([])),
			};
			return callback(tx as never);
		});

		const res = await app.request(
			`/proposals/${proposalId}/members/${memberId}`,
			{ method: "DELETE" },
		);

		expect(res.status).toBe(404);
	});

	it("should reject non-leader attempting to remove member", async () => {
		// Mock isProjectLeader to return empty (user is NOT a leader)
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		vi.mocked(db.transaction).mockImplementation(async (callback) => {
			const tx = {
				select: vi
					.fn()
					.mockReturnValueOnce(mockSelectChain([proposal])),
				insert: vi.fn(() => mockMutationChain([])),
				update: vi.fn(() => mockMutationChain([])),
				delete: vi.fn(() => mockMutationChain([])),
			};
			return callback(tx as never);
		});

		const res = await app.request(
			`/proposals/${proposalId}/members/${memberId}`,
			{ method: "DELETE" },
		);

		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error.code).toBe("NOT_LEADER");
	});

	it("should reject removal when member not found", async () => {
		// Mock isProjectLeader to return truthy (user IS a leader)
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([{ memberId: "leader-m" }]) as never,
		);

		vi.mocked(db.transaction).mockImplementation(async (callback) => {
			const tx = {
				select: vi
					.fn()
					.mockReturnValueOnce(
						mockSelectChain([
							{
								proposalId,
								campusId: MOCK_USERS.faculty.campusId,
								departmentId: MOCK_USERS.faculty.departmentId,
								archivedAt: null,
							},
						]),
					),
				insert: vi.fn(() => mockMutationChain([])),
				update: vi.fn(() => mockMutationChain([])),
				delete: vi.fn(() => mockMutationChain([])),
			};
			return callback(tx as never);
		});

		const res = await app.request(
			`/proposals/${proposalId}/members/${memberId}`,
			{ method: "DELETE" },
		);

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error.code).toBe("MEMBER_NOT_FOUND");
	});

	it("should remove a member successfully", async () => {
		const archived = { memberId };

		// Mock isProjectLeader to return truthy (user IS a leader)
		vi.mocked(db.select).mockReturnValue(
			mockSelectChain([{ memberId: "leader-m" }]) as never,
		);

		vi.mocked(db.transaction).mockImplementation(async (callback) => {
			const tx = {
				select: vi
					.fn()
					.mockReturnValueOnce(mockSelectChain([proposal])),
				insert: vi.fn(() => mockMutationChain([])),
				update: vi.fn(() => mockMutationChain([archived])),
				delete: vi.fn(() => mockMutationChain([])),
			};
			return callback(tx as never);
		});

		const res = await app.request(
			`/proposals/${proposalId}/members/${memberId}`,
			{ method: "DELETE" },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.message).toBe("Member removed");
	});
});
