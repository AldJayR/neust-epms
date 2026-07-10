import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db/client.js";
import {
	setMockUser,
	MOCK_USERS,
	createMockProject,
	mockSelectChain,
	mockMutationChain,
} from "../../../test/helpers.js";
import app from "./reports.routes.js";
import { installApiErrorHandler } from "@/lib/errors.js";

installApiErrorHandler(app);

beforeEach(() => {
	vi.mocked(db.select).mockReset();
	vi.mocked(db.insert).mockReset();
	vi.mocked(db.update).mockReset();
	vi.mocked(db.transaction).mockReset();
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

	it("should reject an empty search query", async () => {
		const res = await app.request("/reports?search=");

		expect(res.status).toBe(400);
	});
});

describe("GET /reports/stats", () => {
	it("should return report counts", async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(mockSelectChain([{ value: 4 }]) as never)
			.mockReturnValueOnce(mockSelectChain([{ value: 4 }]) as never)
			.mockReturnValueOnce(mockSelectChain([{ value: 4 }]) as never);

		const res = await app.request("/reports/stats");

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ total: 4, progress: 4, terminal: 4 });
	});
});

describe("POST /reports", () => {
	it("should create a report for an existing project", async () => {
		const project = createMockProject();
		const submittedAt = new Date("2026-01-01T00:00:00.000Z");
		const report = {
			reportId: "aaa",
			projectId: project.projectId,
			submittedById: MOCK_USERS.faculty.userId,
			reportType: "Progress",
			storagePath: null,
			remarks: "Good progress",
			submittedAt,
			archivedAt: null,
		};
		const enriched = {
			reportId: "aaa",
			projectId: project.projectId,
			projectTitle: "Test Project",
			leaderFirstName: "John",
			leaderLastName: "Doe",
			leaderAcademicRank: "Professor",
			leaderAvatarUrl: null,
			departmentName: "CS",
			reportType: "Progress",
			submittedAt,
			storagePath: null,
			remarks: "Good progress",
			periodStart: null,
			periodEnd: null,
			archivedAt: null,
		};
		vi.mocked(db.select)
			.mockReturnValueOnce(mockSelectChain([project]) as never)
			.mockReturnValueOnce(mockSelectChain([{ memberId: "member-1" }]) as never)
			.mockReturnValueOnce(mockSelectChain([]) as never)
			.mockReturnValueOnce(mockSelectChain([]) as never)
			.mockReturnValueOnce(
				mockSelectChain([{ projectStatus: "Ongoing" }]) as never,
			)
			.mockReturnValueOnce(mockSelectChain([]) as never)
			.mockReturnValueOnce(
				mockSelectChain([{ title: "Test Project" }]) as never,
			)
			.mockReturnValueOnce(mockSelectChain([enriched]) as never);
		vi.mocked(db.transaction).mockImplementation(
			(callback) =>
				callback({
					insert: vi.fn(() => mockMutationChain([report])),
					select: vi.fn(() => mockSelectChain([])),
					update: vi.fn(() => mockMutationChain([])),
				}) as never,
		);

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
		expect(await res.json()).toMatchObject({
			project: "Test Project",
			reportType: "Progress",
		});
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

	it("should reject a non-member with NOT_MEMBER", async () => {
		const project = createMockProject();
		vi.mocked(db.select)
			.mockReturnValueOnce(mockSelectChain([project]) as never)
			.mockReturnValueOnce(mockSelectChain([]) as never);

		const res = await app.request("/reports", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				projectId: project.projectId,
				reportType: "Progress",
			}),
		});

		expect(res.status).toBe(403);
		expect(await res.json()).toMatchObject({
			error: { code: "NOT_MEMBER" },
		});
	});
});
