import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db/client.js";
import {
	setMockUser,
	MOCK_USERS,
	createMockProposal,
	mockSelectChain,
} from "../../../test/helpers.js";
import directorApp from "./index.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import { authMiddleware } from "@/middleware/auth.js";
import { installApiErrorHandler } from "@/lib/errors.js";

const app = new OpenAPIHono();
app.use("*", authMiddleware);
app.route("/", directorApp);
installApiErrorHandler(app);

describe("MOA access", () => {
	beforeEach(() => {
		setMockUser(MOCK_USERS.superAdmin);
	});

	it("should reject Super Admin from the MOA repository", async () => {
		const res = await app.request("/director/moas?page=1&limit=10");

		expect(res.status).toBe(403);
	});

	it("should reject Super Admin from the Director dashboard", async () => {
		const res = await app.request("/director/dashboard");

		expect(res.status).toBe(403);
	});

	it("should reject Super Admin from the project hub", async () => {
		const res = await app.request("/director/hub/projects?page=1&limit=10");

		expect(res.status).toBe(403);
	});

	it("should reject Super Admin from the faculty directory", async () => {
		const res = await app.request("/director/faculty?page=1&limit=10");

		expect(res.status).toBe(403);
	});

	it("should reject Super Admin from the faculty email report", async () => {
		const res = await app.request("/director/email-report", {
			method: "POST",
		});

		expect(res.status).toBe(403);
	});
});

describe("GET /director/hub/projects", () => {
	beforeEach(() => {
		setMockUser(MOCK_USERS.director);
	});

	it("should allow Director to retrieve projects and endorsed/bypassed proposals", async () => {
		const mockProposal = createMockProposal({
			status: "Endorsed",
		});

		// Mock queries in getHubProjects:
		// 1. getLeaderSubquery definition (calls db.select)
		// 2. latestReportsSubquery definition (calls db.select)
		// 3. Main query building (calls db.select)
		// 4. count query (calls db.select)
		let selectCallCount = 0;
		vi.mocked(db.select).mockImplementation(() => {
			selectCallCount++;
			if (selectCallCount === 4) {
				return mockSelectChain([
					{
						id: mockProposal.proposalId,
						title: mockProposal.title,
						leaderFirstName: "Faculty",
						leaderLastName: "User",
						leaderRank: "Instructor",
						college: "MIS",
						dateSubmitted: mockProposal.createdAt,
						proposalStatus: mockProposal.status,
						projectStatus: null,
						lastReportDate: null,
					},
				]) as never;
			}
			if (selectCallCount === 5) {
				return mockSelectChain([{ value: 1 }]) as never;
			}
			return mockSelectChain([]) as never;
		});

		const res = await app.request("/director/hub/projects?page=1&limit=10");
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.items).toHaveLength(1);
		expect(body.total).toBe(1);
		expect(body.items[0].id).toBe(mockProposal.proposalId);
	});
});
