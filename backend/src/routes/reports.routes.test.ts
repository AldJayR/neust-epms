import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db/client.js";
import {
	setMockUser,
	MOCK_USERS,
	createMockProject,
	mockSelectChain,
	mockMutationChain,
} from "../../test/helpers.js";
import app from "./reports.routes.js";

beforeEach(() => {
	setMockUser(MOCK_USERS.faculty);
});

describe("GET /reports", () => {
	it("should return a list of reports", async () => {
		const mock = {
			reportId: "aaa",
			projectId: "bbb",
			submittedById: "ccc",
			reportType: "Monthly",
			storagePath: null,
			remarks: null,
			submittedAt: new Date(),
			archivedAt: null,
		};
		vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);
		const res = await app.request("/reports");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.items).toHaveLength(1);
		expect(body.items[0].reportType).toBe("Monthly");
	});
});

describe("POST /reports", () => {
	it("should create a report for an existing project", async () => {
		const project = createMockProject();
		const report = {
			reportId: "aaa",
			projectId: project.projectId,
			submittedById: MOCK_USERS.faculty.userId,
			reportType: "Progress",
			storagePath: null,
			remarks: "Good progress",
			submittedAt: new Date(),
			archivedAt: null,
		};
		const enriched = {
			reportId: "aaa",
			projectId: project.projectId,
			projectTitle: "Test Project",
			leaderFirstName: "John",
			leaderLastName: "Doe",
			departmentName: "CS",
			reportType: "Progress",
			submittedAt: new Date(),
			storagePath: null,
			remarks: "Good progress",
			periodStart: null,
			periodEnd: null,
			archivedAt: null,
		};
		vi.mocked(db.select)
			.mockReturnValueOnce(mockSelectChain([project]) as never)
			.mockReturnValueOnce(mockSelectChain([enriched]) as never);
		vi.mocked(db.insert).mockReturnValue(mockMutationChain([report]) as never);
		vi.mocked(db.update).mockReturnValue(mockMutationChain([]) as never);

		const res = await app.request("/reports", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				projectId: project.projectId,
				reportType: "Progress",
				remarks: "Good progress",
			}),
		});
		expect(res.status).toBe(201);
	});

	it("should reject report for non-existent project", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);
		const res = await app.request("/reports", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				projectId: "ffffffff-0000-4000-8000-ffffffffffff",
				reportType: "Progress",
			}),
		});
		expect(res.status).toBe(404);
	});
});

describe("DELETE /reports/:id (soft delete)", () => {
	it("should archive an existing report", async () => {
		const mockReport = {
			reportId: "aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa",
			submittedById: MOCK_USERS.faculty.userId,
			departmentId: 1,
			campusId: 1,
		};
		const mockUpdate = { reportId: "aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa", archivedAt: new Date() };
		vi.mocked(db.select).mockReturnValue(mockSelectChain([mockReport]) as never);
		vi.mocked(db.update).mockReturnValue(mockMutationChain([mockUpdate]) as never);
		const res = await app.request(
			"/reports/aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa",
			{ method: "DELETE" },
		);
		expect(res.status).toBe(200);
	});

	it("should return 404 for non-existent report", async () => {
		vi.mocked(db.select).mockReturnValue(mockSelectChain([]) as never);
		vi.mocked(db.update).mockReturnValue(mockMutationChain([]) as never);
		const res = await app.request(
			"/reports/aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa",
			{ method: "DELETE" },
		);
		expect(res.status).toBe(404);
	});
});
