import { describe, expect, it } from "vitest";
import { currentManilaYear, ProjectYearSchema, projectYearBounds } from "./project-period.js";
import { FacultyDashboardQuery } from "@/modules/dashboard/dashboard.schema.js";

describe("dashboard calendar years", () => {
	it("changes the default year at midnight in Manila rather than UTC", () => {
		expect(currentManilaYear(new Date("2025-12-31T15:59:59Z"))).toBe(2025);
		expect(currentManilaYear(new Date("2025-12-31T16:00:00Z"))).toBe(2026);
	});
	it("uses an exclusive next-year boundary in Manila", () => {
		const bounds = projectYearBounds(2026);
		expect(bounds.start.toISOString()).toBe("2025-12-31T16:00:00.000Z");
		expect(bounds.end.toISOString()).toBe("2026-12-31T16:00:00.000Z");
	});
	it("validates query years and defaults the faculty endpoint to the current year", () => {
		expect(ProjectYearSchema.parse("2026")).toBe(2026);
		expect(ProjectYearSchema.safeParse("2026.5").success).toBe(false);
		expect(ProjectYearSchema.safeParse("not-a-year").success).toBe(false);
		expect(ProjectYearSchema.safeParse(2201).success).toBe(false);
		expect(FacultyDashboardQuery.parse({}).year).toBe(currentManilaYear());
	});
});
