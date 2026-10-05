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
				kind: "project",
				id: String(index),
				label: "Project",
				campus: "Campus",
				department: "Department",
				proposalId: String(index),
				reportId: null,
				status: "Closed",
				closedAt: null,
				traineeCount,
				projectRole: null,
			})),
		};
		expect(
			analyticsResponseSchema
				.parse(response)
				.items.map((item) => item.kind === "project" ? item.traineeCount : undefined),
		).toEqual([null, 0]);
		expect(
			analyticsResponseSchema.safeParse({ ...response, total: "2" }).success,
		).toBe(false);
	});

	it("uses a separate faculty row without project-only fields", () => {
		const response = analyticsResponseSchema.parse({
			metrics: [], groups: [], total: 1,
			dateBasis: "Current involvement", scopeLabel: "All units", generatedAt: "2026-10-05",
			items: [{
				kind: "faculty", id: "faculty-1", userId: "faculty-1", label: "Faculty",
				campus: "Campus", department: "Department", projects: 2, lead: 1, collaboration: 1,
			}],
		});
		expect(response.items[0]).toMatchObject({ kind: "faculty", projects: 2 });
		expect(response.items[0]).not.toHaveProperty("traineeCount");
	});
});
