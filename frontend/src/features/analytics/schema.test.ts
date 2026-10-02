import { describe, expect, it } from "vitest";
import { analyticsResponseSchema, analyticsSearchSchema } from "./schema";

describe("analytics contracts", () => {
	it("parses URL filters without accepting invalid periods or pagination", () => {
		expect(
			analyticsSearchSchema.parse({ year: "2026", page: "2" }),
		).toMatchObject({ year: 2026, page: 2 });
		expect(analyticsSearchSchema.safeParse({ page: 0 }).success).toBe(false);
		expect(analyticsSearchSchema.safeParse({ year: 9999 }).success).toBe(false);
	});
	it("keeps missing reach distinct from explicit zero", () => {
		const response = {
			metrics: [],
			groups: [],
			total: 2,
			dateBasis: "Closure year",
			scopeLabel: "All units",
			generatedAt: "2026-10-01",
			items: [null, 0].map((traineeCount, index) => ({
				id: String(index),
				label: "Project",
				campus: "Campus",
				department: "Department",
				proposalId: null,
				reportId: null,
				userId: null,
				status: "Closed",
				closedAt: null,
				traineeCount,
				projects: 1,
				lead: 0,
				collaboration: 0,
			})),
		};
		expect(
			analyticsResponseSchema
				.parse(response)
				.items.map((item) => item.traineeCount),
		).toEqual([null, 0]);
		expect(
			analyticsResponseSchema.safeParse({ ...response, total: "2" }).success,
		).toBe(false);
	});
});
