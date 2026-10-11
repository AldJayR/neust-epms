/**
 * Integration tests for projects.routes.ts
 *
 * Tests state transitions (SYS-REQ-04.1),
 * and explicit project closure with required reports.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db/client.js";
import { projects } from "@/db/schema/projects.js";
import { projectReports } from "@/db/schema/project-reports.js";
import { reportAttachments } from "@/db/schema/report-attachments.js";
import { supabase } from "@/lib/supabase.js";
import { MAX_PDF_UPLOAD_BYTES } from "@/services/file.service.js";
import { closeProject } from "./project-closure.service.js";
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
		expect(body.error.code).toBe("DEPRECATED_TRANSITION");
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
		expect(body.error.code).toBe("DEPRECATED_TRANSITION");
	});

	it("rejects the deprecated transition even with a valid linked MOA", async () => {
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

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.code).toBe("DEPRECATED_TRANSITION");
		expect(db.update).not.toHaveBeenCalled();
		expect(insertAuditLog).not.toHaveBeenCalled();
	});
});

describe("POST /projects/:id/close", () => {
	const upload = vi.fn();
	const remove = vi.fn();
	const projectId = createMockProject().projectId;
	const completeReport = { reportId: "report-1", traineeCount: 10, packageCompletedAt: new Date() };
	const signedFile = () => new File(["%PDF-1.4\nsigned terminal report"], "signed.pdf", { type: "application/pdf" });
	const signedBody = (file = signedFile()) => {
		const body = new FormData();
		body.set("file", file);
		return body;
	};

	beforeEach(() => {
		upload.mockReset().mockResolvedValue({ error: null });
		remove.mockReset().mockResolvedValue({ error: null });
		vi.mocked(supabase.storage.from).mockReturnValue({ upload, remove } as never);
		vi.mocked(db.transaction).mockImplementation(async (callback) => callback(db as never));
	});

	function mockClosure(
		project = createMockProject({ projectStatus: "Pending Closure" }),
		reports: unknown[] = [completeReport],
		evaluations: unknown[] = [{ attachmentId: "eval-1" }],
	) {
		vi.mocked(db.select).mockImplementation(() => {
			const chain = mockSelectChain([]);
			chain.from = vi.fn((table) => mockSelectChain(
				table === projects ? [project] : table === projectReports ? reports : table === reportAttachments ? evaluations : [],
			));
			return chain as never;
		});
		vi.mocked(db.update).mockReturnValue(mockMutationChain([project]) as never);
		return project;
	}

	it.each(["projectId", "proposalId"] as const)("closes using %s and saves the signed PDF and hash", async (key) => {
		const project = mockClosure();
		const response = await app.request(`/projects/${project[key]}/close`, { method: "POST", body: signedBody() });
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ message: "Project closed" });
		expect(upload).toHaveBeenCalledWith(
			expect.stringContaining(`projects/${project.projectId}/signed-terminal-report_`),
			expect.any(File),
			{ contentType: "application/pdf", upsert: false },
		);
		const updateChain = vi.mocked(db.update).mock.results[0]!.value;
		expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({
			projectStatus: "Closed",
			actualEndDate: expect.any(Date),
			signedTerminalReportDocPath: upload.mock.calls[0]![0],
			signedTerminalReportHash: expect.stringMatching(/^[a-f0-9]{64}$/),
		}));
		expect(insertAuditLog).toHaveBeenCalledWith(expect.objectContaining({
			action: `Closed project ${project.projectId}`,
			oldValue: { projectStatus: "Pending Closure" },
			newValue: expect.objectContaining({ projectStatus: "Closed", signedTerminalReportHash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
		}), expect.anything());
		expect(remove).not.toHaveBeenCalled();
	});

	it("rejects the old bodyless closure request", async () => {
		const response = await app.request(`/projects/${projectId}/close`, { method: "POST" });
		expect(response.status).toBe(400);
		expect(upload).not.toHaveBeenCalled();
		expect(db.update).not.toHaveBeenCalled();
	});

	it.each(["faculty", "retChair", "superAdmin"] as const)("rejects signed uploads from %s", async (role) => {
		setMockUser(MOCK_USERS[role]);
		const response = await app.request(`/projects/${projectId}/close`, { method: "POST", body: signedBody() });
		expect(response.status).toBe(403);
		expect(upload).not.toHaveBeenCalled();
	});

	it("checks the Director role inside the service too", async () => {
		await expect(closeProject(projectId, MOCK_USERS.faculty, signedFile(), "127.0.0.1")).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(upload).not.toHaveBeenCalled();
	});

	it.each(["", "not a PDF"])("rejects an empty or disguised PDF", async (content) => {
		const response = await app.request(`/projects/${projectId}/close`, {
			method: "POST", body: signedBody(new File([content], "fake.pdf", { type: "application/pdf" })),
		});
		expect(response.status).toBe(422);
		expect(upload).not.toHaveBeenCalled();
	});

	it("rejects oversized requests before parsing the file", async () => {
		const response = await app.request(`/projects/${projectId}/close`, {
			method: "POST", headers: { "Content-Length": String(MAX_PDF_UPLOAD_BYTES + 1) }, body: signedBody(),
		});
		expect(response.status).toBe(413);
		expect(upload).not.toHaveBeenCalled();
	});

	it("checks the actual file size inside the service", async () => {
		const file = signedFile();
		vi.spyOn(file, "size", "get").mockReturnValue(MAX_PDF_UPLOAD_BYTES + 1);
		await expect(closeProject(projectId, MOCK_USERS.director, file, "127.0.0.1")).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
		expect(upload).not.toHaveBeenCalled();
	});

	it.each([
		["Closed", "ALREADY_CLOSED"], ["Completed", "ALREADY_CLOSED"],
		["Approved", "INVALID_STATE"], ["Ongoing", "INVALID_STATE"],
	])("rejects a project in %s state", async (status, code) => {
		mockClosure(createMockProject({ projectStatus: status }));
		const response = await app.request(`/projects/${projectId}/close`, { method: "POST", body: signedBody() });
		expect(response.status).toBe(400);
		expect((await response.json()).error.code).toBe(code);
		expect(upload).not.toHaveBeenCalled();
	});

	it("still requires the leader's terminal report", async () => {
		mockClosure(undefined, []);
		const response = await app.request(`/projects/${projectId}/close`, { method: "POST", body: signedBody() });
		expect(response.status).toBe(400);
		expect((await response.json()).error.code).toBe("MISSING_CLOSURE_REPORT");
		expect(upload).not.toHaveBeenCalled();
	});

	it("still requires a completed terminal package", async () => {
		mockClosure(undefined, [{ ...completeReport, packageCompletedAt: null }]);
		const response = await app.request(`/projects/${projectId}/close`, { method: "POST", body: signedBody() });
		expect(response.status).toBe(400);
		expect((await response.json()).error.code).toBe("INCOMPLETE_PACKAGE");
		expect(upload).not.toHaveBeenCalled();
	});

	it("still requires evaluation forms", async () => {
		mockClosure(undefined, [completeReport], []);
		const response = await app.request(`/projects/${projectId}/close`, { method: "POST", body: signedBody() });
		expect(response.status).toBe(400);
		expect((await response.json()).error.code).toBe("MISSING_EVALUATION_FORMS");
		expect(upload).not.toHaveBeenCalled();
	});

	it("does not change project state when uploading fails", async () => {
		mockClosure();
		upload.mockResolvedValueOnce({ error: { message: "Storage unavailable" } });
		const response = await app.request(`/projects/${projectId}/close`, { method: "POST", body: signedBody() });
		expect(response.status).toBe(400);
		expect((await response.json()).error.code).toBe("UPLOAD_FAILED");
		expect(db.transaction).not.toHaveBeenCalled();
		expect(db.update).not.toHaveBeenCalled();
	});

	it("rechecks project state after uploading and removes a losing upload", async () => {
		const project = mockClosure();
		upload.mockImplementationOnce(async () => {
			project.projectStatus = "Closed";
			return { error: null };
		});
		const response = await app.request(`/projects/${projectId}/close`, { method: "POST", body: signedBody() });
		expect(response.status).toBe(400);
		expect((await response.json()).error.code).toBe("ALREADY_CLOSED");
		expect(db.update).not.toHaveBeenCalled();
		expect(remove).toHaveBeenCalledWith([upload.mock.calls[0]![0]]);
	});

	it("removes the uploaded scan when the transaction fails", async () => {
		mockClosure();
		vi.mocked(db.transaction).mockRejectedValueOnce(new Error("Database unavailable"));
		await expect(closeProject(projectId, MOCK_USERS.director, signedFile(), "127.0.0.1")).rejects.toThrow("Database unavailable");
		expect(remove).toHaveBeenCalledWith([upload.mock.calls[0]![0]]);
	});
});
