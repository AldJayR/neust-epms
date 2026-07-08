import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db/client.js";
import {
	setMockUser,
	MOCK_USERS,
	createMockProposal,
	createMockProject,
	mockSelectChain,
} from "../../../test/helpers.js";
import proposalsApp from "./index.js";
import projectsApp from "../projects/index.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import { authMiddleware } from "@/middleware/auth.js";

const propApp = new OpenAPIHono();
propApp.use("*", authMiddleware);
propApp.route("/", proposalsApp);

const projApp = new OpenAPIHono();
projApp.use("*", authMiddleware);
projApp.route("/", projectsApp);

describe("GET /proposals/:id/derived-state", () => {
	beforeEach(() => {
		setMockUser(MOCK_USERS.faculty);
	});

	it("should return the derived state for a proposal", async () => {
		const proposal = createMockProposal({
			status: "Returned",
			leaderId: MOCK_USERS.faculty.userId,
		});

		// Mock queries:
		// 1. leaderSubquery definition (calls db.select)
		// 2. Main proposals query execution (calls db.select)
		// 3. proposalReviews query execution (calls db.select)
		let selectCallCount = 0;
		vi.mocked(db.select).mockImplementation(() => {
			selectCallCount++;
			if (selectCallCount === 2) {
				return mockSelectChain([
					{
						proposalId: proposal.proposalId,
						status: proposal.status,
						bypassedRetChair: proposal.bypassedRetChair,
						leaderId: MOCK_USERS.faculty.userId,
						campusId: proposal.campusId,
						departmentId: proposal.departmentId,
					},
				]) as never;
			}
			return mockSelectChain([]) as never;
		});

		const res = await propApp.request(
			`/proposals/${proposal.proposalId}/derived-state`,
		);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body).toEqual({
			state: "ACT",
			owner: "You",
			reason: "Your proposal was returned for revision. Review the feedback and resubmit.",
			nextTransition: "Submit revised proposal",
		});
	});

	it("should return 404 if proposal not found", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await propApp.request(
			`/proposals/eeeeeeee-5555-4555-8555-eeeeeeeeeeee/derived-state`,
		);
		expect(res.status).toBe(404);
	});
});

describe("GET /projects/:id/derived-state", () => {
	beforeEach(() => {
		setMockUser(MOCK_USERS.faculty);
	});

	it("should return the derived state for a project", async () => {
		const project = createMockProject({
			projectStatus: "Ongoing",
		});

		// Mock queries:
		// 1. allowedProposals subquery definition (calls db.select)
		// 2. leaderMembers subquery definition (calls db.select)
		// 3. Main projects query execution (calls db.select)
		// 4. projectReportingSchedules query execution (calls db.select)
		// 5. projectReports query execution (calls db.select)
		let selectCallCount = 0;
		vi.mocked(db.select).mockImplementation(() => {
			selectCallCount++;
			if (selectCallCount === 3) {
				return mockSelectChain([
					{
						projectId: project.projectId,
						projectStatus: project.projectStatus,
						moaId: project.moaId,
						leaderId: MOCK_USERS.faculty.userId,
					},
				]) as never;
			}
			return mockSelectChain([]) as never;
		});

		const res = await projApp.request(
			`/projects/${project.projectId}/derived-state`,
		);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.state).toBe("WATCH");
		expect(body.owner).toBe("Director/Admin");
	});

	it("should return 404 if project not found", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);

		const res = await projApp.request(
			`/projects/ffffffff-6666-4666-8666-ffffffffffff/derived-state`,
		);
		expect(res.status).toBe(404);
	});
});
