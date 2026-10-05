/**
 * Integration tests for proposals.routes.ts
 *
 * Tests the full proposal lifecycle state machine,
 * conflict-of-interest rules (EC-01), and RBAC enforcement.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db/client.js";
import {
	setMockUser,
	MOCK_USERS,
	createMockProposal,
	mockSelectChain,
	mockMutationChain,
	mockTransaction,
} from "../../../test/helpers.js";
import baseApp from "./index.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import { authMiddleware } from "@/middleware/auth.js";
import { installApiErrorHandler } from "@/lib/errors.js";
import { createProposalInTransaction } from "./proposals.service.js";
import { createNotification, getUserIdsByRole } from "@/lib/notification.helpers.js";

vi.mock("@/lib/notification.helpers.js", () => ({
	createNotification: vi.fn().mockResolvedValue(undefined),
	getUserIdsByRole: vi.fn().mockResolvedValue([]),
}));

const app = new OpenAPIHono();
app.use("*", authMiddleware);
app.route("/", baseApp);
installApiErrorHandler(app);

const PROPOSAL_ID = "eeeeeeee-5555-4555-8555-eeeeeeeeeeee";

beforeEach(() => {
	setMockUser(MOCK_USERS.faculty);
});

describe("GET /proposals", () => {
	it("should return a list of proposals", async () => {
		const mockProposal = createMockProposal();
		vi.mocked(db.select)
			.mockReturnValueOnce(mockSelectChain([]) as never) // leaderSubquery
			.mockReturnValueOnce(mockSelectChain([]) as never) // userMemberSubquery
			.mockReturnValueOnce(mockSelectChain([mockProposal]) as never) // items
			.mockReturnValueOnce(mockSelectChain([{ value: 1 }]) as never) // count
			.mockReturnValueOnce(mockSelectChain([]) as never); // extension services

		const res = await app.request("/proposals");
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.items).toHaveLength(1);
		expect(body.total).toBe(1);
	});

	it("should return empty list when no proposals exist", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/proposals");
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.items).toHaveLength(0);
		expect(body.total).toBe(0);
	});

	it("should reject an unsupported status filter", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request("/proposals?status=Unknown");

		expect(res.status).toBe(400);
	});
});

describe("GET /proposals/:id", () => {
	it("should return 404 when proposal not found", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await app.request(`/proposals/${PROPOSAL_ID}`);
		expect(res.status).toBe(404);
	});

	it("should return proposal when found", async () => {
		const mock = createMockProposal();
		vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);

		const res = await app.request(`/proposals/${PROPOSAL_ID}`);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.title).toBe("Community Health Extension Program");
	});
});

describe("POST /proposals", () => {
	it("should create a proposal with transaction", async () => {
		const mock = createMockProposal();
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never); // duplicate title check → no match
		vi.mocked(db.transaction).mockImplementation(
			mockTransaction(mock) as never,
		);

		const res = await app.request("/proposals", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				campusId: 1,
				departmentId: 1,
				title: "Test Proposal",
				bannerProgramId: 1,
				projectLocale: "Test City",
				extensionServiceIds: [1],
			}),
		});

		expect(res.status).toBe(201);
	});

	it("should reject non-numeric budgets", async () => {
		const res = await app.request("/proposals", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				campusId: 1,
				departmentId: 1,
				title: "Test Proposal",
				bannerProgramId: 1,
				projectLocale: "Test City",
				extensionServiceIds: [1],
				budgetPartner: "not-a-number",
				budgetNeust: "25000.00",
			}),
		});

		expect(res.status).toBe(400);
	});

	it("should reject negative budgets", async () => {
		const res = await app.request("/proposals", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				campusId: 1,
				departmentId: 1,
				title: "Test Proposal",
				bannerProgramId: 1,
				projectLocale: "Test City",
				extensionServiceIds: [1],
				budgetPartner: -1,
				budgetNeust: 25000,
			}),
		});

		expect(res.status).toBe(400);
	});

	it.each(["faculty", "retChair"] as const)("stores %s submissions without bypassing Chair endorsement", async (role) => {
		const proposal = createMockProposal();
		const proposalInsert = mockMutationChain([proposal]);
		const serviceInsert = mockMutationChain([]);
		const insert = vi
			.fn()
			.mockReturnValueOnce(proposalInsert)
			.mockReturnValueOnce(mockMutationChain([]))
			.mockReturnValueOnce(serviceInsert)
			.mockReturnValueOnce(mockMutationChain([]));
		let selectCallCount = 0;
		const tx = {
			insert,
			select: vi.fn(() => {
				selectCallCount++;
				return selectCallCount === 1
					? mockSelectChain([
							{
								bannerProgramId: 1,
								programName: "Test Program",
								programCampusId: 1,
								programDepartmentId: 1,
								isMainCampus: true,
							},
						])
					: mockSelectChain([
							{ extensionServiceId: 1 },
							{ extensionServiceId: 3 },
						]);
			}),
		} as never;

		await createProposalInTransaction(
			tx,
			{
				campusId: 1,
				departmentId: 1,
				title: "Test Proposal",
				bannerProgramId: 1,
				projectLocale: "Test City",
				extensionServiceIds: [1, 3],
				sectorIds: [1],
			},
			MOCK_USERS[role],
		);

		expect(insert).toHaveBeenCalledTimes(4);
		expect(proposalInsert.values).toHaveBeenCalledWith(expect.objectContaining({
			bypassedRetChair: false,
			status: "Draft",
		}));
		expect(serviceInsert.values).toHaveBeenCalledWith([
			{ proposalId: proposal.proposalId, extensionServiceId: 1 },
			{ proposalId: proposal.proposalId, extensionServiceId: 3 },
		],
		);
	});
});

describe("POST /proposals/:id/submit", () => {
	it("should allow submission of a Draft proposal", async () => {
		const mock = createMockProposal({ status: "Draft", projectRole: "Project Leader" });
		vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);
		vi.mocked(db.update).mockReturnValue(mockMutationChain([mock]) as never);

		const res = await app.request(`/proposals/${PROPOSAL_ID}/submit`, {
			method: "POST",
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.message).toContain("submitted");
	});

	it("should reject submission of an already Submitted proposal", async () => {
		const mock = createMockProposal({ status: "Pending Review" });
		vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);

		const res = await app.request(`/proposals/${PROPOSAL_ID}/submit`, {
			method: "POST",
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_STATUS");
	});
});

describe("POST /proposals/:id/review", () => {
	it("allows a Chair to directly endorse their own submission without a document", async () => {
		setMockUser(MOCK_USERS.retChair);
		vi.mocked(getUserIdsByRole).mockResolvedValueOnce([MOCK_USERS.director.userId]);
		const proposal = createMockProposal({
			status: "Pending Review",
			departmentId: MOCK_USERS.retChair.departmentId,
			userId: MOCK_USERS.retChair.userId,
			projectRole: "Project Leader",
			bypassedRetChair: true,
		});
		vi.mocked(db.select).mockReturnValue(mockSelectChain([proposal]) as never);
		vi.mocked(db.transaction).mockImplementation(mockTransaction(proposal) as never);
		const response = await app.request(`/proposals/${PROPOSAL_ID}/review`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ decision: "Endorsed" }),
		});
		expect(response.status).toBe(200);
		expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
			recipientId: MOCK_USERS.director.userId,
			title: "Proposal Awaiting Approval",
			sendEmail: true,
		}));
	});

	it("should allow RET Chair to endorse a Submitted proposal", async () => {
		setMockUser(MOCK_USERS.retChair);
		const mock = createMockProposal({
			status: "Pending Review",
			departmentId: MOCK_USERS.retChair.departmentId,
		});
		let selectCallCount = 0;
		vi.mocked(db.select).mockImplementation(() => {
			selectCallCount++;
			if (selectCallCount === 1) return mockSelectChain([mock]) as never; // proposal lookup
			if (selectCallCount === 2)
				return mockSelectChain([]) as never; // leader lookup
			if (selectCallCount === 3)
				return mockSelectChain([]) as never; // isProjectLeader → not a leader
			return mockSelectChain([
				{ bypassedRetChair: false },
			]) as never; // bypassRow
		});
		vi.mocked(db.transaction).mockImplementation(
			mockTransaction(mock) as never,
		);

		const res = await app.request(`/proposals/${PROPOSAL_ID}/review`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ decision: "Endorsed" }),
		});

		expect(res.status).toBe(200);
	});

	it("should allow Director to approve an Endorsed proposal", async () => {
		setMockUser(MOCK_USERS.director);
		const mock = createMockProposal({ status: "Endorsed" });
		let selectCallCount = 0;
		vi.mocked(db.select).mockImplementation(() => {
			selectCallCount++;
			if (selectCallCount === 1) return mockSelectChain([mock]) as never; // proposal lookup
			if (selectCallCount === 2)
				return mockSelectChain([]) as never; // leader lookup
			if (selectCallCount === 3)
				return mockSelectChain([]) as never; // isProjectLeader → not a leader
			return mockSelectChain([
				{ bypassedRetChair: false },
			]) as never; // bypassRow
		});
		vi.mocked(db.transaction).mockImplementation(
			mockTransaction(mock) as never,
		);

		const res = await app.request(`/proposals/${PROPOSAL_ID}/review`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ decision: "Approved" }),
		});

		expect(res.status).toBe(200);
	});

	it("should reject Director approving before endorsement (no bypass)", async () => {
		setMockUser(MOCK_USERS.director);
		const mock = createMockProposal({ status: "Pending Review" });
		let selectCallCount = 0;
		vi.mocked(db.select).mockImplementation(() => {
			selectCallCount++;
			if (selectCallCount === 1) return mockSelectChain([mock]) as never; // proposal lookup
			if (selectCallCount === 2)
				return mockSelectChain([]) as never; // leader lookup
			if (selectCallCount === 3)
				return mockSelectChain([]) as never; // isProjectLeader → not a leader
			return mockSelectChain([
				{ bypassedRetChair: false },
			]) as never; // bypassRow
		});

		const res = await app.request(`/proposals/${PROPOSAL_ID}/review`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ decision: "Approved" }),
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_STATE");
	});

	it("should reject Director approval of a pending proposal even with a legacy bypass flag", async () => {
		setMockUser(MOCK_USERS.director);
		const mock = createMockProposal({
			status: "Pending Review",
			bypassedRetChair: true,
		});
		let selectCallCount = 0;
		vi.mocked(db.select).mockImplementation(() => {
			selectCallCount++;
			if (selectCallCount === 1) return mockSelectChain([mock]) as never; // proposal lookup
			if (selectCallCount === 2)
				return mockSelectChain([]) as never; // isProjectLeader → not a leader
			return mockSelectChain([
				{ bypassedRetChair: true },
			]) as never; // bypassRow
		});
		vi.mocked(db.transaction).mockImplementation(
			mockTransaction(mock) as never,
		);

		const res = await app.request(`/proposals/${PROPOSAL_ID}/review`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ decision: "Approved" }),
		});

		expect(res.status).toBe(400);
		expect((await res.json()).error.code).toBe("INVALID_STATE");
	});

	it("should require fresh Chair endorsement when Director returns an Endorsed proposal", async () => {
		setMockUser(MOCK_USERS.director);
		const mock = createMockProposal({ status: "Endorsed" });
		let selectCallCount = 0;
		vi.mocked(db.select).mockImplementation(() => {
			selectCallCount++;
			if (selectCallCount === 1) return mockSelectChain([mock]) as never; // proposal lookup
			if (selectCallCount === 2)
				return mockSelectChain([]) as never; // isProjectLeader → not a leader
			return mockSelectChain([
				{ bypassedRetChair: false },
			]) as never; // bypassRow
		});
		vi.mocked(db.transaction).mockImplementation(
			mockTransaction(mock) as never,
		);

		const res = await app.request(`/proposals/${PROPOSAL_ID}/review`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ decision: "Returned", comments: "Needs revision" }),
		});

		expect(res.status).toBe(200);
		// Returned proposals must go through Chair endorsement again.
		const txUpdate = vi.mocked(db.transaction).mock.calls[0][0];
		const txObj = {
			insert: vi.fn(() => ({ values: vi.fn(() => ({})) })),
			update: vi.fn(() => ({
				set: vi.fn((vals: Record<string, unknown>) => {
					expect(vals.bypassedRetChair).toBe(false);
					return { where: vi.fn(() => ({ returning: vi.fn(() => [mock]) })) };
				}),
			})),
		};
		await (txUpdate as (tx: unknown) => Promise<unknown>)(txObj);
	});
});

