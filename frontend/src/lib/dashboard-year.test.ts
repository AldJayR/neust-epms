import { describe, expect, it } from "vitest";
import { currentManilaYear, dashboardYearSchema } from "./dashboard-year";

describe("dashboard year selection", () => {
	it("defaults using the Manila calendar across the UTC New Year boundary", () => {
		expect(currentManilaYear(new Date("2025-12-31T15:59:59Z"))).toBe(2025);
		expect(currentManilaYear(new Date("2025-12-31T16:00:00Z"))).toBe(2026);
	});
	it("accepts URL years and rejects invalid or unsupported values", () => {
		expect(dashboardYearSchema.parse("2026")).toBe(2026);
		for (const year of ["2026.5", "invalid", "1999", "2201"]) {
			expect(dashboardYearSchema.safeParse(year).success).toBe(false);
		}
	});
});
