import { describe, expect, it } from "vitest";
import { isActivationMoaValid, reportingScheduleError, validateProjectTransition } from "./project-policies.js";

describe("activation and closure policies", () => {
	const project = { projectId: "project-1", projectStatus: "Approved", moaId: "moa-1" };
	it.each(["Ongoing", "Completed"])("rejects deprecated %s transitions regardless of prerequisites", (status) => {
		expect(() => validateProjectTransition(project, status)).toThrowError(expect.objectContaining({ code: "DEPRECATED_TRANSITION" }));
	});
	const now = new Date("2026-10-08T12:00:00Z");
	const moa = { validFrom: now, validUntil: new Date("2027-01-01"), archivedAt: null, storagePath: "moas/agreement.pdf" };
	it("accepts validity starting exactly now", () => {
		expect(isActivationMoaValid(moa, now)).toBe(true);
	});
	it.each([
		{ validFrom: new Date("2026-10-09") },
		{ validUntil: now },
		{ validUntil: new Date("2025-01-01") },
		{ archivedAt: now },
		{ storagePath: null },
		{ storagePath: "  " },
	])("rejects an unusable MOA: %j", (override) => {
		expect(isActivationMoaValid({ ...moa, ...override }, now)).toBe(false);
	});
	const progress = { reportType: "Progress", dueAt: "2026-11-08T00:00:00Z" };
	const closure = { reportType: "Terminal Report", dueAt: "2026-12-08T00:00:00Z" };
	it("accepts a single final closure with earlier progress dates", () => {
		expect(reportingScheduleError([closure, progress])).toBeNull();
		expect(reportingScheduleError([closure])).toBeNull();
	});
	it.each([
		[], [progress], [closure, { ...closure, reportType: "Project Closure" }],
		[progress, progress, closure], [closure, { ...progress, dueAt: closure.dueAt }],
		[closure, { ...progress, dueAt: "2027-01-01T00:00:00Z" }],
		[closure, { ...progress, dueAt: "invalid" }],
	].map((milestones) => ({ milestones })))("rejects malformed schedules: %j", ({ milestones }) => {
		expect(reportingScheduleError(milestones)).toBeTruthy();
	});
});
