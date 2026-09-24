import { describe, expect, it } from "vitest";
import {
	ActivateSchema,
	ProjectDetailsSchema,
	ProjectReportingScheduleSchema,
} from "./projects.schema.js";

describe("ActivateSchema", () => {
	it("accepts typed reporting milestones without a frequency", () => {
		const result = ActivateSchema.safeParse({
			moaId: "11111111-1111-4111-8111-111111111111",
			milestones: [
				{
					reportType: "Progress",
					dueAt: "2026-09-30T00:00:00.000Z",
				},
			],
		});

		expect(result.success).toBe(true);
	});

	it("accepts reporting milestones with custom title", () => {
		const result = ActivateSchema.safeParse({
			moaId: "11111111-1111-4111-8111-111111111111",
			milestones: [
				{
					title: "Month 1 Progress Report",
					reportType: "Progress",
					dueAt: "2026-10-30T00:00:00.000Z",
				},
				{
					title: "Terminal Report (Accomplishment and Terminal Report)",
					reportType: "Terminal Report",
					dueAt: "2026-11-30T00:00:00.000Z",
				},
			],
		});

		expect(result.success).toBe(true);
	});
});

describe("ProjectReportingScheduleSchema", () => {
	it("validates reporting schedule with milestone titles", () => {
		const result = ProjectReportingScheduleSchema.safeParse({
			schedule: {
				milestones: [
					{
						id: "22222222-2222-4222-8222-222222222222",
						title: "Month 1 Progress Report",
						date: "2026-10-30T00:00:00.000Z",
						isCompleted: false,
						completedAt: null,
						reportType: "Progress",
						reportId: null,
						storagePath: null,
					},
				],
			},
			upcoming: [
				{
					id: "22222222-2222-4222-8222-222222222222",
					title: "Month 1 Progress Report",
					date: "2026-10-30T00:00:00.000Z",
					reportType: "Progress",
				},
			],
			overdue: [],
		});

		expect(result.success).toBe(true);
	});
});

describe("ProjectDetailsSchema", () => {
	it("validates project details with targetStartDate and targetEndDate", () => {
		const result = ProjectDetailsSchema.safeParse({
			id: "33333333-3333-4333-8333-333333333333",
			title: "Extension Program",
			status: "Approved",
			version: "v1",
			bypassedRetChair: false,
			metadata: {
				leader: { name: "Dr. Leader" },
				departmentCode: "DIT",
				department: "Information Technology",
				duration: "Jan 2026 - Jun 2026",
				moaLinked: "City Government",
				extensionServices: ["Training"],
				budget: { total: 50000, neust: 50000, partner: 0 },
			},
			members: [],
			history: [],
			attachments: [],
			targetStartDate: "2026-01-01T00:00:00.000Z",
			targetEndDate: "2026-06-30T00:00:00.000Z",
		});

		expect(result.success).toBe(true);
	});
});
