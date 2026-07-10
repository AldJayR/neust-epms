/**
 * Integration tests for projects.routes.ts
 *
 * Tests state transitions (SYS-REQ-04.1),
 * and explicit project closure with required reports.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db/client.js";
import {
	setMockUser,
	MOCK_USERS,
	createMockProject,
	createMockMoa,
	mockSelectChain,
	mockMutationChain,
} from "../../../test/helpers.js";
import app from "./index.js";
import { installApiErrorHandler } from "@/lib/errors.js";

installApiErrorHandler(app);
import { insertAuditLog } from "@/lib/audit.js";

beforeEach(() => {
	setMockUser(MOCK_USERS.director);
});

describe("GET /projects", () => {
	it("should return a list of projects", async () => {
		const mock = createMockProject();
		vi.mocked(db.select).mockReturnValue(mockSelectChain([mock]) as never);

		const res = await app.request("/projects");
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.items).toHaveLength(1);
	});
});

describe("POST /projects/:id/transition", () => {
	it("should require MOA to transition to Ongoing (SYS-REQ-04.1)", async () => {
		const project = createMockProject({
			projectStatus: "Approved",
			moaId: null,
		});
		vi.mocked(db.select).mockReturnValue(mockSelectChain([project]) as never);

		const res = await app.request(`/projects/${project.projectId}/transition`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: "Ongoing" }),
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("MOA_REQUIRED");
	});

	it("should reject Completed if project is not Ongoing", async () => {
		const project = createMockProject({ projectStatus: "Approved" });
		vi.mocked(db.select).mockReturnValue(mockSelectChain([project]) as never);

		const res = await app.request(`/projects/${project.projectId}/transition`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: "Completed" }),
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_TRANSITION");
	});

	it("should transition project status successfully and log changes", async () => {
		const project = createMockProject({
			projectStatus: "Approved",
			moaId: "moa-123",
		});
		const moa = createMockMoa({
			moaId: "moa-123",
			validUntil: new Date("2030-01-01"),
		});

		let callCount = 0;
		vi.mocked(db.select).mockImplementation(() => {
			callCount++;
			if (callCount === 1) return mockSelectChain([project]) as never;
			return mockSelectChain([moa]) as never;
		});
		vi.mocked(db.update).mockReturnValue(mockMutationChain([project]) as never);

		const res = await app.request(`/projects/${project.projectId}/transition`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: "Ongoing" }),
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.message).toContain("Ongoing");

		expect(insertAuditLog).toHaveBeenCalledWith(
			expect.objectContaining({
				action: `Transitioned project ${project.projectId} to Ongoing`,
				oldValue: { projectStatus: "Approved" },
				newValue: { projectStatus: "Ongoing" },
			}),
			expect.anything(),
		);
	});
});

describe("POST /projects/:id/close", () => {
	it("should close a project when both required reports exist", async () => {
		const project = createMockProject({ projectStatus: "Ongoing" });
		const reports = [
			{ reportType: "Final Accomplishment" },
			{ reportType: "Terminal" },
		];

		let callCount = 0;
		vi.mocked(db.select).mockImplementation(() => {
			callCount++;
			if (callCount === 1) return mockSelectChain([project]) as never;
			return mockSelectChain(reports) as never;
		});
		vi.mocked(db.update).mockReturnValue(mockMutationChain([project]) as never);

		const res = await app.request(`/projects/${project.projectId}/close`, {
			method: "POST",
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.message).toBe("Project closed");

		expect(insertAuditLog).toHaveBeenCalledWith(
			expect.objectContaining({
				action: `Closed project ${project.projectId}`,
				oldValue: { projectStatus: "Ongoing" },
				newValue: { projectStatus: "Closed" },
			}),
			expect.anything(),
		);
	});

	it("should reject close when Final Accomplishment report is missing", async () => {
		const project = createMockProject({ projectStatus: "Ongoing" });
		const reports = [{ reportType: "Terminal" }];

		let callCount = 0;
		vi.mocked(db.select).mockImplementation(() => {
			callCount++;
			if (callCount === 1) return mockSelectChain([project]) as never;
			return mockSelectChain(reports) as never;
		});

		const res = await app.request(`/projects/${project.projectId}/close`, {
			method: "POST",
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("MISSING_FINAL_ACCOMPLISHMENT_REPORT");
	});

	it("should reject close when Terminal report is missing", async () => {
		const project = createMockProject({ projectStatus: "Ongoing" });
		const reports = [{ reportType: "Final Accomplishment" }];

		let callCount = 0;
		vi.mocked(db.select).mockImplementation(() => {
			callCount++;
			if (callCount === 1) return mockSelectChain([project]) as never;
			return mockSelectChain(reports) as never;
		});

		const res = await app.request(`/projects/${project.projectId}/close`, {
			method: "POST",
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("MISSING_TERMINAL_REPORT");
	});

	it("should reject close when no reports exist", async () => {
		const project = createMockProject({ projectStatus: "Ongoing" });

		let callCount = 0;
		vi.mocked(db.select).mockImplementation(() => {
			callCount++;
			if (callCount === 1) return mockSelectChain([project]) as never;
			return mockSelectChain([]) as never;
		});

		const res = await app.request(`/projects/${project.projectId}/close`, {
			method: "POST",
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("MISSING_FINAL_ACCOMPLISHMENT_REPORT");
	});

	it("should reject close when project is already closed", async () => {
		const project = createMockProject({ projectStatus: "Closed" });

		vi.mocked(db.select).mockImplementation(() => {
			return mockSelectChain([project]) as never;
		});

		const res = await app.request(`/projects/${project.projectId}/close`, {
			method: "POST",
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("ALREADY_CLOSED");
	});

	it("should reject close when project is not Ongoing", async () => {
		const project = createMockProject({ projectStatus: "Approved" });

		vi.mocked(db.select).mockImplementation(() => {
			return mockSelectChain([project]) as never;
		});

		const res = await app.request(`/projects/${project.projectId}/close`, {
			method: "POST",
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("INVALID_STATE");
	});

	it("should reject close when project is already completed", async () => {
		const project = createMockProject({ projectStatus: "Completed" });

		vi.mocked(db.select).mockImplementation(() => {
			return mockSelectChain([project]) as never;
		});

		const res = await app.request(`/projects/${project.projectId}/close`, {
			method: "POST",
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("ALREADY_CLOSED");
	});
});
